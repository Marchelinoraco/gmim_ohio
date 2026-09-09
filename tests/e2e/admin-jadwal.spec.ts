import { test, expect, type APIRequestContext, type Page } from '@playwright/test'

/**
 * Alur jadwal end-to-end: buat draf → tidak bocor ke publik → terbitkan →
 * muncul di publik → hapus → hilang dari keduanya.
 *
 * Langkah ketiga yang paling penting. Draf adalah satu-satunya hal yang
 * memisahkan "pengurus sedang menyusun jadwal" dari "jemaat melihat ibadah yang
 * belum diputuskan" — dan tidak ada test lain yang menjaganya.
 *
 * `mode: 'serial'` karena kelima langkah adalah satu cerita atas satu baris yang
 * sama; menjalankannya paralel akan membuat langkah 3 membaca keadaan yang sudah
 * diubah langkah 4.
 *
 * Tanggal sengaja jauh di masa depan supaya test tidak bergantung pada isi
 * jadwal sungguhan dan tidak mengotori tinjauan pengurus.
 */
test.describe.configure({ mode: 'serial' })

const EMAIL = process.env.SEED_ADMIN_EMAIL
const PASSWORD = process.env.SEED_ADMIN_PASSWORD
/**
 * Tanggal DAN tema diberi akhiran unik per run.
 *
 * `ws_template_date_uq` memperlakukan NULL sebagai sama sejak migrasi 0005, dan
 * ibadah buatan form ini punya `template_id` maupun `kolom_id` NULL — jadi dua
 * run yang memakai tanggal sama akan bentrok satu sama lain. Kalau sebuah run
 * gagal di tengah dan meninggalkan barisnya, run berikutnya tidak boleh ikut
 * tumbang karenanya; tanggal unik membuat tiap run berdiri sendiri.
 *
 * Tahun 2027 jauh di luar jendela jadwal sungguhan, jadi baris uji tidak pernah
 * bercampur dengan yang ditinjau pengurus.
 */
const RUN = Date.now()
const HARI = (RUN % 27) + 1
const TANGGAL = `2027-01-${String(HARI).padStart(2, '0')}`
const TEMA = `Uji Otomatis ${RUN} — hapus bila tertinggal`

/**
 * Pemanasan route sebelum dipakai. Hit pertama ke sebuah graf modul di dev
 * server memicu transform on-demand Vite dan bisa melampaui timeout asersi.
 * Pola dan alasannya sama dengan `warmAuthEndpoint` di `admin.spec.ts`; lihat
 * docblock di sana dan di `auth-smoke.spec.ts`.
 */
async function warm(request: APIRequestContext, path: string) {
  await expect(async () => {
    const res = await request.get(path)
    expect([200, 300, 301, 302, 303, 307, 308]).toContain(res.status())
  }).toPass({ timeout: 20_000 })
}

/**
 * Buka `/jadwal` publik dalam keadaan benar-benar segar.
 *
 * Alur ini mengunjungi halaman yang sama tiga kali sambil mengubah isinya di
 * antara kunjungan (draf → terbit → hapus). Tanpa muat ulang penuh, asersi bisa
 * membaca render dari kunjungan sebelumnya dan menyimpulkan hal yang salah —
 * terlihat sebagai kegagalan yang hanya muncul di suite penuh, karena di sanalah
 * timingnya cukup ketat untuk terekspos.
 */
async function bukaJadwalPublik(page: Page) {
  await page.goto('/jadwal')
  await page.reload({ waitUntil: 'networkidle' })
}

async function masuk(page: Page) {
  await page.goto('/admin/login')
  // Tunggu hidrasi: tanpa ini form ter-submit native dan request tak pernah terjadi.
  await page.waitForLoadState('networkidle')
  await page.getByLabel(/email/i).fill(EMAIL!)
  await page.getByLabel(/kata sandi|password/i).fill(PASSWORD!)
  await page.getByRole('button', { name: /masuk|sign in/i }).click()
  await expect(page).toHaveURL(/\/admin$/, { timeout: 15_000 })
}

test('alur jadwal: buat draf → terbitkan → hapus', async ({ page, request }, testInfo) => {
  // Project reduced-motion memvalidasi perilaku animasi; halaman jadwal tidak
  // punya animasi, jadi menjalankannya di sana hanya menggandakan beban tulis
  // ke database tanpa menambah informasi.
  test.skip(testInfo.project.name !== 'chromium', 'alur admin hanya di chromium')
  test.skip(!EMAIL || !PASSWORD, 'SEED_ADMIN_EMAIL/PASSWORD tidak di-set')

  // Default 30 detik tidak cukup untuk alur sepanjang ini: satu login plus lima
  // langkah yang bersama-sama melakukan sembilan navigasi full-page, masing-masing
  // dengan SSR render di dev server. Bukan menutupi kelambatan aplikasi — tiap
  // asersi di bawah punya timeout-nya sendiri yang tetap ketat, jadi kalau ada
  // langkah yang benar-benar macet, ia gagal di situ dan bukan di batas total ini.
  test.setTimeout(120_000)

  await warm(request, '/api/auth/ok')
  await warm(request, '/admin')
  await masuk(page)

  // 0. Bersihkan sisa run sebelumnya yang gagal di tengah. Lewat UI, bukan SQL:
  //    jalur hapus yang sama dengan yang dipakai pengurus, jadi sekalian terpakai.
  await page.goto('/admin/jadwal')
  await page.waitForLoadState('networkidle')
  // Tanpa anchor `^`: teks satu baris tabel dimulai dengan TANGGAL, bukan tema,
  // jadi `/^Uji Otomatis/` tidak pernah cocok dan pembersihan diam-diam tak
  // melakukan apa-apa.
  const sisa = page.getByRole('row').filter({ hasText: /Uji Otomatis/ })
  for (let n = await sisa.count(); n > 0; n = await sisa.count()) {
    await sisa
      .first()
      .getByRole('button', { name: /^hapus$|^delete$/i })
      .click()
    await page
      .getByRole('dialog')
      .getByRole('button', { name: /^hapus$|^delete$/i })
      .click()
    await expect(sisa).toHaveCount(n - 1, { timeout: 15_000 })
  }

  // 1. Buat sebagai draf.
  await page.goto('/admin/jadwal/baru')
  await page.waitForLoadState('networkidle')
  await page.getByLabel(/^tanggal$|^date$/i).fill(TANGGAL)
  await page.getByLabel(/jam mulai|start time/i).fill('10:00')
  await page.getByLabel(/tema \(indonesia\)|theme \(indonesian\)/i).fill(TEMA)
  await page.getByRole('button', { name: /^simpan$|^save$/i }).click()
  await expect(page).toHaveURL(/\/admin\/jadwal$/, { timeout: 15_000 })

  // 2. Tampil di dashboard sebagai draf.
  const baris = page.getByRole('row').filter({ hasText: TEMA })
  await expect(baris).toBeVisible({ timeout: 15_000 })
  await expect(baris).toContainText(/draf|draft/i)

  // 3. TIDAK bocor ke halaman publik. Inti test ini.
  await bukaJadwalPublik(page)
  await expect(page.getByText(TEMA)).toHaveCount(0)

  // 4. Terbitkan → muncul di publik.
  await page.goto('/admin/jadwal')
  await page.waitForLoadState('networkidle')
  await baris.getByRole('button', { name: /terbitkan|^publish$/i }).click()
  await expect(baris).toContainText(/terbit|published/i, { timeout: 15_000 })
  await bukaJadwalPublik(page)
  await expect(page.getByText(TEMA).first()).toBeVisible({ timeout: 15_000 })

  // 5. Hapus → hilang dari keduanya.
  await page.goto('/admin/jadwal')
  await page.waitForLoadState('networkidle')
  await baris.getByRole('button', { name: /^hapus$|^delete$/i }).click()
  await page
    .getByRole('dialog')
    .getByRole('button', { name: /^hapus$|^delete$/i })
    .click()
  await expect(page.getByRole('row').filter({ hasText: TEMA })).toHaveCount(0, { timeout: 15_000 })
  await bukaJadwalPublik(page)
  await expect(page.getByText(TEMA)).toHaveCount(0, { timeout: 15_000 })
})

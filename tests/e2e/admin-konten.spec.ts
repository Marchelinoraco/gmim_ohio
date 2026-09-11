import { test, expect, type APIRequestContext, type Page, type Locator } from '@playwright/test'

/**
 * Alur warta & renungan end-to-end: buat draf → tidak bocor ke publik →
 * terbitkan → muncul di publik DENGAN FORMAT BERTAHAN → hapus → hilang.
 *
 * Langkah "format bertahan" yang paling berharga di sini. Ia menguji seluruh
 * rantai sekaligus: editor menghasilkan tag yang ada di allowlist, sanitasi di
 * titik simpan tidak membuangnya, dan sanitasi di titik baca juga tidak. Tak ada
 * test lain yang menyentuh ketiganya bersamaan.
 *
 * `mode: 'serial'` karena tiap alur adalah satu cerita atas satu baris yang sama.
 *
 * Tanggal data uji sengaja jauh di MASA LALU. `/warta` dan `/renungan` publik
 * mengurutkan `desc`, jadi tanggal masa depan akan menjadikan data uji ini
 * "kartu pertama" — dan `public-pages.spec.ts` mengasersi isi kartu pertama
 * adalah warta seed yang dikenal. Tanggal lampau membuat data uji selalu berada
 * di urutan terakhir dan tidak pernah mengubah apa yang dilihat test lain.
 */
test.describe.configure({ mode: 'serial' })

const EMAIL = process.env.SEED_ADMIN_EMAIL
const PASSWORD = process.env.SEED_ADMIN_PASSWORD

/**
 * Penanda unik per run. Slug renungan punya unique constraint, jadi run yang
 * gagal di tengah akan menghalangi run berikutnya kalau penandanya tetap.
 */
const RUN = Date.now()
const JUDUL = `Uji Otomatis ${RUN}`
const SLUG = `uji-otomatis-${RUN}`
const TEBAL = `tebal${RUN}`

async function warm(request: APIRequestContext, path: string) {
  await expect(async () => {
    const res = await request.get(path)
    expect([200, 300, 301, 302, 303, 307, 308]).toContain(res.status())
  }).toPass({ timeout: 25_000 })
}

async function masuk(page: Page) {
  await page.goto('/admin/login')
  // Tunggu hidrasi: tanpa ini form ter-submit native dan request tak pernah terjadi.
  await page.waitForLoadState('networkidle')
  await page.getByLabel(/email/i).fill(EMAIL!)
  await page.getByLabel(/kata sandi|password/i).fill(PASSWORD!)
  await page.getByRole('button', { name: /masuk|sign in/i }).click()
  await expect(page).toHaveURL(/\/admin$/, { timeout: 20_000 })
}

/**
 * Buka halaman publik dalam keadaan benar-benar segar.
 *
 * Alur ini mengunjungi halaman yang sama beberapa kali sambil mengubah isinya di
 * antara kunjungan. Tanpa muat ulang penuh, asersi bisa membaca render dari
 * kunjungan sebelumnya dan menyimpulkan hal yang salah.
 */
async function bukaPublik(page: Page, path: string) {
  // Query unik per kunjungan: alur ini membuka halaman yang sama berkali-kali
  // sambil mengubah isinya, dan `goto` ke URL identik bisa dilayani dari cache
  // navigasi browser sehingga asersi membaca render lama. Query-nya diabaikan
  // route publik, jadi ia hanya memaksa permintaan baru.
  const pemisah = path.includes('?') ? '&' : '?'
  await page.goto(`${path}${pemisah}_t=${Date.now()}`, { waitUntil: 'networkidle' })
}

/**
 * Ketik teks tebal ke editor ke-`n` (0 = Indonesia, 1 = Inggris).
 *
 * Urutannya WAJIB ketik → seleksi → tebalkan. Menekan tombol toolbar lebih dulu
 * memindahkan fokus keluar dari editor, sehingga teks yang diketik sesudahnya
 * tidak masuk ke mana-mana — terverifikasi saat menulis probe Task 6.
 */
async function ketikTebal(page: Page, n: number, teks: string) {
  const editor = page.locator('[contenteditable="true"]').nth(n)
  await editor.click()
  await page.keyboard.type(teks)
  await page.keyboard.press('ControlOrMeta+a')
  await page
    .getByRole('toolbar')
    .nth(n)
    .getByRole('button', { name: /tebal|bold/i })
    .click()
  await expect(editor.locator('strong')).toHaveText(teks, { timeout: 10_000 })
}

/**
 * Hapus sisa run sebelumnya lewat UI — jalur yang sama dengan pengurus.
 *
 * Filter TANPA anchor `^`: teks satu baris tabel dimulai dengan TANGGAL, bukan
 * judul, jadi `/^Uji Otomatis/` tidak pernah cocok dan pembersihan diam-diam
 * tidak melakukan apa-apa. Cacat itu nyata terjadi di Rencana 3b.
 */
async function bersihkanSisa(page: Page, path: string) {
  const sisa = page.getByRole('row').filter({ hasText: /Uji Otomatis/ })

  // Muat ulang dari server tiap putaran, bukan mengandalkan tabel yang
  // diperbarui `router.invalidate()`. Selagi loader itu berjalan tabelnya kosong
  // sesaat, sehingga menunggu `toHaveCount(n - 1)` bisa lulus sebelum hapusnya
  // tersimpan — dan putaran berikutnya lalu mengklik baris yang sudah tidak ada,
  // menggantung sampai test timeout. Persoalan yang sama dengan `hapusBaris`.
  for (let putaran = 0; putaran < 20; putaran++) {
    await page.goto(`${path}?_t=${Date.now()}`, { waitUntil: 'networkidle' })
    if ((await sisa.count()) === 0) return
    await sisa
      .first()
      .getByRole('button', { name: /^hapus$|^delete$/i })
      .click()
    await page
      .getByRole('dialog')
      .getByRole('button', { name: /^hapus$|^delete$/i })
      .click()
    // Beri mutasi kesempatan terkirim sebelum halaman dimuat ulang.
    await expect(sisa.first()).toBeHidden({ timeout: 15_000 })
  }
  throw new Error(`Sisa data uji di ${path} tidak habis setelah 20 putaran`)
}

/**
 * Hapus satu baris, lalu PASTIKAN hapusnya sudah benar-benar tersimpan.
 *
 * Menunggu baris hilang dari tabel saja tidak cukup: `router.invalidate()`
 * membuat tabel kosong sesaat selagi loader berjalan, sehingga asersi
 * `toHaveCount(0)` bisa lulus SEBELUM mutasi hapusnya selesai — dan langkah
 * berikutnya lalu membaca halaman publik yang masih memuat barisnya. Memuat
 * ulang daftar dari server menjadikan ketiadaan baris itu fakta, bukan tebakan.
 */
/**
 * Ubah status satu baris, lalu PASTIKAN perubahannya sudah tersimpan.
 *
 * Sama seperti `hapusBaris`: menunggu teks status berubah di tabel saja tidak
 * cukup, karena `router.invalidate()` membuat tabel kosong-lalu-terisi dan
 * asersi bisa lulus sebelum mutasinya selesai. Memuat ulang daftar dari server
 * menjadikan status itu fakta sebelum langkah berikutnya membaca halaman publik.
 */
async function ubahStatus(page: Page, baris: Locator, daftar: string, judul: string, jadi: RegExp) {
  await baris.getByRole('button', { name: /terbitkan|^publish$/i }).click()
  await page.goto(`${daftar}?_t=${Date.now()}`, { waitUntil: 'networkidle' })
  await expect(page.getByRole('row').filter({ hasText: judul })).toContainText(jadi, {
    timeout: 15_000,
  })
}

async function hapusBaris(page: Page, baris: Locator, daftar: string, judul: string) {
  await baris.getByRole('button', { name: /^hapus$|^delete$/i }).click()
  await page
    .getByRole('dialog')
    .getByRole('button', { name: /^hapus$|^delete$/i })
    .click()
  await page.goto(`${daftar}?_t=${Date.now()}`, { waitUntil: 'networkidle' })
  await expect(page.getByRole('row').filter({ hasText: judul })).toHaveCount(0, { timeout: 15_000 })
}

test('alur warta: buat draf → terbitkan dengan format bertahan → hapus', async ({
  page,
  request,
}, testInfo) => {
  test.skip(testInfo.project.name !== 'chromium', 'alur admin hanya di chromium')
  test.skip(!EMAIL || !PASSWORD, 'SEED_ADMIN_EMAIL/PASSWORD tidak di-set')
  // Alur panjang: login plus lima langkah dengan banyak navigasi full-page yang
  // masing-masing di-SSR di dev server. Tiap asersi tetap punya timeout sendiri
  // yang ketat, jadi langkah yang benar-benar macet gagal di situ, bukan di sini.
  test.setTimeout(180_000)

  await warm(request, '/api/auth/ok')
  await warm(request, '/admin')
  await warm(request, '/admin/warta/baru')
  await masuk(page)
  await bersihkanSisa(page, '/admin/warta')

  // 1. Buat sebagai draf, isi diketik lewat editor.
  await page.goto('/admin/warta/baru')
  await page.waitForLoadState('networkidle')
  await page.getByLabel(/^minggu$|^week$/i).fill('2019-02-03')
  await page.getByLabel(/judul \(indonesia\)/i).fill(JUDUL)
  await page.getByLabel(/judul \(inggris\)|title \(english\)/i).fill(JUDUL)
  await page.getByLabel(/ringkasan \(indonesia\)/i).fill('Ringkasan uji')
  await page.getByLabel(/ringkasan \(inggris\)|summary \(english\)/i).fill('Test summary')
  await ketikTebal(page, 0, TEBAL)
  await ketikTebal(page, 1, TEBAL)
  await page.getByRole('button', { name: /^simpan$|^save$/i }).click()
  await expect(page).toHaveURL(/\/admin\/warta$/, { timeout: 20_000 })

  // 2. Tampil di dashboard sebagai draf.
  const baris = page.getByRole('row').filter({ hasText: JUDUL })
  await expect(baris).toBeVisible({ timeout: 15_000 })
  await expect(baris).toContainText(/draf|draft/i)

  // 3. TIDAK bocor ke halaman publik.
  await bukaPublik(page, '/warta')
  await expect(page.getByText(JUDUL)).toHaveCount(0)

  // 4. Terbitkan → muncul di publik, dan FORMAT TEBALNYA BERTAHAN.
  await page.goto('/admin/warta')
  await page.waitForLoadState('networkidle')
  await ubahStatus(page, baris, '/admin/warta', JUDUL, /terbit|published/i)

  await bukaPublik(page, '/warta')
  await page
    .getByRole('link', { name: new RegExp(JUDUL) })
    .first()
    .click()
  await expect(page.locator('strong', { hasText: TEBAL }).first()).toBeVisible({ timeout: 15_000 })

  // 5. Hapus → hilang dari keduanya.
  await page.goto('/admin/warta')
  await page.waitForLoadState('networkidle')
  await hapusBaris(page, baris, '/admin/warta', JUDUL)
  await bukaPublik(page, '/warta')
  await expect(page.getByText(JUDUL)).toHaveCount(0, { timeout: 15_000 })
})

test('alur renungan: buat draf → terbitkan dengan format bertahan → hapus', async ({
  page,
  request,
}, testInfo) => {
  test.skip(testInfo.project.name !== 'chromium', 'alur admin hanya di chromium')
  test.skip(!EMAIL || !PASSWORD, 'SEED_ADMIN_EMAIL/PASSWORD tidak di-set')
  test.setTimeout(180_000)

  await warm(request, '/api/auth/ok')
  await warm(request, '/admin')
  await warm(request, '/admin/renungan/baru')
  await masuk(page)
  await bersihkanSisa(page, '/admin/renungan')

  // 1. Buat sebagai draf.
  await page.goto('/admin/renungan/baru')
  await page.waitForLoadState('networkidle')
  await page.getByLabel(/slug url/i).fill(SLUG)
  await page.getByLabel(/judul \(indonesia\)/i).fill(JUDUL)
  await page.getByLabel(/judul \(inggris\)|title \(english\)/i).fill(JUDUL)
  await page.getByLabel(/^penulis$|^author$/i).fill('Tim Uji')
  await page.getByLabel(/tanggal terbit|published date/i).fill('2019-02-03')
  await page.getByLabel(/kutipan \(indonesia\)/i).fill('Kutipan uji')
  await page.getByLabel(/kutipan \(inggris\)|excerpt \(english\)/i).fill('Test excerpt')
  await ketikTebal(page, 0, TEBAL)
  await ketikTebal(page, 1, TEBAL)
  await page.getByRole('button', { name: /^simpan$|^save$/i }).click()
  await expect(page).toHaveURL(/\/admin\/renungan$/, { timeout: 20_000 })

  // 2. Tampil sebagai draf.
  const baris = page.getByRole('row').filter({ hasText: JUDUL })
  await expect(baris).toBeVisible({ timeout: 15_000 })
  await expect(baris).toContainText(/draf|draft/i)

  // 3. TIDAK bocor ke publik.
  await bukaPublik(page, '/renungan')
  await expect(page.getByText(JUDUL)).toHaveCount(0)

  // 4. Terbitkan → muncul di publik dengan format bertahan.
  await page.goto('/admin/renungan')
  await page.waitForLoadState('networkidle')
  await ubahStatus(page, baris, '/admin/renungan', JUDUL, /terbit|published/i)

  await bukaPublik(page, `/renungan/${SLUG}`)
  await expect(page.locator('strong', { hasText: TEBAL }).first()).toBeVisible({ timeout: 15_000 })

  // 5. Hapus → hilang dari keduanya.
  await page.goto('/admin/renungan')
  await page.waitForLoadState('networkidle')
  await hapusBaris(page, baris, '/admin/renungan', JUDUL)
  await bukaPublik(page, '/renungan')
  await expect(page.getByText(JUDUL)).toHaveCount(0, { timeout: 15_000 })
})

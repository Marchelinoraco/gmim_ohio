import { test, expect, type APIRequestContext, type Page } from '@playwright/test'

/**
 * Alur master data end-to-end: pengaturan → halaman publik, warna kategori, dan
 * pesan masuk.
 *
 * Alur pertama yang paling berharga. Ia membuktikan pengaturan tidak sekadar
 * TERSIMPAN tapi juga TERBACA halaman publik — rantai form → validasi tulis →
 * jsonb → validasi baca → render. Tidak ada test lain yang menyentuhnya utuh,
 * dan justru di rantai itulah dua schema yang disalin terpisah akan menyimpang
 * tanpa ketahuan sampai jemaat yang melihat akibatnya.
 *
 * `mode: 'serial'` karena ketiga alur menulis ke database yang sama; berjalan
 * paralel mereka akan saling membaca keadaan setengah jadi.
 *
 * Nilai `contact_info` DIKEMBALIKAN seperti semula di akhir: ini pengaturan
 * sungguhan yang dibaca jemaat, bukan fixture.
 */
test.describe.configure({ mode: 'serial' })

const EMAIL = process.env.SEED_ADMIN_EMAIL
const PASSWORD = process.env.SEED_ADMIN_PASSWORD

/** Penanda unik per run supaya run yang gagal di tengah tidak menjegal run berikutnya. */
const RUN = Date.now()
const NAMA_UJI = `Uji Otomatis ${RUN} — hapus bila tertinggal`
const EMAIL_UJI = `uji-${RUN}@contoh.test`

/**
 * Pemanasan route sebelum dipakai. Hit pertama ke sebuah graf modul di dev
 * server memicu transform on-demand Vite dan bisa melampaui timeout asersi.
 * Pola dan alasannya sama dengan `warmAuthEndpoint` di `admin.spec.ts`.
 */
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
 * Buka halaman dalam keadaan benar-benar segar.
 *
 * Alur ini mengunjungi halaman yang sama berkali-kali sambil mengubah isinya di
 * antara kunjungan, dan `goto` ke URL identik bisa dilayani dari cache navigasi
 * browser sehingga asersi membaca render lama.
 */
async function bukaSegar(page: Page, path: string) {
  const pemisah = path.includes('?') ? '&' : '?'
  await page.goto(`${path}${pemisah}_t=${Date.now()}`, { waitUntil: 'networkidle' })
}

/**
 * Isi field Email di kartu Kontak, simpan, lalu muat ulang DARI SERVER.
 *
 * Menunggu konfirmasi sebelum berpindah itu wajib: tanpa itu `goto` berangkat
 * selagi mutasinya masih di jalan, loader membaca nilai LAMA, dan asersi gagal
 * walau tulisnya sebenarnya berhasil.
 */
function kartuKontak(page: Page) {
  // Ditunjuk lewat JUDUL PERSIS, bukan `hasText: /^kontak/`: `hasText` menguji
  // seluruh teks kartu, dan "Kontak Pastoral" juga diawali "Kontak" — polanya
  // cocok ke dua kartu sekaligus dan strict mode menolak kliknya.
  return page.locator('[data-slot="card"]').filter({ has: page.getByText(/^(Kontak|Contact)$/) })
}

async function simpanEmailKontak(page: Page, nilai: string) {
  const kartu = kartuKontak(page)
  await kartu.getByLabel(/^email$/i).fill(nilai)
  await kartu.getByRole('button', { name: /^simpan$|^save$/i }).click()
  await expect(page.getByRole('status').filter({ hasText: /tersimpan|saved/i })).toBeVisible({
    timeout: 20_000,
  })
  await bukaSegar(page, '/admin/pengaturan')
  await expect(kartuKontak(page).getByLabel(/^email$/i)).toHaveValue(nilai, { timeout: 20_000 })
}

test('pengaturan kontak sampai ke halaman publik', async ({ page, request }, testInfo) => {
  // Project reduced-motion memvalidasi perilaku animasi; halaman ini tidak punya
  // animasi, jadi menjalankannya di sana hanya menggandakan beban tulis ke
  // database tanpa menambah informasi.
  test.skip(testInfo.project.name !== 'chromium', 'alur admin hanya di chromium')
  test.skip(!EMAIL || !PASSWORD, 'SEED_ADMIN_EMAIL/PASSWORD tidak di-set')
  test.setTimeout(180_000)

  await warm(request, '/api/auth/ok')
  await warm(request, '/admin/pengaturan')
  await warm(request, '/kunjungi')
  await masuk(page)

  await bukaSegar(page, '/admin/pengaturan')
  const asli = await kartuKontak(page).getByLabel(/^email$/i).inputValue()

  try {
    await simpanEmailKontak(page, EMAIL_UJI)

    // Inti test ini: pengaturan benar-benar TERBACA halaman publik, bukan hanya
    // tersimpan. `/kunjungi` merendernya sebagai taut mailto:.
    await bukaSegar(page, '/kunjungi')
    await expect(page.getByRole('link', { name: EMAIL_UJI })).toBeVisible({ timeout: 20_000 })
  } finally {
    // Pemulihan MENELAN galatnya sendiri. Kalau ia ikut melempar, Playwright
    // melaporkan galat `finally` dan MENGUBUR kegagalan sesungguhnya di atas —
    // persis yang terjadi saat test ini dibuktikan merah pertama kali, dan
    // jejaknya menunjuk baris pemulihan alih-alih baris yang benar-benar rusak.
    // Keberhasilan pemulihannya diasersi di bawah, di luar blok ini.
    try {
      await bukaSegar(page, '/admin/pengaturan')
      await simpanEmailKontak(page, asli)
    } catch {
      // sengaja diabaikan — lihat alasan di atas
    }
  }

  // Pemulihan benar-benar terjadi. Ini pengaturan sungguhan yang dibaca jemaat,
  // jadi meninggalkannya berubah bukan pilihan.
  await bukaSegar(page, '/admin/pengaturan')
  await expect(kartuKontak(page).getByLabel(/^email$/i)).toHaveValue(asli, { timeout: 20_000 })

  // Dan benar-benar hilang lagi dari publik saat dikosongkan.
  if (asli === '') {
    await bukaSegar(page, '/kunjungi')
    await expect(page.getByRole('link', { name: EMAIL_UJI })).toHaveCount(0)
  }
})

test('warna kategori hanya bisa dipilih dari daftar tertutup', async ({
  page,
  request,
}, testInfo) => {
  test.skip(testInfo.project.name !== 'chromium', 'alur admin hanya di chromium')
  test.skip(!EMAIL || !PASSWORD, 'SEED_ADMIN_EMAIL/PASSWORD tidak di-set')
  test.setTimeout(120_000)

  await warm(request, '/admin/master')
  await masuk(page)
  await bukaSegar(page, '/admin/master')

  // Enam kategori, masing-masing enam pilihan warna.
  const warna = page.getByLabel(/^warna —|^colour —/i)
  await expect(warna).toHaveCount(6, { timeout: 20_000 })
  await expect(warna.first().locator('option')).toHaveCount(6)

  // Tidak ada jalan mengetik hex. Kolom `color` menyimpan NAMA TOKEN CSS supaya
  // badge ikut bertukar warna saat tema berganti; hex di sana memutus tema gelap
  // tanpa error apa pun, jadi yang dijaga di sini adalah ketiadaan jalannya.
  await expect(page.locator('input[type="color"]')).toHaveCount(0)
  for (const nilai of await warna.first().locator('option').evaluateAll((o) =>
    o.map((x) => (x as HTMLOptionElement).value),
  )) {
    expect(nilai).toMatch(/^var\(--color-cat-[a-z-]+\)$/)
  }
})

test('pesan masuk muncul, bisa ditandai, dan bisa dihapus', async ({ page, request }, testInfo) => {
  test.skip(testInfo.project.name !== 'chromium', 'alur admin hanya di chromium')
  test.skip(!EMAIL || !PASSWORD, 'SEED_ADMIN_EMAIL/PASSWORD tidak di-set')
  test.setTimeout(180_000)

  await warm(request, '/kunjungi')
  await warm(request, '/admin/pesan')

  // `contact_messages` kosong, jadi datanya dibuat lewat jalur pengunjung
  // sungguhan. Honeypot `website` DIBIARKAN kosong: mengisinya membuat server
  // diam-diam membuang pesannya (`{ ok: true }` tanpa simpan) dan test akan
  // terlihat gagal tanpa alasan yang jelas.
  await page.goto('/kunjungi')
  await page.waitForLoadState('networkidle')
  await page.getByLabel(/nama/i).first().fill(NAMA_UJI)
  await page.getByLabel(/email/i).first().fill(EMAIL_UJI)
  await page.getByLabel(/telepon|phone/i).first().fill('+1 614 555 0100')
  await page.getByLabel(/pesan|message/i).first().fill(`Isi pesan uji. ${NAMA_UJI}`)
  await page.getByRole('button', { name: /kirim|send/i }).click()
  await expect(page.getByText(/terima kasih|thank you|terkirim|sent/i).first()).toBeVisible({
    timeout: 20_000,
  })

  await masuk(page)
  await bukaSegar(page, '/admin/pesan')

  // Tanpa anchor `^`: teks satu baris tabel dimulai dengan kolom pertama, jadi
  // pola ber-anchor tidak pernah cocok dan asersinya diam-diam tak menguji apa pun.
  const baris = () => page.getByRole('row').filter({ hasText: NAMA_UJI })
  await expect(baris()).toBeVisible({ timeout: 20_000 })
  await expect(baris()).toContainText(/baru|new/i)

  // Muat ulang DARI SERVER sebelum memeriksa: tabel yang diperbarui
  // `router.invalidate()` bisa terbaca sebelum mutasinya tersimpan.
  await baris().getByRole('button', { name: /tandai dibaca|mark as read/i }).click()
  await bukaSegar(page, '/admin/pesan')
  await expect(baris()).toContainText(/dibaca|read/i, { timeout: 20_000 })

  // Pesan panjang dipotong di tabel; jalan membaca penuhnya harus ada.
  await baris().getByRole('button', { name: /baca selengkapnya|read full/i }).click()
  await expect(page.getByRole('dialog')).toContainText(NAMA_UJI, { timeout: 20_000 })
  await page.getByRole('dialog').getByRole('button', { name: /batal|cancel/i }).click()

  // Hapus — data uji tidak boleh tertinggal di kotak masuk pengurus.
  await baris().getByRole('button', { name: /^hapus$|^delete$/i }).click()
  await page
    .getByRole('dialog')
    .getByRole('button', { name: /^hapus$|^delete$/i })
    .click()
  await bukaSegar(page, '/admin/pesan')
  await expect(baris()).toHaveCount(0, { timeout: 20_000 })
})

import { test, expect, type APIRequestContext } from '@playwright/test'

/**
 * Helper untuk memanaskan endpoint auth sebelum form submission.
 *
 * Hit PERTAMA ke `/api/auth/*` pada dev server baru menyala memicu transform
 * on-demand ~1.5 MB (better-auth + drizzle), dan bisa timeout di runner dingin.
 * Pemanasan ini memastikan graf auth siap sebelum test submit form.
 *
 * Pola ini sudah dipakai di auth-smoke.spec.ts; lihat docblock-nya untuk detail.
 * Ini artefak dev server saja — build produksi tidak punya transform on-demand.
 */
async function warmAuthEndpoint(request: APIRequestContext) {
  await expect(async () => {
    const res = await request.get('/api/auth/ok')
    expect(res.status()).toBe(200)
  }).toPass({ timeout: 20_000 })
}

/**
 * Helper untuk memanaskan route `/admin` sebelum navigation setelah login.
 *
 * Hit PERTAMA ke route `/admin` pada dev server baru menyala memicu transform
 * on-demand seluruh graf layoutnya (admin._app + children), dan bisa timeout di
 * runner dingin saat suite penuh berjalan dengan parallelisasi. Pemanasan ini
 * memastikan modul ter-transform sebelum test navigation dimulai.
 *
 * Panggilan tanpa sesi → akan redirect ke `/admin/login` (status 200 + Location),
 * cukup untuk transform; kita tidak butuh render halaman `/admin` itu sendiri.
 *
 * Pemanasan saja TIDAK cukup, dan timeout saja juga tidak — keduanya menangani
 * biaya yang berbeda, dan test ini butuh dua-duanya:
 *   - pemanasan di sini menghapus transform on-demand Vite (hit pertama ke graf
 *     modul admin), yang tidak bisa ditunggu berapa lama pun tanpa membuat test
 *     lambat gagal saat aplikasinya benar-benar rusak;
 *   - timeout longgar di asersi navigasi (lihat test "masuk dengan kredensial
 *     benar") menampung latensi SSR full-page di dev server yang melayani empat
 *     worker sekaligus — biaya yang tetap ada meski modulnya sudah panas.
 *
 * Pola pemanasannya sejalan dengan warmAuthEndpoint() dan docblock
 * auth-smoke.spec.ts.
 *
 * Artefak dev server saja; build produksi tidak punya transform on-demand.
 */
async function warmAdminRoute(request: APIRequestContext) {
  await expect(async () => {
    const res = await request.get('/admin')
    // Tanpa sesi, server redirect ke /admin/login (300-series + Location header).
    // Kita tidak check status = 200, cukup request terselesaikan tanpa timeout.
    expect([200, 300, 301, 302, 303, 307, 308]).toContain(res.status())
  }).toPass({ timeout: 20_000 })
}

/**
 * Gerbang `/admin/*`.
 *
 * Test gerbang `/admin` membuktikan bahwa route tidak dapat diakses tanpa sesi
 * valid. Perlindungannya berlapis: layout pathless `admin._app` mencegah render,
 * dan server fn `ensureAdmin()` di loader mencegah akses langsung ke API. Dual
 * layer ini disengaja — layout untuk UX, server fn untuk keamanan. Test tidak
 * mengisolasi satu lapisan saja (tidak perlu: nilainya tidak sebanding dengan
 * kerumitannya).
 *
 * Rencana berikutnya (3b–3d) akan menambahkan route admin baru (/jadwal, /warta,
 * /galeri, dll). Setiap route baru WAJIB:
 * 1. Dideklarasikan sebagai `admin._app.<nama>.tsx` (anak layout ber-gerbang)
 * 2. Memanggil `ensureAdmin()` di loadernya
 * 3. Ditambahkan ke daftar test gerbang di bawah
 *
 * Kredensial diambil dari env yang sama dengan `pnpm seed:admin`.
 * - **Lokal:** SEED_ADMIN_* ada di .env, test yang butuh sesi JALAN dan membuktikan
 *   alur login lengkap (dari form submit sampai dashboard). Tanpa ini, hanya skip
 *   terlihat seperti cakupan.
 * - **CI:** SEED_ADMIN_* tidak di-set, test yang butuh sesi dilewati dengan sengaja
 *   — gerbang itu sendiri tetap diuji dan tidak boleh rusak (bukan login yang
 *   diuji, tapi gate redirect).
 */
const EMAIL = process.env.SEED_ADMIN_EMAIL
const PASSWORD = process.env.SEED_ADMIN_PASSWORD

// Daftar route admin yang harus dijaga gerbang. Tambahkan path baru saat route
// baru lahir di rencana berikutnya.
for (const path of ['/admin']) {
  test(`${path} tanpa sesi → dialihkan ke /admin/login`, async ({ page }) => {
    await page.goto(path)
    await expect(page).toHaveURL(/\/admin\/login$/)
  })
}

test('/admin/login tidak dijaga — kalau ikut dijaga, redirect-nya jadi loop', async ({ page }) => {
  const res = await page.goto('/admin/login')
  expect(res?.status()).toBe(200)
  await expect(page).toHaveURL(/\/admin\/login$/)
})

test('halaman admin ber-noindex', async ({ page }) => {
  const res = await page.goto('/admin/login')
  const html = (await res?.text()) ?? ''
  expect(html).toMatch(/name="robots"[^>]*content="noindex"/)
})

test('masuk dengan kredensial benar → sampai di dashboard', async ({ page, request }, testInfo) => {
  // Project reduced-motion ada untuk validasi perilaku animasi (hero tidak autoplay, dll).
  // Form login tidak punya animasi — menjalankan alur login di sana tidak menambah
  // informasi, hanya menggandakan beban pada endpoint auth sensitif urutan. Test gerbang
  // yang murah (cek redirect) tetap jalan di kedua project; yang dibatasi hanya
  // sign-in sungguhan.
  test.skip(testInfo.project.name !== 'chromium', 'alur login hanya di chromium')
  test.skip(!EMAIL || !PASSWORD, 'SEED_ADMIN_EMAIL/PASSWORD tidak di-set')

  // Panaskan endpoint auth sebelum submit form. Lihat komentar warmAuthEndpoint.
  await warmAuthEndpoint(request)

  // Panaskan route /admin sebelum navigasi setelah login. Lihat komentar
  // warmAdminRoute — ia menjelaskan pembagian tugas antara pemanasan ini dan
  // timeout longgar di asersi navigasi di bawah.
  await warmAdminRoute(request)

  await page.goto('/admin/login')
  // Tunggu hidrasi selesai sebelum submit. React form handler belum aktif saat
  // SSR selesai — tanpa wait ini, form ter-submit secara native (tidak melalui
  // handler React) dan request tidak pernah terjadi. Pola ini sejalan dengan
  // openThemeMenu di theme.spec.ts, di mana aksi diulang sampai efeknya terlihat.
  await page.waitForLoadState('networkidle')
  await page.getByLabel(/email/i).fill(EMAIL!)
  await page.getByLabel(/kata sandi|password/i).fill(PASSWORD!)
  await page.getByRole('button', { name: /masuk|sign in/i }).click()

  // Navigasi ke /admin: sign-in berhasil, browser mulai SSR render full-page
  // (bukan hidrasi). Di dev server sibuk (4 worker parallel), ini butuh 10–15 detik:
  // - SSR render layout + children + data fetches
  // - Kirim HTML via network
  // - Browser parse + hidrasi React
  // Pemanasan warmAdminRoute() di atas menghapus biaya transform on-demand Vite
  // (~1.5 MB), tapi tidak memperpendek bagian ini. Timeout 15 detik menampung
  // latensi itu. Angka ini hanya relevan di dev dengan transform on-demand —
  // produksi build tidak punya transform on-demand, jadi tidak berlaku di sana.
  await expect(page).toHaveURL(/\/admin$/, { timeout: 15_000 })
  await expect(
    page.getByRole('navigation', { name: /navigasi dashboard|dashboard navigation/i }),
  ).toBeVisible()
})

test('kredensial salah → tetap di halaman masuk dengan pesan galat', async ({
  page,
  request,
}, testInfo) => {
  // Batasi ke chromium saja (lihat komentar di test sebelumnya).
  test.skip(testInfo.project.name !== 'chromium', 'alur login hanya di chromium')

  // Panaskan endpoint auth sebelum submit form. Lihat komentar warmAuthEndpoint.
  await warmAuthEndpoint(request)

  await page.goto('/admin/login')
  // Tunggu hidrasi selesai sebelum submit (lihat komentar di test sebelumnya).
  // Tanpa ini, form ter-submit sebelum React hydrate, handler tidak dipanggil,
  // dan error message tidak muncul.
  await page.waitForLoadState('networkidle')
  await page.getByLabel(/email/i).fill('bukan@siapa-siapa.test')
  await page.getByLabel(/kata sandi|password/i).fill('salah-sekali-123')
  await page.getByRole('button', { name: /masuk|sign in/i }).click()

  await expect(page.getByRole('status')).toContainText(/salah|incorrect/i)
  await expect(page).toHaveURL(/\/admin\/login$/)
})

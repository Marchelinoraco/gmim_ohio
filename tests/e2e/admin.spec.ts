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

test('masuk dengan kredensial benar → sampai di dashboard', async ({ page, request }) => {
  test.skip(!EMAIL || !PASSWORD, 'SEED_ADMIN_EMAIL/PASSWORD tidak di-set')

  // Panaskan endpoint auth sebelum submit form. Lihat komentar warmAuthEndpoint.
  await warmAuthEndpoint(request)

  await page.goto('/admin/login')
  // Tunggu hidrasi selesai sebelum submit. React form handler belum aktif saat
  // SSR selesai — tanpa wait ini, form ter-submit secara native (tidak melalui
  // handler React) dan request tidak pernah terjadi. Pola ini sejalan dengan
  // openThemeMenu di theme.spec.ts, di mana aksi diulang sampai efeknya terlihat.
  await page.waitForLoadState('networkidle')
  await page.getByLabel(/email/i).fill(EMAIL!)
  await page.getByLabel(/kata sandi|password/i).fill(PASSWORD!)
  await page.getByRole('button', { name: /masuk|sign in/i }).click()

  await expect(page).toHaveURL(/\/admin$/)
  await expect(page.getByRole('navigation', { name: /navigasi dashboard|dashboard navigation/i })).toBeVisible()
})

test('kredensial salah → tetap di halaman masuk dengan pesan galat', async ({ page, request }) => {
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

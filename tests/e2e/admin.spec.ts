import { test, expect } from '@playwright/test'

/**
 * Gerbang `/admin/*`.
 *
 * Test pertama adalah yang paling penting di file ini: ia gagal begitu sebuah
 * halaman admin baru diletakkan di luar pathless layout `admin._app`, yang
 * membuat gerbangnya bocor tanpa gejala lain apa pun.
 *
 * Kredensial diambil dari env yang sama dengan `pnpm seed:admin`. Di CI keduanya
 * tidak di-set, jadi test yang butuh sesi dilewati — gerbangnya sendiri tetap
 * diuji, dan itu bagian yang tak boleh rusak.
 */
const EMAIL = process.env.SEED_ADMIN_EMAIL
const PASSWORD = process.env.SEED_ADMIN_PASSWORD

for (const path of ['/admin', '/admin/jadwal', '/admin/warta', '/admin/galeri']) {
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

test('masuk dengan kredensial benar → sampai di dashboard', async ({ page }) => {
  test.skip(!EMAIL || !PASSWORD, 'SEED_ADMIN_EMAIL/PASSWORD tidak di-set')

  await page.goto('/admin/login')
  await page.getByLabel(/email/i).fill(EMAIL!)
  await page.getByLabel(/kata sandi|password/i).fill(PASSWORD!)
  await page.getByRole('button', { name: /masuk|sign in/i }).click()

  await expect(page).toHaveURL(/\/admin$/)
  await expect(page.getByRole('navigation', { name: /navigasi dashboard|dashboard navigation/i })).toBeVisible()
})

test('kredensial salah → tetap di halaman masuk dengan pesan galat', async ({ page }) => {
  await page.goto('/admin/login')
  await page.getByLabel(/email/i).fill('bukan@siapa-siapa.test')
  await page.getByLabel(/kata sandi|password/i).fill('salah-sekali-123')
  await page.getByRole('button', { name: /masuk|sign in/i }).click()

  await expect(page.getByRole('status')).toContainText(/salah|incorrect/i)
  await expect(page).toHaveURL(/\/admin\/login$/)
})

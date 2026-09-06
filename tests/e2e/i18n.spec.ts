import { test, expect } from '@playwright/test'

// Konten hero Beranda dari `DEFAULT_SETTINGS.hero` (`src/db/seed/settings.ts`).
const HERO_TITLE_ID = 'Selamat Datang di GMIM Musafir Columbus Ohio'
const HERO_TITLE_EN = 'Welcome to GMIM Musafir Columbus Ohio'
const HERO_TAGLINE_ID = 'Bertumbuh bersama dalam kasih Kristus di perantauan.'
const HERO_TAGLINE_EN = 'Growing together in the love of Christ.'

test('beranda id menampilkan teks Indonesia', async ({ page }) => {
  await page.goto('/')
  await expect(page.locator('h1')).toContainText(HERO_TITLE_ID)
  await expect(page.getByText(HERO_TAGLINE_ID)).toBeVisible()
})

test('beranda /en menampilkan teks Inggris', async ({ page }) => {
  await page.goto('/en')
  await expect(page.locator('h1')).toContainText(HERO_TITLE_EN)
  await expect(page.getByText(HERO_TAGLINE_EN)).toBeVisible()
})

test('language switcher pindah ke /en', async ({ page }) => {
  await page.goto('/')
  // Sejak Task 6 ada LanguageSwitcher di header DAN footer — scope ke header.
  await page.getByRole('banner').getByRole('link', { name: 'EN — English' }).click()
  await expect(page).toHaveURL(/\/en$/)
  await expect(page.getByText(HERO_TAGLINE_EN)).toBeVisible()
})

test('dari /en bisa balik ke Indonesia (tidak terjebak cookie)', async ({ page }) => {
  await page.goto('/en')
  await expect(page.getByText(HERO_TAGLINE_EN)).toBeVisible()
  // Klik pemilih bahasa Indonesia — harus sampai di / dengan konten id, tanpa 307
  // balik ke /en. Nama aksesibelnya memuat kode yang terlihat ("ID") demi WCAG
  // 2.5.3 Label in Name; teksnya sendiri ringkas supaya header tak meluap.
  await page.getByRole('banner').getByRole('link', { name: 'ID — Bahasa Indonesia' }).click()
  await expect(page).toHaveURL(/localhost:\d+\/$/)
  await expect(page.getByText(HERO_TAGLINE_ID)).toBeVisible()
  // Muat ulang / lagi — tetap Indonesia (tidak ada cookie yang membelokkan).
  await page.reload()
  await expect(page).toHaveURL(/localhost:\d+\/$/)
  await expect(page.getByText(HERO_TAGLINE_ID)).toBeVisible()
})

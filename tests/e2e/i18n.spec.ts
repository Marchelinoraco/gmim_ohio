import { test, expect } from '@playwright/test'

const BODY_ID = 'Website resmi jemaat sedang dalam pembangunan. Segera hadir.'
const BODY_EN = "The congregation's official website is under construction. Coming soon."

test('beranda id menampilkan teks Indonesia', async ({ page }) => {
  await page.goto('/')
  await expect(page.locator('h1')).toContainText('GMIM Musafir Columbus Ohio')
  await expect(page.getByText(BODY_ID)).toBeVisible()
})

test('beranda /en menampilkan teks Inggris', async ({ page }) => {
  await page.goto('/en')
  await expect(page.getByText(BODY_EN)).toBeVisible()
})

test('language switcher pindah ke /en', async ({ page }) => {
  await page.goto('/')
  // Sejak Task 6 ada LanguageSwitcher di header DAN footer — scope ke header.
  await page.getByRole('banner').getByRole('link', { name: 'English' }).click()
  await expect(page).toHaveURL(/\/en$/)
  await expect(page.getByText(BODY_EN)).toBeVisible()
})

test('dari /en bisa balik ke Indonesia (tidak terjebak cookie)', async ({ page }) => {
  await page.goto('/en')
  await expect(page.getByText(BODY_EN)).toBeVisible()
  // Klik "Indonesia" — harus sampai di / dengan konten id, tanpa 307 balik ke /en.
  await page.getByRole('banner').getByRole('link', { name: 'Indonesia' }).click()
  await expect(page).toHaveURL(/localhost:\d+\/$/)
  await expect(page.getByText(BODY_ID)).toBeVisible()
  // Muat ulang / lagi — tetap Indonesia (tidak ada cookie yang membelokkan).
  await page.reload()
  await expect(page).toHaveURL(/localhost:\d+\/$/)
  await expect(page.getByText(BODY_ID)).toBeVisible()
})

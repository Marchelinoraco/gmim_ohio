import { test, expect } from '@playwright/test'

test('beranda id menampilkan teks Indonesia', async ({ page }) => {
  await page.goto('/')
  await expect(page.locator('h1')).toContainText('GMIM Musafir Columbus Ohio')
  await expect(page.getByText('Situs dalam pembangunan.')).toBeVisible()
})

test('beranda /en menampilkan teks Inggris', async ({ page }) => {
  await page.goto('/en')
  await expect(page.getByText('Site under construction.')).toBeVisible()
})

test('language switcher pindah ke /en', async ({ page }) => {
  await page.goto('/')
  // Sejak Task 6 ada LanguageSwitcher di header DAN footer — scope ke header.
  await page.getByRole('banner').getByRole('link', { name: 'English' }).click()
  await expect(page).toHaveURL(/\/en$/)
  await expect(page.getByText('Site under construction.')).toBeVisible()
})

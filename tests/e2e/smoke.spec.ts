import { test, expect } from '@playwright/test'

test('header & footer tampil di beranda', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('banner')).toBeVisible()
  await expect(page.getByRole('contentinfo')).toBeVisible()
  await expect(page.getByRole('contentinfo')).toContainText('895 Old Diley Road')
})

test('mode coming-soon: nav utama 7-menu disembunyikan', async ({ page }) => {
  await page.goto('/')
  // Task 8c: sampai Rencana 2 mengisi route asli, nav 7-menu tidak dirender.
  await expect(page.getByRole('navigation', { name: /menu|navigasi/i })).toHaveCount(0)
})

test('halaman tak dikenal menampilkan 404', async ({ page }) => {
  const res = await page.goto('/tidak-ada-halaman-ini')
  expect(res?.status()).toBe(404)
})

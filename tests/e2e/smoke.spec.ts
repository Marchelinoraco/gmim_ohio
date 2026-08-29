import { test, expect } from '@playwright/test'

test('header & footer tampil di beranda', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('banner')).toBeVisible()
  await expect(page.getByRole('contentinfo')).toContainText('895 Old Diley Road')
  await expect(page.getByRole('navigation', { name: /menu|navigasi/i })).toBeVisible()
})

test('halaman tak dikenal menampilkan 404', async ({ page }) => {
  const res = await page.goto('/tidak-ada-halaman-ini')
  expect(res?.status()).toBe(404)
})

import { test, expect } from '@playwright/test'

test('header & footer tampil di beranda', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('banner')).toBeVisible()
  await expect(page.getByRole('contentinfo')).toBeVisible()
  await expect(page.getByRole('contentinfo')).toContainText('895 Old Diley Road')
})

/**
 * Pengganti POSITIF untuk test "nav 7-menu disembunyikan" yang hilang saat
 * peluncuran (`SITE.comingSoon = false`) tanpa penggantinya — tanpa ini nav
 * header bisa lenyap total tanpa satu test pun merah.
 *
 * Nav desktop selalu ada di DOM dan tampil sejak breakpoint `lg`
 * (`site-header.tsx`); viewport default Playwright 1280px sudah melewatinya.
 * Panel mobile hanya dirender saat hamburger dibuka, jadi di viewport ini
 * `<nav aria-label="Navigasi">` (pesan `nav_menu_label`) tepat satu — tak perlu
 * scope tambahan untuk menghindari strict-mode.
 */
test('header merender tujuh tautan nav', async ({ page }) => {
  await page.goto('/')
  const nav = page.getByRole('banner').getByRole('navigation', { name: 'Navigasi' })
  await expect(nav).toBeVisible()
  await expect(nav.getByRole('link')).toHaveCount(7)
})

test('halaman tak dikenal menampilkan 404', async ({ page }) => {
  const res = await page.goto('/tidak-ada-halaman-ini')
  expect(res?.status()).toBe(404)
})

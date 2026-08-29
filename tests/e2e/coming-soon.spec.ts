import { test, expect } from '@playwright/test'

const SITE_NAME = 'GMIM Musafir Columbus Ohio'
const ADDRESS = '895 Old Diley Road, Columbus, Ohio'
const BODY_ID = 'Website resmi jemaat sedang dalam pembangunan. Segera hadir.'
const BODY_EN = "The congregation's official website is under construction. Coming soon."

test('/ merender hero coming-soon (nama, alamat, pesan)', async ({ page }) => {
  await page.goto('/')
  await expect(page.locator('h1')).toHaveText(SITE_NAME)
  await expect(page.getByText(BODY_ID)).toBeVisible()
  await expect(page.getByRole('main')).toContainText(ADDRESS)
})

test('/ menyembunyikan nav 7-menu', async ({ page }) => {
  await page.goto('/')
  await expect(
    page.getByRole('link', { name: /jadwal|pelayanan|kunjungi|galeri|warta/i }),
  ).toHaveCount(0)
  await expect(page.getByRole('navigation', { name: /menu|navigasi/i })).toHaveCount(0)
})

test('/ punya video hero + tombol kontrol suara', async ({ page }) => {
  await page.goto('/')
  await expect(page.locator('video')).toHaveCount(1)
  await expect(page.locator('video')).toHaveAttribute('poster', '/hero/hero-poster.jpg')
  await expect(page.getByRole('button', { name: /nyalakan suara|matikan suara/i })).toBeVisible()
})

test('/ tetap punya header + footer', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('banner')).toBeVisible()
  await expect(page.getByRole('contentinfo')).toContainText(ADDRESS)
  // Kontrol tema & bahasa tetap ada di header coming-soon.
  await expect(page.getByRole('banner').getByRole('button', { name: /ganti tema/i })).toBeVisible()
})

test('/en merender versi Inggris', async ({ page }) => {
  await page.goto('/en')
  await expect(page.locator('h1')).toHaveText(SITE_NAME)
  await expect(page.getByText(BODY_EN)).toBeVisible()
})

test('tombol Facebook menunjuk ke halaman FB jemaat', async ({ page }) => {
  await page.goto('/')
  const fb = page.getByRole('main').getByRole('link', { name: /facebook/i })
  await expect(fb).toHaveAttribute('href', 'https://www.facebook.com/gmimmusafir.columbus/')
  await expect(fb).toHaveAttribute('target', '_blank')
})

test('tombol suara meng-unmute video (motion normal)', async ({ page }) => {
  await page.goto('/')
  const video = page.locator('video')
  const soundBtn = page.getByRole('button', { name: /nyalakan suara|matikan suara/i })

  await expect(soundBtn).toBeVisible()
  await expect.poll(() => video.evaluate((v: HTMLVideoElement) => v.muted)).toBe(true)
  await expect(soundBtn).toHaveAttribute('aria-pressed', 'false')

  // Klik bisa terjadi sebelum React hydrate handler — ulang sampai muted lepas
  // (klik pertama yang berhasil langsung menghentikan retry, jadi tak ada
  // toggle balik).
  await expect(async () => {
    await soundBtn.click()
    expect(await video.evaluate((v: HTMLVideoElement) => v.muted)).toBe(false)
  }).toPass()

  await expect(page.getByRole('button', { name: /matikan suara/i })).toHaveAttribute(
    'aria-pressed',
    'true',
  )
})

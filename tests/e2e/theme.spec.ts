import { test, expect, type Page } from '@playwright/test'

const DARK_BG = 'rgb(22, 18, 33)' // #161221
const LIGHT_BG = 'rgb(255, 255, 255)' // #ffffff

const bodyBg = (page: Page) => page.evaluate(() => getComputedStyle(document.body).backgroundColor)

// Klik tombol toggle bisa hilang jika terjadi sebelum React hydrate (HTML SSR
// sudah terlihat lebih dulu). Poll: klik hanya bila menu belum terbuka, ulangi
// sampai menu muncul.
async function openThemeMenu(page: Page) {
  const button = page.getByRole('button', { name: /ganti tema|toggle theme/i })
  await expect(button).toBeVisible()
  await expect(async () => {
    if (!(await page.getByRole('menu').isVisible())) {
      await button.click({ timeout: 1000 })
    }
    await expect(page.getByRole('menu')).toBeVisible({ timeout: 1000 })
  }).toPass({ timeout: 15000 })
}

async function chooseTheme(page: Page, name: RegExp) {
  await openThemeMenu(page)
  await page.getByRole('menuitemradio', { name }).click()
  await expect(page.getByRole('menu')).toBeHidden()
}

test('anti-flash: skrip tema inline muncul di <head> sebelum <link> app.css', async ({ page }) => {
  const res = await page.goto('/')
  const html = (await res?.text()) ?? ''
  const headEnd = html.indexOf('</head>')
  const scriptAt = html.indexOf("localStorage.getItem('gmim-theme')")
  // stylesheet pembawa palet — /src/styles/app.css (dev) atau /assets/app-*.css (prod)
  const appCssAt = html.search(/<link[^>]+href="[^"]*\/(?:src\/styles\/|assets\/)app[^"]*\.css"/)
  expect(scriptAt).toBeGreaterThan(-1)
  expect(appCssAt).toBeGreaterThan(-1)
  expect(scriptAt).toBeLessThan(headEnd) // di dalam <head>
  expect(scriptAt).toBeLessThan(appCssAt) // sebelum stylesheet palet
})

test('default mengikuti OS dark tanpa preferensi tersimpan (tak ada data-theme)', async ({
  browser,
}) => {
  const ctx = await browser.newContext({ colorScheme: 'dark' })
  const page = await ctx.newPage()
  await page.goto('/')
  expect(await page.locator('html').getAttribute('data-theme')).toBeNull()
  expect(await bodyBg(page)).toBe(DARK_BG)
  await ctx.close()
})

test('default light saat OS light', async ({ browser }) => {
  const ctx = await browser.newContext({ colorScheme: 'light' })
  const page = await ctx.newPage()
  await page.goto('/')
  expect(await page.locator('html').getAttribute('data-theme')).toBeNull()
  expect(await bodyBg(page)).toBe(LIGHT_BG)
  await ctx.close()
})

test('pilih "Gelap": tersimpan di localStorage & bertahan setelah reload', async ({ page }) => {
  await page.goto('/')
  await chooseTheme(page, /gelap|dark/i)

  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')
  expect(await page.evaluate(() => localStorage.getItem('gmim-theme'))).toBe('dark')
  expect(await bodyBg(page)).toBe(DARK_BG)

  await page.reload()
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')
  expect(await bodyBg(page)).toBe(DARK_BG)
})

test('pilih "Terang" mengalahkan OS dark & bertahan reload', async ({ browser }) => {
  const ctx = await browser.newContext({ colorScheme: 'dark' })
  const page = await ctx.newPage()
  await page.goto('/')
  await chooseTheme(page, /terang|light/i)

  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light')
  await page.reload()
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light')
  expect(await bodyBg(page)).toBe(LIGHT_BG)
  await ctx.close()
})

test('kembali ke "Ikuti sistem" menghapus data-theme', async ({ page }) => {
  await page.goto('/')
  await chooseTheme(page, /gelap|dark/i)
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')

  await chooseTheme(page, /ikuti sistem|system/i)
  expect(await page.locator('html').getAttribute('data-theme')).toBeNull()
  expect(await page.evaluate(() => localStorage.getItem('gmim-theme'))).toBe('system')
})

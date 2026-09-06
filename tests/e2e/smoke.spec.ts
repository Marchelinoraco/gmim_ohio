import { test, expect, type Page } from '@playwright/test'

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

/**
 * Header overlay — invarian yang paling mudah rusak dari penyegaran visual.
 *
 * Header hanya boleh transparan di BERANDA, satu-satunya halaman dengan media
 * full-bleed di belakangnya. Kalau kondisi `isHome` di `useOverlayHeader()`
 * melebar (mis. jadi `pathname.startsWith('/')`), halaman lain mendapat header
 * transparan berteks putih di atas latar putih — tak terbaca sama sekali, dan
 * tanpa test ini tak ada yang merah.
 *
 * Latar diuji lewat `getComputedStyle`, bukan nama class: yang dijaga adalah
 * hasil yang dilihat pengunjung, bukan cara Tailwind menuliskannya.
 */
const headerBg = (page: Page) =>
  page.getByRole('banner').evaluate((el) => getComputedStyle(el).backgroundColor)

const TRANSPARENT = 'rgba(0, 0, 0, 0)'

test('beranda: header transparan di puncak, memadat jadi solid setelah digulir', async ({
  page,
}) => {
  await page.goto('/')
  await expect.poll(() => headerBg(page)).toBe(TRANSPARENT)

  // Scroll DIULANG tiap poll, bukan sekali di luar: scroll restoration router
  // mengembalikan posisi ke 0 saat hidrasi, jadi satu `scrollTo()` yang mendarat
  // sebelum hidrasi akan terhapus dan header tak pernah memadat. Mengulanginya
  // membuat asersi menunggu hidrasi tanpa `waitForTimeout` yang rapuh — pola
  // retry yang sama dipakai `openThemeMenu` di `theme.spec.ts`.
  await expect
    .poll(async () => {
      await page.evaluate(() => window.scrollTo(0, 400))
      return headerBg(page)
    })
    .not.toBe(TRANSPARENT)

  // ...dan kembali transparan saat digulir balik ke puncak.
  await page.evaluate(() => window.scrollTo(0, 0))
  await expect.poll(() => headerBg(page)).toBe(TRANSPARENT)
})

test('beranda /en juga overlay — kondisi isHome mengenali varian ber-locale', async ({ page }) => {
  await page.goto('/en')
  await expect.poll(() => headerBg(page)).toBe(TRANSPARENT)
})

for (const path of ['/tentang', '/jadwal', '/galeri']) {
  test(`${path}: header solid sejak puncak — overlay TIDAK bocor ke luar beranda`, async ({
    page,
  }) => {
    await page.goto(path)
    await expect.poll(() => headerBg(page)).not.toBe(TRANSPARENT)
  })
}

/**
 * Dua regresi panel nav mobile, keduanya lahir dari header `fixed` di beranda.
 *
 * 1. Overlay harus batal saat panel terbuka — kalau tidak, baris brand tetap
 *    transparan di atas video sementara daftar nav di bawahnya solid.
 * 2. Panel harus bisa digulir sendiri. Karena headernya `fixed`, isi yang
 *    melimpah keluar layar TIDAK bisa dijangkau dengan menggulir halaman: pada
 *    ponsel landscape tombol "Persembahan" terukur di y≈497 pada viewport 380px
 *    dan tetap di situ setelah `scrollTo(0, 600)`.
 */
test('beranda mobile: membuka menu memadatkan header (brand tak melayang di atas hero)', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/')
  await expect.poll(() => headerBg(page)).toBe(TRANSPARENT)

  const panel = page.locator('#primary-nav-mobile')
  const burger = page.getByRole('button', { name: /buka atau tutup menu|toggle menu/i })
  await expect(async () => {
    if (!(await panel.isVisible())) await burger.click({ timeout: 1000 })
    await expect(panel).toBeVisible({ timeout: 1000 })
  }).toPass({ timeout: 15000 })

  await expect.poll(() => headerBg(page)).not.toBe(TRANSPARENT)
})

test('beranda landscape: seluruh isi panel nav tetap bisa ditekan', async ({ page }) => {
  await page.setViewportSize({ width: 700, height: 380 })
  await page.goto('/')

  const panel = page.locator('#primary-nav-mobile')
  const burger = page.getByRole('button', { name: /buka atau tutup menu|toggle menu/i })
  await expect(async () => {
    if (!(await panel.isVisible())) await burger.click({ timeout: 1000 })
    await expect(panel).toBeVisible({ timeout: 1000 })
  }).toPass({ timeout: 15000 })

  // "Persembahan" adalah item TERBAWAH kedua panel dan yang pertama jatuh keluar
  // layar. Klik-nya sengaja tidak diganti asersi geometri: Playwright menggulir
  // elemen ke dalam view lebih dulu, jadi klik yang berhasil membuktikan panelnya
  // benar-benar bisa digulir — bukan sekadar punya properti CSS tertentu.
  await panel.getByRole('link', { name: /persembahan/i }).click()
  await expect(page).toHaveURL(/\/persembahan$/)
})

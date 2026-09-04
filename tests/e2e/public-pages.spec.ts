import { test, expect, type Page } from '@playwright/test'

/**
 * e2e halaman publik Rencana 2a — jalan di kedua project Playwright
 * (`chromium` + `reduced-motion`).
 *
 * Cakupan:
 *  1. Tabel 8 route publik — 200, tepat satu `<h1>` non-kosong, `<html lang="id">`;
 *     lalu varian `/en/...` — 200 + `<html lang="en">`.
 *  2. `/warta` daftar → detail — klik kartu pertama, URL jadi `/warta/<uuid>`,
 *     body tersanitasi (`.prose-gmim`) tampil dengan heading seed yang dikenal.
 *  3. `/galeri/<id>` lightbox — buka album, klik tile pertama, dialog Radix
 *     muncul, ArrowRight maju ke gambar berikutnya, Escape menutup. Satu-satunya
 *     komponen interaktif di rencana ini yang belum punya cakupan e2e.
 *  4. `/kunjungi` form kontak — JALUR HONEYPOT (RULING): isi field valid + isi
 *     honeypot `website` tersembunyi, submit, harap pesan sukses. Ini menggerakkan
 *     round-trip klien→server→klien penuh tapi menulis NOL baris ke Neon dev dan
 *     memakai NOL jatah rate-limit — CI kalau tidak akan menumpuk baris sampah
 *     dan akhirnya me-rate-limit dirinya sendiri. Jalur tulis sungguhan sudah
 *     diverifikasi manual: `task-12-report.md` mencatat `contact_messages` 0→3
 *     dengan id baris, submisi ke-4 kena rate-limit, baris uji lalu dihapus.
 *  5. `/sitemap.xml` — 200, content-type xml, memuat `<loc>` home + namespace
 *     `xhtml`. Meng-assert BENTUK coming-soon (home saja): per RULING 2, selama
 *     `SITE.comingSoon` true daftar lengkap TIDAK dipancarkan. Rencana 2b yang
 *     memperluas assertion ini saat flag dibalik.
 *
 * RULING 1: TIDAK ada assertion 404 untuk `/tokens` atau `/beranda`.
 * `playwright.config.ts` menjalankan `webServer: { command: 'pnpm dev' }`, jadi
 * e2e mengeksekusi terhadap server DEV — di sana `import.meta.env.PROD` bernilai
 * `false` sehingga `/tokens` dan `/beranda` sengaja mengembalikan 200. Gerbang
 * PROD (`beforeLoad` melempar `notFound()`) TIDAK bisa dilatih di bawah
 * `pnpm dev`; verifikasinya = inspeksi kode + bukti collapse build di
 * `task-14-report.md`. Membangun test yang men-grep bundle di sini rapuh dan
 * tak sepadan — sengaja tidak dilakukan.
 */

// 8 route publik yang dibangun Rencana 2a. `/beranda` (file `_dev.beranda.tsx`,
// URL `/beranda` — `_dev` segmen layout pathless) memberi `<Beranda>` cakupan
// e2e selama `SITE.comingSoon` masih `true`.
const PUBLIC_PATHS = [
  '/tentang',
  '/warta',
  '/renungan',
  '/galeri',
  '/kunjungi',
  '/persembahan',
  '/ibadah-live',
  '/beranda',
] as const

for (const path of PUBLIC_PATHS) {
  test(`${path} — 200, satu <h1> non-kosong, <html lang="id">`, async ({ page }) => {
    const res = await page.goto(path)
    expect(res?.status()).toBe(200)
    await expect(page.locator('html')).toHaveAttribute('lang', 'id')
    const h1 = page.locator('h1')
    await expect(h1).toHaveCount(1)
    await expect(h1).not.toBeEmpty()
  })

  test(`/en${path} — 200, satu <h1> non-kosong, <html lang="en">`, async ({ page }) => {
    const res = await page.goto(`/en${path}`)
    expect(res?.status()).toBe(200)
    await expect(page.locator('html')).toHaveAttribute('lang', 'en')
    const h1 = page.locator('h1')
    await expect(h1).toHaveCount(1)
    // Tangkap heading kosong / belum diterjemahkan di sisi en juga.
    await expect(h1).not.toBeEmpty()
  })
}

const UUID = '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}'

test('/warta: klik kartu pertama → /warta/<uuid> + body tersanitasi tampil', async ({ page }) => {
  await page.goto('/warta')

  // Kartu = <Link to="/warta/$id"> → <a href="/warta/<uuid>">. Link "Kembali"
  // di detail ber-href "/warta" (tanpa slash) jadi tak cocok `^="/warta/"`.
  const firstCard = page.locator('main a[href^="/warta/"]').first()
  await expect(firstCard).toBeVisible()
  await firstCard.click()

  await expect(page).toHaveURL(new RegExp(`/warta/${UUID}$`))

  const prose = page.locator('.prose-gmim')
  await expect(prose).toBeVisible()
  await expect(prose).not.toBeEmpty()
  // Daftar diurut `weekDate` desc → kartu pertama = warta 2026-08-30, yang
  // body seed-nya diawali <h2>Tema Ibadah: Hidup dalam Syukur</h2>.
  await expect(prose.getByText('Tema Ibadah: Hidup dalam Syukur')).toBeVisible()
})

test('/galeri: album → tile pertama buka lightbox, ArrowRight maju, Escape tutup', async ({
  page,
}) => {
  await page.goto('/galeri')

  const albumLink = page.locator('main a[href^="/galeri/"]').first()
  await expect(albumLink).toBeVisible()
  await albumLink.click()
  await expect(page).toHaveURL(new RegExp(`/galeri/${UUID}$`))

  // Tile foto = <button> membungkus <img alt="<caption>">. Caption seed item 0.
  const firstTile = page.getByRole('button', { name: 'Ibadah Minggu di gedung gereja' })
  await expect(firstTile).toBeVisible()

  // Buka lightbox — klik bisa mendahului hidrasi handler onClick — ulang sampai
  // dialog muncul (pola anti-flake `theme.spec.ts` `openThemeMenu`).
  const dialog = page.getByRole('dialog')
  await expect(async () => {
    if (!(await dialog.isVisible())) await firstTile.click({ timeout: 1000 })
    await expect(dialog).toBeVisible({ timeout: 1000 })
  }).toPass({ timeout: 15000 })

  // Gambar aktif = item 0 (tile pertama → index 0).
  await expect(dialog.getByRole('img', { name: 'Ibadah Minggu di gedung gereja' })).toBeVisible()

  // ArrowRight → item 1. `<Lightbox>` memasang listener `keydown` window-level di
  // `useEffect`, jadi ada jendela di mana dialog sudah terlihat tapi listener
  // belum terpasang → tekan pertama tertelan. `ArrowRight` TIDAK idempoten, jadi
  // tiap percobaan retry harus mulai dari state diketahui: tutup dulu, buka lagi
  // (selalu balik ke index 0), baru tekan.
  await expect(async () => {
    await page.keyboard.press('Escape')
    await expect(dialog).toBeHidden({ timeout: 1000 })
    await firstTile.click()
    await expect(dialog).toBeVisible({ timeout: 1000 })
    await page.keyboard.press('ArrowRight')
    await expect(dialog.getByText('2 / 3')).toBeVisible({ timeout: 1000 })
  }).toPass({ timeout: 15000 })
  await expect(dialog.getByRole('img', { name: 'Ramah tamah jemaat seusai ibadah' })).toBeVisible()

  // Escape ditangani Radix Dialog → tutup.
  await page.keyboard.press('Escape')
  await expect(dialog).toBeHidden()
})

const CONTACT_SUCCESS_ID = 'Terima kasih. Pesan Anda sudah kami terima dan akan segera kami balas.'

/**
 * Isi input honeypot `website` yang `display:none`. `.fill()` menolak elemen
 * tersembunyi, dan menyetel `.value` mentah tak memicu onChange React — jadi
 * pakai native value setter + event `input` yang menggelembung (teknik baku
 * untuk controlled input React).
 */
async function fillHoneypot(page: Page, value: string) {
  await page.locator('input[name="website"]').evaluate((el, v) => {
    const input = el as HTMLInputElement
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set
    setter?.call(input, v)
    input.dispatchEvent(new Event('input', { bubbles: true }))
  }, value)
}

test('/kunjungi: form kontak jalur honeypot → pesan sukses (nol baris DB)', async ({ page }) => {
  await page.goto('/kunjungi')

  // Round-trip form perlu hidrasi (tanpa JS, submit = POST native → reload, bukan
  // pesan sukses). Hidrasi juga bisa menimpa field yang diisi sebelum React
  // mengambil alih controlled input. Ulang seluruh alur sampai sukses tampil —
  // jalur honeypot idempoten: nol baris DB, nol jatah rate-limit, jadi mengulang
  // aman.
  await expect(async () => {
    await page.getByLabel(/nama/i).fill('Uji Playwright E2E')
    await page.getByLabel(/email/i).fill('uji-e2e-honeypot@example.com')
    await page.getByLabel(/pesan/i).fill('Pesan uji e2e untuk memicu jalur honeypot.')
    await fillHoneypot(page, 'https://spam.example/')
    await page.getByRole('button', { name: /^kirim$/i }).click()
    await expect(page.getByText(CONTACT_SUCCESS_ID)).toBeVisible({ timeout: 2000 })
  }).toPass({ timeout: 20000 })
})

test('/sitemap.xml: 200, content-type xml, bentuk coming-soon (home saja)', async ({ page }) => {
  const res = await page.goto('/sitemap.xml')
  expect(res?.status()).toBe(200)
  expect(res?.headers()['content-type']).toContain('xml')

  const body = (await res?.text()) ?? ''
  expect(body).toContain('<loc>https://gmimmusafir.org</loc>')
  expect(body).toContain('xmlns:xhtml="http://www.w3.org/1999/xhtml"')

  // RULING 2: selama SITE.comingSoon true, hanya home yang dipancarkan.
  // TODO(2b): saat flag dibalik, perluas ke <loc>…/tentang</loc>, /warta, dst.
  expect(body).not.toContain('/tentang')
  expect((body.match(/<loc>/g) ?? []).length).toBe(1)
})

import { test, expect, type Page } from '@playwright/test'

/**
 * e2e halaman publik — jalan di kedua project Playwright (`chromium` +
 * `reduced-motion`).
 *
 * Cakupan:
 *  1. Tabel 10 route publik — 200, tepat satu `<h1>` non-kosong, `<html lang="id">`;
 *     lalu varian `/en/...` — 200 + `<html lang="en">`.
 *  2. `/` hero video (`<HeroMedia>`, komponen BERSAMA dipakai `<Beranda>`) —
 *     markup SSR tanpa atribut `autoplay`; di project `reduced-motion`, video
 *     tetap di poster (tak diputar). Cakupan ini dulu ada di
 *     `coming-soon.spec.ts` (dihapus bersama flag `SITE.comingSoon`) — invarian
 *     `<HeroMedia>`-nya sendiri generik dan masih berlaku penuh di `<Beranda>`,
 *     jadi diporting ke sini alih-alih ikut terbuang bersama file lama.
 *  3. `/warta` daftar → detail — klik kartu pertama, URL jadi `/warta/<uuid>`,
 *     body tersanitasi (`.prose-gmim`) tampil dengan heading seed yang dikenal.
 *  4. `/galeri/<id>` lightbox — buka album, klik tile pertama, dialog Radix
 *     muncul, ArrowRight maju ke gambar berikutnya, Escape menutup. Satu-satunya
 *     komponen interaktif di rencana ini yang belum punya cakupan e2e.
 *  5. `/kunjungi` form kontak — JALUR HONEYPOT (RULING): isi field valid + isi
 *     honeypot `website` tersembunyi, submit, harap pesan sukses. Ini menggerakkan
 *     round-trip klien→server→klien penuh tapi menulis NOL baris ke Neon dev dan
 *     memakai NOL jatah rate-limit — CI kalau tidak akan menumpuk baris sampah
 *     dan akhirnya me-rate-limit dirinya sendiri. Jalur tulis sungguhan sudah
 *     diverifikasi manual: `task-12-report.md` mencatat `contact_messages` 0→3
 *     dengan id baris, submisi ke-4 kena rate-limit, baris uji lalu dihapus.
 *  6. `/sitemap.xml` — 200, content-type xml, memuat daftar lengkap path publik
 *     (statis + entri dinamis warta/renungan/galeri/jadwal) + namespace `xhtml`.
 *
 * RULING 1: TIDAK ada assertion 404 untuk `/tokens`. `playwright.config.ts`
 * menjalankan `webServer: { command: 'pnpm dev' }`, jadi e2e mengeksekusi
 * terhadap server DEV — di sana `import.meta.env.PROD` bernilai `false`
 * sehingga `/tokens` sengaja mengembalikan 200. Gerbang PROD (`beforeLoad`
 * melempar `notFound()`) TIDAK bisa dilatih di bawah `pnpm dev`; verifikasinya
 * = inspeksi kode + bukti collapse build di `task-14-report.md`. Membangun
 * test yang men-grep bundle di sini rapuh dan tak sepadan — sengaja tidak
 * dilakukan.
 */

// 10 route publik (sejak Rencana 2b: `/` merender `<Beranda>` penuh,
// `/pelayanan` + `/jadwal` diluncurkan bersama flag `SITE.comingSoon = false`).
const PUBLIC_PATHS = [
  '/',
  '/tentang',
  '/warta',
  '/renungan',
  '/galeri',
  '/kunjungi',
  '/persembahan',
  '/ibadah-live',
  '/jadwal',
  '/pelayanan',
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

// `<HeroMedia>` (dipakai `<Beranda>` di `/`) — invarian yang dulu dilatih di
// `coming-soon.spec.ts` (dihapus bersama `<ComingSoon>`) TAPI komponennya
// sendiri masih dipakai penuh oleh Beranda; port di sini alih-alih dibuang.
test('/ markup SSR tidak mengandung atribut autoplay pada video', async ({ page }) => {
  const res = await page.goto('/')
  const html = (await res?.text()) ?? ''
  const videoTag = html.slice(html.indexOf('<video'), html.indexOf('</video>'))
  expect(videoTag).not.toContain('autoplay')
})

test('reduced-motion: hero video tidak autoplay, tetap di poster', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'reduced-motion', 'hanya bermakna di project reduced-motion')
  await page.goto('/')
  const video = page.locator('video')
  await expect(video).toHaveCount(1)

  // Tak ada atribut autoplay di markup SSR.
  expect(await video.getAttribute('autoplay')).toBeNull()

  // Video tidak diputar otomatis — tetap di poster (`BerandaHero`'s effect
  // mengecek `prefers-reduced-motion` sebelum memanggil `v.play()`).
  await expect.poll(() => video.evaluate((v: HTMLVideoElement) => v.paused)).toBe(true)
})

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

test('/sitemap.xml: 200, content-type xml, daftar lengkap path publik', async ({ page }) => {
  const res = await page.goto('/sitemap.xml')
  expect(res?.status()).toBe(200)
  expect(res?.headers()['content-type']).toContain('xml')

  const body = (await res?.text()) ?? ''
  expect(body).toContain('<loc>https://gmimmusafir.org</loc>')
  expect(body).toContain('xmlns:xhtml="http://www.w3.org/1999/xhtml"')

  for (const path of [
    '/tentang',
    '/warta',
    '/renungan',
    '/galeri',
    '/kunjungi',
    '/persembahan',
    '/ibadah-live',
    '/pelayanan',
    '/jadwal',
  ]) {
    expect(body).toContain(`<loc>https://gmimmusafir.org${path}</loc>`)
  }
  // 10 = 10 path statis; entri dinamis warta/renungan/galeri/jadwal menambah
  // lebih banyak lagi tergantung isi seed saat ini — `toBeGreaterThanOrEqual`
  // sengaja dipakai supaya tes tak rapuh terhadap perubahan seed.
  const locCount = (body.match(/<loc>/g) ?? []).length
  expect(locCount).toBeGreaterThanOrEqual(10)
})

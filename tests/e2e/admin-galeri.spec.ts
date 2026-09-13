import { test, expect, type APIRequestContext, type Page } from '@playwright/test'

/**
 * Alur galeri end-to-end: album draf tidak bocor ke publik, unggah sungguhan
 * sampai ke halaman publik, dan tautan YouTube bisa ditambahkan.
 *
 * Alur kedua yang paling berharga. Ia menguji rantai yang tak disentuh test
 * lain: browser mengunggah LANGSUNG ke Vercel Blob, server hanya menerbitkan
 * token, URL-nya disimpan ke database, lalu halaman publik merendernya. Tiap
 * mata rantai itu bisa putus sendiri-sendiri.
 *
 * `mode: 'serial'` karena ketiga alur berbagi satu album dan satu sesi.
 */
test.describe.configure({ mode: 'serial' })

const EMAIL = process.env.SEED_ADMIN_EMAIL
const PASSWORD = process.env.SEED_ADMIN_PASSWORD

/** Foto sungguhan dari seed galeri — dipakai sebagai sumber unggahan. */
const FOTO = 'public/gallery/761546284_1774904490204016_6530656974838765152_n.jpg'

/** Penanda unik per run supaya run yang gagal di tengah tidak menjegal run berikutnya. */
const RUN = Date.now()
const JUDUL = `Uji Otomatis ${RUN} — hapus bila tertinggal`

async function warm(request: APIRequestContext, path: string) {
  await expect(async () => {
    const res = await request.get(path)
    expect([200, 300, 301, 302, 303, 307, 308]).toContain(res.status())
  }).toPass({ timeout: 25_000 })
}

/**
 * Tunggu sampai React benar-benar MENGHIDRASI elemen yang akan diklik.
 *
 * `waitForLoadState('networkidle')` hanya PROKSI: ia menunggu jaringan sepi,
 * bukan handler terpasang. Sejak header publik tidak lagi dirender di
 * `/admin/login` (Rencana 3e), permintaan yang dulu menahan jaringan tetap
 * sibuk sudah tidak ada — idle tiba lebih awal, kadang sebelum React memasang
 * handler, dan klik pertama tidak melakukan apa pun.
 *
 * React menempelkan kunci `__reactFiber$…`/`__reactProps$…` pada tiap simpul
 * DOM yang dihidrasinya. Menunggu kunci itu muncul adalah fakta, bukan tebakan.
 */
async function tungguHidrasi(page: Page, selector: string) {
  await page.waitForFunction(
    (sel) => {
      const el = document.querySelector(sel)
      return !!el && Object.keys(el).some((k) => k.startsWith('__react'))
    },
    selector,
    { timeout: 30_000 },
  )
}

async function masuk(page: Page) {
  await page.goto('/admin/login')
  await tungguHidrasi(page, 'form button[type="submit"]')
  await page.getByLabel(/email/i).fill(EMAIL!)
  await page.getByLabel(/kata sandi|password/i).fill(PASSWORD!)
  await page.getByRole('button', { name: /masuk|sign in/i }).click()
  await expect(page).toHaveURL(/\/admin$/, { timeout: 20_000 })
}

/** Buka halaman dalam keadaan benar-benar segar (hindari cache navigasi). */
async function bukaSegar(page: Page, path: string) {
  const pemisah = path.includes('?') ? '&' : '?'
  await page.goto(`${path}${pemisah}_t=${Date.now()}`, { waitUntil: 'networkidle' })
}

/** Hapus seluruh album uji yang tertinggal, lewat UI — jalur yang sama dengan pengurus. */
async function bersihkanSisa(page: Page) {
  for (let putaran = 0; putaran < 20; putaran++) {
    await bukaSegar(page, '/admin/galeri')
    // Tanpa anchor `^`: teks satu baris tabel dimulai dengan kolom pertama
    // (sampul), bukan judul, jadi pola ber-anchor tidak pernah cocok dan
    // pembersihan diam-diam tak melakukan apa pun.
    const sisa = page.getByRole('row').filter({ hasText: /Uji Otomatis/ })
    if ((await sisa.count()) === 0) return
    await sisa.first().getByRole('button', { name: /^hapus$|^delete$/i }).click()
    await page.getByRole('dialog').getByRole('button', { name: /^hapus$|^delete$/i }).click()
    await page.waitForTimeout(500)
  }
  throw new Error('album uji tidak habis setelah 20 putaran')
}

test('galeri: draf tidak bocor, unggah sampai ke publik, YouTube bisa ditambah', async ({
  page,
  request,
}, testInfo) => {
  // Project reduced-motion memvalidasi perilaku animasi; halaman ini tidak punya
  // animasi, jadi menjalankannya di sana hanya menggandakan unggahan sungguhan
  // ke Blob tanpa menambah informasi.
  test.skip(testInfo.project.name !== 'chromium', 'alur admin hanya di chromium')
  test.skip(!EMAIL || !PASSWORD, 'SEED_ADMIN_EMAIL/PASSWORD tidak di-set')
  test.setTimeout(180_000)

  await warm(request, '/api/auth/ok')
  await warm(request, '/admin/galeri')
  await warm(request, '/galeri')
  await masuk(page)
  await bersihkanSisa(page)

  // 1. Buat album sebagai DRAF.
  await page.goto('/admin/galeri/baru')
  await tungguHidrasi(page, 'form button[type="submit"]')
  await page.getByLabel(/judul \(indonesia\)/i).fill(JUDUL)
  await page.getByLabel(/judul \(inggris\)/i).fill(`${JUDUL} EN`)
  await page.getByLabel(/tanggal album/i).fill('2027-01-15')
  await page.getByRole('button', { name: /^simpan$|^save$/i }).click()
  await expect(page).toHaveURL(/\/admin\/galeri\/[0-9a-f-]{36}$/, { timeout: 20_000 })
  const alamatAlbum = page.url()

  // 2. Unggah foto SUNGGUHAN. Item tersimpan begitu unggah selesai.
  await page.getByLabel(/tambah foto|add photo/i).setInputFiles(FOTO)
  await expect(page.getByRole('listitem')).toHaveCount(1, { timeout: 60_000 })

  // URL-nya harus benar-benar dari Blob — bukan data: atau blob: lokal, yang
  // akan tampak benar di dashboard tapi kosong bagi jemaat.
  const src = await page.getByRole('listitem').first().locator('img').getAttribute('src')
  expect(src).toMatch(/^https:\/\/[a-z0-9]+\.public\.blob\.vercel-storage\.com\//)

  // 3. Tautan YouTube bisa ditambahkan. Tipe ini didukung komponen galeri sejak
  //    Rencana 2b tapi tak pernah bisa diisi sampai sekarang.
  await page.getByLabel(/tautan youtube/i).fill('https://www.youtube.com/watch?v=dQw4w9WgXcQ')
  await page.getByRole('button', { name: /tambah tautan youtube|add youtube link/i }).click()
  await expect(page.getByRole('listitem')).toHaveCount(2, { timeout: 20_000 })

  // 4. Masih DRAF → tidak boleh bocor ke halaman publik. Inti alur pertama:
  //    draf adalah satu-satunya hal yang memisahkan "pengurus sedang menyusun"
  //    dari "jemaat melihat album yang belum siap".
  await bukaSegar(page, '/galeri')
  await expect(page.getByText(JUDUL)).toHaveCount(0)

  // 5. Terbitkan → album DAN fotonya muncul di publik.
  await bukaSegar(page, '/admin/galeri')
  const baris = page.getByRole('row').filter({ hasText: JUDUL })
  await baris.getByRole('button', { name: /terbitkan|^publish$/i }).click()
  // Muat ulang dari server sebelum memeriksa publik: tabel yang diperbarui
  // `router.invalidate()` bisa terbaca sebelum mutasinya tersimpan.
  await bukaSegar(page, '/admin/galeri')
  await expect(page.getByRole('row').filter({ hasText: JUDUL })).toContainText(
    /terbit|published/i,
    { timeout: 20_000 },
  )

  await bukaSegar(page, '/galeri')
  await expect(page.getByText(JUDUL).first()).toBeVisible({ timeout: 20_000 })

  // Fotonya benar-benar sampai ke halaman album publik, bukan cuma judulnya.
  const idAlbum = alamatAlbum.split('/').pop()!
  await bukaSegar(page, `/galeri/${idAlbum}`)
  await expect(page.locator(`img[src="${src}"]`).first()).toBeVisible({ timeout: 20_000 })

  // 6. Hapus → hilang dari keduanya.
  await bukaSegar(page, '/admin/galeri')
  await page
    .getByRole('row')
    .filter({ hasText: JUDUL })
    .getByRole('button', { name: /^hapus$|^delete$/i })
    .click()
  await page.getByRole('dialog').getByRole('button', { name: /^hapus$|^delete$/i }).click()
  await bukaSegar(page, '/admin/galeri')
  await expect(page.getByRole('row').filter({ hasText: JUDUL })).toHaveCount(0, { timeout: 20_000 })
  await bukaSegar(page, '/galeri')
  await expect(page.getByText(JUDUL)).toHaveCount(0, { timeout: 20_000 })
})

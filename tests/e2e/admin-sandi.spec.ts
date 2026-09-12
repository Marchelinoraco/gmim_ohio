import { test, expect, type APIRequestContext, type Page } from '@playwright/test'

/**
 * Halaman ubah kata sandi.
 *
 * Test ini SENGAJA TIDAK mengganti kata sandi sungguhan, walau itu jalur yang
 * paling ingin dikunci. Playwright menjalankan berkas spec secara PARALEL, dan
 * `admin-jadwal`, `admin-konten`, serta `admin-master` sama-sama masuk memakai
 * `SEED_ADMIN_PASSWORD`. Mengganti kata sandi — bahkan sebentar lalu
 * dikembalikan — membuat login mereka gagal di jendela itu, dan kegagalannya
 * akan tampak seperti kerusakan di tempat lain. Playwright tidak punya kunci
 * lintas berkas, jadi tidak ada cara aman melakukannya di dalam suite.
 *
 * Yang dikunci di sini: halamannya berdiri, dan KEDUA penolakan bekerja. Jalur
 * berhasilnya dibuktikan sekali lewat probe terpisah di luar suite (lihat
 * catatan di PR), karena pembuktian itu memang harus mengubah kata sandi.
 *
 * `mode: 'serial'` karena ketiganya memakai satu sesi login yang sama.
 */
test.describe.configure({ mode: 'serial' })

const EMAIL = process.env.SEED_ADMIN_EMAIL
const PASSWORD = process.env.SEED_ADMIN_PASSWORD

async function warm(request: APIRequestContext, path: string) {
  await expect(async () => {
    const res = await request.get(path)
    expect([200, 300, 301, 302, 303, 307, 308]).toContain(res.status())
  }).toPass({ timeout: 25_000 })
}

async function masuk(page: Page) {
  await page.goto('/admin/login')
  // Tunggu hidrasi: tanpa ini form ter-submit native dan request tak pernah terjadi.
  await page.waitForLoadState('networkidle')
  await page.getByLabel(/email/i).fill(EMAIL!)
  await page.getByLabel(/kata sandi|password/i).fill(PASSWORD!)
  await page.getByRole('button', { name: /masuk|sign in/i }).click()
  await expect(page).toHaveURL(/\/admin$/, { timeout: 20_000 })
}

/** Isi ketiga field lalu kirim. */
async function kirim(page: Page, sekarang: string, baru: string, ulangi: string) {
  await page.getByLabel(/^kata sandi sekarang$|^current password$/i).fill(sekarang)
  await page.getByLabel(/^kata sandi baru$|^new password$/i).fill(baru)
  await page.getByLabel(/^ulangi kata sandi baru$|^repeat new password$/i).fill(ulangi)
  await page.getByRole('button', { name: /ganti kata sandi|change password/i }).click()
}

test('ubah kata sandi: ulangan tidak sama & kata sandi sekarang salah', async ({
  page,
  request,
}, testInfo) => {
  // Project reduced-motion memvalidasi perilaku animasi; halaman ini tidak punya
  // animasi, jadi menjalankannya di sana hanya menggandakan percobaan masuk yang
  // gagal ke endpoint auth yang sensitif pembatasan laju.
  test.skip(testInfo.project.name !== 'chromium', 'alur admin hanya di chromium')
  test.skip(!EMAIL || !PASSWORD, 'SEED_ADMIN_EMAIL/PASSWORD tidak di-set')
  test.setTimeout(120_000)

  await warm(request, '/api/auth/ok')
  await warm(request, '/admin/ubah-sandi')
  await masuk(page)

  await page.goto('/admin/ubah-sandi')
  await page.waitForLoadState('networkidle')
  await expect(page.getByRole('heading', { name: /ubah kata sandi|change password/i })).toBeVisible()

  // 1. Ulangan tidak sama → ditolak DI LAYAR, tanpa menyentuh server sama sekali.
  //    Kalau penolakan ini bocor ke server, ia akan mengganti kata sandi
  //    sungguhan dengan nilai yang salah ketik — persis kerusakan yang dicegah.
  await kirim(page, PASSWORD!, 'kata-sandi-percobaan-1', 'kata-sandi-percobaan-2')
  await expect(page.getByRole('status').filter({ hasText: /tidak sama|does not match/i })).toBeVisible(
    { timeout: 10_000 },
  )

  // 2. Kata sandi sekarang salah → ditolak SERVER, dan pesannya tidak mentah.
  await kirim(page, 'jelas-bukan-kata-sandinya', 'kata-sandi-percobaan-1', 'kata-sandi-percobaan-1')
  await expect(
    page.getByRole('status').filter({ hasText: /sekarang salah|is incorrect/i }),
  ).toBeVisible({ timeout: 20_000 })

  // Kata sandi sungguhan tidak berubah. Dibuktikan dengan KELUAR lalu masuk
  // lagi memakai kata sandi yang sama — sekadar membuka /admin/login sambil
  // masih bersesi tidak membuktikan apa pun soal kata sandinya.
  await page.getByRole('button', { name: /keluar|sign out/i }).click()
  await expect(page).toHaveURL(/\/admin\/login$/, { timeout: 20_000 })
  await masuk(page)
})

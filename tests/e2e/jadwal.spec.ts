import { test, expect } from '@playwright/test'

/**
 * e2e halaman Jadwal Ibadah & Pelayanan (Rencana 2b) — jalan di kedua project
 * Playwright (`chromium` + `reduced-motion`).
 *
 * Cakupan:
 *  1. `/jadwal` daftar — 200, satu `<h1>` non-kosong, ≥1 `<ServiceCard>`.
 *  2. Filter kategori "Kaum Ibu" (`<select>` NATIVE, `schedule-filters.tsx`) —
 *     URL `?kategori=kaum-ibu` + setiap badge kategori yang tampil berbunyi
 *     "Wanita/Kaum Ibu" (nama seed `kaum_ibu`, `src/db/seed/categories.ts`).
 *  3. Toggle Kalender — URL `?view=kalender`, grid muncul, klik tanggal
 *     berisi ibadah → panel di bawah menampilkan kartu.
 *  4. `/jadwal` → klik kartu pertama → `/jadwal/<uuid>` → tema (h1) + badge
 *     kategori tampil.
 *  5. `/jadwal/bukan-uuid` → 404 (guard `UUID_RE` di `jadwal_.$id.tsx`, bukan
 *     500 dari Postgres `22P02`).
 *  6. `/pelayanan` indeks — 200, tepat 6 kartu kategori (5 non-kolom + Kolom).
 *  7. `/pelayanan/kolom` — 200, daftar kolom (seed `Kolom 1`..`Kolom 4`) tampil.
 *  8. `/en/jadwal` — 200, `<html lang="en">` (pola sama loop `PUBLIC_PATHS`
 *     di `public-pages.spec.ts`).
 *
 * Seed jadwal (`src/db/seed/schedule.ts`) memakai rentang DINAMIS relatif
 * tanggal `pnpm db:seed` dijalankan (hari ini s/d +55 hari) — test di sini
 * TIDAK PERNAH mengasumsikan tanggal spesifik, hanya "ada minimal satu kartu/
 * tanggal berisi ibadah".
 */

const UUID = '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}'

test('/jadwal: 200, satu <h1> non-kosong, minimal satu kartu ibadah', async ({ page }) => {
  const res = await page.goto('/jadwal')
  expect(res?.status()).toBe(200)

  const h1 = page.locator('h1')
  await expect(h1).toHaveCount(1)
  await expect(h1).not.toBeEmpty()

  // Kartu = <ServiceCard linkToDetail> → <Link to="/jadwal/$id"> → <a href="/jadwal/<uuid>">.
  const cards = page.locator('main a[href^="/jadwal/"]')
  await expect(cards.first()).toBeVisible()
})

test('/jadwal: filter kategori "Kaum Ibu" → URL + badge kategori', async ({ page }) => {
  await page.goto('/jadwal')

  // Select native (bukan tombol/link) — label = pesan `jadwal_filter_category`
  // ("Kategori"); opsi bervalue slug tapi teks tampil nameId, jadi
  // `selectOption({ label })` lebih andal daripada menebak value. `selectOption`
  // bisa mendahului hidrasi (handler `onChange` React belum terpasang) —
  // pola retry sama dengan `openThemeMenu`/honeypot di `theme.spec.ts` /
  // `public-pages.spec.ts`: ulangi aksi sampai URL benar-benar berubah.
  await expect(async () => {
    await page.getByLabel('Kategori').selectOption({ label: 'Wanita/Kaum Ibu' })
    expect(new URL(page.url()).searchParams.get('kategori')).toBe('kaum-ibu')
  }).toPass({ timeout: 15000 })

  // `<CategoryBadge>` merender <span> polos. Teks yang sama juga ada di
  // <option> dropdown (collapsed, tapi tetap di DOM) — scope eksplisit ke tag
  // `span` supaya <option> tak ikut terhitung.
  const categoryBadges = page
    .locator('main')
    .locator('span')
    .filter({ hasText: /Kaum Bapa|Kaum Ibu|Ibadah Jemaat|Pemuda|Sekolah Minggu|Kolom/ })
  const ibuBadges = categoryBadges.filter({ hasText: 'Wanita/Kaum Ibu' })

  await expect.poll(() => categoryBadges.count()).toBeGreaterThan(0)
  await expect
    .poll(async () => (await categoryBadges.count()) === (await ibuBadges.count()))
    .toBe(true)
})

test('/jadwal: toggle Kalender → grid, klik tanggal berisi ibadah → panel kartu', async ({
  page,
}) => {
  await page.goto('/jadwal')

  // Klik bisa mendahului hidrasi (handler `onClick` React belum terpasang) —
  // pola retry sama dengan `openThemeMenu`/honeypot: ulangi klik sampai URL
  // benar-benar berubah.
  await expect(async () => {
    await page.getByRole('button', { name: 'Kalender' }).click({ timeout: 1000 })
    expect(new URL(page.url()).searchParams.get('view')).toBe('kalender')
  }).toPass({ timeout: 15000 })

  // Label bulan/tahun `aria-live="polite"` (`<MonthCalendar>`) — bukti grid render.
  await expect(page.locator('[aria-live="polite"]')).toBeVisible()

  // Sel kalender kosong = <div> biasa; HANYA sel berisi ≥1 ibadah jadi
  // <button aria-label="{tanggal}, {jumlah} ibadah">. Kata "ibadah" tak muncul
  // di label tombol navigasi bulan, jadi aman jadi pembeda. JANGAN hardcode
  // tanggal — seed relatif ke tanggal jalan.
  const dayWithService = page.getByRole('button', { name: /ibadah/ }).first()
  await expect(dayWithService).toBeVisible()
  await dayWithService.click()

  // Panel di bawah kalender menampilkan minimal satu kartu untuk tanggal terpilih.
  await expect(page.locator('main a[href^="/jadwal/"]').first()).toBeVisible()
})

test('/jadwal: klik kartu pertama → /jadwal/<uuid> → tema & badge kategori tampil', async ({
  page,
}) => {
  await page.goto('/jadwal')
  await page.locator('main a[href^="/jadwal/"]').first().click()

  await expect(page).toHaveURL(new RegExp(`/jadwal/${UUID}$`))

  // Halaman detail tanpa <PageHero> — tema/nama kategori = satu-satunya <h1>.
  const h1 = page.locator('h1')
  await expect(h1).toHaveCount(1)
  await expect(h1).not.toBeEmpty()

  // <CategoryBadge> tampil di bawah h1.
  const badge = page
    .locator('main')
    .locator('span')
    .filter({ hasText: /Kaum Bapa|Kaum Ibu|Ibadah Jemaat|Pemuda|Sekolah Minggu|Kolom/ })
  await expect(badge.first()).toBeVisible()
})

test('/jadwal/bukan-uuid: 404 (bukan 500)', async ({ page }) => {
  const res = await page.goto('/jadwal/bukan-uuid')
  expect(res?.status()).toBe(404)
})

test('/pelayanan: 200, enam kartu kategori', async ({ page }) => {
  const res = await page.goto('/pelayanan')
  expect(res?.status()).toBe(200)

  const h1 = page.locator('h1')
  await expect(h1).toHaveCount(1)
  await expect(h1).not.toBeEmpty()

  // 5 kategori non-kolom → /pelayanan/$slug + 1 kartu Kolom → /pelayanan/kolom.
  await expect(page.locator('main a[href^="/pelayanan/"]')).toHaveCount(6)
})

test('/pelayanan/kolom: 200, daftar kolom tampil', async ({ page }) => {
  const res = await page.goto('/pelayanan/kolom')
  expect(res?.status()).toBe(200)

  const h1 = page.locator('h1')
  await expect(h1).toHaveCount(1)
  await expect(h1).not.toBeEmpty()

  // Heading section "Daftar Kolom" (pesan `pelayanan_kolom_list_title`) + nama
  // kolom seed (`src/db/seed/kolom.ts`: "Kolom 1"..."Kolom 4"). "Kolom 1" juga
  // muncul sebagai heading section jadwal per-kolom (`<SectionTitle as="h3">`)
  // di bawahnya — scope eksplisit ke `<ul>` daftar kolom (satu-satunya `<ul>`
  // di halaman ini) supaya tak bentrok strict-mode dengan heading itu.
  await expect(page.getByRole('heading', { name: 'Daftar Kolom' })).toBeVisible()
  await expect(page.locator('ul').getByText('Kolom 1', { exact: true })).toBeVisible()
})

test('/en/jadwal: 200, <html lang="en">', async ({ page }) => {
  const res = await page.goto('/en/jadwal')
  expect(res?.status()).toBe(200)
  await expect(page.locator('html')).toHaveAttribute('lang', 'en')
})

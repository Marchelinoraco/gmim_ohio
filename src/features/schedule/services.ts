import { createServerFn } from '@tanstack/react-start'
import type { kolom, worshipCategories, worshipServices } from '@/db/schema'

/**
 * Lapisan tipe + query baca untuk `worship_services` (jadwal ibadah).
 *
 * `listUpcomingServices` mengembalikan baris `worship_services` TERBIT yang jatuh
 * pada hari ini (Eastern) atau setelahnya, lengkap dengan kategori (nama/warna/
 * key/slug) dan kolom bila ada. Dipakai section "Ibadah Minggu Ini" di Beranda.
 *
 * `listServices` adalah versi berfilter (kategori/kolom/rentang tanggal) untuk
 * `/jadwal` dan `/pelayanan/*`. `getService` mengambil satu ibadah terbit
 * berdasarkan id untuk halaman detail.
 *
 * `@/db` di-import lazy DI DALAM handler supaya modul route yang memuat server fn
 * ini tidak ikut meng-evaluasi `@/lib/env` saat bundling. Query relasional
 * (`db.query.*`) memakai callback `where`/`orderBy` sehingga skema & helper
 * `drizzle-orm` tak perlu di-import terpisah — pola sama dengan
 * `@/features/content/gallery`. Semua query difilter `status = 'published'`.
 *
 * Tabel `worship_services` masih KOSONG sampai Rencana 2b mengisinya — hari ini
 * fn-fn ini mengembalikan `[]`/`null` dan section Beranda menyembunyikan dirinya.
 */

/**
 * Satu ibadah terbit + kategori (key/nama/warna/slug) + kolom (id/nama) bila
 * ada. `kolom.id` (Task 11) dibutuhkan supaya `/pelayanan/kolom` bisa
 * mengelompokkan jadwal per kolom lewat `id` (dicocokkan ke baris `listKolom()`),
 * BUKAN `kolom.name` — `kolom.name` di schema (`src/db/schema/worship.ts`)
 * TIDAK unique, jadi pengelompokan by nama rapuh.
 */
export type UpcomingService = typeof worshipServices.$inferSelect & {
  category: Pick<
    typeof worshipCategories.$inferSelect,
    'key' | 'nameId' | 'nameEn' | 'color' | 'slug'
  >
  kolom: Pick<typeof kolom.$inferSelect, 'id' | 'name'> | null
}

/**
 * Daftar ibadah terbit dari hari ini (Eastern) ke depan, urut `serviceDate` asc
 * lalu `startTime` asc. `limit` opsional, default 6.
 */
export const listUpcomingServices = createServerFn({ method: 'GET' })
  .validator((limit: number = 6) => limit)
  .handler(async ({ data: limit }): Promise<UpcomingService[]> => {
    const { db } = await import('@/db')
    const { todayEastern } = await import('@/lib/datetime')
    const today = todayEastern()
    return db.query.worshipServices.findMany({
      where: (s, { and, eq, gte }) => and(eq(s.status, 'published'), gte(s.serviceDate, today)),
      orderBy: (s, { asc }) => [asc(s.serviceDate), asc(s.startTime)],
      limit,
      with: {
        category: { columns: { key: true, nameId: true, nameEn: true, color: true, slug: true } },
        kolom: { columns: { id: true, name: true } },
      },
    })
  })

/** Filter opsional untuk `listServices` — semua field opsional (default = tanpa filter). */
export type ServiceFilter = {
  categorySlug?: string
  kolomId?: string
  from?: string
  to?: string
}

/**
 * Daftar ibadah terbit berfilter (kategori/kolom/rentang tanggal), urut
 * `serviceDate` asc lalu `startTime` asc. `from` default hari ini (Eastern);
 * tanpa `to` rentang tak terbatas ke depan.
 */
export const listServices = createServerFn({ method: 'GET' })
  .validator((f: ServiceFilter = {}) => f)
  .handler(async ({ data: f }): Promise<UpcomingService[]> => {
    const { db } = await import('@/db')
    const { todayEastern } = await import('@/lib/datetime')
    const from = f.from ?? todayEastern()

    // slug → id lebih dulu; relational query tak bisa `where` pada relasi.
    let categoryId: string | undefined
    if (f.categorySlug) {
      const cat = await db.query.worshipCategories.findFirst({
        where: (c, { eq }) => eq(c.slug, f.categorySlug!),
        columns: { id: true },
      })
      // slug tak dikenal → tak ada hasil (bukan "semua"), supaya URL ngawur
      // tidak diam-diam menampilkan seluruh jadwal.
      if (!cat) return []
      categoryId = cat.id
    }

    return db.query.worshipServices.findMany({
      where: (s, { and, eq, gte, lte }) =>
        and(
          eq(s.status, 'published'),
          gte(s.serviceDate, from),
          f.to ? lte(s.serviceDate, f.to) : undefined,
          categoryId ? eq(s.categoryId, categoryId) : undefined,
          f.kolomId ? eq(s.kolomId, f.kolomId) : undefined,
        ),
      orderBy: (s, { asc }) => [asc(s.serviceDate), asc(s.startTime)],
      with: {
        category: { columns: { key: true, nameId: true, nameEn: true, color: true, slug: true } },
        kolom: { columns: { id: true, name: true } },
      },
    })
  })

/**
 * Satu ibadah terbit berdasarkan id.
 *
 * Validator = identitas `(id: string) => id` (tanpa cek UUID). Route pemanggil
 * WAJIB memfilter dulu id berbentuk UUID → `notFound()`, supaya id ngawur tak
 * menembus ke Postgres jadi `22P02` (500) — pola sama dengan `getBulletinDetail`
 * di `@/features/content/bulletins`.
 */
export const getService = createServerFn({ method: 'GET' })
  .validator((id: string) => id)
  .handler(async ({ data: id }): Promise<UpcomingService | null> => {
    const { db } = await import('@/db')
    const row = await db.query.worshipServices.findFirst({
      where: (s, { and, eq }) => and(eq(s.id, id), eq(s.status, 'published')),
      with: {
        category: { columns: { key: true, nameId: true, nameEn: true, color: true, slug: true } },
        kolom: { columns: { id: true, name: true } },
      },
    })
    return row ?? null
  })

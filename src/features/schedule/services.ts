import { createServerFn } from '@tanstack/react-start'
import type { kolom, worshipCategories, worshipServices } from '@/db/schema'

/**
 * Lapisan tipe + query baca untuk `worship_services` (jadwal ibadah).
 *
 * `listUpcomingServices` mengembalikan baris `worship_services` TERBIT yang jatuh
 * pada hari ini (Eastern) atau setelahnya, lengkap dengan kategori (nama/warna/
 * key) dan kolom bila ada. Dipakai section "Ibadah Minggu Ini" di Beranda.
 *
 * `@/db` di-import lazy DI DALAM handler supaya modul route yang memuat server fn
 * ini tidak ikut meng-evaluasi `@/lib/env` saat bundling. Query relasional
 * (`db.query.*`) memakai callback `where`/`orderBy` sehingga skema & helper
 * `drizzle-orm` tak perlu di-import terpisah — pola sama dengan
 * `@/features/content/gallery`. Semua query difilter `status = 'published'`.
 *
 * Tabel `worship_services` masih KOSONG sampai Rencana 2b mengisinya — hari ini
 * fn ini mengembalikan `[]` dan section Beranda menyembunyikan dirinya.
 */

/** Satu ibadah terbit + kategori (key/nama/warna) + kolom (nama) bila ada. */
export type UpcomingService = typeof worshipServices.$inferSelect & {
  category: Pick<typeof worshipCategories.$inferSelect, 'key' | 'nameId' | 'nameEn' | 'color'>
  kolom: Pick<typeof kolom.$inferSelect, 'name'> | null
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
        category: { columns: { key: true, nameId: true, nameEn: true, color: true } },
        kolom: { columns: { name: true } },
      },
    })
  })

import { createServerFn } from '@tanstack/react-start'
import type { bulletins } from '@/db/schema'

/**
 * Lapisan tipe + query baca untuk `bulletins` (Warta Jemaat).
 *
 * Server fn di sini mengembalikan baris DB mentah — HTML `bodyId`/`bodyEn`
 * BELUM disanitasi; sanitasi dikerjakan di titik render (loader task halaman)
 * lewat `sanitizeRichText`, supaya lapisan ini tetap murni data + tipe jelas.
 *
 * `@/db` dan skema di-import lazy DI DALAM tiap handler supaya modul route yang
 * memuat server fn ini tidak ikut meng-evaluasi `@/lib/env` saat bundling.
 * Semua query difilter `status = 'published'`.
 */

/** Satu baris `bulletins` apa adanya (kolom mentah, `bodyId/En` belum disanitasi). */
export type Bulletin = typeof bulletins.$inferSelect

/** Daftar warta terbit, terbaru dulu (urut `weekDate` desc). */
export const listBulletins = createServerFn({ method: 'GET' }).handler(
  async (): Promise<Bulletin[]> => {
    const { db } = await import('@/db')
    const { bulletins } = await import('@/db/schema')
    const { desc, eq } = await import('drizzle-orm')
    return db
      .select()
      .from(bulletins)
      .where(eq(bulletins.status, 'published'))
      .orderBy(desc(bulletins.weekDate))
  },
)

/** Satu warta terbit berdasarkan id; `null` bila tidak ada / belum terbit. */
export const getBulletin = createServerFn({ method: 'GET' })
  .validator((id: string) => id)
  .handler(async ({ data: id }): Promise<Bulletin | null> => {
    const { db } = await import('@/db')
    const { bulletins } = await import('@/db/schema')
    const { and, eq } = await import('drizzle-orm')
    const rows = await db
      .select()
      .from(bulletins)
      .where(and(eq(bulletins.id, id), eq(bulletins.status, 'published')))
      .limit(1)
    return rows[0] ?? null
  })

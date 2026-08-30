import { createServerFn } from '@tanstack/react-start'
import type { devotionals } from '@/db/schema'

/**
 * Lapisan tipe + query baca untuk `devotionals` (Renungan).
 *
 * Server fn di sini mengembalikan baris DB mentah — HTML `bodyId`/`bodyEn`
 * BELUM disanitasi; sanitasi dikerjakan di titik render (loader task halaman)
 * lewat `sanitizeRichText`, supaya lapisan ini tetap murni data + tipe jelas.
 *
 * `@/db` dan skema di-import lazy DI DALAM tiap handler supaya modul route yang
 * memuat server fn ini tidak ikut meng-evaluasi `@/lib/env` saat bundling.
 * Semua query difilter `status = 'published'`.
 */

/** Satu baris `devotionals` apa adanya (kolom mentah, `bodyId/En` belum disanitasi). */
export type Devotional = typeof devotionals.$inferSelect

/** Daftar renungan terbit, terbaru dulu (urut `publishedDate` desc). */
export const listDevotionals = createServerFn({ method: 'GET' }).handler(
  async (): Promise<Devotional[]> => {
    const { db } = await import('@/db')
    const { devotionals } = await import('@/db/schema')
    const { desc, eq } = await import('drizzle-orm')
    return db
      .select()
      .from(devotionals)
      .where(eq(devotionals.status, 'published'))
      .orderBy(desc(devotionals.publishedDate))
  },
)

/** Satu renungan terbit berdasarkan slug; `null` bila tidak ada / belum terbit. */
export const getDevotional = createServerFn({ method: 'GET' })
  .validator((slug: string) => slug)
  .handler(async ({ data: slug }): Promise<Devotional | null> => {
    const { db } = await import('@/db')
    const { devotionals } = await import('@/db/schema')
    const { and, eq } = await import('drizzle-orm')
    const rows = await db
      .select()
      .from(devotionals)
      .where(and(eq(devotionals.slug, slug), eq(devotionals.status, 'published')))
      .limit(1)
    return rows[0] ?? null
  })

import { createServerFn } from '@tanstack/react-start'
import type { devotionals } from '@/db/schema'
import type { SanitizedHtml } from '@/lib/sanitize'

/**
 * Lapisan tipe + query baca untuk `devotionals` (Renungan).
 *
 * `listDevotionals` / `getDevotional` mengembalikan baris DB mentah — HTML
 * `bodyId`/`bodyEn` BELUM disanitasi; sanitasi (kalau perlu) dikerjakan di titik
 * render. `getDevotionalDetail` adalah PENGECUALIAN yang disengaja: ia
 * menyanitasi `bodyId`/`bodyEn` DI DALAM server fn dan mengembalikannya sebagai
 * `SanitizedHtml`, justru supaya `sanitizeRichText` (dan paket `sanitize-html`
 * di baliknya) tak pernah ikut ke loader route maupun bundle klien.
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

// Body mentah — dipakai Rencana 3 (form edit admin), bukan halaman publik.
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

/**
 * Satu baris `devotionals` + body HTML (`bodyId`/`bodyEn`) yang SUDAH disanitasi
 * server-side jadi tipe branded `SanitizedHtml` — siap dioper ke `<Prose>`.
 */
export type DevotionalDetail = Devotional & {
  bodyIdHtml: SanitizedHtml | null
  bodyEnHtml: SanitizedHtml | null
}

/**
 * Satu renungan terbit (by slug) + body HTML yang SUDAH disanitasi server-side
 * (id & en).
 *
 * `sanitizeRichText` (dan lewatnya paket `sanitize-html`) DI-import lazy di dalam
 * handler ini — batas server keras `createServerFn` — supaya tak pernah masuk
 * bundle klien lewat modul route yang meng-import fn ini.
 *
 * `devotionals.slug` kolom `text` (bukan `uuid`), jadi slug ngawur tak bisa
 * melempar `22P02` — cukup mengembalikan `null` → loader route yang jadikan 404.
 * Tak perlu pre-check pola di loader (beda dengan `getBulletinDetail`).
 */
export const getDevotionalDetail = createServerFn({ method: 'GET' })
  .validator((slug: string) => slug)
  .handler(async ({ data: slug }): Promise<DevotionalDetail | null> => {
    const { db } = await import('@/db')
    const { devotionals } = await import('@/db/schema')
    const { and, eq } = await import('drizzle-orm')
    const { sanitizeRichText } = await import('@/lib/sanitize')
    const rows = await db
      .select()
      .from(devotionals)
      .where(and(eq(devotionals.slug, slug), eq(devotionals.status, 'published')))
      .limit(1)
    const row = rows[0]
    if (!row) return null
    return {
      ...row,
      bodyIdHtml: row.bodyId ? sanitizeRichText(row.bodyId) : null,
      bodyEnHtml: row.bodyEn ? sanitizeRichText(row.bodyEn) : null,
    }
  })

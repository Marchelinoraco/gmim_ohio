import { createServerFn } from '@tanstack/react-start'
import type { bulletins } from '@/db/schema'
import type { SanitizedHtml } from '@/lib/sanitize'

/**
 * Lapisan tipe + query baca untuk `bulletins` (Warta Jemaat).
 *
 * `listBulletins` mengembalikan `BulletinSummary` — subset kolom yang dipakai
 * daftar; body HTML SENGAJA tak di-select (lihat tipe di bawah). `getBulletin`
 * mengembalikan baris mentah lengkap (body `bodyId`/`bodyEn` BELUM disanitasi;
 * dipakai form edit admin di Rencana 3). `getBulletinDetail` adalah PENGECUALIAN
 * yang disengaja: ia menyanitasi `bodyId`/`bodyEn` DI DALAM server fn dan
 * mengembalikannya sebagai `SanitizedHtml`, justru supaya `sanitizeRichText`
 * (dan paket `sanitize-html` di baliknya) tak pernah ikut ke loader route maupun
 * bundle klien.
 *
 * `@/db` dan skema di-import lazy DI DALAM tiap handler supaya modul route yang
 * memuat server fn ini tidak ikut meng-evaluasi `@/lib/env` saat bundling.
 * Semua query difilter `status = 'published'`.
 */

/** Satu baris `bulletins` apa adanya (kolom mentah, `bodyId/En` belum disanitasi). */
export type Bulletin = typeof bulletins.$inferSelect

/**
 * Bentuk daftar warta — hanya kolom yang benar-benar dipakai pemanggil `/warta`,
 * `<Beranda>`, dan `sitemap.xml` (`id` + judul + ringkasan + `weekDate` +
 * `updatedAt`). Body HTML admin (`bodyId`/`bodyEn`) TIDAK di-select: tak ada yang
 * merendernya di daftar, dan menyerialisasi HTML mentah ke payload loader klien
 * tumbuh tanpa batas seiring pengurus menambah warta.
 */
export type BulletinSummary = Pick<
  Bulletin,
  'id' | 'titleId' | 'titleEn' | 'summaryId' | 'summaryEn' | 'weekDate' | 'updatedAt'
>

/** Daftar warta terbit, terbaru dulu (urut `weekDate` desc). */
export const listBulletins = createServerFn({ method: 'GET' }).handler(
  async (): Promise<BulletinSummary[]> => {
    const { db } = await import('@/db')
    const { bulletins } = await import('@/db/schema')
    const { desc, eq } = await import('drizzle-orm')
    return db
      .select({
        id: bulletins.id,
        titleId: bulletins.titleId,
        titleEn: bulletins.titleEn,
        summaryId: bulletins.summaryId,
        summaryEn: bulletins.summaryEn,
        weekDate: bulletins.weekDate,
        updatedAt: bulletins.updatedAt,
      })
      .from(bulletins)
      .where(eq(bulletins.status, 'published'))
      .orderBy(desc(bulletins.weekDate))
  },
)

// Body mentah — dipakai Rencana 3 (form edit admin), bukan halaman publik.
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

/**
 * Satu baris `bulletins` + body HTML (`bodyId`/`bodyEn`) yang SUDAH disanitasi
 * server-side jadi tipe branded `SanitizedHtml` — siap dioper ke `<Prose>`.
 */
export type BulletinDetail = Bulletin & {
  bodyIdHtml: SanitizedHtml | null
  bodyEnHtml: SanitizedHtml | null
}

/**
 * Satu warta terbit + body HTML yang SUDAH disanitasi server-side (id & en).
 *
 * `sanitizeRichText` (dan lewatnya paket `sanitize-html`) DI-import lazy di dalam
 * handler ini — batas server keras `createServerFn` — supaya tak pernah masuk
 * bundle klien lewat modul route yang meng-import fn ini.
 *
 * Validator = identitas `(id: string) => id` (tanpa cek UUID). Loader route yang
 * memanggil fn ini WAJIB memfilter dulu id berbentuk UUID → `notFound()`, supaya
 * id ngawur tak menembus ke Postgres jadi `22P02` (500). Kegagalan infra asli
 * tetap dibiarkan naik sebagai 500.
 */
export const getBulletinDetail = createServerFn({ method: 'GET' })
  .validator((id: string) => id)
  .handler(async ({ data: id }): Promise<BulletinDetail | null> => {
    const { db } = await import('@/db')
    const { bulletins } = await import('@/db/schema')
    const { and, eq } = await import('drizzle-orm')
    const { sanitizeRichText } = await import('@/lib/sanitize')
    const rows = await db
      .select()
      .from(bulletins)
      .where(and(eq(bulletins.id, id), eq(bulletins.status, 'published')))
      .limit(1)
    const row = rows[0]
    if (!row) return null
    return {
      ...row,
      bodyIdHtml: row.bodyId ? sanitizeRichText(row.bodyId) : null,
      bodyEnHtml: row.bodyEn ? sanitizeRichText(row.bodyEn) : null,
    }
  })

import { createServerFn } from '@tanstack/react-start'
import { ensureAdmin } from '@/lib/auth.functions'

export type AdminBulletinRow = {
  id: string
  weekDate: string
  titleId: string
  status: 'draft' | 'published'
  punyaPdf: boolean
}

export type AdminBulletinDetail = {
  id: string
  weekDate: string
  titleId: string
  titleEn: string
  summaryId: string
  summaryEn: string
  bodyId: string | null
  bodyEn: string | null
  pdfUrl: string | null
  status: 'draft' | 'published'
}

export type AdminDevotionalRow = {
  id: string
  slug: string
  titleId: string
  authorName: string
  publishedDate: string
  status: 'draft' | 'published'
}

export type AdminDevotionalDetail = AdminDevotionalRow & {
  titleEn: string
  coverImageUrl: string | null
  excerptId: string
  excerptEn: string
  bodyId: string
  bodyEn: string
}

/**
 * Daftar warta untuk dashboard — termasuk draft, yang tidak pernah dikembalikan
 * `listBulletins` publik.
 *
 * Body sengaja TIDAK diambil di sini: ia bisa panjang, dan daftar hanya
 * memerlukan judul serta status. `punyaPdf` cukup sebagai penanda tanpa menarik
 * URL-nya.
 *
 * `ensureAdmin()` dipanggil di server fn, bukan hanya di route: route yang
 * dijaga tidak menghalangi pemanggilan langsung lewat HTTP.
 */
export const listBulletinsForAdmin = createServerFn({ method: 'GET' }).handler(
  async (): Promise<AdminBulletinRow[]> => {
    await ensureAdmin()
    const { db } = await import('@/db')
    const rows = await db.query.bulletins.findMany({
      orderBy: (b, { desc }) => [desc(b.weekDate)],
      columns: { id: true, weekDate: true, titleId: true, status: true, pdfUrl: true },
      limit: 500,
    })
    return rows.map((r) => ({
      id: r.id,
      weekDate: r.weekDate,
      titleId: r.titleId,
      status: r.status,
      punyaPdf: Boolean(r.pdfUrl),
    }))
  },
)

export const getBulletinForAdmin = createServerFn({ method: 'GET' })
  .validator((id: string) => id)
  .handler(async ({ data: id }): Promise<AdminBulletinDetail | null> => {
    await ensureAdmin()
    const { db } = await import('@/db')
    const r = await db.query.bulletins.findFirst({ where: (b, { eq }) => eq(b.id, id) })
    if (!r) return null
    return {
      id: r.id,
      weekDate: r.weekDate,
      titleId: r.titleId,
      titleEn: r.titleEn,
      summaryId: r.summaryId,
      summaryEn: r.summaryEn,
      bodyId: r.bodyId,
      bodyEn: r.bodyEn,
      pdfUrl: r.pdfUrl,
      status: r.status,
    }
  })

export const listDevotionalsForAdmin = createServerFn({ method: 'GET' }).handler(
  async (): Promise<AdminDevotionalRow[]> => {
    await ensureAdmin()
    const { db } = await import('@/db')
    return db.query.devotionals.findMany({
      orderBy: (d, { desc }) => [desc(d.publishedDate)],
      columns: {
        id: true,
        slug: true,
        titleId: true,
        authorName: true,
        publishedDate: true,
        status: true,
      },
      limit: 500,
    })
  },
)

export const getDevotionalForAdmin = createServerFn({ method: 'GET' })
  .validator((id: string) => id)
  .handler(async ({ data: id }): Promise<AdminDevotionalDetail | null> => {
    await ensureAdmin()
    const { db } = await import('@/db')
    const r = await db.query.devotionals.findFirst({ where: (d, { eq }) => eq(d.id, id) })
    if (!r) return null
    return {
      id: r.id,
      slug: r.slug,
      titleId: r.titleId,
      titleEn: r.titleEn,
      authorName: r.authorName,
      publishedDate: r.publishedDate,
      coverImageUrl: r.coverImageUrl,
      excerptId: r.excerptId,
      excerptEn: r.excerptEn,
      bodyId: r.bodyId,
      bodyEn: r.bodyEn,
      status: r.status,
    }
  })

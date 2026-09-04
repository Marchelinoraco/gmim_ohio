import { createServerFn } from '@tanstack/react-start'
import type { galleryAlbums, galleryItems } from '@/db/schema'

/**
 * Lapisan tipe + query baca untuk galeri (`gallery_albums` + `gallery_items`).
 *
 * Server fn di sini mengembalikan baris DB mentah (caption/URL apa adanya);
 * tidak ada transformasi selain hitung `itemCount` pada daftar album.
 *
 * `@/db` di-import lazy DI DALAM tiap handler supaya modul route yang memuat
 * server fn ini tidak ikut meng-evaluasi `@/lib/env` saat bundling. Query
 * relasional (`db.query.*`) memakai callback `where`/`orderBy` sehingga skema &
 * helper `drizzle-orm` tidak perlu di-import terpisah. Semua query difilter
 * `status = 'published'`.
 */

/** Satu baris `gallery_albums` apa adanya. */
export type GalleryAlbum = typeof galleryAlbums.$inferSelect

/** Satu baris `gallery_items` apa adanya (image atau youtube). */
export type GalleryItem = typeof galleryItems.$inferSelect

/** Album + jumlah item — bentuk yang dipakai daftar galeri. */
export type GalleryAlbumSummary = GalleryAlbum & { itemCount: number }

/**
 * Daftar album terbit dengan `itemCount`, urut `sortOrder` asc lalu `albumDate`
 * desc. `coverImageUrl` dikembalikan apa adanya (kolom).
 */
export const listGalleryAlbums = createServerFn({ method: 'GET' }).handler(
  async (): Promise<GalleryAlbumSummary[]> => {
    const { db } = await import('@/db')
    const albums = await db.query.galleryAlbums.findMany({
      where: (a, { eq }) => eq(a.status, 'published'),
      orderBy: (a, { asc, desc }) => [asc(a.sortOrder), desc(a.albumDate)],
      with: { items: { columns: { id: true } } },
    })
    return albums.map(({ items, ...album }) => ({ ...album, itemCount: items.length }))
  },
)

/**
 * Satu album terbit + item-itemnya (urut `sortOrder` asc); `null` bila album
 * tidak ada / belum terbit.
 */
export const getGalleryAlbum = createServerFn({ method: 'GET' })
  .validator((id: string) => id)
  .handler(async ({ data: id }): Promise<{ album: GalleryAlbum; items: GalleryItem[] } | null> => {
    const { db } = await import('@/db')
    const album = await db.query.galleryAlbums.findFirst({
      where: (a, { and, eq }) => and(eq(a.id, id), eq(a.status, 'published')),
      with: { items: { orderBy: (i, { asc }) => [asc(i.sortOrder)] } },
    })
    if (!album) return null
    const { items, ...rest } = album
    return { album: rest, items }
  })

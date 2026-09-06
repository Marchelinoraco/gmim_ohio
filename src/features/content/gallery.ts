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
 * Foto galeri untuk section Beranda — hanya kolom yang benar-benar dipakai
 * (`createdAt`/`updatedAt` tidak), plus `albumId` untuk menaut ke albumnya.
 */
export type RecentGalleryPhoto = Pick<
  GalleryItem,
  'id' | 'albumId' | 'type' | 'imageUrl' | 'youtubeUrl' | 'captionId' | 'captionEn' | 'sortOrder'
>

/**
 * Foto terbaru lintas album terbit, untuk section galeri di Beranda.
 *
 * HANYA `type = 'image'` — beranda menampilkan grid foto, dan item `youtube`
 * tak punya `imageUrl` sehingga akan jadi kotak kosong.
 *
 * Diurut album terbaru dulu (`albumDate` desc), lalu `sortOrder` di dalam
 * album, sehingga urutan kurasi pengurus tetap dihormati. `limit` dibatasi di
 * query, bukan setelah fetch, supaya tidak menarik seluruh galeri hanya untuk
 * membuang sebagian besarnya.
 */
export const listRecentGalleryPhotos = createServerFn({ method: 'GET' })
  .validator((limit: number = 6) => limit)
  .handler(async ({ data: limit }): Promise<RecentGalleryPhoto[]> => {
    const { db } = await import('@/db')
    const { galleryAlbums: albums, galleryItems: items } = await import('@/db/schema')
    const { and, asc, desc, eq } = await import('drizzle-orm')

    // JOIN, bukan `db.query.*` + filter setelah fetch: query relasional Drizzle
    // tak bisa memfilter berdasarkan kolom relasi, sehingga `limit` akan
    // diterapkan SEBELUM album draft tersaring dan section ini diam-diam
    // menampilkan foto lebih sedikit dari yang diminta.
    const rows = await db
      .select({
        id: items.id,
        albumId: items.albumId,
        type: items.type,
        imageUrl: items.imageUrl,
        youtubeUrl: items.youtubeUrl,
        captionId: items.captionId,
        captionEn: items.captionEn,
        sortOrder: items.sortOrder,
      })
      .from(items)
      .innerJoin(albums, eq(items.albumId, albums.id))
      .where(and(eq(albums.status, 'published'), eq(items.type, 'image')))
      .orderBy(desc(albums.albumDate), asc(items.sortOrder))
      .limit(limit)

    return rows
  })

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

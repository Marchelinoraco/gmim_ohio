import { createServerFn } from '@tanstack/react-start'
import { ensureAdmin } from '@/lib/auth.functions'

export type AdminAlbumRow = {
  id: string
  titleId: string
  titleEn: string
  albumDate: string
  coverImageUrl: string | null
  sortOrder: number
  status: 'draft' | 'published'
  itemCount: number
}

export type AdminItemRow = {
  id: string
  type: 'image' | 'youtube'
  imageUrl: string | null
  youtubeUrl: string | null
  captionId: string | null
  captionEn: string | null
  sortOrder: number
}

export type AdminAlbumDetail = Omit<AdminAlbumRow, 'itemCount'> & { items: AdminItemRow[] }

/**
 * Daftar album untuk dashboard.
 *
 * Berbeda dari `listGalleryAlbums` publik dalam satu hal yang disengaja: ia
 * menampilkan draf. Pengurus perlu melihat album yang belum terbit — itu justru
 * yang sedang dikerjakannya.
 *
 * `ensureAdmin()` dipanggil di sini, bukan hanya di route: route yang dijaga
 * tidak menghalangi siapa pun memanggil server fn ini langsung lewat HTTP.
 */
export const listAlbumsForAdmin = createServerFn({ method: 'GET' }).handler(
  async (): Promise<AdminAlbumRow[]> => {
    await ensureAdmin()
    const { db } = await import('@/db')
    // Kolom dipilih eksplisit: stempel waktu tidak dipakai tampilan mana pun,
    // dan mengambilnya hanya untuk dibuang membuat setiap baris lebih berat.
    const rows = await db.query.galleryAlbums.findMany({
      columns: {
        id: true,
        titleId: true,
        titleEn: true,
        albumDate: true,
        coverImageUrl: true,
        sortOrder: true,
        status: true,
      },
      orderBy: (a, { asc, desc }) => [asc(a.sortOrder), desc(a.albumDate)],
      with: { items: { columns: { id: true } } },
    })
    return rows.map(({ items, ...album }) => ({ ...album, itemCount: items.length }))
  },
)

/**
 * Satu album beserta seluruh itemnya, terurut sesuai kurasi pengurus.
 *
 * Item TIDAK difilter per tipe: editor harus menampilkan gambar dan tautan
 * YouTube berdampingan, karena keduanya menempati urutan yang sama di halaman
 * publik.
 */
export const getAlbumForAdmin = createServerFn({ method: 'GET' })
  .validator((id: unknown) => String(id))
  .handler(async ({ data: id }): Promise<AdminAlbumDetail | null> => {
    await ensureAdmin()
    const { db } = await import('@/db')
    const row = await db.query.galleryAlbums.findFirst({
      where: (a, { eq }) => eq(a.id, id),
      columns: {
        id: true,
        titleId: true,
        titleEn: true,
        albumDate: true,
        coverImageUrl: true,
        sortOrder: true,
        status: true,
      },
      with: {
        items: {
          columns: {
            id: true,
            type: true,
            imageUrl: true,
            youtubeUrl: true,
            captionId: true,
            captionEn: true,
            sortOrder: true,
          },
          orderBy: (i, { asc }) => [asc(i.sortOrder)],
        },
      },
    })
    return row ?? null
  })

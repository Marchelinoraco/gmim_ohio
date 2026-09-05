import { galleryAlbums, galleryItems } from '@/db/schema'

// `@/db` di-import lazy di dalam `seedGallery()` — lihat catatan di `categories.ts`.

/**
 * Galeri placeholder — 1 album berisi 4 item (3 foto + 1 video YouTube). Semua
 * gambar sementara menunjuk ke `public/hero/hero-poster.jpg`; video memakai URL
 * contoh. Data riil diisi pengurus lewat dashboard (Rencana 3).
 */
export const PLACEHOLDER_ALBUM = {
  titleId: 'Ibadah Jemaat & Kegiatan',
  titleEn: 'Worship Services & Activities',
  albumDate: '2026-08-16',
  coverImageUrl: '/hero/hero-poster.jpg',
  sortOrder: 0,
  status: 'published',
} as const

export const PLACEHOLDER_ALBUM_ITEMS = [
  {
    type: 'image',
    imageUrl: '/hero/hero-poster.jpg',
    youtubeUrl: null,
    captionId: 'Ibadah Minggu di gedung gereja',
    captionEn: 'Sunday service at the church building',
    sortOrder: 0,
  },
  {
    type: 'image',
    imageUrl: '/hero/hero-poster.jpg',
    youtubeUrl: null,
    captionId: 'Ramah tamah jemaat seusai ibadah',
    captionEn: 'Fellowship after the service',
    sortOrder: 1,
  },
  {
    type: 'image',
    imageUrl: '/hero/hero-poster.jpg',
    youtubeUrl: null,
    captionId: 'Ibadah Syukur HUT Kemerdekaan RI',
    captionEn: 'Indonesian Independence Day thanksgiving service',
    sortOrder: 2,
  },
  // Item video sengaja TIDAK di-seed. Placeholder sebelumnya memakai video
  // YouTube populer yang tak ada hubungannya dengan gereja (bercaption
  // "Cuplikan ibadah Minggu") — di situs jemaat sungguhan itu terbaca sebagai
  // lelucon atau kelalaian, bukan placeholder yang jujur. Tipe `youtube`
  // tetap didukung komponen galeri; pengurus mengisinya lewat dashboard
  // (Rencana 3) saat video ibadah sungguhan sudah ada.
] as const

/**
 * Idempoten via guard "tabel album kosong": hanya insert saat `gallery_albums`
 * masih kosong, supaya album/foto yang dikelola pengurus tidak tertimpa saat
 * seed di-run ulang.
 */
export async function seedGallery() {
  const { db } = await import('@/db')
  if ((await db.$count(galleryAlbums)) > 0) return 0

  const [album] = await db.insert(galleryAlbums).values(PLACEHOLDER_ALBUM).returning({
    id: galleryAlbums.id,
  })
  if (!album) throw new Error('Gagal membuat album galeri placeholder')

  await db
    .insert(galleryItems)
    .values(PLACEHOLDER_ALBUM_ITEMS.map((item) => ({ ...item, albumId: album.id })))

  return 1 + PLACEHOLDER_ALBUM_ITEMS.length
}

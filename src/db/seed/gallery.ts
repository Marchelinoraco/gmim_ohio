import { galleryAlbums, galleryItems } from '@/db/schema'

// `@/db` di-import lazy di dalam `seedGallery()` — lihat catatan di `categories.ts`.

/**
 * Galeri — foto jemaat SUNGGUHAN dari `public/gallery/` (18 berkas), bukan
 * placeholder.
 *
 * `albumDate` adalah tanggal PUBLIKASI, bukan tanggal acara. Berkasnya berasal
 * dari unggahan Facebook jemaat yang EXIF-nya sudah dihapus, jadi tanggal
 * pengambilan tidak bisa diketahui — dan mengarang tanggal acara untuk jemaat
 * sungguhan adalah persis fabrikasi yang dilarang di proyek ini. Karena itu
 * albumnya satu dan judulnya TIDAK mengklaim acara tertentu. Bila pengurus tahu
 * tanggal aslinya, pecah jadi beberapa album lewat dashboard (Rencana 3).
 *
 * Caption dipakai sebagai teks alternatif gambar, jadi tidak boleh dikarang.
 * Tiga rangkaian di bawah diberi caption spesifik karena isinya diperiksa
 * langsung; satu rangkaian (`179275…`, 3 foto) belum sempat diperiksa sehingga
 * captionnya sengaja netral — benar apa pun isinya.
 *
 * Tujuh berkas di rangkaian `179882…` hanya 414x414 (thumbnail Facebook). Wajar
 * di grid, tampak lunak bila dibesarkan di lightbox — diterima sadar: foto
 * jemaat yang nyata lebih berharga daripada ketajaman sempurna.
 */
export const PLACEHOLDER_ALBUM = {
  titleId: 'Kebersamaan Jemaat',
  titleEn: 'Congregation Life',
  albumDate: '2026-09-06',
  coverImageUrl: '/gallery/762676795_1774904053537393_4203003014146262855_n.jpg',
  sortOrder: 0,
  status: 'published',
} as const

export const PLACEHOLDER_ALBUM_ITEMS = [
  {
    type: 'image',
    imageUrl: '/gallery/762676795_1774904053537393_4203003014146262855_n.jpg',
    youtubeUrl: null,
    captionId: 'Ramah tamah jemaat di taman',
    captionEn: 'Congregation fellowship at the park',
    sortOrder: 0,
  },
  {
    type: 'image',
    imageUrl: '/gallery/761546284_1774904490204016_6530656974838765152_n.jpg',
    youtubeUrl: null,
    captionId: 'Ramah tamah jemaat di taman',
    captionEn: 'Congregation fellowship at the park',
    sortOrder: 1,
  },
  {
    type: 'image',
    imageUrl: '/gallery/761811544_1774904530204012_5383425075066311029_n.jpg',
    youtubeUrl: null,
    captionId: 'Ramah tamah jemaat di taman',
    captionEn: 'Congregation fellowship at the park',
    sortOrder: 2,
  },
  {
    type: 'image',
    imageUrl: '/gallery/762082791_1774904416870690_3036812318472249267_n.jpg',
    youtubeUrl: null,
    captionId: 'Ramah tamah jemaat di taman',
    captionEn: 'Congregation fellowship at the park',
    sortOrder: 3,
  },
  {
    type: 'image',
    imageUrl: '/gallery/762566796_1774904086870723_5047499250338732125_n.jpg',
    youtubeUrl: null,
    captionId: 'Ramah tamah jemaat di taman',
    captionEn: 'Congregation fellowship at the park',
    sortOrder: 4,
  },
  {
    type: 'image',
    imageUrl: '/gallery/775995783_1787695685591563_1554595913002947083_n.jpg',
    youtubeUrl: null,
    captionId: 'Ibadah Minggu di gedung gereja',
    captionEn: 'Sunday service at the church building',
    sortOrder: 5,
  },
  {
    type: 'image',
    imageUrl: '/gallery/776586526_1787695658924899_8780970688726208330_n.jpg',
    youtubeUrl: null,
    captionId: 'Ibadah Minggu di gedung gereja',
    captionEn: 'Sunday service at the church building',
    sortOrder: 6,
  },
  {
    type: 'image',
    imageUrl: '/gallery/778816763_1792757641752034_5246157175915069274_n.jpg',
    youtubeUrl: null,
    captionId: 'Kebersamaan jemaat GMIM Musafir',
    captionEn: 'GMIM Musafir congregation together',
    sortOrder: 7,
  },
  {
    type: 'image',
    imageUrl: '/gallery/780501231_1792759538418511_1801571666564199968_n.jpg',
    youtubeUrl: null,
    captionId: 'Kebersamaan jemaat GMIM Musafir',
    captionEn: 'GMIM Musafir congregation together',
    sortOrder: 8,
  },
  {
    type: 'image',
    imageUrl: '/gallery/780981729_1792759575085174_6871526939715110517_n.jpg',
    youtubeUrl: null,
    captionId: 'Kebersamaan jemaat GMIM Musafir',
    captionEn: 'GMIM Musafir congregation together',
    sortOrder: 9,
  },
  {
    type: 'image',
    imageUrl: '/gallery/777851661_1798824924478639_1339761123375355166_n.jpg',
    youtubeUrl: null,
    captionId: 'Kegiatan bersama jemaat di aula',
    captionEn: 'Congregation activity in the hall',
    sortOrder: 10,
  },
  {
    type: 'image',
    imageUrl: '/gallery/783727908_1798824957811969_7541717977865179310_n.jpg',
    youtubeUrl: null,
    captionId: 'Kegiatan bersama jemaat di aula',
    captionEn: 'Congregation activity in the hall',
    sortOrder: 11,
  },
  {
    type: 'image',
    imageUrl: '/gallery/784251895_1798824781145320_2023819866779381703_n.jpg',
    youtubeUrl: null,
    captionId: 'Kegiatan bersama jemaat di aula',
    captionEn: 'Congregation activity in the hall',
    sortOrder: 12,
  },
  {
    type: 'image',
    imageUrl: '/gallery/786352933_1798823921145406_2162773084630993206_n.jpg',
    youtubeUrl: null,
    captionId: 'Kegiatan bersama jemaat di aula',
    captionEn: 'Congregation activity in the hall',
    sortOrder: 13,
  },
  {
    type: 'image',
    imageUrl: '/gallery/786811246_1798824214478710_5797195767360273187_n.jpg',
    youtubeUrl: null,
    captionId: 'Kegiatan bersama jemaat di aula',
    captionEn: 'Congregation activity in the hall',
    sortOrder: 14,
  },
  {
    type: 'image',
    imageUrl: '/gallery/788758535_1798824807811984_2395970786723915722_n.jpg',
    youtubeUrl: null,
    captionId: 'Kegiatan bersama jemaat di aula',
    captionEn: 'Congregation activity in the hall',
    sortOrder: 15,
  },
  {
    type: 'image',
    imageUrl: '/gallery/789216602_1798824631145335_6012517010743133903_n.jpg',
    youtubeUrl: null,
    captionId: 'Kegiatan bersama jemaat di aula',
    captionEn: 'Congregation activity in the hall',
    sortOrder: 16,
  },
  {
    type: 'image',
    imageUrl: '/gallery/789490298_1798823971145401_7778904209668799238_n.jpg',
    youtubeUrl: null,
    captionId: 'Kegiatan bersama jemaat di aula',
    captionEn: 'Congregation activity in the hall',
    sortOrder: 17,
  },
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

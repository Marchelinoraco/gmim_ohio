/**
 * Konfigurasi situs statis.
 *
 * `comingSoon` — saat `true`, `/` merender halaman "segera hadir" dan
 * `SiteHeader` menyembunyikan 7 nav + CTA + hamburger (route-nya belum ada).
 * Rencana 2 menyetel `false` begitu route asli (`/tentang`, `/jadwal`, dst.)
 * tersedia.
 *
 * Data di sini adalah placeholder yang bisa diedit tanpa sentuh komponen; di
 * Rencana 2 sebagian pindah ke tabel Site Settings.
 */
export const SITE = {
  comingSoon: true,
  name: 'GMIM Musafir Columbus Ohio',
  address: '895 Old Diley Road, Columbus, Ohio',
  mapsUrl: 'https://www.google.com/maps/search/?api=1&query=895+Old+Diley+Road+Columbus+Ohio',
  facebookUrl: 'https://www.facebook.com/gmimmusafir.columbus/',
  hero: {
    poster: '/hero/hero-poster.jpg',
    sources: [{ src: '/hero/hero.mp4', type: 'video/mp4' }],
  },
} as const

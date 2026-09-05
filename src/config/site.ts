/**
 * Konfigurasi situs statis.
 *
 * `comingSoon` — `false` sejak Rencana 2b: situs publik penuh sudah diluncurkan.
 *
 * APA YANG FLAG INI SUNGGUH LAKUKAN SEKARANG (tiga hal, semuanya saat `true`):
 *  1. `SiteHeader` (`src/components/layout/site-header.tsx`) menyembunyikan 7
 *     nav + CTA Live/Persembahan + tombol hamburger; sisa brand + tema + bahasa.
 *  2. `SiteFooter` (`src/components/layout/site-footer.tsx`) menyembunyikan
 *     `<SiteMapFooter>` (peta situs).
 *  3. `pageMeta` (`src/lib/seo.ts`) memancarkan
 *     `<meta name="robots" content="noindex, follow">` di tiap halaman.
 *
 * APA YANG TIDAK LAGI DILAKUKANNYA: mengembalikan halaman "segera hadir".
 * `src/components/site/coming-soon.tsx` DIHAPUS di Rencana 2b dan `index.tsx`
 * tidak bercabang lagi — membalik flag ini ke `true` hari ini tetap merender
 * `<Beranda>` penuh di `/`, dan `/sitemap.xml` tetap memancarkan sepuluh path
 * statis. Hasilnya bukan situs coming-soon melainkan situs RUSAK: semua halaman
 * masih ada, masih tertaut dari beranda dan sitemap, hanya saja tanpa navigasi.
 *
 * Jadi: `comingSoon = true` BUKAN cara sah untuk "menutup" situs. Kalau situs
 * benar-benar perlu ditutup, lakukan di lapisan yang tepat — hentikan/pause
 * deployment di Vercel, atau pasang gerbang di server (redirect/`503` untuk
 * semua route) plus `robots.txt` yang melarang crawl. Kalau yang diinginkan
 * benar halaman "segera hadir", komponennya harus dibangun ulang lebih dulu
 * (lihat riwayat git sebelum Rencana 2b) dan `/` + `sitemap.xml` di-gate ulang
 * ke flag ini.
 *
 * Data di sini adalah placeholder yang bisa diedit tanpa sentuh komponen; di
 * Rencana 3 sebagian pindah ke tabel Site Settings.
 */
export const SITE = {
  comingSoon: false,
  name: 'GMIM Musafir Columbus Ohio',
  // Base URL produksi (tanpa trailing slash) — sumber tunggal untuk URL absolut
  // di OG tags, canonical, dan hreflang. Jangan sebar literal domain di tempat lain.
  url: 'https://gmimmusafir.org',
  address: '895 Old Diley Road, Columbus, Ohio',
  mapsUrl: 'https://www.google.com/maps/search/?api=1&query=895+Old+Diley+Road+Columbus+Ohio',
  facebookUrl: 'https://www.facebook.com/gmimmusafir.columbus/',
  hero: {
    poster: '/hero/hero-poster.jpg',
    sources: [{ src: '/hero/hero.mp4', type: 'video/mp4' }],
  },
} as const

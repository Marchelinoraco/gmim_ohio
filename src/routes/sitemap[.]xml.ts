import { createFileRoute } from '@tanstack/react-router'
import { buildSitemapXml, type SitemapEntry } from '@/lib/sitemap'

/**
 * `GET /sitemap.xml` — dokumen sitemap bilingual (`public/robots.txt` sudah
 * mengiklankannya, jadi crawler PASTI menjemputnya di produksi).
 *
 * Sejak Rencana 2b (`SITE.comingSoon = false`), sitemap SELALU memancarkan
 * seluruh path statis publik + entri dinamis konten terbit (warta, renungan,
 * galeri, jadwal ibadah) — tanpa gerbang.
 */

// 10 route publik. `/pelayanan` dan `/jadwal` ditambahkan Rencana 2b begitu
// route-nya tersedia — melisting URL yang 404 adalah cacat SEO (standing
// pre-flight ruling).
const STATIC_PATHS = [
  '/',
  '/tentang',
  '/warta',
  '/renungan',
  '/galeri',
  '/kunjungi',
  '/persembahan',
  '/ibadah-live',
  '/pelayanan',
  '/jadwal',
] as const

/**
 * `updatedAt` (kolom `timestamptz` → `Date`) → `"YYYY-MM-DD"`.
 *
 * `toISOString()` memberi tanggal UTC — bisa sehari di depan Eastern dekat
 * tengah malam. Sengaja diterima di sini: `lastmod` cuma petunjuk kesegaran
 * untuk crawler, bukan tanggal yang ditampilkan; tidak sepadan menyeret
 * `TZDate` (`@/lib/datetime`) hanya untuk ini.
 */
function toYmd(value: Date): string {
  return value.toISOString().slice(0, 10)
}

/**
 * Entri `/warta/<id>`, `/renungan/<slug>`, `/galeri/<id>`, `/jadwal/<id>` untuk
 * konten terbit.
 *
 * Memakai server fn fitur yang sudah ada (`listBulletins` / `listDevotionals` /
 * `listGalleryAlbums` / `listServices`) alih-alih query langsung: keempatnya
 * sudah mengunci filter `status = 'published'` dan disiplin `await
 * import('@/db')` lazy yang dipakai seluruh repo, dan sudah punya cakupan test
 * sendiri. `listServices({ data: {} })` tanpa filter = seluruh ibadah terbit
 * dari hari ini (Eastern) ke depan. Dipanggil dari server route handler =
 * eksekusi handler langsung (bukan HTTP round-trip). `lastmod` = `updatedAt`
 * baris (kapan konten halaman terakhir berubah — yang paling bermakna untuk
 * crawler).
 */
async function listPublishedEntries(): Promise<SitemapEntry[]> {
  const { listBulletins } = await import('@/features/content/bulletins')
  const { listDevotionals } = await import('@/features/content/devotionals')
  const { listGalleryAlbums } = await import('@/features/content/gallery')
  const { listServices } = await import('@/features/schedule/services')

  const [bulletins, devotionals, albums, services] = await Promise.all([
    listBulletins(),
    listDevotionals(),
    listGalleryAlbums(),
    listServices({ data: {} }),
  ])

  return [
    ...bulletins.map((b) => ({ path: `/warta/${b.id}`, lastmod: toYmd(b.updatedAt) })),
    ...devotionals.map((d) => ({ path: `/renungan/${d.slug}`, lastmod: toYmd(d.updatedAt) })),
    ...albums.map((a) => ({ path: `/galeri/${a.id}`, lastmod: toYmd(a.updatedAt) })),
    ...services.map((s) => ({ path: `/jadwal/${s.id}`, lastmod: toYmd(s.updatedAt) })),
  ]
}

export const Route = createFileRoute('/sitemap.xml')({
  server: {
    handlers: {
      GET: async () => {
        const staticEntries: SitemapEntry[] = STATIC_PATHS.map((path) => ({ path }))
        let entries: SitemapEntry[]
        // Endpoint yang dilihat crawler tak boleh 500 karena DB kedip sesaat —
        // degradasi ke entri statis. Bungkus HANYA query. Jangan buang isi baris
        // ke log.
        try {
          entries = [...staticEntries, ...(await listPublishedEntries())]
        } catch (err) {
          console.error(
            'sitemap.xml: query konten gagal — memakai entri statis saja:',
            err instanceof Error ? err.message : 'penyebab tak diketahui',
          )
          entries = staticEntries
        }

        const xml = buildSitemapXml(entries)
        return new Response(xml, {
          headers: {
            'Content-Type': 'application/xml; charset=utf-8',
            // Sitemap berubah pelan (konten baru masuk lewat dashboard, bukan tiap
            // menit); 1 jam cukup segar untuk crawler dan meredam beban DB dari
            // bot yang menjemput berulang.
            'Cache-Control': 'public, max-age=3600',
          },
        })
      },
    },
  },
})

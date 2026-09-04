/**
 * Penyusun dokumen `sitemap.xml` — murni, tanpa server maupun DB, jadi bisa
 * diuji unit tanpa menyalakan apa pun.
 *
 * `localeUrl` di-re-export dari `@/lib/seo`: URL absolut sadar-locale di sitemap
 * WAJIB identik dengan yang dipancarkan `pageMeta` (canonical + tiga alternate
 * hreflang), supaya Google melihat satu himpunan URL yang konsisten. Definisi
 * tunggalnya ada di `seo.ts`; modul ini hanya meminjam — tak ada salinan kedua.
 *
 * Bentuk keluaran: SATU `<url>` per entry, memakai URL `id` sebagai `<loc>`,
 * dengan tiga `<xhtml:link rel="alternate" hreflang="id|en|x-default">` di
 * dalamnya (`x-default` = URL id). Ini cara kanonik menyatakan sitemap bilingual
 * dan menghindari `<loc>` ganda untuk path yang sama.
 */
import { localeUrl } from '@/lib/seo'

export { localeUrl }

export type SitemapEntry = {
  /** Path route, mis. `/`, `/warta`, `/warta/<id>`. */
  path: string
  /** Opsional `YYYY-MM-DD`. */
  lastmod?: string
}

/**
 * Escape kelima karakter yang bermakna di XML. Id & slug memang berasal dari DB
 * (tepercaya), tapi meng-escape nilai yang di-interpolasi ke dokumen yang kita
 * SAJIKAN bukan hal opsional. `&` di-escape lebih dulu supaya `<` → `&lt;` tak
 * jadi `&amp;lt;`.
 */
function xmlEscape(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

/**
 * Satu blok `<url>…</url>` (URL id sebagai `<loc>`, 3 alternate, `lastmod`
 * opsional). Urutan anak mengikuti XSD sitemap 0.9 — `<url>` adalah sequence
 * terurut: `<loc>` → `<lastmod>` → ekstensi (`<xhtml:link>`). Google toleran
 * terhadap urutan lain, validator ketat tidak.
 */
function urlBlock(entry: SitemapEntry): string {
  const idUrl = xmlEscape(localeUrl(entry.path, 'id'))
  const enUrl = xmlEscape(localeUrl(entry.path, 'en'))
  const lines = ['  <url>', `    <loc>${idUrl}</loc>`]
  if (entry.lastmod) lines.push(`    <lastmod>${xmlEscape(entry.lastmod)}</lastmod>`)
  lines.push(
    `    <xhtml:link rel="alternate" hreflang="id" href="${idUrl}"/>`,
    `    <xhtml:link rel="alternate" hreflang="en" href="${enUrl}"/>`,
    `    <xhtml:link rel="alternate" hreflang="x-default" href="${idUrl}"/>`,
    '  </url>',
  )
  return lines.join('\n')
}

/** Dokumen sitemap lengkap untuk `entries` (urutan dipertahankan). */
export function buildSitemapXml(entries: SitemapEntry[]): string {
  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">',
    ...entries.map(urlBlock),
    '</urlset>',
    '',
  ].join('\n')
}

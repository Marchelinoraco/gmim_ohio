/**
 * Helper SEO terpusat untuk situs publik.
 *
 * `pageMeta()` menghasilkan bentuk `{ meta, links }` yang sama persis dengan yang
 * dulu ditulis tangan di `head()` tiap route: `<title>`, `description`, tag
 * Open Graph + Twitter Card, `<link rel="canonical">`, dan tiga `<link
 * rel="alternate" hreflang>` (id, en, x-default). Semua URL absolut memakai
 * `SITE.url` sebagai sumber tunggal dan sadar-locale (`en` → prefiks `/en`).
 * `churchJsonLd()` menyusun JSON-LD `@type: Church` sekali untuk seluruh situs.
 *
 * Gotcha: serializer `head()` TanStack menuliskan kunci objek APA ADANYA sebagai
 * atribut HTML. Karena itu kuncinya `hreflang` (huruf kecil) — bukan `hrefLang`
 * gaya React DOM — supaya atribut yang keluar `hreflang="id"` yang idiomatis.
 *
 * Modul ini tidak meng-import Paraglide runtime: `locale` selalu diterima
 * eksplisit sebagai parameter (pemanggil meneruskan `getLocale()`).
 */
import { SITE } from '@/config/site'

/**
 * Bentuk elemen `links` di `head()`. TanStack mengetikkannya `unknown` dan tidak
 * mengekspor nama `LinkDescriptor`, jadi kita definisikan tipe struktural lokal
 * yang cukup untuk canonical + alternate hreflang.
 */
export type LinkDescriptor = { rel: string; href: string; hreflang?: string }

/**
 * Bentuk elemen `meta`. `MetaDescriptor` TanStack adalah union anggota-disjoint
 * (`{ title } | { name; content } | { charSet } | ...`), jadi akses kunci
 * langsung (`m.title`, `m.property`) tak ter-typecheck di atasnya. Struct
 * kunci-opsional ini menutup pola akses itu, mengetikkan nilainya
 * `string | undefined` (bukan `unknown`), dan tetap kena excess-property check
 * pada object literal di bawah sehingga kunci salah-ketik tertangkap.
 */
type MetaTag = {
  title?: string
  name?: string
  property?: string
  content?: string
}

interface PageMetaOpts {
  /** Path route, mis. `/warta`, `/warta/123`, `/`. */
  path: string
  titleId: string
  titleEn: string
  descId: string
  descEn: string
  locale: 'id' | 'en'
  /** Path relatif atau URL absolut. Default: `SITE.hero.poster`. */
  image?: string
}

/**
 * `SITE.url` + path sadar-locale. `en` diberi prefiks `/en`. Slash tunggal di
 * ekor dipangkas sehingga `path: '/'` menghasilkan `https://gmimmusafir.org`
 * (id) / `https://gmimmusafir.org/en` (en) — bukan `//` atau trailing slash.
 *
 * Di-`export` supaya `@/lib/sitemap` memancarkan URL absolut yang IDENTIK
 * dengan canonical + alternate hreflang di `pageMeta` — satu sumber, bukan dua
 * salinan yang bisa menyimpang.
 */
export function localeUrl(path: string, locale: 'id' | 'en'): string {
  const prefix = locale === 'en' ? '/en' : ''
  const url = `${SITE.url}${prefix}${path}`
  return url.endsWith('/') ? url.slice(0, -1) : url
}

/**
 * Menghasilkan `{ meta, links }` siap-pakai untuk `head()` sebuah route: judul,
 * deskripsi, tag Open Graph + Twitter Card, canonical, dan alternate hreflang
 * id/en/x-default. Pemanggil meneruskan `getLocale()` (dari `@/paraglide/runtime`)
 * sebagai `locale` supaya keluaran ikut request id vs `/en`.
 */
export function pageMeta(opts: PageMetaOpts): { meta: MetaTag[]; links: LinkDescriptor[] } {
  const { path, titleId, titleEn, descId, descEn, locale, image } = opts

  const title = `${locale === 'id' ? titleId : titleEn} — ${SITE.name}`
  const description = locale === 'id' ? descId : descEn
  const canonical = localeUrl(path, locale)
  const idUrl = localeUrl(path, 'id')
  const enUrl = localeUrl(path, 'en')
  const ogLocale = locale === 'en' ? 'en_US' : 'id_ID'
  const rawImage = image ?? SITE.hero.poster
  const ogImage = /^https?:\/\//.test(rawImage) ? rawImage : `${SITE.url}${rawImage}`

  return {
    meta: [
      { title },
      { name: 'description', content: description },
      { property: 'og:title', content: title },
      { property: 'og:description', content: description },
      { property: 'og:type', content: 'website' },
      { property: 'og:url', content: canonical },
      { property: 'og:image', content: ogImage },
      { property: 'og:site_name', content: SITE.name },
      { property: 'og:locale', content: ogLocale },
      { name: 'twitter:card', content: 'summary_large_image' },
      { name: 'twitter:title', content: title },
      { name: 'twitter:description', content: description },
    ],
    links: [
      { rel: 'canonical', href: canonical },
      // Sama untuk kedua locale: selalu id + en + x-default (= id).
      { rel: 'alternate', hreflang: 'id', href: idUrl },
      { rel: 'alternate', hreflang: 'en', href: enUrl },
      { rel: 'alternate', hreflang: 'x-default', href: idUrl },
    ],
  }
}

/**
 * JSON-LD `Church` untuk seluruh situs (dirender sekali di body `__root.tsx`).
 * Mengembalikan string JSON — bukan objek — karena disuntikkan lewat
 * `dangerouslySetInnerHTML` pada `<script type="application/ld+json">`.
 */
export function churchJsonLd(): string {
  const json = JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'Church',
    name: SITE.name,
    url: SITE.url,
    address: {
      '@type': 'PostalAddress',
      streetAddress: '895 Old Diley Road',
      addressLocality: 'Columbus',
      addressRegion: 'OH',
      addressCountry: 'US',
    },
    sameAs: [SITE.facebookUrl],
  })
  // Escape `<` — output disuntik via dangerouslySetInnerHTML ke <script>; ini
  // mencegah `</script>` di nilai mana pun (kelak) menutup tag lebih awal.
  // `JSON.parse` tetap round-trip (< → '<'), jadi test tak berubah.
  return json.replace(/</g, '\\u003c')
}

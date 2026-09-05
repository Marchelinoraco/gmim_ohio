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
 * Kunci link ditulis huruf kecil `hreflang` — BUKAN `hrefLang` gaya React DOM.
 * Serializer `head()` TanStack menuliskan kunci objek APA ADANYA sebagai nama
 * atribut HTML, jadi kunci = atribut yang keluar. Bukti langsung: saat kunci
 * sempat diubah ke `hrefLang`, halaman konten memancarkan literal
 * `<link ... hrefLang="id" ...>`, sementara head coming-soon `/` yang tak
 * tersentuh tetap `hreflang="id"` — serializer yang sama, render path yang sama,
 * ejaan kunci yang berbeda → atribut yang berbeda. (Head coming-soon itu sendiri
 * sudah tidak ada sejak Rencana 2b; paragraf ini catatan bukti historis.)
 *
 * Akibatnya React mencatat `Invalid DOM property 'hreflang'. Did you mean
 * 'hrefLang'?` di dev. Warning itu DITERIMA dengan sengaja: ia cuma derau konsol
 * dev, sedangkan alternatifnya (`hrefLang`) hanya "berfungsi" karena parsing
 * HTML5 meng-lowercase nama atribut. Untuk atribut sepenting hreflang di situs
 * publik gereja, output yang benar & idiomatis mengalahkan konsol yang sunyi.
 *
 * JANGAN ubah ke `hrefLang` — sudah pernah dicoba dan dibalik (lihat
 * `pre-merge-fix-report.md` §"Item 3 revert").
 *
 * Modul ini tidak meng-import Paraglide runtime: `locale` selalu diterima
 * eksplisit sebagai parameter (pemanggil meneruskan `getLocale()`).
 */
import { SITE } from '@/config/site'

/**
 * Gerbang `noindex`. `SITE.comingSoon` sekarang `false` (situs diluncurkan di
 * Rencana 2b), jadi jalur ini TIDAK aktif: `pageMeta` tidak memancarkan tag
 * `robots` sama sekali dan seluruh situs terindeks normal.
 *
 * Kalau flag itu dibalik ke `true`, tiap halaman yang memanggil `pageMeta` akan
 * memancarkan `<meta name="robots" content="noindex, follow">` — `follow`
 * (bukan `nofollow`) supaya ekuitas tautan tetap mengalir. Kodenya SENGAJA
 * dipertahankan sebagai satu-satunya bagian gerbang `comingSoon` yang masih
 * benar-benar bermakna; tapi lihat docblock `SITE.comingSoon`
 * (`src/config/site.ts`): membalik flag itu TIDAK lagi mengembalikan halaman
 * "segera hadir" dan BUKAN cara sah untuk menutup situs — `/` tetap merender
 * Beranda penuh dan `sitemap.xml` tetap memancarkan seluruh path statis.
 *
 * Indireksi bertipe `boolean` (sama seperti `site-footer.tsx` /
 * `site-header.tsx`): `SITE` `as const` menyempitkan `SITE.comingSoon` ke
 * literal `false`, menetapkan ke const bertipe `boolean` melebarkannya lagi.
 */
const comingSoon: boolean = SITE.comingSoon

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
      // Lihat docblock `comingSoon` di atas. Flag `false` sejak peluncuran, jadi
      // hari ini array ini selalu kosong dan tak ada tag `robots` yang keluar.
      ...(comingSoon ? [{ name: 'robots', content: 'noindex, follow' }] : []),
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
      // Kunci huruf kecil `hreflang` WAJIB — serializer menulisnya apa adanya
      // sbg nama atribut (lihat docblock; jangan ubah ke `hrefLang`).
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

import { describe, it, expect } from 'vitest'
import { buildSitemapXml, localeUrl, type SitemapEntry } from '@/lib/sitemap'

describe('localeUrl (re-export dari @/lib/seo)', () => {
  it('id: SITE.url + path tanpa prefix', () => {
    expect(localeUrl('/warta', 'id')).toBe('https://gmimmusafir.org/warta')
  })

  it('en: path berprefiks /en', () => {
    expect(localeUrl('/warta', 'en')).toBe('https://gmimmusafir.org/en/warta')
  })

  it('path "/" tidak menghasilkan "//" atau trailing slash', () => {
    expect(localeUrl('/', 'id')).toBe('https://gmimmusafir.org')
    expect(localeUrl('/', 'en')).toBe('https://gmimmusafir.org/en')
  })
})

describe('buildSitemapXml', () => {
  it('satu entry → XML well-formed: deklarasi + kedua namespace + <url> berpasangan', () => {
    const xml = buildSitemapXml([{ path: '/' }])
    expect(xml.startsWith('<?xml version="1.0" encoding="UTF-8"?>')).toBe(true)
    expect(xml).toContain(
      '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">',
    )
    expect(xml).toContain('</urlset>')
    expect((xml.match(/<url>/g) ?? []).length).toBe(1)
    expect((xml.match(/<\/url>/g) ?? []).length).toBe(1)
  })

  it('path "/" → <loc> tanpa "//" dan tanpa trailing slash', () => {
    const xml = buildSitemapXml([{ path: '/' }])
    expect(xml).toContain('<loc>https://gmimmusafir.org</loc>')
    expect(xml).not.toContain('<loc>https://gmimmusafir.org/</loc>')
    expect(xml).not.toContain('gmimmusafir.org//')
  })

  it('tiga <xhtml:link> alternate per <url>; x-default menunjuk URL id', () => {
    const xml = buildSitemapXml([{ path: '/warta' }])
    expect(xml).toContain(
      '<xhtml:link rel="alternate" hreflang="id" href="https://gmimmusafir.org/warta"/>',
    )
    expect(xml).toContain(
      '<xhtml:link rel="alternate" hreflang="en" href="https://gmimmusafir.org/en/warta"/>',
    )
    expect(xml).toContain(
      '<xhtml:link rel="alternate" hreflang="x-default" href="https://gmimmusafir.org/warta"/>',
    )
    expect((xml.match(/<xhtml:link /g) ?? []).length).toBe(3)
  })

  it('lastmod dipancarkan saat ada, dihilangkan saat tidak', () => {
    const withMod = buildSitemapXml([{ path: '/warta/abc', lastmod: '2026-08-30' }])
    expect(withMod).toContain('<lastmod>2026-08-30</lastmod>')

    const withoutMod = buildSitemapXml([{ path: '/warta/abc' }])
    expect(withoutMod).not.toContain('<lastmod>')
  })

  it('nilai yang perlu di-escape di-escape di <loc> maupun href', () => {
    const xml = buildSitemapXml([{ path: '/warta/a&b<c' }])
    expect(xml).toContain('https://gmimmusafir.org/warta/a&amp;b&lt;c')
    expect(xml).not.toContain('a&b<c')
    // `&` di-escape lebih dulu, jadi `&lt;` tidak jadi `&amp;lt;`.
    expect(xml).not.toContain('&amp;lt;')
  })

  it('banyak entry → satu <url> per entry, berurutan', () => {
    const entries: SitemapEntry[] = [{ path: '/' }, { path: '/warta' }, { path: '/galeri' }]
    const xml = buildSitemapXml(entries)
    expect((xml.match(/<url>/g) ?? []).length).toBe(3)
    expect(xml.indexOf('gmimmusafir.org/warta')).toBeLessThan(xml.indexOf('gmimmusafir.org/galeri'))
  })
})

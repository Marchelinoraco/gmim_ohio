import { describe, it, expect } from 'vitest'
import { pageMeta, churchJsonLd } from '@/lib/seo'

describe('pageMeta', () => {
  it('id: canonical & og:url tanpa prefix, alternate id/en/x-default', () => {
    const { meta, links } = pageMeta({
      path: '/warta',
      titleId: 'Warta',
      titleEn: 'Bulletin',
      descId: 'd',
      descEn: 'd',
      locale: 'id',
    })
    const canonical = links.find((l) => l.rel === 'canonical')
    expect(canonical?.href).toBe('https://gmimmusafir.org/warta')
    expect(links.filter((l) => l.rel === 'alternate')).toHaveLength(3)
    expect(meta.find((m) => m.title)?.title).toBe('Warta — GMIM Musafir Columbus Ohio')
    expect(meta.find((m) => m.property === 'og:url')?.content).toBe('https://gmimmusafir.org/warta')
  })
  it('en: canonical & og:url berprefiks /en', () => {
    const { links } = pageMeta({
      path: '/warta',
      titleId: 'Warta',
      titleEn: 'Bulletin',
      descId: 'd',
      descEn: 'd',
      locale: 'en',
    })
    expect(links.find((l) => l.rel === 'canonical')?.href).toBe('https://gmimmusafir.org/en/warta')
  })
  it('path "/" tidak menghasilkan "//"', () => {
    const { links } = pageMeta({
      path: '/',
      titleId: 'x',
      titleEn: 'x',
      descId: 'd',
      descEn: 'd',
      locale: 'en',
    })
    expect(links.find((l) => l.rel === 'canonical')?.href).toBe('https://gmimmusafir.org/en')
  })
  it('setelah peluncuran: TIDAK menyisipkan meta robots noindex', () => {
    const { meta } = pageMeta({
      path: '/warta',
      titleId: 'Warta',
      titleEn: 'Bulletin',
      descId: 'd',
      descEn: 'd',
      locale: 'id',
    })
    const robots = meta.find((m) => m.name === 'robots')
    expect(robots).toBeUndefined()
  })
})

describe('churchJsonLd', () => {
  it('JSON valid dengan @type Church + alamat', () => {
    const obj = JSON.parse(churchJsonLd())
    expect(obj['@type']).toBe('Church')
    expect(obj.address.streetAddress).toContain('895 Old Diley Road')
  })
})

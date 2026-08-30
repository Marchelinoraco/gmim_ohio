import { describe, it, expect } from 'vitest'
import { WORSHIP_CATEGORIES } from '@/db/seed/categories'
import { PLACEHOLDER_KOLOM } from '@/db/seed/kolom'
import { DEFAULT_SETTINGS } from '@/db/seed/settings'

describe('WORSHIP_CATEGORIES', () => {
  it('punya tepat 6 kategori dengan key unik', () => {
    expect(WORSHIP_CATEGORIES).toHaveLength(6)
    const keys = new Set(WORSHIP_CATEGORIES.map((c) => c.key))
    expect(keys.size).toBe(6)
  })

  it('slug unik dan url-safe', () => {
    const slugs = WORSHIP_CATEGORIES.map((c) => c.slug)
    expect(new Set(slugs).size).toBe(slugs.length)
    for (const s of slugs) expect(s).toMatch(/^[a-z0-9-]+$/)
  })

  it('setiap kategori punya nama id & en dan token warna', () => {
    for (const c of WORSHIP_CATEGORIES) {
      expect(c.nameId.length).toBeGreaterThan(0)
      expect(c.nameEn.length).toBeGreaterThan(0)
      expect(c.color).toMatch(/^var\(--color-cat-[a-z-]+\)$/)
    }
  })

  it('sortOrder berurut 1..6', () => {
    expect(WORSHIP_CATEGORIES.map((c) => c.sortOrder)).toEqual([1, 2, 3, 4, 5, 6])
  })
})

describe('PLACEHOLDER_KOLOM', () => {
  it('4 kolom bernomor 1..4', () => {
    expect(PLACEHOLDER_KOLOM).toHaveLength(4)
    expect(PLACEHOLDER_KOLOM.map((k) => k.number)).toEqual([1, 2, 3, 4])
    expect(PLACEHOLDER_KOLOM.map((k) => k.name)).toEqual(['Kolom 1', 'Kolom 2', 'Kolom 3', 'Kolom 4'])
  })
})

describe('DEFAULT_SETTINGS', () => {
  it('punya 7 key setting yang diharapkan', () => {
    expect(Object.keys(DEFAULT_SETTINGS).sort()).toEqual(
      [
        'contact_info',
        'giving_info',
        'hero',
        'live_stream',
        'pastoral_contacts',
        'service_times',
        'social_links',
      ].sort(),
    )
  })
})

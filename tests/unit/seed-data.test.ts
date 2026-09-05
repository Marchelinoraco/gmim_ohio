import { describe, it, expect } from 'vitest'
import { PLACEHOLDER_BULLETINS } from '@/db/seed/bulletins'
import { WORSHIP_CATEGORIES } from '@/db/seed/categories'
import { PLACEHOLDER_DEVOTIONALS } from '@/db/seed/devotionals'
import { PLACEHOLDER_ALBUM, PLACEHOLDER_ALBUM_ITEMS } from '@/db/seed/gallery'
import { PLACEHOLDER_KOLOM } from '@/db/seed/kolom'
import { buildService, SCHEDULE_TEMPLATES } from '@/db/seed/schedule'
import { DEFAULT_SETTINGS } from '@/db/seed/settings'

// Tag yang diizinkan sanitizer rich-text (`src/lib/sanitize.ts`). Body warta &
// renungan yang memakai tag lain akan dibuang diam-diam saat dirender.
const ALLOWED_TAGS = new Set([
  'h2',
  'h3',
  'h4',
  'p',
  'ul',
  'ol',
  'li',
  'strong',
  'em',
  'a',
  'br',
  'blockquote',
])

function expectWithinAllowlist(html: string) {
  expect(html).not.toMatch(/<script|<div|<img|<span|class=|style=|on\w+=/i)
  const tags = [...html.matchAll(/<\/?([a-z0-9]+)/gi)].map((m) => (m[1] ?? '').toLowerCase())
  expect(tags.length).toBeGreaterThan(0)
  for (const tag of tags) expect(ALLOWED_TAGS.has(tag)).toBe(true)
}

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
    expect(PLACEHOLDER_KOLOM.map((k) => k.name)).toEqual([
      'Kolom 1',
      'Kolom 2',
      'Kolom 3',
      'Kolom 4',
    ])
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

describe('PLACEHOLDER_BULLETINS', () => {
  it('3 warta, weekDate valid & unik, urut terbaru dulu', () => {
    expect(PLACEHOLDER_BULLETINS).toHaveLength(3)
    const dates = PLACEHOLDER_BULLETINS.map((b) => b.weekDate)
    expect(new Set(dates).size).toBe(3)
    for (const d of dates) expect(d).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    expect([...dates]).toEqual([...dates].sort().reverse())
  })

  it('tiap entri punya judul id & en, published, dan memenuhi CHECK konten', () => {
    for (const b of PLACEHOLDER_BULLETINS) {
      expect(b.titleId.trim().length).toBeGreaterThan(0)
      expect(b.titleEn.trim().length).toBeGreaterThan(0)
      expect(b.summaryId.trim().length).toBeGreaterThan(0)
      expect(b.summaryEn.trim().length).toBeGreaterThan(0)
      expect(b.status).toBe('published')
      // CHECK bulletin_has_content: pdf_url IS NOT NULL OR body_id IS NOT NULL
      expect(b.pdfUrl != null || (b.bodyId != null && b.bodyId.length > 0)).toBe(true)
    }
  })

  it('body HTML hanya memakai tag dalam allowlist sanitizer', () => {
    for (const b of PLACEHOLDER_BULLETINS) {
      if (b.bodyId) expectWithinAllowlist(b.bodyId)
      if (b.bodyEn) expectWithinAllowlist(b.bodyEn)
    }
  })
})

describe('PLACEHOLDER_DEVOTIONALS', () => {
  it('3 renungan dengan slug unik & url-safe', () => {
    expect(PLACEHOLDER_DEVOTIONALS).toHaveLength(3)
    const slugs = PLACEHOLDER_DEVOTIONALS.map((d) => d.slug)
    expect(new Set(slugs).size).toBe(slugs.length)
    for (const s of slugs) expect(s).toMatch(/^[a-z0-9-]+$/)
  })

  // `authorName` WAJIB byline non-personal. Renungan di seed ini teks karangan;
  // memberinya nama pendeta jemaat yang sungguhan (spec §1 mencatat Pdt. Allan
  // Robot, S.Th. sebagai pendeta GMIM Musafir) berarti menaruh tulisan di mulut
  // orang nyata. Menyebut beliau sebagai pendeta di `/tentang` tetap sah — itu
  // fakta dari spec; yang dilarang adalah atribusi karya yang tidak beliau tulis.
  it('tiap entri lengkap, published, dan authorName bukan nama orang sungguhan', () => {
    for (const d of PLACEHOLDER_DEVOTIONALS) {
      expect(d.titleId.trim().length).toBeGreaterThan(0)
      expect(d.titleEn.trim().length).toBeGreaterThan(0)
      expect(d.excerptId.trim().length).toBeGreaterThan(0)
      expect(d.excerptEn.trim().length).toBeGreaterThan(0)
      expect(d.publishedDate).toMatch(/^\d{4}-\d{2}-\d{2}$/)
      expect(d.status).toBe('published')
      expect(d.authorName).toBe('Tim Renungan')
    }
  })

  it('body HTML dalam allowlist dan memuat blockquote ayat', () => {
    for (const d of PLACEHOLDER_DEVOTIONALS) {
      expectWithinAllowlist(d.bodyId)
      expectWithinAllowlist(d.bodyEn)
      expect(d.bodyId).toMatch(/<blockquote>/)
      expect(d.bodyEn).toMatch(/<blockquote>/)
    }
  })
})

describe('SCHEDULE_TEMPLATES', () => {
  it('menutup keenam kategori tepat sekali kecuali yang memang ganda', () => {
    const keys = SCHEDULE_TEMPLATES.map((t) => t.categoryKey)
    expect(new Set(keys).size).toBe(6)
  })

  it('dayOfWeek 0-6 dan startTime format HH:mm:ss', () => {
    for (const t of SCHEDULE_TEMPLATES) {
      expect(t.dayOfWeek).toBeGreaterThanOrEqual(0)
      expect(t.dayOfWeek).toBeLessThanOrEqual(6)
      expect(t.startTime).toMatch(/^\d{2}:\d{2}:\d{2}$/)
    }
  })

  it('endTime (bila ada) setelah startTime dan formatnya konsisten', () => {
    for (const t of SCHEDULE_TEMPLATES) {
      expect(t.endTime).toMatch(/^\d{2}:\d{2}:\d{2}$/)
      expect(t.endTime > t.startTime).toBe(true)
    }
  })

  it('defaultLocationType hanya gedung_gereja atau rumah', () => {
    for (const t of SCHEDULE_TEMPLATES) {
      expect(['gedung_gereja', 'rumah']).toContain(t.defaultLocationType)
    }
  })

  // Tuan rumah SENGAJA tak pernah diisi generator (lihat INVARIAN di
  // `buildService`, `src/db/seed/schedule.ts`) — yang diuji di sini hanya
  // bahwa kolom memang ibadah rumah, bukan di gedung gereja.
  it('kategori kolom memakai lokasi rumah', () => {
    const kolomTpl = SCHEDULE_TEMPLATES.find((t) => t.categoryKey === 'kolom')
    expect(kolomTpl?.defaultLocationType).toBe('rumah')
  })
})

describe('galeri placeholder', () => {
  it('1 album published dengan cover, 3 item image urut 0..2', () => {
    expect(PLACEHOLDER_ALBUM.status).toBe('published')
    expect(PLACEHOLDER_ALBUM.coverImageUrl).toBe('/hero/hero-poster.jpg')

    expect(PLACEHOLDER_ALBUM_ITEMS).toHaveLength(3)
    expect(PLACEHOLDER_ALBUM_ITEMS.map((i) => i.sortOrder)).toEqual([0, 1, 2])

    for (const i of PLACEHOLDER_ALBUM_ITEMS) {
      expect(i.imageUrl).toBe('/hero/hero-poster.jpg')
      expect(i.youtubeUrl).toBeNull()
      expect((i.captionId ?? '').length).toBeGreaterThan(0)
      expect((i.captionEn ?? '').length).toBeGreaterThan(0)
    }
  })

  // Seed sengaja TIDAK memuat item `youtube`. Placeholder lamanya adalah video
  // YouTube populer yang tak ada hubungannya dengan gereja, bercaption
  // "Cuplikan ibadah Minggu" — di situs jemaat sungguhan itu terbaca sebagai
  // lelucon, bukan placeholder jujur. Asersi ini menguncinya.
  it('tidak ada item video placeholder', () => {
    expect(PLACEHOLDER_ALBUM_ITEMS.every((i) => i.type === 'image')).toBe(true)
  })
})

// Invarian integritas konten yang sudah GAGAL tiga kali di proyek ini (nama
// pelayan, nama tuan rumah, atribusi renungan): seed TIDAK PERNAH mengarang
// data tentang orang sungguhan. `buildService` diekspor khusus supaya invarian
// itu dikunci test, bukan sekadar prosa di docblock.
describe('buildService — tanpa fabrikasi orang', () => {
  type Args = Parameters<typeof buildService>[0]
  const cat = { id: 'cat-1' } as Args['cat']
  const asTpl = (t: (typeof SCHEDULE_TEMPLATES)[number]): Args['tpl'] =>
    ({ ...t, id: 'tpl-1', categoryId: 'cat-1' }) as Args['tpl']

  it('baris rumah TIDAK punya tuan rumah maupun alamat', () => {
    const tpl = SCHEDULE_TEMPLATES.find((t) => t.defaultLocationType === 'rumah')!
    for (let seq = 0; seq < 12; seq++) {
      const row = buildService({
        tpl: asTpl(tpl),
        cat,
        kolomRow: { id: 'kolom-1' } as Args['kolomRow'],
        date: '2026-09-09',
        seq,
      })
      expect(row.locationType).toBe('rumah')
      expect(row.hostFamilyName).toBeNull()
      expect(row.hostAddress).toBeNull()
    }
  })

  it('pelayan firman & pemimpin ibadah tak pernah dikarang', () => {
    for (const tpl of SCHEDULE_TEMPLATES) {
      const row = buildService({ tpl: asTpl(tpl), cat, kolomRow: null, date: '2026-09-09', seq: 0 })
      expect(row.preacherName).toBeNull()
      expect(row.liturgistName).toBeNull()
    }
  })
})

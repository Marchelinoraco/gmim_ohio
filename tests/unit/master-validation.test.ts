import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, it, expect } from 'vitest'
import { SETTING_SCHEMAS, SITE_SETTINGS_KEYS } from '@/features/content/site-settings'
import { CATEGORY_COLOR_TOKENS } from '@/db/schema/worship'

const CSS = readFileSync(fileURLToPath(new URL('../../src/styles/app.css', import.meta.url)), 'utf8')

describe('SETTING_SCHEMAS', () => {
  it('punya schema untuk SETIAP kunci setting', () => {
    for (const key of SITE_SETTINGS_KEYS) {
      expect(SETTING_SCHEMAS[key], `tidak ada schema untuk "${key}"`).toBeDefined()
    }
  })

  // Jalur tulis memakai schema yang sama dengan jalur baca. Kalau salah satu
  // kunci tak punya schema, mutasinya akan menulis apa pun tanpa diperiksa.
  it('menolak bentuk yang salah untuk contact_info', () => {
    expect(SETTING_SCHEMAS.contact_info.safeParse({ phone: 123 }).success).toBe(false)
  })

  it('menerima bentuk yang benar untuk contact_info', () => {
    const r = SETTING_SCHEMAS.contact_info.safeParse({
      phone: '+1 614 000 0000',
      email: 'a@b.test',
      officeHoursId: 'Senin–Jumat',
      officeHoursEn: 'Mon–Fri',
      mapsUrl: 'https://maps.google.com/?q=x',
      lat: null,
      lng: null,
    })
    expect(r.success, JSON.stringify(r.error?.issues)).toBe(true)
  })

  it('menerima giving_info dengan daftar rekening', () => {
    const r = SETTING_SCHEMAS.giving_info.safeParse({
      accounts: [{ bank: 'Bank A', number: '123', holder: 'GMIM Musafir' }],
      noteId: 'catatan',
      noteEn: 'note',
    })
    expect(r.success, JSON.stringify(r.error?.issues)).toBe(true)
  })
})

describe('CATEGORY_COLOR_TOKENS', () => {
  it('berisi enam token, satu per kategori', () => {
    expect(CATEGORY_COLOR_TOKENS).toHaveLength(6)
  })

  it('semuanya berbentuk var(--color-cat-*)', () => {
    for (const t of CATEGORY_COLOR_TOKENS) {
      expect(t).toMatch(/^var\(--color-cat-[a-z-]+\)$/)
    }
  })

  // Token yang tidak ada di app.css membuat badge kategori kehilangan warnanya,
  // dan gagalnya diam: CSS variable yang tak dikenal hanya menghasilkan nilai
  // kosong tanpa error apa pun.
  it('setiap token benar-benar terdefinisi di app.css', () => {
    for (const t of CATEGORY_COLOR_TOKENS) {
      const nama = t.slice('var('.length, -1)
      expect(CSS, `${nama} tidak ada di app.css`).toContain(`${nama}:`)
    }
  })
})

import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, it, expect } from 'vitest'
import { SETTING_SCHEMAS, SITE_SETTINGS_KEYS } from '@/features/content/site-settings'
import { CATEGORY_COLOR_TOKENS } from '@/db/schema/worship'
import {
  categoryInputSchema,
  kolomInputSchema,
  settingInputSchema,
} from '@/features/master/mutations'

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

const kategori = {
  id: '11111111-1111-4111-8111-111111111111',
  nameId: 'Ibadah Jemaat',
  nameEn: 'Congregational Service',
  slug: 'ibadah-jemaat',
  color: 'var(--color-cat-jemaat)',
  sortOrder: 1,
}

describe('categoryInputSchema', () => {
  it('menerima input yang sah', () => {
    const r = categoryInputSchema.safeParse(kategori)
    expect(r.success, JSON.stringify(r.error?.issues)).toBe(true)
  })

  // Hex di kolom ini memutus tema gelap: badge tetap memakai warna terang di
  // atas latar gelap, dan tak ada error apa pun yang muncul.
  it('menolak warna hex', () => {
    expect(categoryInputSchema.safeParse({ ...kategori, color: '#5b21b6' }).success).toBe(false)
  })

  it('menolak token yang tidak ada di daftar', () => {
    expect(
      categoryInputSchema.safeParse({ ...kategori, color: 'var(--color-cat-ngawur)' }).success,
    ).toBe(false)
  })

  it('menolak slug ber-spasi atau huruf kapital', () => {
    expect(categoryInputSchema.safeParse({ ...kategori, slug: 'Ibadah Jemaat' }).success).toBe(false)
  })

  it('menolak nama kosong', () => {
    expect(categoryInputSchema.safeParse({ ...kategori, nameId: '  ' }).success).toBe(false)
  })
})

const kolomBaru = { name: 'Kolom 5', number: 5, isActive: true }

describe('kolomInputSchema', () => {
  it('menerima input minimal', () => {
    const r = kolomInputSchema.safeParse(kolomBaru)
    expect(r.success, JSON.stringify(r.error?.issues)).toBe(true)
  })

  it('menolak nomor nol atau negatif', () => {
    expect(kolomInputSchema.safeParse({ ...kolomBaru, number: 0 }).success).toBe(false)
    expect(kolomInputSchema.safeParse({ ...kolomBaru, number: -1 }).success).toBe(false)
  })

  it('menolak nomor pecahan', () => {
    expect(kolomInputSchema.safeParse({ ...kolomBaru, number: 1.5 }).success).toBe(false)
  })

  it('mengubah koordinator kosong jadi null', () => {
    const r = kolomInputSchema.safeParse({ ...kolomBaru, coordinatorName: '  ' })
    expect(r.success).toBe(true)
    if (r.success) expect(r.data.coordinatorName).toBeNull()
  })
})

describe('settingInputSchema', () => {
  it('menerima key yang dikenal dengan nilai berbentuk benar', () => {
    const r = settingInputSchema.safeParse({
      key: 'social_links',
      value: { facebook: 'https://fb.test', instagram: '', youtube: '' },
    })
    expect(r.success, JSON.stringify(r.error?.issues)).toBe(true)
  })

  it('menolak key yang tidak dikenal', () => {
    expect(settingInputSchema.safeParse({ key: 'ngawur', value: {} }).success).toBe(false)
  })

  // Nilai divalidasi memakai schema yang SAMA dengan jalur baca. Tanpa ini,
  // form bisa menyimpan bentuk yang nanti ditolak halaman publik — dan
  // kerusakannya baru terlihat oleh pengunjung.
  it('menolak nilai yang bentuknya salah untuk key-nya', () => {
    expect(
      settingInputSchema.safeParse({ key: 'social_links', value: { facebook: 123 } }).success,
    ).toBe(false)
  })

  it('menolak nilai yang kekurangan field', () => {
    expect(settingInputSchema.safeParse({ key: 'service_times', value: { id: 'x' } }).success).toBe(
      false,
    )
  })
})

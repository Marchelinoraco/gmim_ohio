import { describe, it, expect } from 'vitest'
import { bulletinInputSchema } from '@/features/content/bulletin-mutations'
import { devotionalInputSchema } from '@/features/content/devotional-mutations'

const valid = {
  weekDate: '2026-10-04',
  titleId: 'Warta Minggu',
  titleEn: 'Weekly Bulletin',
  summaryId: 'Ringkasan',
  summaryEn: 'Summary',
  bodyId: '<p>isi</p>',
  bodyEn: '<p>body</p>',
  status: 'draft' as const,
}

describe('bulletinInputSchema', () => {
  it('menerima input yang sah', () => {
    expect(bulletinInputSchema.safeParse(valid).success).toBe(true)
  })

  it('menolak tanggal yang tidak ada di kalender', () => {
    expect(bulletinInputSchema.safeParse({ ...valid, weekDate: '2026-02-30' }).success).toBe(false)
  })

  it('menolak judul kosong', () => {
    expect(bulletinInputSchema.safeParse({ ...valid, titleId: '   ' }).success).toBe(false)
  })

  // Constraint `bulletin_has_content` di database mewajibkan pdfUrl ATAU bodyId.
  // Divalidasi di sini supaya pengurus dapat pesan yang bisa dipahami, bukan
  // error constraint mentah dari Postgres.
  it('menolak warta tanpa body dan tanpa PDF', () => {
    const r = bulletinInputSchema.safeParse({ ...valid, bodyId: '', bodyEn: '', pdfUrl: '' })
    expect(r.success).toBe(false)
  })

  it('menerima warta ber-PDF tanpa body', () => {
    const r = bulletinInputSchema.safeParse({
      ...valid,
      bodyId: '',
      bodyEn: '',
      pdfUrl: 'https://contoh.test/warta.pdf',
    })
    expect(r.success).toBe(true)
  })

  it('menerima warta ber-body tanpa PDF', () => {
    expect(bulletinInputSchema.safeParse({ ...valid, pdfUrl: '' }).success).toBe(true)
  })

  it('menolak pdfUrl yang bukan http/https', () => {
    const r = bulletinInputSchema.safeParse({ ...valid, pdfUrl: 'javascript:alert(1)' })
    expect(r.success).toBe(false)
  })

  // Body yang isinya cuma markup kosong dari editor bukan body sungguhan.
  // Tiptap menghasilkan `<p></p>` untuk editor yang dikosongkan.
  it('menganggap body kosong-versi-editor sebagai tidak ada', () => {
    const r = bulletinInputSchema.safeParse({
      ...valid,
      bodyId: '<p></p>',
      bodyEn: '<p><br></p>',
      pdfUrl: '',
    })
    expect(r.success).toBe(false)
  })
})

const renungan = {
  slug: 'hidup-dalam-syukur',
  titleId: 'Hidup dalam Syukur',
  titleEn: 'Living in Gratitude',
  authorName: 'Tim Renungan',
  publishedDate: '2026-10-04',
  excerptId: 'Kutipan',
  excerptEn: 'Excerpt',
  bodyId: '<p>isi</p>',
  bodyEn: '<p>body</p>',
  status: 'draft' as const,
}

describe('devotionalInputSchema', () => {
  it('menerima input yang sah', () => {
    expect(devotionalInputSchema.safeParse(renungan).success).toBe(true)
  })

  // Slug masuk ke URL publik `/renungan/<slug>`. Spasi dan huruf kapital di sana
  // menghasilkan tautan yang rusak atau ter-encode aneh.
  it('menolak slug ber-spasi atau huruf kapital', () => {
    expect(devotionalInputSchema.safeParse({ ...renungan, slug: 'Hidup Dalam' }).success).toBe(false)
    expect(devotionalInputSchema.safeParse({ ...renungan, slug: 'Hidup' }).success).toBe(false)
  })

  it('menerima slug huruf kecil, angka, dan tanda hubung', () => {
    expect(devotionalInputSchema.safeParse({ ...renungan, slug: 'renungan-2' }).success).toBe(true)
  })

  // `bodyId`/`bodyEn` NOT NULL di schema — berbeda dari warta.
  it('menolak body kosong di salah satu bahasa', () => {
    expect(devotionalInputSchema.safeParse({ ...renungan, bodyId: '<p></p>' }).success).toBe(false)
    expect(devotionalInputSchema.safeParse({ ...renungan, bodyEn: '' }).success).toBe(false)
  })

  it('menolak tanggal yang tidak ada di kalender', () => {
    expect(
      devotionalInputSchema.safeParse({ ...renungan, publishedDate: '2026-02-30' }).success,
    ).toBe(false)
  })

  it('menolak coverImageUrl yang bukan http/https', () => {
    const r = devotionalInputSchema.safeParse({ ...renungan, coverImageUrl: 'javascript:alert(1)' })
    expect(r.success).toBe(false)
  })
})

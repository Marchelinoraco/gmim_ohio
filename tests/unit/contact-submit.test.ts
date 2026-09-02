import { describe, it, expect } from 'vitest'
import { contactSchema, checkRateLimit } from '@/features/contact/submit'

/**
 * Uji logika murni form kontak: schema Zod + helper rate-limit. Handler server fn
 * (insert DB + notifikasi Resend) TIDAK diuji di sini — logikanya dibawa oleh dua
 * unit murni ini, jadi tak perlu scaffold `vi.mock('@/db')`.
 */

const valid = {
  name: 'Budi Santoso',
  email: 'budi@example.com',
  message: 'Halo, saya ingin bertanya tentang jadwal ibadah minggu ini.',
}

describe('contactSchema', () => {
  it('menerima payload valid tanpa phone & tanpa website', () => {
    expect(contactSchema.safeParse(valid).success).toBe(true)
  })

  it('menerima payload valid dengan phone', () => {
    expect(contactSchema.safeParse({ ...valid, phone: '+1 614 555 0100' }).success).toBe(true)
  })

  it('menerima payload valid TANPA website (honeypot opsional)', () => {
    const r = contactSchema.safeParse({ ...valid, website: undefined })
    expect(r.success).toBe(true)
  })

  it('website TERISI tetap lolos parse — honeypot bukan batasan schema, tapi cek handler', () => {
    const r = contactSchema.safeParse({ ...valid, website: 'http://spam.example/bot' })
    expect(r.success).toBe(true)
    if (r.success) expect(r.data.website).toBe('http://spam.example/bot')
  })

  it('memangkas spasi pada name & message', () => {
    const r = contactSchema.parse({
      ...valid,
      name: '  Budi Santoso  ',
      message: `  ${valid.message}  `,
    })
    expect(r.name).toBe('Budi Santoso')
    expect(r.message).toBe(valid.message)
  })

  it('menolak name < 2 karakter', () => {
    expect(contactSchema.safeParse({ ...valid, name: 'A' }).success).toBe(false)
  })

  it('menolak name > 100 karakter', () => {
    expect(contactSchema.safeParse({ ...valid, name: 'A'.repeat(101) }).success).toBe(false)
  })

  it('menolak email yang tidak berformat email', () => {
    expect(contactSchema.safeParse({ ...valid, email: 'bukan-email' }).success).toBe(false)
  })

  it('menolak email > 200 karakter', () => {
    const longEmail = `${'a'.repeat(195)}@example.com`
    expect(longEmail.length).toBeGreaterThan(200)
    expect(contactSchema.safeParse({ ...valid, email: longEmail }).success).toBe(false)
  })

  it('menolak message < 10 karakter', () => {
    expect(contactSchema.safeParse({ ...valid, message: 'pendek' }).success).toBe(false)
  })

  it('menolak message > 2000 karakter', () => {
    expect(contactSchema.safeParse({ ...valid, message: 'a'.repeat(2001) }).success).toBe(false)
  })

  it('menolak phone > 40 karakter', () => {
    expect(contactSchema.safeParse({ ...valid, phone: '1'.repeat(41) }).success).toBe(false)
  })
})

describe('checkRateLimit', () => {
  const freshStore = () => new Map<string, { count: number; resetAt: number }>()
  const WINDOW = 10 * 60 * 1000

  it('3 permintaan pertama lolos, ke-4 kena batas', () => {
    const store = freshStore()
    const now = 1_000
    expect(checkRateLimit('1.1.1.1', now, store)).toBe(false)
    expect(checkRateLimit('1.1.1.1', now, store)).toBe(false)
    expect(checkRateLimit('1.1.1.1', now, store)).toBe(false)
    expect(checkRateLimit('1.1.1.1', now, store)).toBe(true)
    expect(checkRateLimit('1.1.1.1', now, store)).toBe(true)
  })

  it('jendela waktu reset setelah resetAt lewat', () => {
    const store = freshStore()
    const start = 1_000
    for (let i = 0; i < 4; i += 1) checkRateLimit('2.2.2.2', start, store)
    expect(checkRateLimit('2.2.2.2', start, store)).toBe(true)
    expect(checkRateLimit('2.2.2.2', start + WINDOW + 1, store)).toBe(false)
  })

  it('dua IP berbeda tidak saling mengganggu', () => {
    const store = freshStore()
    const now = 1_000
    for (let i = 0; i < 4; i += 1) checkRateLimit('3.3.3.3', now, store)
    expect(checkRateLimit('3.3.3.3', now, store)).toBe(true)
    expect(checkRateLimit('4.4.4.4', now, store)).toBe(false)
  })

  it('memangkas entri kedaluwarsa supaya store tak tumbuh tanpa batas', () => {
    const store = freshStore()
    checkRateLimit('5.5.5.5', 1_000, store)
    expect(store.has('5.5.5.5')).toBe(true)
    checkRateLimit('6.6.6.6', 1_000 + WINDOW + 1, store)
    expect(store.has('5.5.5.5')).toBe(false)
  })
})

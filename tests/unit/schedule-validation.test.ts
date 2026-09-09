import { describe, it, expect } from 'vitest'
import { serviceInputSchema } from '@/features/schedule/mutations'

const valid = {
  // UUID v4 yang sah (nibble versi `4`, variant `8`) — `1111-…-1111` ditolak
  // Zod v4 karena bukan RFC 4122, dan database memang selalu menghasilkan v4.
  categoryId: '11111111-1111-4111-8111-111111111111',
  serviceDate: '2026-10-04',
  startTime: '10:00',
  locationType: 'gedung_gereja' as const,
  status: 'draft' as const,
}

describe('serviceInputSchema', () => {
  it('menerima input minimal yang sah', () => {
    expect(serviceInputSchema.safeParse(valid).success).toBe(true)
  })

  // `datetime.ts` parseDate menerima tanggal mustahil seperti 2026-02-30;
  // lapisan Zod harus menolaknya sebelum sampai ke helper mana pun.
  it('menolak tanggal yang tidak ada di kalender', () => {
    const r = serviceInputSchema.safeParse({ ...valid, serviceDate: '2026-02-30' })
    expect(r.success).toBe(false)
  })

  it('menolak format tanggal selain YYYY-MM-DD', () => {
    expect(serviceInputSchema.safeParse({ ...valid, serviceDate: '04/10/2026' }).success).toBe(false)
  })

  it('menolak jam di luar 00:00–23:59', () => {
    expect(serviceInputSchema.safeParse({ ...valid, startTime: '25:00' }).success).toBe(false)
  })

  it('menolak endTime lebih awal dari startTime', () => {
    const r = serviceInputSchema.safeParse({ ...valid, startTime: '10:00', endTime: '09:00' })
    expect(r.success).toBe(false)
  })

  it('menerima endTime setelah startTime', () => {
    const r = serviceInputSchema.safeParse({ ...valid, startTime: '10:00', endTime: '12:00' })
    expect(r.success).toBe(true)
  })

  // Ibadah di rumah tanpa penunjuk lokasi apa pun akan tayang sebagai
  // "Lokasi menyusul" selamanya tanpa ada yang sadar.
  it('menolak lokasi rumah tanpa tuan rumah maupun catatan lokasi', () => {
    const r = serviceInputSchema.safeParse({ ...valid, locationType: 'rumah' })
    expect(r.success).toBe(false)
  })

  it('menerima lokasi rumah bila tuan rumah diisi', () => {
    const r = serviceInputSchema.safeParse({
      ...valid,
      locationType: 'rumah',
      hostFamilyName: 'Kel. Contoh',
    })
    expect(r.success).toBe(true)
  })

  it('mengubah string kosong jadi null supaya kolom opsional tidak menyimpan ""', () => {
    const r = serviceInputSchema.safeParse({ ...valid, themeId: '', preacherName: '  ' })
    expect(r.success).toBe(true)
    if (r.success) {
      expect(r.data.themeId).toBeNull()
      expect(r.data.preacherName).toBeNull()
    }
  })
})

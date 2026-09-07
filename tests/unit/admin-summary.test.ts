import { describe, it, expect } from 'vitest'
import { hariTersisa } from '@/features/admin/summary'

/**
 * `hariTersisa` dipisah dari query supaya bisa diuji tanpa database. Inilah
 * angka yang membuat kedaluwarsa jadwal terlihat: seed Rencana 2b mengisi 8
 * minggu ke depan dan berhenti, dan tak ada satu pun permukaan yang menunjukkan
 * kapan ia habis sampai `/jadwal` mendadak kosong.
 */
describe('hariTersisa', () => {
  it('menghitung selisih hari', () => {
    expect(hariTersisa('2026-10-29', '2026-09-07')).toBe(52)
  })

  it('nol saat jadwal habis hari ini', () => {
    expect(hariTersisa('2026-09-07', '2026-09-07')).toBe(0)
  })

  it('negatif saat sudah lewat — jangan disembunyikan jadi nol', () => {
    expect(hariTersisa('2026-09-01', '2026-09-07')).toBe(-6)
  })

  it('null saat belum ada jadwal sama sekali', () => {
    expect(hariTersisa(null, '2026-09-07')).toBeNull()
  })
})

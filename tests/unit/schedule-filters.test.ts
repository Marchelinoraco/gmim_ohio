import { describe, it, expect } from 'vitest'
import { parseScheduleSearch } from '@/components/schedule/schedule-filters'

describe('parseScheduleSearch', () => {
  it('default: tampilan daftar, tanpa filter', () => {
    expect(parseScheduleSearch({})).toEqual({ view: 'daftar' })
  })
  it('menerima view kalender + bulan', () => {
    expect(parseScheduleSearch({ view: 'kalender', bulan: '2026-09' })).toEqual({
      view: 'kalender',
      bulan: '2026-09',
    })
  })
  it('view tak dikenal jatuh ke daftar', () => {
    expect(parseScheduleSearch({ view: 'grafik' }).view).toBe('daftar')
  })
  it('bulan berformat salah dibuang', () => {
    expect(parseScheduleSearch({ view: 'kalender', bulan: 'September' }).bulan).toBeUndefined()
  })
  it('meneruskan kategori & kolom sebagai string', () => {
    const s = parseScheduleSearch({ kategori: 'kaum-ibu', kolom: 'abc' })
    expect(s.kategori).toBe('kaum-ibu')
    expect(s.kolom).toBe('abc')
  })
  it('nilai non-string dibuang', () => {
    expect(parseScheduleSearch({ kategori: 42 }).kategori).toBeUndefined()
  })
})

import { describe, it, expect } from 'vitest'
import {
  toInstant,
  formatServiceDateTime,
  formatDateLong,
  isoWeekStart,
  datesForWeekday,
  todayEastern,
} from '@/lib/datetime'

describe('toInstant', () => {
  it('menafsirkan waktu sebagai wall-clock Eastern (musim panas, EDT = UTC-4)', () => {
    // 31 Agu 2026 10:00 Eastern = 14:00 UTC
    expect(toInstant('2026-08-31', '10:00').toISOString()).toBe('2026-08-31T14:00:00.000Z')
  })
  it('memperhitungkan musim dingin (EST = UTC-5)', () => {
    // 4 Jan 2026 10:00 Eastern = 15:00 UTC
    expect(toInstant('2026-01-04', '10:00').toISOString()).toBe('2026-01-04T15:00:00.000Z')
  })
  it('menerima HH:mm:ss', () => {
    expect(toInstant('2026-08-31', '18:30:00').toISOString()).toBe('2026-08-31T22:30:00.000Z')
  })
})

describe('formatServiceDateTime', () => {
  it('format Indonesia', () => {
    expect(formatServiceDateTime('2026-08-31', '10:00', 'id')).toBe(
      'Senin, 31 Agustus 2026 · 10.00',
    )
  })
  it('format Inggris', () => {
    expect(formatServiceDateTime('2026-08-31', '10:00', 'en')).toBe(
      'Monday, 31 August 2026 · 10:00 AM',
    )
  })
})

describe('formatDateLong', () => {
  it('id', () => {
    expect(formatDateLong('2026-08-31', 'id')).toBe('Senin, 31 Agustus 2026')
  })
})

describe('todayEastern', () => {
  it('memberi tanggal Eastern (bukan UTC) menjelang tengah malam — musim panas EDT', () => {
    // 2026-08-31 03:30 UTC = 2026-08-30 23:30 Eastern (EDT, UTC-4).
    expect(todayEastern(new Date('2026-08-31T03:30:00Z'))).toBe('2026-08-30')
  })
  it('menyeberang ke tanggal berikutnya tepat setelah tengah malam Eastern — musim panas EDT', () => {
    // 2026-08-31 04:30 UTC = 2026-08-31 00:30 Eastern.
    expect(todayEastern(new Date('2026-08-31T04:30:00Z'))).toBe('2026-08-31')
  })
  it('memberi tanggal Eastern menjelang tengah malam — musim dingin EST', () => {
    // 2026-01-15 04:30 UTC = 2026-01-14 23:30 Eastern (EST, UTC-5).
    expect(todayEastern(new Date('2026-01-15T04:30:00Z'))).toBe('2026-01-14')
  })
  it('menyeberang ke tanggal berikutnya tepat setelah tengah malam Eastern — musim dingin EST', () => {
    // 2026-01-15 05:30 UTC = 2026-01-15 00:30 Eastern.
    expect(todayEastern(new Date('2026-01-15T05:30:00Z'))).toBe('2026-01-15')
  })
})

describe('isoWeekStart', () => {
  it('mengembalikan Senin untuk tanggal di tengah minggu', () => {
    // 2026-08-31 adalah Senin
    expect(isoWeekStart('2026-09-02')).toBe('2026-08-31')
  })
  it('idempoten untuk hari Senin', () => {
    expect(isoWeekStart('2026-08-31')).toBe('2026-08-31')
  })
})

describe('datesForWeekday', () => {
  it('semua hari Minggu dalam September 2026', () => {
    expect(datesForWeekday('2026-09-01', '2026-09-30', 0)).toEqual([
      '2026-09-06',
      '2026-09-13',
      '2026-09-20',
      '2026-09-27',
    ])
  })
  it('rentang inklusif di kedua ujung', () => {
    expect(datesForWeekday('2026-09-06', '2026-09-13', 0)).toEqual(['2026-09-06', '2026-09-13'])
  })
  it('rentang tanpa kecocokan mengembalikan array kosong', () => {
    expect(datesForWeekday('2026-09-07', '2026-09-12', 0)).toEqual([])
  })
})

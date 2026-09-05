import { describe, it, expect } from 'vitest'
import { groupByDate, monthGrid } from '@/components/schedule/month-calendar'

const svc = (id: string, date: string) => ({ id, serviceDate: date }) as never

describe('groupByDate', () => {
  it('mengelompokkan per tanggal, urutan dipertahankan', () => {
    const out = groupByDate([
      svc('a', '2026-09-06'),
      svc('b', '2026-09-06'),
      svc('c', '2026-09-09'),
    ])
    expect(out.map((g) => g.date)).toEqual(['2026-09-06', '2026-09-09'])
    expect(out[0]?.services).toHaveLength(2)
  })
  it('array kosong → array kosong', () => {
    expect(groupByDate([])).toEqual([])
  })
})

describe('monthGrid', () => {
  it('tiap minggu berisi 7 hari', () => {
    for (const week of monthGrid('2026-09')) expect(week).toHaveLength(7)
  })
  it('minggu pertama memuat tanggal 1 bulan tsb', () => {
    expect(monthGrid('2026-09')[0]).toContain('2026-09-01')
  })
  it('dimulai hari Minggu', () => {
    // 2026-09-01 adalah Selasa → grid mulai 2026-08-30 (Minggu).
    expect(monthGrid('2026-09')[0]?.[0]).toBe('2026-08-30')
  })
  it('memuat hari terakhir bulan tsb', () => {
    expect(monthGrid('2026-09').flat()).toContain('2026-09-30')
  })
})

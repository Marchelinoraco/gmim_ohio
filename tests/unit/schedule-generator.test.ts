import { describe, it, expect } from 'vitest'
import { planServices } from '@/features/schedule/generator'

const tplJemaat = {
  id: 'tpl-jemaat',
  categoryId: 'cat-jemaat',
  categoryKey: 'ibadah_jemaat',
  dayOfWeek: 0,
  startTime: '10:00:00',
  endTime: '12:00:00',
  defaultLocationType: 'gedung_gereja' as const,
}
const tplKolom = {
  id: 'tpl-kolom',
  categoryId: 'cat-kolom',
  categoryKey: 'kolom',
  dayOfWeek: 3,
  startTime: '19:00:00',
  endTime: null,
  defaultLocationType: 'rumah' as const,
}
const kolomAktif = [{ id: 'k1' }, { id: 'k2' }, { id: 'k3' }, { id: 'k4' }]

describe('planServices', () => {
  it('satu ibadah per tanggal untuk kategori non-kolom', () => {
    // 2026-09-06 dan 2026-09-13 sama-sama Minggu.
    const out = planServices({
      templates: [tplJemaat],
      kolomAktif,
      from: '2026-09-06',
      to: '2026-09-13',
    })
    expect(out).toHaveLength(2)
    expect(out.map((s) => s.serviceDate)).toEqual(['2026-09-06', '2026-09-13'])
    expect(out.every((s) => s.kolomId === null)).toBe(true)
  })

  // Ini yang membuat index tiga-kolom perlu ada sejak awal.
  it('kategori kolom fan-out ke tiap kolom aktif', () => {
    // 2026-09-09 satu-satunya Rabu di rentang ini.
    const out = planServices({
      templates: [tplKolom],
      kolomAktif,
      from: '2026-09-07',
      to: '2026-09-12',
    })
    expect(out).toHaveLength(4)
    expect(out.map((s) => s.kolomId).sort()).toEqual(['k1', 'k2', 'k3', 'k4'])
    expect(new Set(out.map((s) => s.serviceDate))).toEqual(new Set(['2026-09-09']))
  })

  it('kategori kolom tanpa kolom aktif tidak menghasilkan apa pun', () => {
    const out = planServices({
      templates: [tplKolom],
      kolomAktif: [],
      from: '2026-09-07',
      to: '2026-09-12',
    })
    expect(out).toEqual([])
  })

  it('mewarisi jam dan tipe lokasi dari template', () => {
    const [s] = planServices({
      templates: [tplJemaat],
      kolomAktif,
      from: '2026-09-06',
      to: '2026-09-06',
    })
    expect(s).toMatchObject({
      templateId: 'tpl-jemaat',
      startTime: '10:00:00',
      endTime: '12:00:00',
      locationType: 'gedung_gereja',
    })
  })

  // Pengurus harus meninjau sebelum jemaat melihatnya.
  it('selalu menghasilkan draft, tidak pernah published', () => {
    const out = planServices({
      templates: [tplJemaat, tplKolom],
      kolomAktif,
      from: '2026-09-06',
      to: '2026-09-30',
    })
    expect(out.length).toBeGreaterThan(0)
    expect(out.every((s) => s.status === 'draft')).toBe(true)
  })

  it('rentang tanpa hari yang cocok menghasilkan kosong', () => {
    // 2026-09-07 Senin, 2026-09-08 Selasa — tak ada Minggu.
    expect(
      planServices({ templates: [tplJemaat], kolomAktif, from: '2026-09-07', to: '2026-09-08' }),
    ).toEqual([])
  })

  it('menggabungkan beberapa template dalam satu rencana', () => {
    const out = planServices({
      templates: [tplJemaat, tplKolom],
      kolomAktif,
      from: '2026-09-06',
      to: '2026-09-12',
    })
    // 1 Minggu (06) + 1 Rabu (09) × 4 kolom = 5
    expect(out).toHaveLength(5)
  })
})

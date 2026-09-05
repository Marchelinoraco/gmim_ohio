import { describe, it, expect } from 'vitest'
import { groupByKolom } from '@/components/schedule/kolom-group'

type Svc = { id: string; kolom: { id: string; name: string } | null }

const svc = (id: string, kolomId: string | null): Svc => ({
  id,
  kolom: kolomId ? { id: kolomId, name: 'x' } : null,
})

describe('groupByKolom', () => {
  it('mengelompokkan per id kolom, urutan grup mengikuti kolomList (bukan urutan services)', () => {
    const kolomList = [
      { id: 'k2', name: 'Kolom 2' },
      { id: 'k1', name: 'Kolom 1' },
    ]
    const services = [svc('a', 'k1'), svc('b', 'k2'), svc('c', 'k1')]
    const out = groupByKolom(services, kolomList)
    expect(out.map((g) => g.kolom.id)).toEqual(['k2', 'k1'])
    expect(out[0]?.services.map((s) => s.id)).toEqual(['b'])
    expect(out[1]?.services.map((s) => s.id)).toEqual(['a', 'c'])
  })

  it('kolom tanpa jadwal tetap muncul, dengan services kosong', () => {
    const out = groupByKolom([], [{ id: 'k1', name: 'Kolom 1' }])
    expect(out).toEqual([{ kolom: { id: 'k1', name: 'Kolom 1' }, services: [] }])
  })

  it('service dengan kolom null tidak masuk grup manapun', () => {
    const out = groupByKolom([svc('a', null)], [{ id: 'k1', name: 'Kolom 1' }])
    expect(out[0]?.services).toEqual([])
  })

  it('service yang kolom-nya tak ada di kolomList (mis. kolom nonaktif) diabaikan', () => {
    const out = groupByKolom([svc('a', 'inactive-id')], [{ id: 'k1', name: 'Kolom 1' }])
    expect(out[0]?.services).toEqual([])
  })

  it('kolomList kosong → array kosong', () => {
    expect(groupByKolom([svc('a', 'k1')], [])).toEqual([])
  })
})

import { describe, it, expect } from 'vitest'
import { assertSeedAllowed } from '@/db/seed/guard'

describe('assertSeedAllowed', () => {
  it('mengizinkan saat semua tabel konten kosong — ini setup pertama', () => {
    expect(() => assertSeedAllowed({ bulletins: 0, worship_services: 0 }, false)).not.toThrow()
  })

  it('menolak saat ada isi dan flag tidak diberikan', () => {
    expect(() => assertSeedAllowed({ bulletins: 3, worship_services: 72 }, false)).toThrow(
      /SEED_ALLOW_NON_EMPTY/,
    )
  })

  it('menyebut tabel mana yang berisi, supaya pesannya bisa ditindaklanjuti', () => {
    expect(() => assertSeedAllowed({ bulletins: 3, worship_services: 0 }, false)).toThrow(
      /bulletins \(3\)/,
    )
  })

  it('mengizinkan saat flag diberikan — keputusan sadar', () => {
    expect(() => assertSeedAllowed({ bulletins: 3 }, true)).not.toThrow()
  })
})

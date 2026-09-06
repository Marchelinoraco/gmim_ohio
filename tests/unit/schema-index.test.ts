import { describe, it, expect } from 'vitest'
import { getTableConfig } from 'drizzle-orm/pg-core'
import { worshipServices } from '@/db/schema'

/**
 * Bentuk index dibaca dari definisi Drizzle, bukan dari database — jadi test ini
 * jalan di CI tanpa Postgres dan tetap gagal begitu seseorang mengubah kolomnya.
 *
 * Yang dijaga: kategori `kolom` menghasilkan SATU ibadah per kolom aktif pada
 * tanggal dan template yang sama. Tanpa `kolom_id` di dalam unique index, baris
 * kedua dan seterusnya bentrok — dan generator jadwal yang memakai index ini
 * untuk idempotensi (`onConflictDoNothing`) akan diam-diam menyimpan 1 dari 4.
 */
describe('worship_services — ws_template_date_uq', () => {
  const { indexes } = getTableConfig(worshipServices)
  const uq = indexes.find((i) => i.config.name === 'ws_template_date_uq')

  it('ada dan unique', () => {
    expect(uq).toBeDefined()
    expect(uq?.config.unique).toBe(true)
  })

  it('mencakup kolom_id — tanpa itu fan-out kolom bentrok', () => {
    const cols = uq?.config.columns.map((c: unknown) => (c as { name?: string }).name)
    expect(cols).toEqual(['template_id', 'service_date', 'kolom_id'])
  })
})

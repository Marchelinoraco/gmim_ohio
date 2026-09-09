import { readFileSync, readdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, it, expect } from 'vitest'
import { getTableConfig } from 'drizzle-orm/pg-core'
import { worshipServices } from '@/db/schema'

/**
 * Dua hal dijaga di sini, dan versi pertama test ini hanya menjaga yang pertama.
 *
 * 1. BENTUK — kolom apa saja yang masuk unique. Dibaca dari definisi Drizzle,
 *    jadi jalan tanpa Postgres.
 * 2. SEMANTIK NULL — apakah dua baris dengan `kolom_id` sama-sama NULL dianggap
 *    bentrok. Ini yang benar-benar menentukan idempotensi generator untuk lima
 *    kategori non-kolom (kolom_id selalu NULL di sana), dan bentuk saja tidak
 *    bisa membuktikannya: index tiga-kolom yang "benar" tetap nol proteksi
 *    tanpa NULLS NOT DISTINCT. Dibaca dari SQL migrasi — artefak yang benar-
 *    benar dijalankan Postgres, bukan dari niat yang tertulis di schema.
 */
const DRIZZLE = fileURLToPath(new URL('../../drizzle', import.meta.url))

/** Gabungan seluruh SQL migrasi, urut nama file. */
function allMigrationSql(): string {
  return readdirSync(DRIZZLE)
    .filter((f) => f.endsWith('.sql'))
    .sort()
    .map((f) => readFileSync(`${DRIZZLE}/${f}`, 'utf8'))
    .join('\n')
}

describe('worship_services — ws_template_date_uq', () => {
  const { uniqueConstraints, indexes } = getTableConfig(worshipServices)

  it('mencakup ketiga kolom — tanpa kolom_id, fan-out kolom bentrok', () => {
    const uq = uniqueConstraints.find((c) => c.name === 'ws_template_date_uq')
    const idx = indexes.find((i) => i.config.name === 'ws_template_date_uq')
    const cols =
      uq?.columns.map((c) => c.name) ??
      idx?.config.columns.map((c: unknown) => (c as { name?: string }).name)
    expect(cols).toEqual(['template_id', 'service_date', 'kolom_id'])
  })

  it('memperlakukan NULL sebagai SAMA — tanpa ini, lima kategori non-kolom nol idempotensi', () => {
    const sql = allMigrationSql()
    // Cari pernyataan terakhir yang membuat constraint/index bernama itu.
    const statements = sql.split(';').filter((s) => s.includes('ws_template_date_uq'))
    const last = statements.at(-1) ?? ''
    expect(last.toUpperCase()).toContain('NULLS NOT DISTINCT')
  })
})

import { sql } from 'drizzle-orm'
import { timestamp, uuid } from 'drizzle-orm/pg-core'

// Kolom umum dipakai lintas tabel domain. PK domain = uuid gen_random_uuid()
// (Postgres 13+ punya bawaan, tanpa pgcrypto). Tabel auth (Task 9) tetap text id.
export const idPk = () =>
  uuid('id')
    .primaryKey()
    .default(sql`gen_random_uuid()`)

export const timestamps = {
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}

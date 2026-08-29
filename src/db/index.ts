import { attachDatabasePool } from '@vercel/functions'
import { drizzle } from 'drizzle-orm/node-postgres'
import { Pool } from 'pg'
import { env } from '@/lib/env'
import * as schema from './schema'

/**
 * Koneksi runtime aplikasi memakai URL pooled (`-pooler` host). Driver `pg`
 * (node-postgres) direkomendasikan Neon untuk TanStack Start di Vercel Fluid
 * Compute: function tetap warm sehingga koneksi TCP di-reuse antar invokasi.
 * Migrasi drizzle-kit memakai koneksi direct — lihat drizzle.config.ts.
 */
const pool = new Pool({ connectionString: env.DATABASE_URL })

// No-op di luar Vercel; di Vercel mengelola siklus hidup pool antar invokasi warm.
attachDatabasePool(pool)

export const db = drizzle({ client: pool, schema })

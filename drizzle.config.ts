import 'dotenv/config' // memuat .env
import { defineConfig } from 'drizzle-kit'

// Migrasi WAJIB memakai koneksi direct/unpooled (bukan `-pooler` host).
const url = process.env.DATABASE_URL_UNPOOLED ?? process.env.DATABASE_URL

if (!url) {
  throw new Error('DATABASE_URL_UNPOOLED atau DATABASE_URL wajib di-set untuk migrasi drizzle-kit')
}

export default defineConfig({
  out: './drizzle',
  schema: './src/db/schema/index.ts',
  dialect: 'postgresql',
  dbCredentials: { url },
})

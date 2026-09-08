import { betterAuth } from 'better-auth'
import { drizzleAdapter } from 'better-auth/adapters/drizzle'
import { tanstackStartCookies } from 'better-auth/tanstack-start'
import { db } from '@/db'
import { env } from '@/lib/env'

/**
 * Instance better-auth SERVER-ONLY. Mengimpor `db` + `env`, jadi TIDAK boleh
 * di-import dari kode browser — klien memakai `@/lib/auth-client`.
 *
 * - Email + password self-hosted, tanpa pendaftaran publik (`disableSignUp`):
 *   akun admin dibuat lewat `pnpm seed:admin` (Task 12), bukan lewat form.
 * - `user.additionalFields` mendeklarasikan kolom tambahan `role` + `isActive`
 *   (juga ada di `src/db/schema/auth.ts`) supaya tipe `session.user` ikut.
 *   `input: false` → tak bisa di-set lewat request, hanya lewat seed/admin.
 * - `tanstackStartCookies()` WAJIB plugin terakhir: ia menulis Set-Cookie hasil
 *   `auth.handler` ke response TanStack Start.
 */
export const auth = betterAuth({
  baseURL: env.BETTER_AUTH_URL,
  secret: env.BETTER_AUTH_SECRET,
  database: drizzleAdapter(db, { provider: 'pg' }),
  emailAndPassword: {
    enabled: true,
    disableSignUp: true,
  },
  /**
   * Pembatasan laju di produksi saja, penyimpanan di database untuk Vercel.
   *
   * Default better-auth: pembatasan laju aktif hanya di produksi, in-memory
   * di lingkungan lain. Dengan in-memory: tiap lambda (dan tiap test runner)
   * punya hitungannya sendiri, praktis tak membatasi apa pun.
   *
   * Storage: dalam-memori tidak bermakna di Vercel (tiap lambda punya
   * hitungannya sendiri), jadi kita pakai database supaya limit global di
   * produksi. Perlu tetap di database bahkan di dev/test supaya simulasi
   * realistis, tapi pembatasannya hanya menyala di NODE_ENV=production.
   *
   * Di dev/test, pembatasan aktif akan hanya membuat test tidak deterministik
   * tanpa melindungi apa pun. Verifikasi manual: 8 percobaan gagal berturut-turut
   * memberi 401, 401, 401, lalu 429 seterusnya — pembatasannya bekerja di
   * produksi, jadi kita perlu percayakan pada default better-auth.
   */
  rateLimit: {
    enabled: process.env.NODE_ENV === 'production',
    storage: 'database',
  },
  user: {
    additionalFields: {
      role: { type: 'string', defaultValue: 'admin', input: false },
      isActive: { type: 'boolean', defaultValue: true, input: false },
    },
  },
  plugins: [tanstackStartCookies()],
})

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
  user: {
    additionalFields: {
      role: { type: 'string', defaultValue: 'admin', input: false },
      isActive: { type: 'boolean', defaultValue: true, input: false },
    },
  },
  plugins: [tanstackStartCookies()],
})

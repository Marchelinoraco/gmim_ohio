import 'dotenv/config'
import { createLocalAccountIssuer } from 'better-auth'
import { eq } from 'drizzle-orm'
import { auth } from '@/lib/auth'
import { db } from '@/db'
import { user } from '@/db/schema'

/**
 * `pnpm seed:admin` — buat akun admin dari `SEED_ADMIN_EMAIL` /
 * `SEED_ADMIN_PASSWORD`. Idempoten: kalau user dengan email itu sudah ada,
 * berhenti tanpa mengubah apa pun.
 *
 * `emailAndPassword.disableSignUp: true` (Task 9) memblok `auth.api.signUpEmail`
 * server-side — handler-nya throw tanpa syarat. Jadi user + akun credential
 * dibuat lewat internal context better-auth, meniru jalur `sign-up.mjs`:
 *   - `ctx.internalAdapter.createUser(data, { method })` — verified 1.7.2:
 *     menerima & menyimpan additionalFields `role` / `isActive` langsung.
 *   - `ctx.internalAdapter.linkAccount({ providerId: 'credential', issuer, ... })`
 *     — `issuer = createLocalAccountIssuer('credential')` (`'local:credential'`);
 *     `sign-in.mjs` mencocokkan akun credential lewat kombinasi issuer + accountId.
 */
async function main() {
  const email = process.env.SEED_ADMIN_EMAIL
  const password = process.env.SEED_ADMIN_PASSWORD
  if (!email || !password) {
    throw new Error('SEED_ADMIN_EMAIL & SEED_ADMIN_PASSWORD wajib di-set di .env')
  }

  const existing = await db.select().from(user).where(eq(user.email, email))
  if (existing.length > 0) {
    console.log('Admin sudah ada:', email)
    process.exit(0)
  }

  const ctx = await auth.$context
  const passwordHash = await ctx.password.hash(password)

  const created = await ctx.internalAdapter.createUser(
    { email, name: 'Administrator', emailVerified: true, role: 'admin', isActive: true },
    { method: 'email-password' },
  )

  await ctx.internalAdapter.linkAccount({
    userId: created.id,
    providerId: 'credential',
    issuer: createLocalAccountIssuer('credential'),
    accountId: created.id,
    password: passwordHash,
  })

  console.log('Admin dibuat:', email, '(role=admin, isActive=true)')
  process.exit(0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})

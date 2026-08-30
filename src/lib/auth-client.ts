import { createAuthClient } from 'better-auth/react'

/**
 * Klien better-auth untuk BROWSER. Hanya mengimpor `better-auth/react` — TIDAK
 * boleh menyentuh `@/lib/auth`, `@/db`, atau `@/lib/env` (server-only). Tanpa
 * `baseURL`: klien memanggil `/api/auth/*` di origin yang sama.
 */
export const authClient = createAuthClient()

export const { signIn, signOut, useSession } = authClient

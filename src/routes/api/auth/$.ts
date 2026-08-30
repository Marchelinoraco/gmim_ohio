import { createFileRoute } from '@tanstack/react-router'

/**
 * Catch-all HTTP better-auth: `/api/auth/*` (sign-in, sign-out, get-session, …)
 * diteruskan apa adanya ke `auth.handler`. Plugin `tanstackStartCookies` di
 * `@/lib/auth` yang menaruh Set-Cookie ke response.
 *
 * `@/lib/auth` di-import LAZY di dalam tiap handler — bukan di top-level modul.
 * Route ini bagian statis dari route tree, jadi import top-level `@/lib/auth`
 * → `@/lib/env` (`schema.parse(process.env)` saat modul dimuat) akan membuat
 * `GET /` ikut 500 kalau env auth/DB salah/absen di environment mana pun.
 * Dengan lazy import, `env.ts` baru dievaluasi saat ada yang benar-benar
 * mengakses endpoint `/api/auth/*`.
 */
export const Route = createFileRoute('/api/auth/$')({
  server: {
    handlers: {
      GET: async ({ request }: { request: Request }) => {
        const { auth } = await import('@/lib/auth')
        return auth.handler(request)
      },
      POST: async ({ request }: { request: Request }) => {
        const { auth } = await import('@/lib/auth')
        return auth.handler(request)
      },
    },
  },
})

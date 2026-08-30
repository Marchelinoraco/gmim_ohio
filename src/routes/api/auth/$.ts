import { createFileRoute } from '@tanstack/react-router'
import { auth } from '@/lib/auth'

/**
 * Catch-all HTTP better-auth: `/api/auth/*` (sign-in, sign-out, get-session, …)
 * diteruskan apa adanya ke `auth.handler`. Plugin `tanstackStartCookies` di
 * `@/lib/auth` yang menaruh Set-Cookie ke response.
 */
export const Route = createFileRoute('/api/auth/$')({
  server: {
    handlers: {
      GET: ({ request }) => auth.handler(request),
      POST: ({ request }) => auth.handler(request),
    },
  },
})

import { createServerFn } from '@tanstack/react-start'
import { getRequestHeaders } from '@tanstack/react-start/server'
import { redirect } from '@tanstack/react-router'

/**
 * Server fn pembungkus better-auth. `auth.ts` server-only, jadi loader/route
 * memanggil helper ini (bukan `auth.api` langsung) supaya batas server/klien
 * tetap jelas.
 *
 * `@/lib/auth` di-import LAZY: import top-level menyeret `@/lib/env` ke graf
 * modul setiap route yang menyentuh file ini, sehingga env yang salah membuat
 * `/admin` membalas 500 alih-alih pesan yang berguna. Dicatat sebagai utang
 * teknis di `docs/dev/rencana-1-handoff.md` sejak Rencana 1.
 */
export const getSession = createServerFn({ method: 'GET' }).handler(async () => {
  const { auth } = await import('@/lib/auth')
  return auth.api.getSession({ headers: getRequestHeaders() })
})

export const ensureAdmin = createServerFn({ method: 'GET' }).handler(async () => {
  const { auth } = await import('@/lib/auth')
  const session = await auth.api.getSession({ headers: getRequestHeaders() })
  if (!session?.user || session.user.role !== 'admin' || !session.user.isActive) {
    throw redirect({ to: '/admin/login' })
  }
  return { user: session.user }
})

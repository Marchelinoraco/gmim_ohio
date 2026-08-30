import { createServerFn } from '@tanstack/react-start'
import { getRequestHeaders } from '@tanstack/react-start/server'
import { redirect } from '@tanstack/react-router'
import { auth } from '@/lib/auth'

/**
 * Server fn pembungkus better-auth. `auth.ts` server-only, jadi loader/route
 * memanggil helper ini (bukan `auth.api` langsung) supaya batas server/klien
 * tetap jelas.
 *
 * `/admin/login` belum ada (Rencana 3) — dipakai sebagai `href` mentah, bukan
 * route bertipe, supaya router tidak menolak target yang belum terdaftar.
 */

export const getSession = createServerFn({ method: 'GET' }).handler(async () => {
  return auth.api.getSession({ headers: getRequestHeaders() })
})

export const ensureAdmin = createServerFn({ method: 'GET' }).handler(async () => {
  const session = await auth.api.getSession({ headers: getRequestHeaders() })
  if (!session?.user || session.user.role !== 'admin' || session.user.isActive === false) {
    throw redirect({ href: '/admin/login' })
  }
  return { user: session.user }
})

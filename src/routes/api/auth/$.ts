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

/**
 * Jalankan handler better-auth, dan JANGAN biarkan galatnya hilang.
 *
 * Tanpa ini, apa pun yang dilempar di sini muncul sebagai
 * `{"status":500,"unhandled":true,"message":"HTTPError"}` — badan yang sama
 * untuk env yang salah, modul yang gagal dimuat, maupun database yang tak
 * terjangkau. Tidak ada yang bisa didiagnosis darinya, dan tidak ada apa pun
 * yang tercatat di log server.
 *
 * Rinciannya di-log SELALU (terbaca di log fungsi Vercel), tapi hanya
 * dikembalikan ke pemanggil bila diminta eksplisit lewat `?diag=1`. Respons
 * publik tetap generik: pesan galat internal bukan untuk pengunjung.
 */
async function tangani(request: Request): Promise<Response> {
  try {
    const { auth } = await import('@/lib/auth')
    return await auth.handler(request)
  } catch (err) {
    const rincian = {
      name: err instanceof Error ? err.name : typeof err,
      message: err instanceof Error ? err.message : String(err),
      cause:
        err instanceof Error && err.cause instanceof Error ? err.cause.message : undefined,
    }
    console.error('[api/auth] handler gagal:', rincian, err)

    const diag = new URL(request.url).searchParams.get('diag') === '1'
    return new Response(JSON.stringify(diag ? rincian : { error: 'auth_unavailable' }), {
      status: 500,
      headers: { 'content-type': 'application/json' },
    })
  }
}

export const Route = createFileRoute('/api/auth/$')({
  server: {
    handlers: {
      GET: ({ request }: { request: Request }) => tangani(request),
      POST: ({ request }: { request: Request }) => tangani(request),
    },
  },
})

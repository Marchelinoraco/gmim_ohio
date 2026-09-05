import * as m from '@/paraglide/messages'
import { getLocale, localizeHref } from '@/paraglide/runtime'
import { Button } from '@/components/ui/button'

/**
 * `<ErrorPage>` — batas error bertema & dwibahasa untuk SELURUH situs.
 *
 * Dipasang di DUA tempat, sengaja: `defaultErrorComponent` di `src/router.tsx`
 * (yang benar-benar menangkap error route anak) DAN `errorComponent` pada root
 * route di `src/routes/__root.tsx`. Root `errorComponent` SAJA TIDAK CUKUP —
 * di TanStack Router ia hanya menangkap error yang dilempar root route itu
 * sendiri; route anak tanpa `errorComponent` jatuh ke
 * `router.options.defaultErrorComponent`, yang secara default adalah komponen
 * `ErrorComponent` bawaan ("Something went wrong! / Hide Error" + dump pesan
 * error mentah). Diverifikasi langsung: dengan root `errorComponent` terpasang
 * tapi tanpa `defaultErrorComponent`, route anak yang melempar tetap merender
 * UI bawaan itu.
 *
 * Kenapa ini penting sejak Rencana 2b: `/` kini memanggil tiga server fn ke
 * Neon, dan Neon scale-to-zero pada situs gereja bertrafik rendah berarti
 * request pertama setelah idle memicu cold start yang bisa lewat timeout.
 *
 * Gaya, token tema, dan cara mengambil teks dari katalog mengikuti
 * `notFoundComponent` di `__root.tsx`. Detail teknis error SENGAJA tidak
 * ditampilkan: tak berguna bagi jemaat dan bisa membocorkan internal —
 * penyebabnya tetap sampai ke log server.
 */
export function ErrorPage() {
  const homeHref = localizeHref('/', { locale: getLocale() })
  return (
    <main className="mx-auto flex min-h-[50vh] max-w-2xl flex-col items-center justify-center gap-4 px-4 py-16 text-center">
      <h1 className="text-ink text-2xl font-semibold">{m.error_title()}</h1>
      <p className="text-muted">{m.error_body()}</p>
      <Button asChild variant="primary" size="md" className="h-11">
        <a href={homeHref}>{m.error_home()}</a>
      </Button>
    </main>
  )
}

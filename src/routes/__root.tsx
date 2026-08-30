import type { ReactNode } from 'react'
import { Outlet, createRootRoute, HeadContent, Scripts } from '@tanstack/react-router'
import appCss from '@/styles/app.css?url'
import * as m from '@/paraglide/messages'
import { getLocale, localizeHref } from '@/paraglide/runtime'
import { Button } from '@/components/ui/button'
import { SiteHeader } from '@/components/layout/site-header'
import { SiteFooter } from '@/components/layout/site-footer'
import { THEME_INIT_SCRIPT } from '@/lib/theme'
import { churchJsonLd } from '@/lib/seo'

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: 'utf-8' },
      { name: 'viewport', content: 'width=device-width, initial-scale=1' },
      { title: 'GMIM Musafir Columbus Ohio' },
    ],
    links: [
      // TODO(desainer): ganti dengan favicon.ico + logo-mark.svg proper
      // (mark sederhana Manguni + Mawar Luther). Sementara pakai PNG 64x64
      // hasil resize dari logo.png — non-blocking.
      { rel: 'icon', type: 'image/png', href: '/favicon.png' },
    ],
  }),
  notFoundComponent: NotFound,
  component: RootComponent,
})

function RootComponent() {
  return (
    <RootDocument>
      <Outlet />
    </RootDocument>
  )
}

function NotFound() {
  const homeHref = localizeHref('/', { locale: getLocale() })
  return (
    <main className="mx-auto flex min-h-[50vh] max-w-2xl flex-col items-center justify-center gap-4 px-4 py-16 text-center">
      <p className="text-primary font-serif text-6xl font-semibold">404</p>
      <h1 className="text-ink text-2xl font-semibold">{m.notfound_title()}</h1>
      <p className="text-muted">{m.notfound_body()}</p>
      <Button asChild variant="primary" size="md" className="h-11">
        <a href={homeHref}>{m.notfound_home()}</a>
      </Button>
    </main>
  )
}

function RootDocument({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang={getLocale()}>
      <head>
        {/* Anti-flash tema — dirender sebelum <link> stylesheet supaya
            data-theme terpasang sebelum paint. `<html>` TIDAK di-hardcode
            data-theme di SSR (server tak tahu preferensi user).

            Stylesheet app.css sengaja dirender di sini TANPA lewat route
            `head.links`: `HeadContent`/Asset menambah `precedence` pada tiap
            <link rel="stylesheet">, dan React 19 lalu meng-hoist link itu ke
            atas segala elemen non-hoistable (skrip inline) di <head>. Dengan
            merender <link> sendiri tanpa `precedence`, urutan sumber terjaga:
            skrip dulu, baru CSS. */}
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
        <link rel="stylesheet" href={appCss} />
        <HeadContent />
      </head>
      <body>
        <SiteHeader />
        {children}
        <SiteFooter />
        {/* JSON-LD Church — sekali, semua halaman. String JSON via
            dangerouslySetInnerHTML (bukan objek di head.meta) sesuai kontrak
            `churchJsonLd(): string`. */}
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: churchJsonLd() }} />
        <Scripts />
      </body>
    </html>
  )
}

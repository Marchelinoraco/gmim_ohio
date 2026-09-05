import { createRouter } from '@tanstack/react-router'
import { routeTree } from './routeTree.gen'
import { deLocalizeUrl, localizeUrl } from '@/paraglide/runtime'
import { ErrorPage } from '@/components/site/error-page'

export function getRouter() {
  return createRouter({
    routeTree,
    scrollRestoration: true,
    defaultPreload: 'intent',
    // Batas error seluruh situs. WAJIB di sini, bukan cuma `errorComponent` di
    // `__root.tsx`: route anak tanpa `errorComponent` sendiri jatuh ke opsi ini,
    // yang tanpa penyetelan adalah komponen bawaan TanStack ("Something went
    // wrong!" + dump error mentah, tanpa tema, tanpa terjemahan). Lihat docblock
    // `<ErrorPage>`.
    defaultErrorComponent: ErrorPage,
    rewrite: {
      input: ({ url }) => deLocalizeUrl(url),
      output: ({ url }) => localizeUrl(url),
    },
  })
}

declare module '@tanstack/react-router' {
  interface Register {
    router: ReturnType<typeof getRouter>
  }
}

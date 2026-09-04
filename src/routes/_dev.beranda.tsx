import { createFileRoute, notFound } from '@tanstack/react-router'
import { listBulletins } from '@/features/content/bulletins'
import { listUpcomingServices } from '@/features/schedule/services'
import { getSiteSettings } from '@/features/content/site-settings'
import { Beranda } from '@/components/site/beranda'
import { SiteMapFooter } from '@/components/site/site-map-footer'

export const Route = createFileRoute('/_dev/beranda')({
  // Halaman dev throwaway — tersedia hanya di `pnpm dev`. Di build produksi
  // (`import.meta.env.PROD`) route ini melempar 404 lewat notFoundComponent root.
  // `SITE.comingSoon` tetap `true` di Rencana 2a, jadi `/` masih coming-soon;
  // pratinjau `<Beranda>` hidup di sini sampai Rencana 2b memindahkannya ke `/`.
  beforeLoad: () => {
    if (import.meta.env.PROD) throw notFound()
  },
  loader: () => Promise.all([getSiteSettings(), listBulletins(), listUpcomingServices()]),
  component: DevBeranda,
})

// Halaman dev throwaway.
// TODO(2b): HAPUS file ini seluruhnya — `<Beranda>` pindah ke `/` saat
// `SITE.comingSoon = false`, dan route pratinjau ini tak lagi punya alasan ada.
function DevBeranda() {
  const [settings, bulletins, services] = Route.useLoaderData()
  return (
    <>
      <Beranda settings={settings} bulletins={bulletins} services={services} />
      {/* Footer root menekan <SiteMapFooter> selama `SITE.comingSoon` true (RULING
          3), jadi `/beranda` satu-satunya tempat meninjau peta situs sebelum 2b
          mengirimnya ke domain produksi gereja. Hanya satu salinan yang render —
          footer root tetap menekan miliknya. Aman: <SiteMapFooter> cuma pakai
          `getLocale()` + `localizeHref` + `m.*` — tanpa DB, tanpa loader. */}
      <SiteMapFooter />
    </>
  )
}

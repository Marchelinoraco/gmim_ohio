import { createFileRoute, notFound } from '@tanstack/react-router'
import { listBulletins } from '@/features/content/bulletins'
import { listUpcomingServices } from '@/features/schedule/services'
import { getSiteSettings } from '@/features/content/site-settings'
import { Beranda } from '@/components/site/beranda'

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

// Halaman dev throwaway (dihapus di Rencana 2b saat `<Beranda>` pindah ke `/`).
function DevBeranda() {
  const [settings, bulletins, services] = Route.useLoaderData()
  return <Beranda settings={settings} bulletins={bulletins} services={services} />
}

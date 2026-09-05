import { createFileRoute } from '@tanstack/react-router'
import { getLocale } from '@/paraglide/runtime'
import { listBulletins } from '@/features/content/bulletins'
import { listUpcomingServices } from '@/features/schedule/services'
import { getSiteSettings } from '@/features/content/site-settings'
import { pageMeta } from '@/lib/seo'
import { Beranda } from '@/components/site/beranda'

/**
 * `/` — Beranda penuh (sejak Rencana 2b, `SITE.comingSoon = false`). Loader
 * memuat settings + warta + jadwal ibadah paralel; `head` memakai `pageMeta`
 * tanpa syarat.
 */
export const Route = createFileRoute('/')({
  loader: () => Promise.all([getSiteSettings(), listBulletins(), listUpcomingServices()]),
  head: () =>
    pageMeta({
      path: '/',
      titleId: 'Beranda',
      titleEn: 'Home',
      descId:
        'GMIM Musafir Columbus Ohio — jemaat perantauan GMIM yang menaungi keluarga Minahasa-Indonesia di Columbus, Ohio: jadwal ibadah, warta, dan cara berkunjung.',
      descEn:
        'GMIM Musafir Columbus Ohio — a GMIM diaspora congregation for Minahasan-Indonesian families in Columbus, Ohio: service times, bulletins, and how to visit.',
      locale: getLocale(),
    }),
  component: Home,
})

function Home() {
  const [settings, bulletins, services] = Route.useLoaderData()
  return <Beranda settings={settings} bulletins={bulletins} services={services} />
}

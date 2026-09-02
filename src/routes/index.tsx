import { createFileRoute } from '@tanstack/react-router'
import * as m from '@/paraglide/messages'
import { getLocale } from '@/paraglide/runtime'
import { listBulletins } from '@/features/content/bulletins'
import { listUpcomingServices } from '@/features/schedule/services'
import { getSiteSettings } from '@/features/content/site-settings'
import { pageMeta } from '@/lib/seo'
import { SITE } from '@/config/site'
import { Beranda } from '@/components/site/beranda'
import { ComingSoon } from '@/components/site/coming-soon'

/**
 * `/` — switch antara halaman "segera hadir" (produksi live selama
 * `SITE.comingSoon`) dan `<Beranda>` penuh.
 *
 * `SITE.comingSoon` adalah literal `true`, jadi TS mempersempit setiap ternary di
 * bawah dan menganggap cabang `!comingSoon` unreachable (`loader` ter-narrow ke
 * `undefined`, `<Beranda>` dianggap kode mati). Dibaca lewat indireksi bertipe
 * `boolean` supaya KEDUA cabang tetap ter-typecheck. `SITE.comingSoon` TIDAK
 * diubah: di produksi tetap `true` dan `/` merender coming-soon byte-identik
 * dengan sebelumnya (diverifikasi: HTML `/` identik selain token waktu request).
 * `<Beranda>` hanya terlihat lewat `/beranda` (file `_dev.beranda.tsx`) sampai
 * Rencana 2b menyetel `SITE.comingSoon = false`.
 */
const comingSoon: boolean = SITE.comingSoon

export const Route = createFileRoute('/')({
  // Cabang coming-soon TIDAK memasang loader (bukan `() => null`): tanpa loader,
  // state hidrasi router keluar byte-identik dengan sebelum switch — `l:null` pun
  // tak ikut. Cabang Beranda memuat ketiga server fn paralel.
  loader: comingSoon
    ? undefined
    : () => Promise.all([getSiteSettings(), listBulletins(), listUpcomingServices()]),
  head: () => {
    if (!comingSoon) {
      return pageMeta({
        path: '/',
        titleId: 'Beranda',
        titleEn: 'Home',
        descId:
          'GMIM Musafir Columbus Ohio — jemaat perantauan GMIM yang menaungi keluarga Minahasa-Indonesia di Columbus, Ohio: jadwal ibadah, warta, dan cara berkunjung.',
        descEn:
          'GMIM Musafir Columbus Ohio — a GMIM diaspora congregation for Minahasan-Indonesian families in Columbus, Ohio: service times, bulletins, and how to visit.',
        locale: getLocale(),
      })
    }

    // ---- coming-soon head (byte-identik dengan versi sebelum switch) ----
    // `m.*` + `getLocale()` di sini resolve ke locale request (Paraglide
    // AsyncLocalStorage), jadi <title>/OG/canonical ikut id vs /en. Judul =
    // nama + status "segera hadir".
    const title = `${SITE.name} — ${m.coming_soon_status()}`
    const description = m.coming_soon_body()
    const locale = getLocale()
    // CTA situs = "bagikan ke Facebook", jadi unfurl link harus rapi: URL
    // absolut untuk og:image / og:url / canonical / hreflang.
    const idUrl = `${SITE.url}/`
    const enUrl = `${SITE.url}/en`
    const canonical = locale === 'en' ? enUrl : idUrl
    const ogImage = `${SITE.url}${SITE.hero.poster}`
    const ogLocale = locale === 'en' ? 'en_US' : 'id_ID'
    return {
      meta: [
        { title },
        { name: 'description', content: description },
        { property: 'og:title', content: title },
        { property: 'og:description', content: description },
        { property: 'og:type', content: 'website' },
        { property: 'og:image', content: ogImage },
        { property: 'og:url', content: canonical },
        { property: 'og:site_name', content: SITE.name },
        { property: 'og:locale', content: ogLocale },
        { name: 'twitter:card', content: 'summary_large_image' },
        { name: 'twitter:title', content: title },
        { name: 'twitter:description', content: description },
      ],
      links: [
        // Poster = elemen LCP halaman ini — preload agar muncul secepat mungkin.
        { rel: 'preload', as: 'image', href: SITE.hero.poster },
        { rel: 'canonical', href: canonical },
        // Kunci ditulis lowercase `hreflang` agar atribut HTML keluar idiomatis
        // (serializer head TanStack memakai kunci apa adanya).
        { rel: 'alternate', hreflang: 'id', href: idUrl },
        { rel: 'alternate', hreflang: 'en', href: enUrl },
        { rel: 'alternate', hreflang: 'x-default', href: idUrl },
      ],
    }
  },
  component: Home,
})

function Home() {
  const data = Route.useLoaderData()
  // Tanpa loader (coming-soon) → `data` undefined → coming-soon (produksi).
  // Ada loader (Beranda) → tuple 3 elemen.
  if (!data) return <ComingSoon />
  const [settings, bulletins, services] = data
  return <Beranda settings={settings} bulletins={bulletins} services={services} />
}

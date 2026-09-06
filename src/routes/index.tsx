import { createFileRoute } from '@tanstack/react-router'
import { getLocale } from '@/paraglide/runtime'
import { listBulletins } from '@/features/content/bulletins'
import { listRecentGalleryPhotos } from '@/features/content/gallery'
import { listServices } from '@/features/schedule/services'
import { getSiteSettings } from '@/features/content/site-settings'
import { addDays, todayEastern } from '@/lib/datetime'
import { pageMeta } from '@/lib/seo'
import { Beranda } from '@/components/site/beranda'

/**
 * `/` — Beranda penuh (sejak Rencana 2b, `SITE.comingSoon = false`). Loader
 * memuat settings + warta + jadwal ibadah paralel; `head` memakai `pageMeta`
 * tanpa syarat.
 *
 * Section "Ibadah Minggu Ini" memakai `listServices` dengan JENDELA 7 HARI
 * (`[todayEastern(), +6]`), BUKAN `listUpcomingServices()` yang limit-nya buta
 * (default 6). Alasannya aritmetika jadwal itu sendiri: kategori `kolom`
 * menghasilkan 4 ibadah pada satu tanggal (satu per kolom aktif), sehingga enam
 * kartu pertama sering habis SEBELUM hari Minggu — dari Senin/Selasa/Rabu,
 * Ibadah Jemaat Minggu 10.00 (ibadah yang paling dicari pengunjung baru, dan
 * satu-satunya yang disiarkan) jatuh di posisi ke-7/ke-8 dan tak muncul sama
 * sekali di section yang judulnya justru "Ibadah Minggu Ini". Jendela 7 hari
 * membuat judul itu harfiah benar dan menjamin hari Minggu selalu masuk. Empat
 * kartu kolom tetap ditampilkan apa adanya — itu empat ibadah nyata di empat
 * rumah berbeda, bukan derau. Tipe kembaliannya sama (`UpcomingService[]`),
 * jadi props `<Beranda>` tak berubah.
 */
export const Route = createFileRoute('/')({
  loader: () => {
    const from = todayEastern()
    return Promise.all([
      getSiteSettings(),
      listBulletins(),
      listServices({ data: { from, to: addDays(from, 6) } }),
      listRecentGalleryPhotos({ data: 6 }),
    ])
  },
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
  const [settings, bulletins, services, photos] = Route.useLoaderData()
  return <Beranda settings={settings} bulletins={bulletins} services={services} photos={photos} />
}

import * as m from '@/paraglide/messages'
import { localizeHref } from '@/paraglide/runtime'
import type { UpcomingService } from '@/features/schedule/services'
import { formatServiceDateTime } from '@/lib/datetime'
import { SITE } from '@/config/site'
import { Card, CardContent, CardDescription, CardHeader } from '@/components/ui/card'
import { CategoryBadge } from '@/components/schedule/category-badge'

/**
 * `<ServiceCard>` — kartu satu ibadah. Komponen tampilan BERSAMA untuk daftar
 * `/jadwal`, panel kalender `/jadwal`, `/pelayanan/*`, dan section "Ibadah Minggu
 * Ini" di Beranda (task terpisah menaikkan Beranda memakainya) — satu tempat untuk
 * merapikan tampilannya.
 *
 * Pelayan Firman/Pemimpin Ibadah (`preacherName`/`liturgistName`) BISA `null` —
 * Task 3 sengaja menghapus nama fiktif yang pernah diisi di seed (Defek Kritis:
 * jemaat sungguhan tak boleh menampilkan orang yang sebenarnya belum dijadwalkan).
 * Baris tsb SELALU dirender, dengan fallback `m.jadwal_tba()` bila `null` — TIDAK
 * disembunyikan, supaya pengunjung tahu roster belum diisi, bukan mengira kartunya
 * rusak.
 *
 * Lokasi: `gedung_gereja` → nama gereja (`SITE.name`, pola sama dengan
 * `beranda.tsx`); `rumah` + `hostFamilyName` → `m.home_location_home({ host })`;
 * `rumah` tanpa nama tuan rumah → `m.home_location_tba()` — TIDAK PERNAH jatuh ke
 * alamat gereja (bug nyata yang sudah diperbaiki sekali di Rencana 2a). Kunci
 * lokasi Rencana 2a dipakai ulang di sini karena kata-katanya sudah pas di luar
 * konteks Beranda — tidak perlu kunci `jadwal_at_home`/`jadwal_location_tba` baru.
 *
 * Tema/bacaan/tautan tata ibadah bersifat opsional di DB — barisnya disembunyikan
 * bila `null` (beda dengan pelayan/pemimpin ibadah, yang tak pernah "opsional"
 * secara pastoral).
 *
 * `linkToDetail`: route `/jadwal/$id` belum ada (Task 9 membuatnya), jadi kartu
 * dibungkus `<a>` polos + `localizeHref` (pola sama dengan `site-header.tsx`),
 * BUKAN `<Link to="/jadwal/$id">` yang typed — itu tak akan lolos typecheck
 * sebelum route-nya terdaftar.
 *
 * `key` tetap di titik panggil (`<ServiceCard key={s.id} …>`), bukan di sini.
 */
export function ServiceCard({
  service,
  locale,
  linkToDetail = false,
}: {
  service: UpcomingService
  locale: 'id' | 'en'
  linkToDetail?: boolean
}) {
  const theme = locale === 'id' ? service.themeId : service.themeEn

  const location =
    service.locationType === 'rumah'
      ? service.hostFamilyName
        ? m.home_location_home({ host: service.hostFamilyName })
        : m.home_location_tba()
      : SITE.name

  const card = (
    <Card className="h-full">
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CategoryBadge category={service.category} locale={locale} />
          <CardDescription>
            {formatServiceDateTime(service.serviceDate, service.startTime, locale)}
          </CardDescription>
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-3 text-sm">
        <p className="text-ink font-medium">{location}</p>

        <dl className="space-y-2">
          {theme && (
            <div>
              <dt className="text-ink font-medium">{m.jadwal_theme()}</dt>
              <dd className="text-muted">{theme}</dd>
            </div>
          )}
          {service.bibleReading && (
            <div>
              <dt className="text-ink font-medium">{m.jadwal_reading()}</dt>
              <dd className="text-muted">{service.bibleReading}</dd>
            </div>
          )}
          <div>
            <dt className="text-ink font-medium">{m.jadwal_preacher()}</dt>
            <dd className="text-muted">{service.preacherName ?? m.jadwal_tba()}</dd>
          </div>
          <div>
            <dt className="text-ink font-medium">{m.jadwal_liturgist()}</dt>
            <dd className="text-muted">{service.liturgistName ?? m.jadwal_tba()}</dd>
          </div>
        </dl>

        {service.liturgyPdfUrl && (
          <a
            href={service.liturgyPdfUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary focus-visible:ring-secondary/60 focus-visible:ring-offset-surface w-fit rounded text-sm font-medium underline underline-offset-2 outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
          >
            {m.jadwal_download_liturgy()}
          </a>
        )}
      </CardContent>
    </Card>
  )

  if (!linkToDetail) return card

  // TODO(Task 9): naikkan ke <Link to="/jadwal/$id"> setelah route ada
  return (
    <a
      href={localizeHref(`/jadwal/${service.id}`, { locale })}
      className="focus-visible:ring-secondary/60 focus-visible:ring-offset-surface rounded outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
    >
      {card}
    </a>
  )
}

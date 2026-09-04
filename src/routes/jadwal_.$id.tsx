import { createFileRoute, Link, notFound } from '@tanstack/react-router'
import * as m from '@/paraglide/messages'
import { getLocale } from '@/paraglide/runtime'
import { getService } from '@/features/schedule/services'
import { easternOffset, formatServiceDateTime } from '@/lib/datetime'
import { localeUrl, pageMeta } from '@/lib/seo'
import { SITE } from '@/config/site'
import { Button } from '@/components/ui/button'
import { CategoryBadge } from '@/components/schedule/category-badge'
import { Container } from '@/components/site/container'
import { Section } from '@/components/site/section'

// Validator `getService` = identitas (tanpa cek UUID). Pre-check di loader
// menyaring id ngawur (mis. `/jadwal/xyz`) jadi 404 sebelum menyentuh Postgres —
// tanpa ini id non-UUID melempar `22P02 invalid input syntax for type uuid` (500).
// Kegagalan infra asli (DB down, dsb.) sengaja TIDAK ditangkap → naik sebagai 500.
// Pola sama dengan `warta_.$id.tsx`.
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export const Route = createFileRoute('/jadwal_/$id')({
  // id non-UUID → pre-check → 404. Baris tak ada / belum terbit → 404.
  // Root `notFoundComponent` (di __root.tsx) yang merender halaman 404.
  loader: async ({ params }) => {
    if (!UUID_RE.test(params.id)) throw notFound()
    const service = await getService({ data: params.id })
    if (!service) throw notFound()
    return service
  },
  head: ({ loaderData }) => {
    if (!loaderData) return {}
    const locale = getLocale()
    const s = loaderData
    const title = s.themeId ?? s.category.nameId
    const titleEn = s.themeEn ?? s.category.nameEn
    const base = pageMeta({
      path: `/jadwal/${s.id}`,
      titleId: title,
      titleEn,
      descId: s.bibleReading ?? s.category.nameId,
      descEn: s.bibleReading ?? s.category.nameEn,
      locale,
    })
    return {
      ...base,
      // Entri `script:ld+json` dirender `HeadContent` sebagai
      // `<script type="application/ld+json">` di `<head>` (pola sama dengan
      // `renungan_.$slug.tsx`).
      meta: [
        ...base.meta,
        {
          'script:ld+json': {
            '@context': 'https://schema.org',
            '@type': 'Event',
            name: locale === 'id' ? title : titleEn,
            startDate: `${s.serviceDate}T${s.startTime}${easternOffset(s.serviceDate)}`,
            ...(s.endTime && {
              endDate: `${s.serviceDate}T${s.endTime}${easternOffset(s.serviceDate)}`,
            }),
            eventAttendanceMode: 'https://schema.org/OfflineEventAttendanceMode',
            eventStatus: 'https://schema.org/EventScheduled',
            location: {
              '@type': 'Place',
              name:
                s.locationType === 'gedung_gereja' ? SITE.name : (s.hostFamilyName ?? SITE.name),
              address: {
                '@type': 'PostalAddress',
                streetAddress:
                  s.locationType === 'gedung_gereja'
                    ? '895 Old Diley Road'
                    : (s.hostAddress ?? '895 Old Diley Road'),
                addressLocality: 'Columbus',
                addressRegion: 'OH',
                addressCountry: 'US',
              },
            },
            organizer: { '@type': 'Organization', name: SITE.name, url: SITE.url },
          },
        },
      ],
    }
  },
  component: JadwalDetail,
})

function JadwalDetail() {
  const service = Route.useLoaderData()
  const locale = getLocale()
  const theme = locale === 'id' ? service.themeId : service.themeEn
  const title = theme ?? (locale === 'id' ? service.category.nameId : service.category.nameEn)

  const location =
    service.locationType === 'rumah'
      ? service.hostFamilyName
        ? m.home_location_home({ host: service.hostFamilyName })
        : m.home_location_tba()
      : SITE.name

  // URL absolut halaman ini (untuk teks bagikan WhatsApp) — pola sama dengan
  // `pageMeta`/`localeUrl` di `@/lib/seo` (satu sumber kebenaran untuk URL absolut
  // sadar-locale).
  const pageUrl = localeUrl(`/jadwal/${service.id}`, locale)
  const shareText = `${title} — ${pageUrl}`

  return (
    <main>
      <Container>
        <Section>
          {/* Halaman ini tanpa <PageHero>, jadi tema/nama kategori = satu-satunya <h1>. */}
          <h1 className="text-ink font-serif text-3xl sm:text-4xl">{title}</h1>

          <div className="mt-3 flex flex-wrap items-center gap-3">
            <CategoryBadge category={service.category} locale={locale} />
            <p className="text-muted text-sm">
              {formatServiceDateTime(service.serviceDate, service.startTime, locale)}
            </p>
          </div>

          {/* Lokasi: baris tebal polos tanpa label, pola sama dengan <ServiceCard>. */}
          <p className="text-ink mt-6 font-medium">{location}</p>
          {service.locationType === 'rumah' && service.hostAddress && (
            <p className="text-muted text-sm">{service.hostAddress}</p>
          )}
          {service.locationNote && <p className="text-muted text-sm">{service.locationNote}</p>}

          <dl className="mt-6 space-y-4 text-sm">
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

          <div className="mt-8 flex flex-wrap gap-4">
            {service.liturgyPdfUrl && (
              <Button asChild variant="primary">
                <a href={service.liturgyPdfUrl} target="_blank" rel="noopener noreferrer">
                  {m.jadwal_download_liturgy()}
                </a>
              </Button>
            )}

            <Button asChild variant="secondary">
              <a
                href={`https://wa.me/?text=${encodeURIComponent(shareText)}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                {m.jadwal_share_wa()}
              </a>
            </Button>
          </div>

          <div className="mt-10">
            <Link
              to="/jadwal"
              search={{ view: 'daftar' }}
              className="text-primary text-sm font-medium hover:underline"
            >
              {m.jadwal_back()}
            </Link>
          </div>
        </Section>
      </Container>
    </main>
  )
}

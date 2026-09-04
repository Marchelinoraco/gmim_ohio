import { createFileRoute } from '@tanstack/react-router'
import * as m from '@/paraglide/messages'
import { getLocale } from '@/paraglide/runtime'
import { listServices } from '@/features/schedule/services'
import { listCategories, listKolom } from '@/features/schedule/taxonomy'
import { pageMeta } from '@/lib/seo'
import { formatDateLong } from '@/lib/datetime'
import {
  parseScheduleSearch,
  ScheduleFilters,
  type ScheduleSearch,
} from '@/components/schedule/schedule-filters'
import { groupByDate } from '@/components/schedule/month-calendar'
import { ServiceCard } from '@/components/schedule/service-card'
import { Container } from '@/components/site/container'
import { EmptyState } from '@/components/site/empty-state'
import { PageHero } from '@/components/site/page-hero'
import { Section, SectionTitle } from '@/components/site/section'

/**
 * Halaman `/jadwal` — tampilan Daftar (view "kalender" menyusul di Task 8).
 *
 * `validateSearch: parseScheduleSearch` mengetikkan search route ini persis
 * `ScheduleSearch` (bukan `unknown`) — `parseScheduleSearch` sudah murni +
 * tahan-banting (lihat docblock-nya di `schedule-filters.tsx`), jadi tinggal
 * dipakai langsung tanpa pembungkus.
 *
 * `loaderDeps: ({ search }) => search` WAJIB ADA — tanpa itu TanStack Router
 * tidak menjalankan ulang `loader` saat search berubah (filter akan tampak
 * tak berfungsi setelah render pertama, sebab `loader` di-cache terhadap
 * `deps`; lihat `FullSearchSchemaOption`/`LoaderFnContext` di
 * `@tanstack/router-core`, versi terpasang `1.171.27`). `deps.kategori`/
 * `deps.kolom` (nama pendek untuk URL) dipetakan ke `categorySlug`/`kolomId`
 * (nama presisi lapisan query) saat memanggil `listServices` — nama field
 * SENGAJA beda, lihat docblock `ScheduleSearch`.
 *
 * `listCategories`/`listKolom` diikutkan di `Promise.all` yang sama supaya
 * data taksonomi untuk `<ScheduleFilters>` selalu segar bersamaan dengan
 * daftar ibadah, walau keduanya sendiri tak berubah akibat filter.
 */
export const Route = createFileRoute('/jadwal')({
  validateSearch: parseScheduleSearch,
  loaderDeps: ({ search }) => search,
  loader: ({ deps }) =>
    Promise.all([
      listServices({ data: { categorySlug: deps.kategori, kolomId: deps.kolom } }),
      listCategories(),
      listKolom(),
    ]),
  head: () =>
    pageMeta({
      path: '/jadwal',
      titleId: 'Jadwal Ibadah',
      titleEn: 'Worship Schedule',
      descId:
        'Jadwal ibadah GMIM Musafir Columbus Ohio — Ibadah Jemaat, kategorial, dan ibadah kolom di rumah anggota, lengkap dengan tema dan pelayan firman.',
      descEn:
        'Worship schedule of GMIM Musafir Columbus Ohio — congregational, category, and neighbourhood (kolom) services, with themes and preachers.',
      // `getLocale()` resolve ke locale request (Paraglide AsyncLocalStorage) —
      // pola sama dengan src/routes/warta.tsx.
      locale: getLocale(),
    }),
  component: Jadwal,
})

const toggleBaseClass =
  'rounded-md px-4 py-2 text-sm font-medium outline-none focus-visible:ring-2 focus-visible:ring-secondary/60 focus-visible:ring-offset-2 focus-visible:ring-offset-surface'
const toggleActiveClass = `${toggleBaseClass} bg-primary text-surface`
const toggleInactiveClass = `${toggleBaseClass} bg-surface text-ink border border-border`

function Jadwal() {
  const [services, categories, kolomList] = Route.useLoaderData()
  const search = Route.useSearch()
  const navigate = Route.useNavigate()
  const locale = getLocale()

  function handleViewChange(view: ScheduleSearch['view']) {
    navigate({ search: { ...search, view } })
  }

  function handleFilterChange(next: ScheduleSearch) {
    navigate({ search: next })
  }

  // Markup grup-per-tanggal dipakai APA ADANYA oleh kedua cabang view di bawah
  // (bukan didup­likasi) — cabang "kalender" sementara menampilkan daftar yang
  // sama sampai Task 8 menukarnya dengan <MonthCalendar>.
  const dateGroups = (
    <div className="flex flex-col gap-10">
      {groupByDate(services).map((group) => (
        <div key={group.date}>
          <SectionTitle>{formatDateLong(group.date, locale)}</SectionTitle>
          <div className="grid gap-6 sm:grid-cols-2">
            {group.services.map((service) => (
              <ServiceCard key={service.id} service={service} locale={locale} linkToDetail />
            ))}
          </div>
        </div>
      ))}
    </div>
  )

  return (
    <main>
      <PageHero title={m.jadwal_title()} subtitle={m.jadwal_subtitle()} />
      <Container>
        <Section>
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="inline-flex gap-2" role="group">
              <button
                type="button"
                aria-pressed={search.view === 'daftar'}
                onClick={() => handleViewChange('daftar')}
                className={search.view === 'daftar' ? toggleActiveClass : toggleInactiveClass}
              >
                {m.jadwal_view_list()}
              </button>
              <button
                type="button"
                aria-pressed={search.view === 'kalender'}
                onClick={() => handleViewChange('kalender')}
                className={search.view === 'kalender' ? toggleActiveClass : toggleInactiveClass}
              >
                {m.jadwal_view_calendar()}
              </button>
            </div>

            <ScheduleFilters
              categories={categories}
              kolomList={kolomList}
              value={search}
              onChange={handleFilterChange}
              locale={locale}
            />
          </div>

          <div className="mt-8">
            {services.length === 0 ? (
              <EmptyState title={m.jadwal_empty()} />
            ) : search.view === 'kalender' ? (
              // TODO(Task 8): ganti cabang ini dengan <MonthCalendar> — sementara
              // memakai `dateGroups` yang sama supaya layar tak kosong.
              dateGroups
            ) : (
              dateGroups
            )}
          </div>
        </Section>
      </Container>
    </main>
  )
}

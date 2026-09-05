import { useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import * as m from '@/paraglide/messages'
import { getLocale } from '@/paraglide/runtime'
import { listServices } from '@/features/schedule/services'
import { listCategories, listKolom } from '@/features/schedule/taxonomy'
import { pageMeta } from '@/lib/seo'
import { formatDateLong, lastDayOfMonth, todayEastern } from '@/lib/datetime'
import {
  parseScheduleSearch,
  ScheduleFilters,
  type ScheduleSearch,
} from '@/components/schedule/schedule-filters'
import { groupByDate, MonthCalendar } from '@/components/schedule/month-calendar'
import { ServiceCard } from '@/components/schedule/service-card'
import { Container } from '@/components/site/container'
import { EmptyState } from '@/components/site/empty-state'
import { PageHero } from '@/components/site/page-hero'
import { Section, SectionTitle } from '@/components/site/section'

/**
 * Halaman `/jadwal` — tampilan Daftar & Kalender (Task 8 menambahkan Kalender;
 * Task 7 hanya membangun Daftar + kerangka toggle view).
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
 * `from`/`to` (Task 8): view "kalender" mengambil SEBULAN PENUH (`bulan-01`
 * s.d. `lastDayOfMonth(bulan)`), bukan "hari ini ke depan" — jika tidak,
 * menavigasi ke bulan lampau akan selalu tampak kosong karena `listServices`
 * default-nya `from = todayEastern()`. `bulan` sendiri default ke bulan
 * berjalan (`todayEastern().slice(0, 7)`) bila belum ada di URL. View
 * "daftar" TIDAK diubah — `from`/`to` tetap `undefined` supaya `listServices`
 * memakai default lamanya ("hari ini ke depan, tanpa batas atas").
 *
 * `listCategories`/`listKolom` diikutkan di `Promise.all` yang sama supaya
 * data taksonomi untuk `<ScheduleFilters>` selalu segar bersamaan dengan
 * daftar ibadah, walau keduanya sendiri tak berubah akibat filter.
 */
export const Route = createFileRoute('/jadwal')({
  validateSearch: parseScheduleSearch,
  loaderDeps: ({ search }) => search,
  loader: ({ deps }) => {
    const bulan = deps.bulan ?? todayEastern().slice(0, 7)
    const from = deps.view === 'kalender' ? `${bulan}-01` : undefined
    const to = deps.view === 'kalender' ? lastDayOfMonth(bulan) : undefined
    return Promise.all([
      listServices({ data: { categorySlug: deps.kategori, kolomId: deps.kolom, from, to } }),
      listCategories(),
      listKolom(),
    ])
  },
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
  // Turunan yang SAMA dengan loader (lihat docblock `Route` di atas) — dipakai
  // sebagai prop `month` untuk <MonthCalendar> supaya kalender selalu punya
  // bulan konkret untuk dirender, bahkan sebelum pengguna memilih satu lewat URL.
  const bulan = search.bulan ?? todayEastern().slice(0, 7)

  // `selectedDate` SENGAJA bukan search param (lihat task-8-brief.md) — cukup
  // state lokal komponen. Default-nya (tanggal pertama yang punya ≥1 ibadah di
  // data `services` yang sedang aktif) perlu "menyesuaikan diri" setiap kali
  // `services` berganti (navigasi bulan/filter → loader jalan ulang → array
  // baru) — TIDAK dihitung lewat `useEffect` (ESLint
  // `react-hooks/set-state-in-effect` menolak `setState` sinkron di dalam
  // efek karena memicu render tambahan yang bisa dihindari), melainkan lewat
  // pola resmi React "menyesuaikan state saat render" — bandingkan `services`
  // dengan salinan render sebelumnya (`prevServices`, disimpan di state) TEPAT
  // di badan komponen, dan panggil `setState` di sana bila beda. React
  // menangkap pemanggilan `setState` ini SEBELUM commit ke DOM lalu langsung
  // me-render ulang dengan state baru — jadi tak ada frame perantara yang
  // terlihat, dan TIDAK ADA risiko loop: begitu `prevServices` diperbarui ke
  // `services` yang sama (persis dengan `===`), kondisi `services !==
  // prevServices` jadi `false` pada render berikutnya dan blok ini berhenti
  // memicu `setState` lagi.
  //
  // `selectedDate` diinisialisasi lewat initializer fungsi (bukan `undefined`
  // polos) supaya render PERTAMA (termasuk SSR) sudah punya default yang
  // benar — `prevServices` di baris berikutnya diinisialisasi ke `services`
  // yang SAMA, jadi blok "menyesuaikan state saat render" di bawah tidak
  // pernah jalan pada render pertama (tak ada bedanya untuk dibandingkan);
  // tanpa initializer ini panel di bawah kalender akan selalu tampak kosong
  // pada muatan awal walau tanggal itu sebenarnya punya ibadah.
  const [selectedDate, setSelectedDate] = useState<string | undefined>(
    () => groupByDate(services)[0]?.date,
  )
  const [prevServices, setPrevServices] = useState(services)
  if (services !== prevServices) {
    setPrevServices(services)
    const stillValid = selectedDate && services.some((s) => s.serviceDate === selectedDate)
    setSelectedDate(stillValid ? selectedDate : groupByDate(services)[0]?.date)
  }

  function handleViewChange(view: ScheduleSearch['view']) {
    navigate({ search: { ...search, view } })
  }

  function handleFilterChange(next: ScheduleSearch) {
    navigate({ search: next })
  }

  const selectedGroup = groupByDate(services).find((group) => group.date === selectedDate)

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
            {search.view === 'kalender' ? (
              <div className="flex flex-col gap-8">
                <MonthCalendar
                  month={bulan}
                  services={services}
                  locale={locale}
                  selectedDate={selectedDate}
                  onSelectDate={setSelectedDate}
                  onChangeMonth={(next) => navigate({ search: { ...search, bulan: next } })}
                />
                <div>
                  {selectedGroup && selectedGroup.services.length > 0 ? (
                    <>
                      <SectionTitle>{formatDateLong(selectedGroup.date, locale)}</SectionTitle>
                      <div className="grid gap-6 sm:grid-cols-2">
                        {selectedGroup.services.map((service) => (
                          <ServiceCard
                            key={service.id}
                            service={service}
                            locale={locale}
                            linkToDetail
                          />
                        ))}
                      </div>
                    </>
                  ) : (
                    <EmptyState title={m.jadwal_empty()} />
                  )}
                </div>
              </div>
            ) : services.length === 0 ? (
              <EmptyState title={m.jadwal_empty()} />
            ) : (
              <div className="flex flex-col gap-10">
                {groupByDate(services).map((group) => (
                  <div key={group.date}>
                    <SectionTitle>{formatDateLong(group.date, locale)}</SectionTitle>
                    <div className="grid gap-6 sm:grid-cols-2">
                      {group.services.map((service) => (
                        <ServiceCard
                          key={service.id}
                          service={service}
                          locale={locale}
                          linkToDetail
                        />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </Section>
      </Container>
    </main>
  )
}

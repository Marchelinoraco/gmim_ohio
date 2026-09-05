import { createFileRoute, Link, notFound } from '@tanstack/react-router'
import * as m from '@/paraglide/messages'
import { getLocale } from '@/paraglide/runtime'
import { listServices } from '@/features/schedule/services'
import { listCategories, listKolom } from '@/features/schedule/taxonomy'
import { pageMeta } from '@/lib/seo'
import { groupByKolom } from '@/components/schedule/kolom-group'
import { ServiceCard } from '@/components/schedule/service-card'
import { Container } from '@/components/site/container'
import { EmptyState } from '@/components/site/empty-state'
import { PageHero } from '@/components/site/page-hero'
import { Paragraphs } from '@/components/site/paragraphs'
import { Section, SectionTitle } from '@/components/site/section'

/**
 * Halaman `/pelayanan/kolom` — route LITERAL, didahulukan TanStack di atas
 * `pelayanan_.$slug.tsx` (`$slug` tak pernah menangkap `kolom`), jadi tak ada
 * cabang kondisional untuk mengecualikannya di route dinamis.
 *
 * Loader mengambil `listCategories()` HANYA untuk nama kategori "Kolom" (judul
 * `<PageHero>`, satu `<h1>` halaman ini) — konsisten dengan nama yang sama
 * dipakai kartu indeks `/pelayanan` dan judul `<PageHero>` di
 * `pelayanan_.$slug.tsx`, bukan judul hardcode terpisah. `key === 'kolom'`
 * dijamin selalu ada (6 kategori tetap, di-seed, tak pernah dibuat lewat UI —
 * lihat `tests/unit/seed-data.test.ts`); `notFound()` di sini murni jaring
 * pengaman defensif, bukan jalur yang diharapkan pernah terpicu.
 *
 * Struktur heading (BEDA dengan `pelayanan_.$slug.tsx`): h1 → intro
 * (`<Paragraphs>`, TANPA heading) → h2 "Daftar Kolom" → h2 "Jadwal" → h3 per
 * kolom (`<SectionTitle as="h3">`). `<PageHero>` di sini SENGAJA tanpa
 * `subtitle` — penjelasan sistem kolom ada di paragraf intro
 * (`pelayanan_kolom_intro`), bukan diulang lagi sebagai subtitle hero.
 *
 * Jadwal dikelompokkan PER KOLOM lewat `groupByKolom`
 * (`@/components/schedule/kolom-group`, Task 11) — BUKAN per tanggal.
 * `groupByKolom` menghasilkan satu grup untuk SETIAP kolom aktif, TERMASUK
 * yang belum punya jadwal (dirender `<EmptyState>` per kolom) — supaya
 * keempat kolom (seed saat ini) selalu tampil lengkap, tak diam-diam hilang.
 *
 * Koordinator kolom (`kolom.coordinatorName`/`coordinatorPhone`, kolom tabel
 * `kolom` di DB — BEDA dari `pastoralContacts` site-settings yang dipakai
 * `pelayanan_.$slug.tsx`) opsional & disembunyikan bila kosong setelah
 * `.trim()` — disiplin sama dengan `/kunjungi`. Seed `PLACEHOLDER_KOLOM`
 * (`src/db/seed/kolom.ts`) saat ini tak mengisi kedua kolom itu (`null`),
 * jadi baris koordinator memang tak tampil hari ini di kolom mana pun — itu
 * benar, bukan bug.
 */
export const Route = createFileRoute('/pelayanan_/kolom')({
  loader: async () => {
    const [categories, kolomList, services] = await Promise.all([
      listCategories(),
      listKolom(),
      listServices({ data: { categorySlug: 'kolom' } }),
    ])
    const category = categories.find((c) => c.key === 'kolom')
    if (!category) throw notFound()
    return { category, kolomList, services }
  },
  head: ({ loaderData }) => {
    if (!loaderData) return {}
    const { category } = loaderData
    return pageMeta({
      path: '/pelayanan/kolom',
      titleId: category.nameId,
      titleEn: category.nameEn,
      descId: category.nameId,
      descEn: category.nameEn,
      locale: getLocale(),
    })
  },
  component: PelayananKolom,
})

function PelayananKolom() {
  const { category, kolomList, services } = Route.useLoaderData()
  const locale = getLocale()
  const groups = groupByKolom(services, kolomList)

  return (
    <main>
      <PageHero title={locale === 'id' ? category.nameId : category.nameEn} />
      <Container>
        <Section>
          <Paragraphs text={m.pelayanan_kolom_intro()} />
        </Section>

        <Section>
          <SectionTitle>{m.pelayanan_kolom_list_title()}</SectionTitle>
          {kolomList.length === 0 ? (
            <EmptyState title={m.jadwal_empty()} />
          ) : (
            <ul className="grid gap-4 sm:grid-cols-2">
              {kolomList.map((k) => {
                const coordinatorName = (k.coordinatorName ?? '').trim()
                const coordinatorPhone = (k.coordinatorPhone ?? '').trim()
                const hasCoordinator = coordinatorName !== '' || coordinatorPhone !== ''
                return (
                  <li key={k.id} className="border-border bg-surface rounded border p-4">
                    <p className="text-ink font-medium">{k.name}</p>
                    {hasCoordinator ? (
                      <div className="text-muted mt-2 space-y-1 text-sm">
                        {coordinatorName ? <p>{coordinatorName}</p> : null}
                        {coordinatorPhone ? (
                          <p>
                            <a
                              href={`tel:${coordinatorPhone.replace(/[^\d+]/g, '')}`}
                              className="text-primary hover:underline"
                            >
                              {coordinatorPhone}
                            </a>
                          </p>
                        ) : null}
                      </div>
                    ) : null}
                  </li>
                )
              })}
            </ul>
          )}
        </Section>

        <Section>
          <SectionTitle>{m.pelayanan_schedule_title()}</SectionTitle>
          {groups.length === 0 ? (
            <EmptyState title={m.jadwal_empty()} />
          ) : (
            <div className="flex flex-col gap-10">
              {groups.map((group) => (
                <div key={group.kolom.id}>
                  <SectionTitle as="h3">{group.kolom.name}</SectionTitle>
                  {group.services.length === 0 ? (
                    <EmptyState title={m.jadwal_empty()} />
                  ) : (
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
                  )}
                </div>
              ))}
            </div>
          )}
        </Section>

        <Section>
          <Link to="/pelayanan" className="text-primary text-sm font-medium hover:underline">
            {m.pelayanan_back()}
          </Link>
        </Section>
      </Container>
    </main>
  )
}

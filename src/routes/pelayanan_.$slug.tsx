import { createFileRoute, Link, notFound } from '@tanstack/react-router'
import * as m from '@/paraglide/messages'
import { getLocale } from '@/paraglide/runtime'
import { getSiteSettings } from '@/features/content/site-settings'
import { listServices } from '@/features/schedule/services'
import { listCategories } from '@/features/schedule/taxonomy'
import { pageMeta } from '@/lib/seo'
import { CATEGORY_DESCRIPTIONS } from '@/components/schedule/category-description'
import { groupByDate } from '@/components/schedule/month-calendar'
import { ServiceCard } from '@/components/schedule/service-card'
import { Container } from '@/components/site/container'
import { EmptyState } from '@/components/site/empty-state'
import { PageHero } from '@/components/site/page-hero'
import { Section, SectionTitle } from '@/components/site/section'

/**
 * Halaman `/pelayanan/$slug` — detail satu kategori ibadah (5 kategori
 * non-kolom: Ibadah Jemaat, Kaum Bapa, Kaum Ibu, Pemuda & Remaja, Sekolah
 * Minggu). Route literal `pelayanan_.kolom.tsx` didahulukan TanStack di atas
 * route dinamis ini, jadi `/pelayanan/kolom` tidak pernah masuk ke sini —
 * TIDAK PERLU cabang kondisional untuk mengecualikannya.
 *
 * Loader mencari kategori lewat `listCategories()` (6 baris, di-seed, tak
 * pernah dibuat lewat UI — tak ada fn `getCategoryBySlug` khusus, mencari di
 * array sekecil ini sudah cukup) alih-alih query DB langsung berdasarkan
 * slug. `slug` tak dikenal (mis. `/pelayanan/ngawur`) → `throw notFound()`,
 * dirender `notFoundComponent` root — pola sama dengan `jadwal_.$id.tsx` /
 * `warta_.$id.tsx`.
 *
 * Subtitle `<PageHero>` memakai `CATEGORY_DESCRIPTIONS[category.key]()`
 * (`@/components/schedule/category-description`) — deskripsi katalog i18n
 * yang SAMA dipakai kartu indeks `/pelayanan`, sumber tunggal.
 *
 * Kartu jadwal diambil lewat `groupByDate` lalu diratakan (`flatMap`) TANPA
 * sub-heading h3 per tanggal — beda dengan `/jadwal` yang merender banyak
 * grup h2 per tanggal, di sini cukup SATU section h2 "Jadwal". `groupByDate`
 * tetap dipakai (bukan `services` mentah) untuk konsisten memakai satu
 * utilitas urutan yang sama dengan `/jadwal`, walau `listServices` sendiri
 * sudah mengembalikan urutan yang identik (asc tanggal lalu jam).
 *
 * Kontak koordinator (`settings.pastoralContacts[category.slug]`) opsional &
 * DISEMBUNYIKAN bila kosong setelah `.trim()` — disiplin sama dengan
 * `/kunjungi` (telepon/email kantor). Seed `pastoral_contacts` saat ini `{}`
 * (kosong untuk SEMUA kategori) — jadi section "Kontak Koordinator" memang
 * tak tampil hari ini untuk kategori mana pun; itu benar, bukan bug.
 */
export const Route = createFileRoute('/pelayanan_/$slug')({
  loader: async ({ params }) => {
    const categories = await listCategories()
    const category = categories.find((c) => c.slug === params.slug)
    if (!category) throw notFound()

    const [services, settings] = await Promise.all([
      listServices({ data: { categorySlug: params.slug } }),
      getSiteSettings(),
    ])
    return { category, services, settings }
  },
  head: ({ loaderData }) => {
    if (!loaderData) return {}
    const { category } = loaderData
    return pageMeta({
      path: `/pelayanan/${category.slug}`,
      titleId: category.nameId,
      titleEn: category.nameEn,
      // Tak ada teks deskripsi dwibahasa terpisah untuk SEO di sini —
      // `CATEGORY_DESCRIPTIONS` hanya menghasilkan teks locale AKTIF (fungsi
      // pesan Paraglide meresolusi locale dari AsyncLocalStorage request,
      // bukan menerima parameter locale eksplisit), jadi tak bisa dipanggil
      // dua kali untuk mendapat ID & EN sekaligus di sini. Fallback ke nama
      // kategori sendiri, pola sama dengan `jadwal_.$id.tsx`
      // (`descId: s.bibleReading ?? s.category.nameId`).
      descId: category.nameId,
      descEn: category.nameEn,
      locale: getLocale(),
    })
  },
  component: PelayananSlug,
})

function PelayananSlug() {
  const { category, services, settings } = Route.useLoaderData()
  const locale = getLocale()

  const contact = settings.pastoralContacts[category.slug]
  const contactName = (contact?.name ?? '').trim()
  const contactPhone = (contact?.phone ?? '').trim()
  const hasContact = contactName !== '' || contactPhone !== ''

  const orderedServices = groupByDate(services).flatMap((group) => group.services)

  return (
    <main>
      <PageHero
        title={locale === 'id' ? category.nameId : category.nameEn}
        subtitle={CATEGORY_DESCRIPTIONS[category.key]()}
      />
      <Container>
        <Section>
          <SectionTitle>{m.pelayanan_schedule_title()}</SectionTitle>
          {orderedServices.length === 0 ? (
            <EmptyState title={m.jadwal_empty()} />
          ) : (
            <div className="grid gap-6 sm:grid-cols-2">
              {orderedServices.map((service) => (
                <ServiceCard key={service.id} service={service} locale={locale} linkToDetail />
              ))}
            </div>
          )}
        </Section>

        {hasContact ? (
          <Section>
            <SectionTitle>{m.pelayanan_coordinator()}</SectionTitle>
            <div className="text-ink space-y-1">
              {contactName ? <p className="font-medium">{contactName}</p> : null}
              {contactPhone ? (
                <p>
                  {/* href hanya digit & `+`; teks tetap string rapi dari settings — pola sama dengan `/kunjungi`. */}
                  <a
                    href={`tel:${contactPhone.replace(/[^\d+]/g, '')}`}
                    className="text-primary hover:underline"
                  >
                    {contactPhone}
                  </a>
                </p>
              ) : null}
            </div>
          </Section>
        ) : null}

        <Section>
          <Link to="/pelayanan" className="text-primary text-sm font-medium hover:underline">
            {m.pelayanan_back()}
          </Link>
        </Section>
      </Container>
    </main>
  )
}

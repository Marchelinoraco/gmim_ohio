import { createFileRoute, Link } from '@tanstack/react-router'
import * as m from '@/paraglide/messages'
import { getLocale } from '@/paraglide/runtime'
import { listCategories } from '@/features/schedule/taxonomy'
import { pageMeta } from '@/lib/seo'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { CategoryBadge } from '@/components/schedule/category-badge'
import { CATEGORY_DESCRIPTIONS } from '@/components/schedule/category-description'
import { Container } from '@/components/site/container'
import { PageHero } from '@/components/site/page-hero'
import { Section } from '@/components/site/section'

/**
 * Halaman indeks `/pelayanan` — kartu untuk keenam kategori ibadah (di-seed,
 * tidak pernah kosong; `listCategories()` sudah terurut `sortOrder`, lihat
 * `src/features/schedule/taxonomy.ts`). Deskripsi tiap kategori hidup di katalog
 * i18n (spec §5.5), BUKAN di DB — dipetakan lewat `CATEGORY_DESCRIPTIONS`
 * (`@/components/schedule/category-description`, dipakai bersama subtitle
 * `<PageHero>` di `/pelayanan/$slug`, Task 11 — sumber tunggal, jangan
 * duplikasi literalnya lagi di sini).
 *
 * Kartu kategori menaut ke `/pelayanan/$slug` (5 kategori non-kolom) atau
 * `/pelayanan/kolom` (Task 11) lewat `<Link>` typed — route-nya sudah ada di
 * route tree sejak Task 11, jadi tak perlu lagi dibungkus `<a>` +
 * `localizeHref` (lihat commit "Tambah halaman indeks Pelayanan" utk versi
 * sebelumnya).
 */

export const Route = createFileRoute('/pelayanan')({
  loader: () => listCategories(),
  head: () =>
    pageMeta({
      path: '/pelayanan',
      titleId: 'Pelayanan',
      titleEn: 'Ministries',
      descId:
        'Enam pelayanan kategorial GMIM Musafir Columbus Ohio — Ibadah Jemaat, Kaum Bapa, Kaum Ibu, Pemuda & Remaja, Sekolah Minggu, dan Kolom.',
      descEn:
        "The six category ministries of GMIM Musafir Columbus Ohio — Congregational Service, Men's Fellowship, Women's Fellowship, Youth & Teens, Sunday School, and Kolom.",
      // `getLocale()` resolve ke locale request (Paraglide AsyncLocalStorage) —
      // pola sama dengan src/routes/warta.tsx.
      locale: getLocale(),
    }),
  component: Pelayanan,
})

function Pelayanan() {
  const data = Route.useLoaderData()
  const locale = getLocale()

  return (
    <main>
      <PageHero title={m.pelayanan_title()} subtitle={m.pelayanan_subtitle()} />
      <Container>
        <Section>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {data.map((c) => {
              const card = (
                <Card className="h-full transition-shadow hover:shadow-md">
                  <CardHeader>
                    <CategoryBadge category={c} locale={locale} />
                    <CardTitle className="font-serif text-xl">
                      {locale === 'id' ? c.nameId : c.nameEn}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="text-muted">{CATEGORY_DESCRIPTIONS[c.key]()}</CardContent>
                </Card>
              )
              const linkClassName =
                'focus-visible:ring-secondary/60 focus-visible:ring-offset-surface rounded outline-none focus-visible:ring-2 focus-visible:ring-offset-2'
              return c.key === 'kolom' ? (
                <Link key={c.id} to="/pelayanan/kolom" className={linkClassName}>
                  {card}
                </Link>
              ) : (
                <Link
                  key={c.id}
                  to="/pelayanan/$slug"
                  params={{ slug: c.slug }}
                  className={linkClassName}
                >
                  {card}
                </Link>
              )
            })}
          </div>
        </Section>
      </Container>
    </main>
  )
}

import { createFileRoute } from '@tanstack/react-router'
import * as m from '@/paraglide/messages'
import { getLocale, localizeHref } from '@/paraglide/runtime'
import { listCategories } from '@/features/schedule/taxonomy'
import { pageMeta } from '@/lib/seo'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { CategoryBadge } from '@/components/schedule/category-badge'
import { Container } from '@/components/site/container'
import { PageHero } from '@/components/site/page-hero'
import { Section } from '@/components/site/section'

/**
 * Halaman indeks `/pelayanan` — kartu untuk keenam kategori ibadah (di-seed,
 * tidak pernah kosong; `listCategories()` sudah terurut `sortOrder`, lihat
 * `src/features/schedule/taxonomy.ts`). Deskripsi tiap kategori hidup di katalog
 * i18n (spec §5.5), BUKAN di DB — dipetakan lewat `DESC` di bawah.
 *
 * Pemetaan `category.key` → pesan ditulis eksplisit (bukan template string
 * dinamis) karena Paraglide meng-compile satu fungsi per kunci pesan; kunci
 * dinamis (`m[\`pelayanan_desc_${key}\`]`) tak bisa di-resolve compiler-nya.
 */
const DESC = {
  ibadah_jemaat: () => m.pelayanan_desc_ibadah_jemaat(),
  kaum_bapa: () => m.pelayanan_desc_kaum_bapa(),
  kaum_ibu: () => m.pelayanan_desc_kaum_ibu(),
  pemuda_remaja: () => m.pelayanan_desc_pemuda_remaja(),
  sekolah_minggu: () => m.pelayanan_desc_sekolah_minggu(),
  kolom: () => m.pelayanan_desc_kolom(),
} as const satisfies Record<string, () => string>

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
              // `/pelayanan/kolom` dan `/pelayanan/$slug` (Task 11) belum ada di
              // route tree, jadi `<Link to>` typed tak bisa resolve ke sana —
              // dibungkus `<a>` + `localizeHref`, pola sama dengan
              // `service-card.tsx` sebelum `/jadwal/$id` ada.
              const path = c.key === 'kolom' ? '/pelayanan/kolom' : `/pelayanan/${c.slug}`
              return (
                <a
                  key={c.id}
                  // TODO(Task 11): naikkan ke <Link to="/pelayanan/$slug"> / <Link to="/pelayanan/kolom"> setelah route-nya ada
                  href={localizeHref(path, { locale })}
                  className="focus-visible:ring-secondary/60 focus-visible:ring-offset-surface rounded outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
                >
                  <Card className="h-full transition-shadow hover:shadow-md">
                    <CardHeader>
                      <CategoryBadge category={c} locale={locale} />
                      <CardTitle className="font-serif text-xl">
                        {locale === 'id' ? c.nameId : c.nameEn}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="text-muted">{DESC[c.key]()}</CardContent>
                  </Card>
                </a>
              )
            })}
          </div>
        </Section>
      </Container>
    </main>
  )
}

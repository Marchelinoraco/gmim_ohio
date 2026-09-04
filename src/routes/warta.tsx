import { createFileRoute } from '@tanstack/react-router'
import * as m from '@/paraglide/messages'
import { getLocale } from '@/paraglide/runtime'
import { listBulletins } from '@/features/content/bulletins'
import { pageMeta } from '@/lib/seo'
import { BulletinCard } from '@/components/site/bulletin-card'
import { Container } from '@/components/site/container'
import { EmptyState } from '@/components/site/empty-state'
import { PageHero } from '@/components/site/page-hero'
import { Section } from '@/components/site/section'

export const Route = createFileRoute('/warta')({
  // `listBulletins` mengembalikan baris mentah — daftar hanya menampilkan
  // `summaryId/En` (teks polos), jadi tak perlu sanitasi di sini. Body HTML
  // baru disanitasi di route detail lewat `getBulletinDetail`.
  loader: () => listBulletins(),
  head: () =>
    pageMeta({
      path: '/warta',
      titleId: 'Warta Jemaat',
      titleEn: 'Church Bulletins',
      descId:
        'Warta Jemaat GMIM Musafir Columbus Ohio — tema ibadah Minggu, pengumuman, dan jadwal pelayanan setiap minggu.',
      descEn:
        'The weekly bulletin of GMIM Musafir Columbus Ohio — the Sunday service theme, announcements, and the ministry schedule.',
      // `getLocale()` resolve ke locale request (Paraglide AsyncLocalStorage) —
      // pola sama dengan src/routes/tentang.tsx.
      locale: getLocale(),
    }),
  component: WartaList,
})

function WartaList() {
  const data = Route.useLoaderData()
  const locale = getLocale()

  return (
    <main>
      <PageHero title={m.warta_title()} subtitle={m.warta_subtitle()} />
      <Container>
        <Section>
          {data.length === 0 ? (
            <EmptyState title={m.warta_empty()} />
          ) : (
            <div className="grid gap-6 sm:grid-cols-2">
              {data.map((b) => (
                <BulletinCard key={b.id} bulletin={b} locale={locale} />
              ))}
            </div>
          )}
        </Section>
      </Container>
    </main>
  )
}

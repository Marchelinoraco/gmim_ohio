import { createFileRoute, Link } from '@tanstack/react-router'
import * as m from '@/paraglide/messages'
import { getLocale } from '@/paraglide/runtime'
import { listDevotionals } from '@/features/content/devotionals'
import { formatDateLong } from '@/lib/datetime'
import { pageMeta } from '@/lib/seo'
import { cn } from '@/lib/utils'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Container } from '@/components/site/container'
import { EmptyState } from '@/components/site/empty-state'
import { PageHero } from '@/components/site/page-hero'
import { Section } from '@/components/site/section'

export const Route = createFileRoute('/renungan')({
  // `listDevotionals` mengembalikan baris mentah — daftar hanya menampilkan
  // `excerptId/En` (teks polos), jadi tak perlu sanitasi di sini. Body HTML
  // baru disanitasi di route detail lewat `getDevotionalDetail`.
  loader: () => listDevotionals(),
  head: () =>
    pageMeta({
      path: '/renungan',
      titleId: 'Renungan',
      titleEn: 'Devotionals',
      descId:
        'Renungan singkat GMIM Musafir Columbus Ohio — pesan Firman untuk menguatkan iman keluarga perantauan setiap minggu.',
      descEn:
        'Short devotionals from GMIM Musafir Columbus Ohio — a word from Scripture to strengthen our diaspora families each week.',
      // `getLocale()` resolve ke locale request (Paraglide AsyncLocalStorage) —
      // pola sama dengan src/routes/warta.tsx.
      locale: getLocale(),
    }),
  component: RenunganList,
})

function RenunganList() {
  const data = Route.useLoaderData()
  const locale = getLocale()

  return (
    <main>
      <PageHero title={m.renungan_title()} subtitle={m.renungan_subtitle()} />
      <Container>
        <Section>
          {data.length === 0 ? (
            <EmptyState title={m.renungan_empty()} />
          ) : (
            <div className="grid gap-6 sm:grid-cols-2">
              {data.map((d) => (
                <Link
                  key={d.id}
                  to="/renungan/$slug"
                  params={{ slug: d.slug }}
                  className="focus-visible:ring-secondary/60 focus-visible:ring-offset-surface rounded outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
                >
                  <Card
                    className={cn(
                      'h-full transition-shadow hover:shadow-md',
                      d.coverImageUrl && 'overflow-hidden pt-0',
                    )}
                  >
                    {d.coverImageUrl && (
                      <img
                        src={d.coverImageUrl}
                        alt=""
                        loading="lazy"
                        className="aspect-[16/9] w-full object-cover"
                      />
                    )}
                    <CardHeader>
                      <CardDescription>
                        {formatDateLong(d.publishedDate, locale)} ·{' '}
                        {m.renungan_by({ author: d.authorName })}
                      </CardDescription>
                      <CardTitle className="font-serif text-xl">
                        {locale === 'id' ? d.titleId : d.titleEn}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="text-muted">
                      {locale === 'id' ? d.excerptId : d.excerptEn}
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </Section>
      </Container>
    </main>
  )
}

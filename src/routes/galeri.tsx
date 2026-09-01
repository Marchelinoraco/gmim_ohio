import { createFileRoute, Link } from '@tanstack/react-router'
import * as m from '@/paraglide/messages'
import { getLocale } from '@/paraglide/runtime'
import { listGalleryAlbums } from '@/features/content/gallery'
import { formatDateLong } from '@/lib/datetime'
import { pageMeta } from '@/lib/seo'
import { cn } from '@/lib/utils'
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Container } from '@/components/site/container'
import { EmptyState } from '@/components/site/empty-state'
import { PageHero } from '@/components/site/page-hero'
import { Section } from '@/components/site/section'

export const Route = createFileRoute('/galeri')({
  // `listGalleryAlbums` mengembalikan baris album + `itemCount`. Caption item
  // adalah teks polos (tak ada rich-text), jadi tak perlu sanitasi di mana pun.
  loader: () => listGalleryAlbums(),
  head: () =>
    pageMeta({
      path: '/galeri',
      titleId: 'Galeri',
      titleEn: 'Gallery',
      descId:
        'Galeri foto dan video GMIM Musafir Columbus Ohio — dokumentasi ibadah Minggu dan kegiatan jemaat perantauan.',
      descEn:
        'Photo and video gallery of GMIM Musafir Columbus Ohio — a record of Sunday worship and the life of our diaspora congregation.',
      // `getLocale()` resolve ke locale request (Paraglide AsyncLocalStorage) —
      // pola sama dengan src/routes/warta.tsx.
      locale: getLocale(),
    }),
  component: GaleriList,
})

function GaleriList() {
  const data = Route.useLoaderData()
  const locale = getLocale()

  return (
    <main>
      <PageHero title={m.galeri_title()} subtitle={m.galeri_subtitle()} />
      <Container>
        <Section>
          {data.length === 0 ? (
            <EmptyState title={m.galeri_empty()} />
          ) : (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {data.map((a) => (
                <Link
                  key={a.id}
                  to="/galeri/$id"
                  params={{ id: a.id }}
                  className="focus-visible:ring-secondary/60 focus-visible:ring-offset-surface rounded outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
                >
                  <Card
                    className={cn(
                      'h-full transition-shadow hover:shadow-md',
                      a.coverImageUrl && 'overflow-hidden pt-0',
                    )}
                  >
                    {a.coverImageUrl && (
                      <img
                        src={a.coverImageUrl}
                        alt=""
                        loading="lazy"
                        className="aspect-[4/3] w-full object-cover"
                      />
                    )}
                    <CardHeader>
                      <CardDescription>
                        {formatDateLong(a.albumDate, locale)} ·{' '}
                        {m.galeri_photos_count({ count: a.itemCount })}
                      </CardDescription>
                      <CardTitle className="font-serif text-xl">
                        {locale === 'id' ? a.titleId : a.titleEn}
                      </CardTitle>
                    </CardHeader>
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

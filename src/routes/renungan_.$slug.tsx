import { createFileRoute, Link, notFound } from '@tanstack/react-router'
import * as m from '@/paraglide/messages'
import { getLocale } from '@/paraglide/runtime'
import { getDevotionalDetail } from '@/features/content/devotionals'
import { formatDateLong } from '@/lib/datetime'
import { pageMeta } from '@/lib/seo'
import { SITE } from '@/config/site'
import { Container } from '@/components/site/container'
import { Prose } from '@/components/site/prose'
import { Section } from '@/components/site/section'

export const Route = createFileRoute('/renungan_/$slug')({
  // `devotionals.slug` kolom `text` (bukan `uuid`) — slug ngawur (mis.
  // `/renungan/xyz`) tak bisa melempar `22P02`, cukup mengembalikan baris kosong.
  // Jadi tak perlu pre-check pola (beda dengan warta yang key-nya UUID) dan tak
  // perlu try/catch: baris tak ada / belum terbit → `notFound()`. Root
  // `notFoundComponent` (di __root.tsx) yang merender halaman 404.
  loader: async ({ params }) => {
    const detail = await getDevotionalDetail({ data: params.slug })
    if (!detail) throw notFound()
    return detail
  },
  head: ({ loaderData }) => {
    if (!loaderData) return {}
    const locale = getLocale()
    // Cover renungan → OG image (sejajar `galeri_.$id.tsx`). Semua null di seed.
    const cover = loaderData.coverImageUrl
    const coverAbs = cover ? (/^https?:\/\//.test(cover) ? cover : `${SITE.url}${cover}`) : null
    const base = pageMeta({
      path: `/renungan/${loaderData.slug}`,
      titleId: loaderData.titleId,
      titleEn: loaderData.titleEn,
      descId: loaderData.excerptId,
      descEn: loaderData.excerptEn,
      locale,
      image: cover ?? undefined,
    })
    return {
      ...base,
      // `head()` mengetikkan `meta` sebagai `unknown` (DefaultRouteMatchExtensions),
      // jadi array bertipe-union literal ini lolos tanpa melonggarkan return
      // `pageMeta`. Entri `script:ld+json` dirender `HeadContent` sebagai
      // `<script type="application/ld+json">` di `<head>` (headContentUtils.tsx).
      meta: [
        ...base.meta,
        {
          'script:ld+json': {
            '@context': 'https://schema.org',
            '@type': 'Article',
            headline: locale === 'id' ? loaderData.titleId : loaderData.titleEn,
            datePublished: loaderData.publishedDate,
            author: { '@type': 'Person', name: loaderData.authorName },
            inLanguage: locale === 'id' ? 'id-ID' : 'en-US',
            ...(coverAbs && { image: coverAbs }),
          },
        },
      ],
    }
  },
  component: RenunganDetail,
})

function RenunganDetail() {
  const data = Route.useLoaderData()
  const locale = getLocale()
  const title = locale === 'id' ? data.titleId : data.titleEn
  const bodyHtml = locale === 'id' ? data.bodyIdHtml : data.bodyEnHtml

  return (
    <main>
      <Container>
        <Section>
          {data.coverImageUrl && (
            <img
              src={data.coverImageUrl}
              alt=""
              className="mb-6 aspect-[16/9] w-full rounded object-cover"
            />
          )}
          {/* Halaman ini tanpa <PageHero>, jadi judul renungan = satu-satunya <h1>. */}
          <h1 className="text-ink font-serif text-3xl sm:text-4xl">{title}</h1>
          <p className="text-muted mt-3">
            {formatDateLong(data.publishedDate, locale)} ·{' '}
            {m.renungan_by({ author: data.authorName })}
          </p>

          {bodyHtml && <Prose html={bodyHtml} className="mt-6" />}

          <div className="mt-10">
            <Link
              to="/renungan"
              className="text-primary text-sm font-medium underline underline-offset-2"
            >
              {m.renungan_back()}
            </Link>
          </div>
        </Section>
      </Container>
    </main>
  )
}

import { createFileRoute, Link, notFound } from '@tanstack/react-router'
import * as m from '@/paraglide/messages'
import { getLocale } from '@/paraglide/runtime'
import { getBulletinDetail } from '@/features/content/bulletins'
import { formatDateLong } from '@/lib/datetime'
import { pageMeta } from '@/lib/seo'
import { Button } from '@/components/ui/button'
import { Container } from '@/components/site/container'
import { Prose } from '@/components/site/prose'
import { Section } from '@/components/site/section'

// Validator `getBulletinDetail` = identitas (tanpa cek UUID). Pre-check di loader
// menyaring id ngawur (mis. `/warta/xyz`) jadi 404 sebelum menyentuh Postgres —
// tanpa ini id non-UUID melempar `22P02 invalid input syntax for type uuid` (500).
// Kegagalan infra asli (DB down, dsb.) sengaja TIDAK ditangkap → naik sebagai 500.
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export const Route = createFileRoute('/warta_/$id')({
  // id non-UUID → pre-check → 404. Baris tak ada / belum terbit → 404.
  // Root `notFoundComponent` (di __root.tsx) yang merender halaman 404.
  loader: async ({ params }) => {
    if (!UUID_RE.test(params.id)) throw notFound()
    const detail = await getBulletinDetail({ data: params.id })
    if (!detail) throw notFound()
    return detail
  },
  head: ({ loaderData }) =>
    loaderData
      ? pageMeta({
          path: `/warta/${loaderData.id}`,
          titleId: loaderData.titleId,
          titleEn: loaderData.titleEn,
          descId: loaderData.summaryId,
          descEn: loaderData.summaryEn,
          locale: getLocale(),
        })
      : {},
  component: WartaDetail,
})

function WartaDetail() {
  const data = Route.useLoaderData()
  const locale = getLocale()
  const title = locale === 'id' ? data.titleId : data.titleEn
  const summary = locale === 'id' ? data.summaryId : data.summaryEn
  const bodyHtml = locale === 'id' ? data.bodyIdHtml : data.bodyEnHtml

  return (
    <main>
      <Container>
        <Section>
          {/* Halaman ini tanpa <PageHero>, jadi judul warta = satu-satunya <h1>. */}
          <h1 className="text-ink font-serif text-3xl sm:text-4xl">{title}</h1>
          <p className="text-muted mt-3">{formatDateLong(data.weekDate, locale)}</p>
          <p className="text-ink mt-6 text-lg leading-relaxed">{summary}</p>

          {bodyHtml && <Prose html={bodyHtml} className="mt-6" />}

          {data.pdfUrl && (
            <div className="mt-8">
              <Button asChild variant="primary">
                <a href={data.pdfUrl} target="_blank" rel="noopener noreferrer">
                  {m.warta_download_pdf()}
                </a>
              </Button>
            </div>
          )}

          <div className="mt-10">
            <Link
              to="/warta"
              className="text-primary text-sm font-medium underline underline-offset-2"
            >
              {m.warta_back()}
            </Link>
          </div>
        </Section>
      </Container>
    </main>
  )
}

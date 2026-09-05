import { createFileRoute } from '@tanstack/react-router'
import * as m from '@/paraglide/messages'
import { getLocale } from '@/paraglide/runtime'
import { getSiteSettings } from '@/features/content/site-settings'
import { listUpcomingServices } from '@/features/schedule/services'
import { formatServiceDateTime } from '@/lib/datetime'
import { pageMeta } from '@/lib/seo'
import { liveEmbedSrc } from '@/lib/video'
import { Button } from '@/components/ui/button'
import { Container } from '@/components/site/container'
import { EmptyState } from '@/components/site/empty-state'
import { PageHero } from '@/components/site/page-hero'
import { Section } from '@/components/site/section'

/**
 * Halaman `/ibadah-live` — bila `liveStream.isLive` && `liveStream.url` bisa
 * dipetakan ke `src` embed yang aman (`liveEmbedSrc`: YouTube / Facebook saja) →
 * `<iframe>` responsif. Selain itu → keadaan "offline": `<EmptyState>` + tombol
 * ke arsip (Facebook jemaat) + catatan jadwal ibadah berikutnya.
 *
 * `isLive` true TAPI `liveEmbedSrc` mengembalikan `null` (host tak dikenal) juga
 * jatuh ke cabang offline — fallback aman yang disengaja: domain gereja tidak
 * meng-`<iframe>` origin sembarangan. Data dari `site_settings` lewat loader
 * `getSiteSettings`, digabung dengan ibadah terbit berikutnya (`listUpcomingServices`,
 * limit 1) untuk cabang offline. `<PageHero>` menyuplai satu-satunya `<h1>`.
 */

export const Route = createFileRoute('/ibadah-live')({
  loader: () => Promise.all([getSiteSettings(), listUpcomingServices({ data: 1 })]),
  head: () =>
    pageMeta({
      path: '/ibadah-live',
      titleId: 'Ibadah Live',
      titleEn: 'Watch Live',
      descId:
        'Ikuti siaran langsung ibadah Jemaat GMIM Musafir Columbus Ohio, atau tonton ibadah sebelumnya di halaman Facebook jemaat.',
      descEn:
        'Watch GMIM Musafir Columbus Ohio worship live, or catch a past service on our Facebook page.',
      // `getLocale()` resolve ke locale request (Paraglide AsyncLocalStorage) —
      // pola sama dengan src/routes/kunjungi.tsx.
      locale: getLocale(),
    }),
  component: IbadahLive,
})

function IbadahLive() {
  const [settings, services] = Route.useLoaderData()
  const { liveStream } = settings
  const nextService = services[0] ?? null
  const locale = getLocale()

  // `isLive` false / `url` kosong → `null` tanpa memanggil `liveEmbedSrc`.
  // `isLive` true + host tak dikenal → `liveEmbedSrc` juga `null` → cabang offline.
  const embed = liveStream.isLive && liveStream.url ? liveEmbedSrc(liveStream.url) : null
  const archiveUrl = liveStream.archiveUrl.trim()

  return (
    <main>
      <PageHero title={m.live_title()} subtitle={m.live_subtitle()} />
      <Container>
        {/* Tanpa <SectionTitle>: halaman ini satu blok "embed-atau-offline",
            judul section cuma jadi derau. Bandingkan kunjungi.tsx yang menamai
            tiap section karena memang punya banyak. */}
        <Section>
          {embed ? (
            <iframe
              src={embed}
              title={m.live_title()}
              loading="lazy"
              allow="autoplay; encrypted-media; picture-in-picture"
              allowFullScreen
              className="border-border aspect-video w-full rounded border"
            />
          ) : (
            <div className="space-y-6 text-center">
              <EmptyState title={m.live_offline()} />
              {archiveUrl ? (
                <Button asChild variant="primary">
                  <a href={archiveUrl} target="_blank" rel="noopener noreferrer">
                    {m.live_watch_archive()}
                  </a>
                </Button>
              ) : null}
              <p className="text-muted">
                {nextService
                  ? m.live_next_service({
                      when: formatServiceDateTime(
                        nextService.serviceDate,
                        nextService.startTime,
                        locale,
                      ),
                      category:
                        locale === 'id' ? nextService.category.nameId : nextService.category.nameEn,
                    })
                  : m.live_next_note()}
              </p>
            </div>
          )}
        </Section>
      </Container>
    </main>
  )
}

import { useState } from 'react'
import { createFileRoute, Link, notFound } from '@tanstack/react-router'
import { Dialog, VisuallyHidden } from 'radix-ui'
import * as m from '@/paraglide/messages'
import { getLocale } from '@/paraglide/runtime'
import { getGalleryAlbum } from '@/features/content/gallery'
import type { GalleryItem } from '@/features/content/gallery'
import { formatDateLong } from '@/lib/datetime'
import { pageMeta } from '@/lib/seo'
import { youtubeId } from '@/lib/video'
import { Container } from '@/components/site/container'
import { Section } from '@/components/site/section'
import { Lightbox } from '@/components/site/lightbox'

// Kunci album = kolom `uuid`. Sama seperti warta (beda dengan renungan yang
// key-nya `text`): id non-UUID (mis. `/galeri/xyz`) → Postgres `22P02 invalid
// input syntax for type uuid` → 500. Pre-check di loader menyaringnya jadi 404
// sebelum menyentuh DB. Kegagalan infra asli sengaja TIDAK ditangkap → 500.
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export const Route = createFileRoute('/galeri_/$id')({
  // id non-UUID → pre-check → 404. Album tak ada / belum terbit → 404.
  // Root `notFoundComponent` (di __root.tsx) yang merender halaman 404.
  loader: async ({ params }) => {
    if (!UUID_RE.test(params.id)) throw notFound()
    const data = await getGalleryAlbum({ data: params.id })
    if (!data) throw notFound()
    return data
  },
  head: ({ loaderData }) =>
    loaderData
      ? pageMeta({
          path: `/galeri/${loaderData.album.id}`,
          titleId: loaderData.album.titleId,
          titleEn: loaderData.album.titleEn,
          descId:
            'Dokumentasi foto dan video kegiatan jemaat GMIM Musafir Columbus Ohio.',
          descEn:
            'Photos and videos documenting the life of the GMIM Musafir Columbus Ohio congregation.',
          locale: getLocale(),
          // Cover album jadi OG image bila ada.
          image: loaderData.album.coverImageUrl ?? undefined,
        })
      : {},
  component: GaleriAlbum,
})

/**
 * Dialog embed YouTube — dipakai saat item `youtube` di grid diklik. Panel
 * bertoken (`bg-surface`) supaya rapi di kedua tema; overlay-nya `bg-black/80`
 * (dipaksa gelap, bukan permukaan tema).
 */
function VideoDialog({
  videoId,
  title,
  onClose,
}: {
  videoId: string | null
  title: string
  onClose: () => void
}) {
  return (
    <Dialog.Root
      open={videoId !== null}
      onOpenChange={(o) => {
        if (!o) onClose()
      }}
    >
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/80" />
        <Dialog.Content
          aria-describedby={undefined}
          className="bg-surface fixed top-1/2 left-1/2 z-50 w-[92vw] max-w-3xl -translate-x-1/2 -translate-y-1/2 rounded p-3 shadow-lg outline-none"
        >
          <VisuallyHidden.Root asChild>
            <Dialog.Title>{title}</Dialog.Title>
          </VisuallyHidden.Root>
          {videoId ? (
            <iframe
              src={`https://www.youtube.com/embed/${videoId}`}
              title={title}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              className="aspect-video w-full rounded"
            />
          ) : null}
          <Dialog.Close
            aria-label={m.lightbox_close()}
            className="border-border bg-surface text-ink hover:bg-surface-2 focus-visible:ring-secondary absolute -top-3 -right-3 inline-flex h-9 w-9 items-center justify-center rounded-full border shadow outline-none focus-visible:ring-2"
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
              className="h-4 w-4"
            >
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </Dialog.Close>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}

function GaleriAlbum() {
  const { album, items } = Route.useLoaderData()
  const locale = getLocale()

  const caption = (i: GalleryItem) =>
    locale === 'id' ? (i.captionId ?? album.titleId) : (i.captionEn ?? album.titleEn)

  // Item foto (dengan `imageUrl` terjamin non-null) — sumber index lightbox.
  const imageItems = items.filter(
    (i): i is GalleryItem & { imageUrl: string } => i.type === 'image' && i.imageUrl !== null,
  )
  const lightboxItems = imageItems.map((i) => ({ src: i.imageUrl, caption: caption(i) }))

  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null)
  const [videoId, setVideoId] = useState<string | null>(null)

  return (
    <main>
      <Container>
        <Section>
          {/* Tanpa <PageHero> pada halaman detail — judul album = satu-satunya <h1>. */}
          <h1 className="text-ink font-serif text-3xl sm:text-4xl">
            {locale === 'id' ? album.titleId : album.titleEn}
          </h1>
          <p className="text-muted mt-3">{formatDateLong(album.albumDate, locale)}</p>

          <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3">
            {items.map((i) => {
              if (i.type === 'image' && i.imageUrl !== null) {
                const idx = imageItems.findIndex((x) => x.id === i.id)
                return (
                  <button
                    key={i.id}
                    type="button"
                    onClick={() => setLightboxIndex(idx)}
                    className="focus-visible:ring-secondary/60 focus-visible:ring-offset-surface overflow-hidden rounded outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
                  >
                    <img
                      src={i.imageUrl}
                      alt={caption(i)}
                      loading="lazy"
                      className="aspect-square w-full rounded object-cover transition-transform hover:scale-105"
                    />
                  </button>
                )
              }
              if (i.type === 'youtube' && i.youtubeUrl !== null) {
                const ytId = youtubeId(i.youtubeUrl)
                if (!ytId) return null
                return (
                  <button
                    key={i.id}
                    type="button"
                    aria-label={m.galeri_watch_video()}
                    onClick={() => setVideoId(ytId)}
                    className="focus-visible:ring-secondary/60 focus-visible:ring-offset-surface relative overflow-hidden rounded outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
                  >
                    <img
                      src={`https://img.youtube.com/vi/${ytId}/hqdefault.jpg`}
                      alt={caption(i)}
                      loading="lazy"
                      className="aspect-square w-full rounded object-cover"
                    />
                    {/* Scrim + segitiga play (dekoratif — tombol sudah punya aria-label).
                        `bg-black/*` + `text-white` di sini BUKAN pelanggaran token:
                        ini afordans yang di-composite di atas media gambar (tak ada
                        token untuk "gelapkan gambar ini"), identik di kedua tema —
                        pengecualian yang sama dengan overlay lightbox. */}
                    <span className="absolute inset-0 bg-black/30" aria-hidden="true" />
                    <span
                      className="absolute inset-0 flex items-center justify-center"
                      aria-hidden="true"
                    >
                      <svg
                        viewBox="0 0 24 24"
                        fill="currentColor"
                        className="h-12 w-12 text-white drop-shadow-lg"
                      >
                        <path d="M8 5v14l11-7z" />
                      </svg>
                    </span>
                  </button>
                )
              }
              return null
            })}
          </div>

          <div className="mt-10">
            <Link to="/galeri" className="text-primary text-sm font-medium hover:underline">
              {m.galeri_back()}
            </Link>
          </div>
        </Section>
      </Container>

      <Lightbox
        items={lightboxItems}
        index={lightboxIndex ?? 0}
        open={lightboxIndex !== null}
        onClose={() => setLightboxIndex(null)}
        onNav={setLightboxIndex}
      />

      <VideoDialog
        videoId={videoId}
        title={m.galeri_watch_video()}
        onClose={() => setVideoId(null)}
      />
    </main>
  )
}

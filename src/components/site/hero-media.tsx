import type { ReactNode, RefObject } from 'react'

/**
 * Blok media hero bersama — `<video>`+`<source>`+scrim gelap. Satu-satunya
 * pemanggil hari ini adalah `beranda.tsx` (`<Beranda>` penuh); pemanggil kedua
 * dulu adalah `coming-soon.tsx`, yang DIHAPUS di Rencana 2b bersama peluncuran
 * situs. Komponen ini tetap terpisah karena invariannya (scrim, `object-cover`,
 * tanpa atribut `autoplay` di markup SSR) sudah punya cakupan e2e sendiri di
 * `tests/e2e/public-pages.spec.ts` dan tak seharusnya larut ke dalam Beranda.
 *
 * `sources` kosong → render `fallback` (`<img>` dari CMS di Beranda) TANPA
 * `<video>` sama sekali. `videoRef` opsional diteruskan ke elemen `<video>`
 * supaya pemanggil bisa mengontrol playback (autoplay-on-mount, dihormati
 * terhadap `prefers-reduced-motion`).
 */
export function HeroMedia({
  poster,
  sources,
  fallback,
  videoRef,
}: {
  poster: string
  sources: readonly { src: string; type: string }[]
  fallback: ReactNode
  videoRef?: RefObject<HTMLVideoElement | null>
}) {
  const hasVideo = sources.length > 0

  return (
    <>
      {hasVideo ? (
        <video
          ref={videoRef}
          className="absolute inset-0 h-full w-full object-cover"
          loop
          muted
          playsInline
          preload="metadata"
          poster={poster}
          aria-hidden="true"
        >
          {sources.map((s) => (
            <source key={s.src} src={s.src} type={s.type} />
          ))}
        </video>
      ) : (
        fallback
      )}

      {/* Scrim — cukup pekat agar teks putih ≥ 4.5:1 di atas frame video paling
          terang, di light MAUPUN dark. */}
      <div
        className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/70 via-black/65 to-black/85"
        aria-hidden="true"
      />
    </>
  )
}

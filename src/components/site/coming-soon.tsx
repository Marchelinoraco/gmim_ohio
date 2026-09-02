import { useEffect, useRef, useState, useSyncExternalStore } from 'react'
import * as m from '@/paraglide/messages'
import { Logo } from '@/components/layout/logo'
import { SITE } from '@/config/site'

/**
 * Halaman "segera hadir" — komponen halaman produksi live selama
 * `SITE.comingSoon` (dipindahkan verbatim dari `src/routes/index.tsx`; satu-
 * satunya perubahan tekstual: nama fungsi `Home` → `ComingSoon`). Semua logika
 * video / reduced-motion / toggle suara TIDAK berubah — perubahan perilaku di
 * sini adalah regresi pada halaman live. Route `/` merender ini saat
 * `SITE.comingSoon`, atau `<Beranda>` bila tidak.
 */

// `prefers-reduced-motion` via useSyncExternalStore — pola SSR-safe yang sama
// dengan ThemeToggle: server + hidrasi memakai snapshot `false` (anggap animasi
// OK), klien beralih ke `matchMedia` tanpa mismatch, dan tanpa setState di dalam
// body effect (dilarang react-hooks v7).
const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)'

function subscribeReducedMotion(onChange: () => void): () => void {
  const mq = window.matchMedia(REDUCED_MOTION_QUERY)
  mq.addEventListener('change', onChange)
  return () => mq.removeEventListener('change', onChange)
}

function reducedMotionSnapshot(): boolean {
  return window.matchMedia(REDUCED_MOTION_QUERY).matches
}

function reducedMotionServerSnapshot(): boolean {
  return false
}

function SpeakerOnIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className="size-5"
    >
      <path d="M11 5 6 9H2v6h4l5 4V5Z" />
      <path d="M15.5 8.5a5 5 0 0 1 0 7" />
      <path d="M18.5 5.5a9 9 0 0 1 0 13" />
    </svg>
  )
}

function SpeakerOffIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className="size-5"
    >
      <path d="M11 5 6 9H2v6h4l5 4V5Z" />
      <line x1="23" y1="9" x2="17" y2="15" />
      <line x1="17" y1="9" x2="23" y2="15" />
    </svg>
  )
}

function PlayIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" className="size-5">
      <path d="M8 5v14l11-7z" />
    </svg>
  )
}

function PauseIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" className="size-5">
      <rect x="6" y="5" width="4" height="14" rx="1" />
      <rect x="14" y="5" width="4" height="14" rx="1" />
    </svg>
  )
}

function MapPinIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className="size-4"
    >
      <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
      <circle cx="12" cy="10" r="3" />
    </svg>
  )
}

function FacebookIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" className="size-4">
      <path d="M24 12.07C24 5.4 18.63 0 12 0S0 5.4 0 12.07C0 18.1 4.39 23.1 10.13 24v-8.44H7.08v-3.49h3.05V9.41c0-3.02 1.79-4.69 4.53-4.69 1.31 0 2.68.24 2.68.24v2.97h-1.5c-1.48 0-1.94.92-1.94 1.87v2.24h3.3l-.53 3.49h-2.77V24C19.61 23.1 24 18.1 24 12.07Z" />
    </svg>
  )
}

export function ComingSoon() {
  const videoRef = useRef<HTMLVideoElement>(null)
  const hasVideo = SITE.hero.sources.length > 0

  const reducedMotion = useSyncExternalStore(
    subscribeReducedMotion,
    reducedMotionSnapshot,
    reducedMotionServerSnapshot,
  )

  // Nilai awal SSR-stabil. `muted` cocok dengan atribut `muted` di <video>;
  // `playing` dikoreksi oleh listener 'play'/'pause' segera setelah mount.
  const [muted, setMuted] = useState(true)
  const [playing, setPlaying] = useState(false)

  useEffect(() => {
    const v = videoRef.current
    if (!v) return

    const onPlay = () => setPlaying(true)
    const onPause = () => setPlaying(false)
    const onVolumeChange = () => setMuted(v.muted)
    v.addEventListener('play', onPlay)
    v.addEventListener('pause', onPause)
    v.addEventListener('volumechange', onVolumeChange)

    // Playback dimulai dari sini, bukan atribut `autoplay` — supaya markup SSR
    // tak pernah membawa `autoplay` dan poster tampil dulu untuk semua orang.
    // Motion-OK: putar setelah hidrasi. Reduced-motion: tahan di poster.
    if (reducedMotion) {
      v.pause()
      try {
        v.currentTime = 0
      } catch {
        // metadata belum siap — abaikan, poster tetap tampil.
      }
    } else {
      v.play().catch(() => {})
    }

    return () => {
      v.removeEventListener('play', onPlay)
      v.removeEventListener('pause', onPause)
      v.removeEventListener('volumechange', onVolumeChange)
    }
  }, [reducedMotion])

  // Reduced-motion: tombol jadi play/pause (klik pertama memutar + membunyikan).
  // Normal: tombol jadi toggle suara pada video latar yang berjalan bisu.
  function handleToggle() {
    const v = videoRef.current
    if (!v) return

    if (reducedMotion) {
      if (v.paused) {
        v.muted = false
        setMuted(false)
        v.play().catch(() => {})
      } else {
        v.pause()
      }
      return
    }

    const next = !v.muted
    v.muted = next
    setMuted(next)
    if (!next) v.play().catch(() => {})
  }

  // Label & ikon bercabang sama: reduced-motion = kontrol Putar/Jeda video;
  // normal = toggle suara pada video latar bisu.
  let toggleLabel = muted ? m.coming_soon_sound_on() : m.coming_soon_sound_off()
  let toggleIcon = muted ? <SpeakerOffIcon /> : <SpeakerOnIcon />
  if (reducedMotion) {
    toggleLabel = playing ? m.coming_soon_pause() : m.coming_soon_play()
    toggleIcon = playing ? <PauseIcon /> : <PlayIcon />
  }

  return (
    <main>
      {/* Tinggi hero = viewport dikurangi tinggi SiteHeader (solid, di atas
          section) supaya tombol suara kanan-bawah tetap di dalam layar pertama.
          SiteHeader coming-soon: py-3 + min-h-11 + border = ~4.3rem; 5rem beri
          margin aman. */}
      <section className="bg-primary relative flex min-h-[calc(100svh-5rem)] flex-col overflow-hidden">
        {hasVideo ? (
          <video
            ref={videoRef}
            className="absolute inset-0 h-full w-full object-cover"
            loop
            muted
            playsInline
            preload="metadata"
            poster={SITE.hero.poster}
            aria-hidden="true"
          >
            {SITE.hero.sources.map((s) => (
              <source key={s.src} src={s.src} type={s.type} />
            ))}
          </video>
        ) : (
          <div className="from-primary to-primary-hover absolute inset-0 bg-gradient-to-br" />
        )}

        {/* Scrim — cukup pekat agar teks putih ≥ 4.5:1 di atas frame video
            paling terang, di light MAUPUN dark (video sama di kedua tema). */}
        <div
          className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/70 via-black/65 to-black/85"
          aria-hidden="true"
        />

        <div className="relative z-10 mx-auto flex w-full max-w-3xl flex-1 flex-col items-center justify-center gap-6 px-4 py-24 text-center text-white [text-shadow:0_2px_12px_rgb(0_0_0_/_0.55)]">
          {/* Medali terang — seal GMIM (coklat/biru/merah) tetap terbaca di atas
              scrim gelap, konsisten di kedua tema. */}
          <div className="rounded-full bg-white p-4 shadow-xl">
            <Logo variant="full" size={64} />
          </div>

          <h1 className="font-serif text-4xl font-semibold sm:text-5xl">{SITE.name}</h1>
          <p className="text-lg font-medium text-white sm:text-xl">{m.coming_soon_tagline()}</p>
          <p className="max-w-xl text-white/90">{m.coming_soon_body()}</p>

          <div className="mt-2 flex flex-col items-center gap-3">
            <address className="text-sm text-white/90 not-italic sm:text-base">
              {SITE.address}
            </address>
            <div className="flex flex-wrap items-center justify-center gap-3">
              <a
                href={SITE.mapsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex min-h-11 items-center gap-1.5 rounded-md border border-white/50 px-4 text-sm font-medium text-white hover:bg-white/10 sm:text-base"
              >
                <MapPinIcon />
                {m.coming_soon_maps()}
              </a>
              {SITE.facebookUrl && (
                <a
                  href={SITE.facebookUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex min-h-11 items-center gap-1.5 rounded-md bg-white px-4 text-sm font-medium text-[#1c1a26] hover:bg-white/90 sm:text-base"
                >
                  <FacebookIcon />
                  {m.coming_soon_facebook()}
                </a>
              )}
            </div>
          </div>
        </div>

        {hasVideo && (
          <button
            type="button"
            onClick={handleToggle}
            // Satu sinyal state saja: `aria-label` yang berubah (aksi + implikasi
            // state) + ikon. Tanpa `aria-pressed` agar SR tak mengumumkan ganda.
            aria-label={toggleLabel}
            className="absolute right-4 bottom-4 z-20 inline-flex h-11 w-11 items-center justify-center rounded-full bg-black/60 text-white backdrop-blur transition hover:bg-black/75 focus-visible:ring-2 focus-visible:ring-white focus-visible:outline-none"
          >
            {toggleIcon}
          </button>
        )}
      </section>
    </main>
  )
}

import { useEffect, useRef, useState, useSyncExternalStore } from 'react'
import { Link } from '@tanstack/react-router'
import * as m from '@/paraglide/messages'
import { SITE } from '@/config/site'
import { Button } from '@/components/ui/button'
import { HeroMedia } from '@/components/site/hero-media'

/**
 * Hero Beranda — video latar dengan kontrol suara.
 *
 * Perilaku video di sini dipulihkan dari `coming-soon.tsx` (dihapus saat
 * peluncuran Rencana 2b; lihat `git show 9903d7e:src/components/site/coming-soon.tsx`).
 * Logikanya dipakai ulang apa adanya karena sudah benar dan sudah dijaga e2e —
 * yang berubah hanya tempatnya dan tampilannya.
 *
 * Tiga invarian yang TIDAK boleh berubah, semuanya punya test:
 * 1. Markup SSR tak pernah membawa atribut `autoplay`. Playback dimulai dari
 *    effect, sehingga poster tampil lebih dulu untuk semua orang dan pengguna
 *    reduced-motion tak pernah kena gerakan yang tak diminta.
 * 2. `prefers-reduced-motion` menahan video di poster, bukan sekadar
 *    mempercepat animasinya.
 * 3. Tombol punya SATU sinyal state: `aria-label` yang berubah. Tanpa
 *    `aria-pressed`, supaya pembaca layar tak mengumumkan keadaan dua kali.
 */

// Pola SSR-safe yang sama dengan ThemeToggle: server & hidrasi memakai snapshot
// `false` (anggap animasi OK), klien beralih ke `matchMedia` tanpa mismatch, dan
// tanpa setState di dalam body effect (dilarang react-hooks v7).
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

function ChevronDownIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className="size-6"
    >
      <path d="m6 9 6 6 6-6" />
    </svg>
  )
}

export function BerandaHero({
  title,
  tagline,
  image,
}: {
  title: string
  tagline: string
  image: string
}) {
  const videoRef = useRef<HTMLVideoElement>(null)
  // `hero.image` kosong (seed) → video; diisi → gambar. `SITE.hero.sources`
  // selalu ≥ 1 (`as const`), jadi tak ada cabang fallback ketiga.
  const hasVideo = image.length === 0

  const reducedMotion = useSyncExternalStore(
    subscribeReducedMotion,
    reducedMotionSnapshot,
    reducedMotionServerSnapshot,
  )

  // Nilai awal SSR-stabil. `muted` cocok dengan atribut `muted` di <video>;
  // `playing` dikoreksi listener 'play'/'pause' segera setelah mount.
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

  let toggleLabel = muted ? m.hero_sound_on() : m.hero_sound_off()
  let toggleIcon = muted ? <SpeakerOffIcon /> : <SpeakerOnIcon />
  if (reducedMotion) {
    toggleLabel = playing ? m.hero_pause() : m.hero_play()
    toggleIcon = playing ? <PauseIcon /> : <PlayIcon />
  }

  // Setinggi viewport penuh: header kini menimpanya (transparan di puncak
  // beranda), jadi hero tak perlu lagi menyisakan ruang untuk header.
  return (
    <section className="bg-primary relative flex min-h-[100svh] flex-col overflow-hidden">
      <HeroMedia
        poster={SITE.hero.poster}
        sources={hasVideo ? SITE.hero.sources : []}
        fallback={
          <img
            src={image}
            alt=""
            className="absolute inset-0 h-full w-full object-cover"
            aria-hidden="true"
          />
        }
        videoRef={videoRef}
      />

      <div className="relative z-10 mx-auto flex w-full max-w-3xl flex-1 flex-col items-center justify-center gap-6 px-4 py-24 text-center text-white [text-shadow:0_2px_12px_rgb(0_0_0_/_0.55)]">
        {/* Masuk bertahap. Kelas `hero-in` dinetralkan blok reduced-motion
            global di `app.css`, jadi tak perlu cabang JS di sini. */}
        <h1 className="hero-in font-serif text-4xl font-semibold text-balance sm:text-5xl lg:text-6xl">
          {title}
        </h1>
        <p className="hero-in max-w-xl text-lg font-medium text-white [animation-delay:120ms] sm:text-xl">
          {tagline}
        </p>
        <div className="hero-in mt-2 flex flex-wrap items-center justify-center gap-3 [animation-delay:240ms]">
          {/* Dua fill solid (primary/secondary) supaya terbaca di atas scrim di
              kedua tema — tak bergantung pada warna permukaan. */}
          <Button asChild variant="primary" size="lg" className="h-11">
            <Link to="/jadwal" search={{ view: 'daftar' }}>
              {m.nav_schedule()}
            </Link>
          </Button>
          <Button asChild variant="secondary" size="lg" className="h-11">
            <Link to="/kunjungi">{m.home_visit_cta()}</Link>
          </Button>
        </div>
      </div>

      {/* Petunjuk gulir — dekoratif, disembunyikan dari pembaca layar karena
          section berikutnya sudah punya heading sendiri. */}
      <div
        className="hero-cue pointer-events-none absolute inset-x-0 bottom-5 z-10 flex justify-center text-white/70"
        aria-hidden="true"
      >
        <ChevronDownIcon />
      </div>

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
    </section>
  )
}

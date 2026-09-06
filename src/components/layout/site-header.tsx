import { useEffect, useState } from 'react'
import { Link, useLocation } from '@tanstack/react-router'
import * as m from '@/paraglide/messages'
import { getLocale, localizeHref } from '@/paraglide/runtime'
import { Button } from '@/components/ui/button'
import { LanguageSwitcher } from '@/components/layout/language-switcher'
import { ThemeToggle } from '@/components/layout/theme-toggle'
import { Logo } from '@/components/layout/logo'
import { SITE } from '@/config/site'

// Semua tujuh route nav sudah ada sejak Rencana 2b, jadi tiap item dipetakan ke
// `<Link to={item.path}>` TanStack Router yang typed (lihat render nav di bawah).
// `LanguageSwitcher`, brand (logo), dan CTA `liveHref`/`giveHref` TETAP `<a>` +
// `localizeHref` — bukan bagian NAV_ITEMS, di luar cakupan perubahan ini.
const NAV_ITEMS = [
  { key: 'home', label: () => m.nav_home(), path: '/' },
  { key: 'about', label: () => m.nav_about(), path: '/tentang' },
  { key: 'ministries', label: () => m.nav_ministries(), path: '/pelayanan' },
  { key: 'schedule', label: () => m.nav_schedule_short(), path: '/jadwal' },
  { key: 'bulletin', label: () => m.nav_bulletin_short(), path: '/warta' },
  { key: 'gallery', label: () => m.nav_gallery(), path: '/galeri' },
  { key: 'visit', label: () => m.nav_visit(), path: '/kunjungi' },
] as const

function MenuIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      className="size-5"
    >
      <line x1="4" y1="7" x2="20" y2="7" />
      <line x1="4" y1="12" x2="20" y2="12" />
      <line x1="4" y1="17" x2="20" y2="17" />
    </svg>
  )
}

function CloseIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      className="size-5"
    >
      <line x1="6" y1="6" x2="18" y2="18" />
      <line x1="18" y1="6" x2="6" y2="18" />
    </svg>
  )
}

/**
 * Header transparan menyatu dengan hero — HANYA di beranda, satu-satunya
 * halaman yang punya media full-bleed di belakangnya. Di halaman lain header
 * tetap solid dalam alur normal; membuatnya transparan di sana hanya
 * menghasilkan teks putih di atas latar putih.
 *
 * Saat overlay, header keluar dari alur (`fixed`) supaya hero benar-benar
 * dimulai dari puncak viewport. Begitu digulir melewati ambang, ia memadat jadi
 * solid + bayangan agar teksnya tetap terbaca di atas konten biasa.
 */
const SCROLL_SOLID_AFTER = 24

function useOverlayHeader() {
  const { pathname } = useLocation()
  // Beranda saja: `/` dan varian ber-locale `/en`.
  const isHome = pathname === '/' || pathname === '/en' || pathname === '/en/'
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    if (!isHome) return
    const onScroll = () => setScrolled(window.scrollY > SCROLL_SOLID_AFTER)
    onScroll() // keadaan awal — penting saat pengguna memuat halaman di posisi tergulir
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [isHome])

  return { overlay: isHome && !scrolled, fixed: isHome }
}

export function SiteHeader() {
  const locale = getLocale()
  const [open, setOpen] = useState(false)
  const { overlay: overlayAtTop, fixed } = useOverlayHeader()

  // Menu mobile terbuka MEMBATALKAN overlay. Panel nav-nya solid, jadi tanpa ini
  // baris brand di atasnya tetap transparan: brand + tombol tutup melayang putih
  // di atas video hero sementara daftar nav tepat di bawahnya putih solid —
  // header yang sama terbelah jadi dua, dan brand-nya hilang begitu frame video
  // yang lewat kebetulan terang.
  const overlay = overlayAtTop && !open

  const homeHref = localizeHref('/', { locale })

  const brand = (
    <a
      href={homeHref}
      aria-label={m.site_name()}
      className={[
        'flex min-h-11 shrink-0 items-center gap-2.5 transition-colors duration-150',
        overlay ? 'text-white' : 'text-ink hover:text-primary',
      ].join(' ')}
    >
      <Logo variant="full" size={40} />
      {/* Lockup dua baris yang DISENGAJA. Nama penuh dalam satu baris serif
          memakan 316px dari 1120px yang tersedia dan membuat header meluap;
          dibiarkan membungkus sendiri, ia pecah jadi empat baris acak. Memecah
          identitas (baris atas) dari lokasi (baris bawah) menyusut ke ~165px
          dan terbaca sebagai wordmark, bukan teks yang kepanjangan.
          Nama penuh tetap jadi nama aksesibel lewat `aria-label` di <a>. */}
      <span className="flex flex-col leading-none whitespace-nowrap">
        <span className="font-serif text-base font-semibold sm:text-lg">{m.site_name_short()}</span>
        <span
          className={[
            'mt-0.5 text-[0.6875rem] font-medium tracking-[0.08em] uppercase',
            overlay ? 'text-white/75' : 'text-muted',
          ].join(' ')}
        >
          {m.site_location_short()}
        </span>
      </span>
    </a>
  )

  // Cabang coming-soon (Rencana 1 Task 8c): sembunyikan 7 nav + CTA + hamburger,
  // sisakan brand + kontrol tema/bahasa. Rencana 2b sudah menyetel
  // `SITE.comingSoon = false`, jadi cabang ini TIDAK aktif dan header penuh di
  // bawahlah yang dirender. Perhatikan: flag ini bukan lagi kill-switch situs
  // (lihat docblock `SITE.comingSoon` di `src/config/site.ts`) — menyembunyikan
  // nav di sini tidak menyembunyikan halamannya.
  if (SITE.comingSoon) {
    return (
      <header className="border-border bg-surface border-b">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3">
          {brand}
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <LanguageSwitcher />
          </div>
        </div>
      </header>
    )
  }

  const liveHref = localizeHref('/ibadah-live', { locale })
  const giveHref = localizeHref('/persembahan', { locale })

  return (
    <header
      className={[
        'z-40 border-b transition-colors duration-300',
        fixed ? 'fixed inset-x-0 top-0' : 'sticky top-0',
        overlay
          ? 'border-transparent bg-transparent text-white'
          : 'border-border bg-surface shadow-header',
      ].join(' ')}
    >
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3">
        {brand}

        {/* Nav desktop — selalu di DOM, tampil sejak breakpoint lg. */}
        <nav aria-label={m.nav_menu_label()} className="hidden items-center gap-0.5 xl:flex">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.key}
              to={item.path}
              className={[
                'inline-flex min-h-11 items-center rounded-md px-2.5 text-sm font-medium transition-colors duration-150',
                overlay
                  ? 'text-white/90 hover:bg-white/15 hover:text-white'
                  : 'text-ink hover:bg-surface-2 hover:text-primary',
              ].join(' ')}
            >
              {item.label()}
            </Link>
          ))}
        </nav>

        <div className="hidden items-center gap-2 xl:flex">
          <Button asChild variant="outline" size="md" className="h-11">
            <a href={liveHref}>{m.cta_live()}</a>
          </Button>
          <Button asChild variant="primary" size="md" className="h-11">
            <a href={giveHref}>{m.cta_give()}</a>
          </Button>
          <ThemeToggle />
          <LanguageSwitcher />
        </div>

        <button
          type="button"
          className={[
            'inline-flex h-11 w-11 items-center justify-center rounded-md xl:hidden',
            overlay ? 'text-white hover:bg-white/15' : 'text-ink hover:bg-surface-2',
          ].join(' ')}
          aria-expanded={open}
          aria-controls="primary-nav-mobile"
          aria-label={m.nav_toggle_menu()}
          onClick={() => setOpen((v) => !v)}
        >
          {open ? <CloseIcon /> : <MenuIcon />}
        </button>
      </div>

      {/* Panel mobile — hanya dirender saat terbuka; komponen Sheet menyusul di Rencana 2. */}
      {open && (
        <nav
          id="primary-nav-mobile"
          aria-label={m.nav_menu_label()}
          // Panel digulir SENDIRI saat lebih tinggi dari sisa layar. Di beranda
          // header `fixed`, jadi isi yang melimpah keluar viewport tidak bisa
          // dijangkau dengan menggulir halaman — pada ponsel landscape (~380px)
          // "Persembahan" dan pemilih tema/bahasa benar-benar tak bisa ditekan.
          // 4.5rem ≈ tinggi baris brand di atasnya.
          className="border-border bg-surface text-ink max-h-[calc(100svh-4.5rem)] overflow-y-auto border-t px-4 py-3 xl:hidden"
        >
          <ul className="flex flex-col">
            {NAV_ITEMS.map((item) => (
              <li key={item.key}>
                <Link
                  to={item.path}
                  onClick={() => setOpen(false)}
                  className="border-border text-ink hover:text-primary flex min-h-11 items-center border-b text-sm font-medium last:border-b-0"
                >
                  {item.label()}
                </Link>
              </li>
            ))}
          </ul>
          <div className="mt-3 flex flex-col gap-2">
            <Button asChild variant="outline" size="md" className="h-11 w-full">
              <a href={liveHref}>{m.cta_live()}</a>
            </Button>
            <Button asChild variant="primary" size="md" className="h-11 w-full">
              <a href={giveHref}>{m.cta_give()}</a>
            </Button>
          </div>
          <div className="mt-3 flex items-center gap-3">
            {/* Baris TERBAWAH panel, dan tombolnya di ujung kiri — menu tema
                harus memekar ke atas-kanan; default `bottom-end` melemparnya
                keluar tepi kiri layar lalu terpotong `overflow-y-auto` panel. */}
            <ThemeToggle placement="top-start" />
            <LanguageSwitcher />
          </div>
        </nav>
      )}
    </header>
  )
}

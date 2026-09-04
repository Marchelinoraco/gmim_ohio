import { useState } from 'react'
import * as m from '@/paraglide/messages'
import { getLocale, localizeHref } from '@/paraglide/runtime'
import { Button } from '@/components/ui/button'
import { LanguageSwitcher } from '@/components/layout/language-switcher'
import { ThemeToggle } from '@/components/layout/theme-toggle'
import { Logo } from '@/components/layout/logo'
import { SITE } from '@/config/site'

// Rencana 2 membuat route asli untuk path di bawah ini (`/tentang`, `/pelayanan`,
// dst.). Sampai saat itu nav dirender sebagai <a> biasa + `localizeHref` — pola
// yang sama dengan LanguageSwitcher — sehingga `pnpm typecheck` lolos tanpa perlu
// route stub, tetap dwibahasa (di `/en` link ikut di bawah `/en`), dan resolve ke
// halaman 404 hingga Rencana 2 mengisi route-nya.
// TODO(2b): naikkan ke `<Link to="/tentang">` TanStack Router yang typed begitu
// route tersebut ada. INI COUPLING BERKONSEKUENSI PALING TINGGI di branch:
// `NAV_ITEMS` di bawah memuat `/pelayanan` dan `/jadwal` — route yang BELUM ADA
// di 2a. Membalik `SITE.comingSoon = false` sebelum kedua route itu dibangun
// memasang dua tautan 404 di SETIAP halaman situs live. 2b harus membuat route
// tsb LEBIH DULU, baru membalik flag.
const NAV_ITEMS = [
  { key: 'home', label: () => m.nav_home(), path: '/' },
  { key: 'about', label: () => m.nav_about(), path: '/tentang' },
  { key: 'ministries', label: () => m.nav_ministries(), path: '/pelayanan' },
  { key: 'schedule', label: () => m.nav_schedule(), path: '/jadwal' },
  { key: 'bulletin', label: () => m.nav_bulletin(), path: '/warta' },
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

export function SiteHeader() {
  const locale = getLocale()
  const [open, setOpen] = useState(false)

  const homeHref = localizeHref('/', { locale })

  const brand = (
    <a href={homeHref} className="text-ink flex min-h-11 items-center gap-2.5">
      <Logo variant="full" size={40} />
      <span className="font-serif text-base leading-tight font-semibold sm:text-lg">
        {m.site_name()}
      </span>
    </a>
  )

  // Mode coming-soon (Task 8c): sembunyikan 7 nav + CTA + hamburger — route-nya
  // belum ada. Sisakan brand + kontrol tema/bahasa. Rencana 2 menyetel
  // `SITE.comingSoon = false` dan header penuh di bawah kembali aktif.
  if (SITE.comingSoon) {
    return (
      <header className="border-border bg-surface border-b">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
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
    <header className="border-border bg-surface border-b">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
        {brand}

        {/* Nav desktop — selalu di DOM, tampil sejak breakpoint lg. */}
        <nav aria-label={m.nav_menu_label()} className="hidden items-center gap-0.5 lg:flex">
          {NAV_ITEMS.map((item) => (
            <a
              key={item.key}
              href={localizeHref(item.path, { locale })}
              className="text-ink hover:bg-surface-2 hover:text-primary inline-flex min-h-11 items-center rounded-md px-3 text-sm font-medium"
            >
              {item.label()}
            </a>
          ))}
        </nav>

        <div className="hidden items-center gap-2 lg:flex">
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
          className="text-ink hover:bg-surface-2 inline-flex h-11 w-11 items-center justify-center rounded-md lg:hidden"
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
          className="border-border border-t px-4 py-3 lg:hidden"
        >
          <ul className="flex flex-col">
            {NAV_ITEMS.map((item) => (
              <li key={item.key}>
                <a
                  href={localizeHref(item.path, { locale })}
                  onClick={() => setOpen(false)}
                  className="border-border text-ink hover:text-primary flex min-h-11 items-center border-b text-sm font-medium last:border-b-0"
                >
                  {item.label()}
                </a>
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
            <ThemeToggle />
            <LanguageSwitcher />
          </div>
        </nav>
      )}
    </header>
  )
}

import * as m from '@/paraglide/messages'
import { LanguageSwitcher } from '@/components/layout/language-switcher'
import { Logo } from '@/components/layout/logo'

// Placeholder link sosial. URL asli diambil dari Site Settings di Rencana 2 —
// sampai saat itu `href="#"` + `aria-disabled` supaya tidak menyesatkan.
// TODO(Rencana 2): tarik dari Site Settings, hapus aria-disabled.
const SOCIAL_LINKS = [
  { key: 'facebook', label: 'Facebook' },
  { key: 'instagram', label: 'Instagram' },
  { key: 'youtube', label: 'YouTube' },
] as const

export function SiteFooter() {
  const year = new Date().getFullYear()

  return (
    <footer className="mt-16 border-t border-border bg-surface-2">
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-10 sm:grid-cols-2 lg:grid-cols-4">
        <div className="space-y-2">
          <div className="flex items-center gap-2.5 text-ink">
            <Logo variant="mark" />
            <span className="font-serif text-base font-semibold">{m.site_name()}</span>
          </div>
          <p className="text-sm text-muted">{m.site_tagline()}</p>
        </div>

        <div className="space-y-2">
          <h2 className="font-serif text-sm font-semibold text-ink">{m.nav_visit()}</h2>
          <address className="text-sm not-italic text-ink">{m.footer_address()}</address>
        </div>

        <div className="space-y-2">
          <h2 className="font-serif text-sm font-semibold text-ink">{m.footer_social()}</h2>
          <ul aria-label={m.footer_social()} className="flex flex-col">
            {SOCIAL_LINKS.map((s) => (
              <li key={s.key}>
                <a
                  href="#"
                  aria-disabled="true"
                  className="inline-flex min-h-11 items-center text-sm text-muted hover:text-primary"
                >
                  {s.label}
                </a>
              </li>
            ))}
          </ul>
        </div>

        <div className="space-y-2">
          <h2 className="font-serif text-sm font-semibold text-ink">{m.lang_id()} / {m.lang_en()}</h2>
          <LanguageSwitcher />
        </div>
      </div>

      <div className="border-t border-border px-4 py-4">
        <p className="mx-auto max-w-6xl text-sm text-muted">
          &copy; {year} {m.site_name()}. {m.footer_rights()}
        </p>
      </div>
    </footer>
  )
}

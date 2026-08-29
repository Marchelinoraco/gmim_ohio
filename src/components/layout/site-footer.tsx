import * as m from '@/paraglide/messages'
import { LanguageSwitcher } from '@/components/layout/language-switcher'
import { Logo } from '@/components/layout/logo'
import { SITE } from '@/config/site'

// Link sosial ditarik dari `SITE`; entri tanpa URL disembunyikan.
// TODO(Rencana 2): tambah Instagram/YouTube saat URL-nya masuk Site Settings.
const SOCIAL_LINKS = [{ key: 'facebook', label: 'Facebook', href: SITE.facebookUrl }].filter(
  (s) => s.href.length > 0,
)

export function SiteFooter() {
  const year = new Date().getFullYear()

  return (
    <footer className="border-border bg-surface-2 mt-16 border-t">
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-10 sm:grid-cols-2 lg:grid-cols-4">
        <div className="space-y-2">
          <div className="text-ink flex items-center gap-2.5">
            <Logo variant="mark" />
            <span className="font-serif text-base font-semibold">{m.site_name()}</span>
          </div>
          <p className="text-muted text-sm">{m.site_tagline()}</p>
        </div>

        <div className="space-y-2">
          <h2 className="text-ink font-serif text-sm font-semibold">{m.nav_visit()}</h2>
          <address className="text-ink text-sm not-italic">{SITE.address}</address>
        </div>

        {SOCIAL_LINKS.length > 0 && (
          <div className="space-y-2">
            <h2 className="text-ink font-serif text-sm font-semibold">{m.footer_social()}</h2>
            <ul aria-label={m.footer_social()} className="flex flex-col">
              {SOCIAL_LINKS.map((s) => (
                <li key={s.key}>
                  <a
                    href={s.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-muted hover:text-primary inline-flex min-h-11 items-center text-sm"
                  >
                    {s.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="space-y-2">
          <h2 className="text-ink font-serif text-sm font-semibold">
            {m.lang_id()} / {m.lang_en()}
          </h2>
          <LanguageSwitcher />
        </div>
      </div>

      <div className="border-border border-t px-4 py-4">
        <p className="text-muted mx-auto max-w-6xl text-sm">
          &copy; {year} {m.site_name()}. {m.footer_rights()}
        </p>
      </div>
    </footer>
  )
}

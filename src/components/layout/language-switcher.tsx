import { useLocation } from '@tanstack/react-router'
import * as m from '@/paraglide/messages'
import { getLocale, locales, localizeHref } from '@/paraglide/runtime'

export function LanguageSwitcher() {
  const current = getLocale()
  const { pathname } = useLocation()

  return (
    <nav aria-label="Bahasa" className="flex gap-2 text-sm">
      {locales.map((loc) => (
        <a
          key={loc}
          href={localizeHref(pathname, { locale: loc })}
          aria-current={loc === current ? 'true' : undefined}
          className={loc === current ? 'font-semibold underline' : 'text-muted'}
        >
          {loc === 'id' ? m.lang_id() : m.lang_en()}
        </a>
      ))}
    </nav>
  )
}

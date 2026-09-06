import { useLocation } from '@tanstack/react-router'
import * as m from '@/paraglide/messages'
import { getLocale, locales, localizeHref } from '@/paraglide/runtime'

/**
 * Pemilih bahasa ringkas — kode dua huruf, bukan nama bahasa penuh.
 *
 * Versi sebelumnya menulis "Indonesia" dan "English" utuh (~130px) sehingga
 * header meluap melewati `max-w-6xl` dan memotong kontrol paling kanan.
 *
 * `aria-label` sengaja MEMUAT teks yang terlihat ("ID …", "EN …") — WCAG 2.5.3
 * (Label in Name) mensyaratkan nama aksesibel memuat labelnya yang tampak, dan
 * "ID" bukan substring dari "Indonesia".
 */
export function LanguageSwitcher() {
  const current = getLocale()
  const { pathname } = useLocation()

  return (
    <nav aria-label={m.nav_language_label()} className="flex items-center gap-0.5 text-sm">
      {locales.map((loc) => {
        const active = loc === current
        return (
          <a
            key={loc}
            href={localizeHref(pathname, { locale: loc })}
            aria-current={active ? 'true' : undefined}
            aria-label={loc === 'id' ? m.lang_id_full() : m.lang_en_full()}
            className={
              active
                ? 'bg-primary text-surface inline-flex h-8 min-w-9 items-center justify-center rounded-md px-2 font-semibold'
                : 'text-muted hover:bg-surface-2 hover:text-ink inline-flex h-8 min-w-9 items-center justify-center rounded-md px-2 transition-colors duration-150'
            }
          >
            {loc === 'id' ? m.lang_id_short() : m.lang_en_short()}
          </a>
        )
      })}
    </nav>
  )
}

import * as m from '@/paraglide/messages'
import { LanguageSwitcher } from '@/components/layout/language-switcher'
import { Logo } from '@/components/layout/logo'
import { SiteMapFooter } from '@/components/site/site-map-footer'
import { SITE } from '@/config/site'

// Link sosial ditarik dari `SITE`, BUKAN `getSiteSettings()`: `SiteFooter` ada di
// `__root.tsx` yang tak punya loader, dan memberi root sebuah settings loader akan
// membuat SETIAP halaman — termasuk coming-soon — bergantung ke database (Rencana
// 1 sengaja membuat `/api/auth` lazy supaya `/` tetap boot dengan `DATABASE_URL`
// kosong). `social_links.facebook` di seed pun generik (`https://www.facebook.com/`)
// — lebih buruk dari `SITE.facebookUrl`. Entri tanpa URL disembunyikan.
// TODO(Rencana 3): pindah ke Site Settings begitu root punya loader, dan tambah
// Instagram/YouTube saat URL-nya masuk.
const SOCIAL_LINKS = [{ key: 'facebook', label: 'Facebook', href: SITE.facebookUrl }].filter(
  (s) => s.href.length > 0,
)

// `SITE` `as const` menyempitkan `SITE.comingSoon` ke literal `false` → dibaca
// lewat indireksi bertipe `boolean` supaya `!comingSoon` di bawah tidak dianggap
// kondisi konstan (alasan lengkap di docblock `comingSoon`, `src/lib/seo.ts`;
// pointer lama ke `src/routes/index.tsx` sudah tak berlaku sejak halaman
// coming-soon dihapus).
const comingSoon: boolean = SITE.comingSoon

// Dievaluasi sekali saat modul dimuat — sama di server & klien untuk umur proses,
// jadi jendela mismatch-hidrasi pergantian tahun mengecil ke ~nol.
const CURRENT_YEAR = new Date().getFullYear()

export function SiteFooter() {
  return (
    <footer className="border-border bg-surface-2 mt-16 border-t">
      {/* Cabang coming-soon (simetris dengan `site-header.tsx`): peta situs
          disembunyikan — menautkan ke /tentang, /warta, dst. berarti
          mengiklankan halaman yang belum diluncurkan. Rencana 2b SUDAH menyetel
          `SITE.comingSoon = false`, jadi peta situs tampil. */}
      {!comingSoon && <SiteMapFooter />}

      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-10 sm:grid-cols-2 lg:grid-cols-4">
        <div className="space-y-2">
          <div className="text-ink flex items-center gap-2.5">
            <Logo variant="mark" size={32} />
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
          &copy; {CURRENT_YEAR} {m.site_name()}. {m.footer_rights()}
        </p>
      </div>
    </footer>
  )
}

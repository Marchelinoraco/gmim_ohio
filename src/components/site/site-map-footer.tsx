import { Link } from '@tanstack/react-router'
import * as m from '@/paraglide/messages'
import { getLocale, localizeHref } from '@/paraglide/runtime'

/**
 * Peta situs footer — kolom tautan ke SEMUA halaman publik. Dirender oleh
 * `<SiteFooter>` HANYA saat `!SITE.comingSoon` (lihat komentar di sana): selagi
 * coming-soon, menautkan ke `/tentang`, `/warta`, dst. berarti mengiklankan
 * halaman yang belum diluncurkan — persis yang dicegah `SITE.comingSoon`.
 *
 * Delapan halaman sudah punya route → `<Link to>` TanStack yang typed (rewrite
 * router melokalkan href-nya di `/en`). `/pelayanan` dan `/jadwal` BELUM ada
 * sampai Rencana 2b — `<Link to>` ke situ tak akan ter-compile — jadi dirender
 * sebagai `<a>` biasa + `localizeHref` (pola sama dengan `site-header.tsx`),
 * resolve ke 404 sampai route-nya dibuat.
 */

const LINK_CLASS = 'text-muted hover:text-primary inline-flex min-h-11 items-center text-sm'

export function SiteMapFooter() {
  const locale = getLocale()

  return (
    <nav
      aria-label={m.footer_sitemap_label()}
      className="border-border mx-auto grid max-w-6xl gap-8 border-b px-4 py-10 sm:grid-cols-2 lg:grid-cols-3"
    >
      <div className="space-y-2">
        <h2 className="text-ink font-serif text-sm font-semibold">{m.footer_explore()}</h2>
        <ul aria-label={m.footer_explore()} className="flex flex-col">
          <li>
            <Link to="/" className={LINK_CLASS}>
              {m.nav_home()}
            </Link>
          </li>
          <li>
            <Link to="/tentang" className={LINK_CLASS}>
              {m.nav_about()}
            </Link>
          </li>
          <li>
            {/* TODO(2b): ganti jadi <Link to="/pelayanan"> setelah route-nya ada */}
            <a href={localizeHref('/pelayanan', { locale })} className={LINK_CLASS}>
              {m.nav_ministries()}
            </a>
          </li>
        </ul>
      </div>

      <div className="space-y-2">
        <h2 className="text-ink font-serif text-sm font-semibold">{m.footer_publications()}</h2>
        <ul aria-label={m.footer_publications()} className="flex flex-col">
          <li>
            <Link to="/warta" className={LINK_CLASS}>
              {m.warta_title()}
            </Link>
          </li>
          <li>
            <Link to="/renungan" className={LINK_CLASS}>
              {m.renungan_title()}
            </Link>
          </li>
          <li>
            <Link to="/galeri" className={LINK_CLASS}>
              {m.nav_gallery()}
            </Link>
          </li>
        </ul>
      </div>

      <div className="space-y-2">
        <h2 className="text-ink font-serif text-sm font-semibold">{m.footer_worship()}</h2>
        <ul aria-label={m.footer_worship()} className="flex flex-col">
          <li>
            {/* TODO(2b): ganti jadi <Link to="/jadwal"> setelah route-nya ada */}
            <a href={localizeHref('/jadwal', { locale })} className={LINK_CLASS}>
              {m.nav_schedule()}
            </a>
          </li>
          <li>
            <Link to="/kunjungi" className={LINK_CLASS}>
              {m.nav_visit()}
            </Link>
          </li>
          <li>
            <Link to="/ibadah-live" className={LINK_CLASS}>
              {m.cta_live()}
            </Link>
          </li>
          <li>
            <Link to="/persembahan" className={LINK_CLASS}>
              {m.cta_give()}
            </Link>
          </li>
        </ul>
      </div>
    </nav>
  )
}

import { Link } from '@tanstack/react-router'
import * as m from '@/paraglide/messages'

/**
 * Peta situs footer — kolom tautan ke SEMUA halaman publik. Dirender oleh
 * `<SiteFooter>` HANYA saat `!SITE.comingSoon` (lihat komentar di sana): selagi
 * coming-soon, menautkan ke `/tentang`, `/warta`, dst. berarti mengiklankan
 * halaman yang belum diluncurkan — persis yang dicegah `SITE.comingSoon`.
 *
 * Semua sepuluh halaman sudah punya route sejak Rencana 2b → seluruh tautan
 * dirender lewat `<Link to>` TanStack yang typed (rewrite router melokalkan
 * href-nya di `/en`).
 */

const LINK_CLASS = 'text-muted hover:text-primary inline-flex min-h-11 items-center text-sm'

export function SiteMapFooter() {
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
            <Link to="/pelayanan" className={LINK_CLASS}>
              {m.nav_ministries()}
            </Link>
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
            <Link to="/jadwal" search={{ view: 'daftar' }} className={LINK_CLASS}>
              {m.nav_schedule()}
            </Link>
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

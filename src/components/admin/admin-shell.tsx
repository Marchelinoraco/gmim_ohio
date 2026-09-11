import { useState } from 'react'
import { useRouter, Link } from '@tanstack/react-router'
import { CalendarDays, FileText, Home, Images, LogOut, Mail, Menu, Settings, X } from 'lucide-react'
import * as m from '@/paraglide/messages'
import { signOut } from '@/lib/auth-client'
import { Button } from '@/components/ui/button'
import { Logo } from '@/components/layout/logo'

/**
 * Shell dashboard — sidebar kiri persisten + topbar, mengikuti pola referensi
 * yang dipilih pemilik proyek (`shadcnuikit.com/dashboard/file-manager`).
 *
 * Halaman yang ditautkan sidebar dibangun bertahap di rencana berikutnya; yang
 * belum ada sengaja TETAP ditautkan supaya kerangka navigasinya terlihat utuh
 * sejak awal dan tidak perlu disentuh tiap fase. Route yang belum ada akan
 * memunculkan 404 — itu jujur, dan lebih baik daripada menu yang tumbuh
 * sepotong-sepotong.
 */
/**
 * Struktur navigasi lengkap sejak awal. Item yang belum mempunyai route
 * menggunakan `<a href>` biasa; akan berubah jadi `<Link>` saat route-nya lahir
 * di rencana berikutnya. Ini menjaga kerangka navigasi tetap utuh dan mudah
 * diperbarui daripada tumbuh sepotong-sepotong.
 */
const NAV = [
  { href: '/admin', label: () => m.admin_nav_home(), icon: Home, exact: true },
  { href: '/admin/jadwal', label: () => m.admin_nav_schedule(), icon: CalendarDays, exact: false },
  { href: '/admin/warta', label: () => m.admin_nav_bulletins(), icon: FileText, exact: false },
  { href: '/admin/renungan', label: () => m.admin_nav_devotionals(), icon: FileText, exact: false },
  { href: '/admin/galeri', label: () => m.admin_nav_gallery(), icon: Images, exact: false },
  { href: '/admin/master', label: () => m.admin_nav_master(), icon: Settings, exact: false },
  { href: '/admin/pesan', label: () => m.admin_nav_messages(), icon: Mail, exact: false },
] as const

export function AdminShell({ email, children }: { email: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(false)
  const router = useRouter()

  async function keluar() {
    await signOut()
    await router.navigate({ to: '/admin/login' })
  }

  const nav = (
    <nav aria-label={m.admin_nav_label()} className="flex flex-col gap-0.5 p-3">
      {NAV.map((item) => {
        const Icon = item.icon
        const className =
          'text-ink hover:bg-surface-2 data-[status=active]:bg-surface-2 data-[status=active]:text-primary flex min-h-11 items-center gap-2.5 rounded-md px-3 text-sm font-medium'

        // Route yang sudah ada memakai <Link> (navigasi klien, tanpa muat ulang);
        // sisanya tetap <a> sampai route-nya lahir di rencana berikutnya —
        // `Link` TanStack bertipe ketat dan menolak path yang belum terdaftar.
        // Perbandingan eksplisit, bukan `daftar.includes(...)`: `includes`
        // mengembalikan boolean biasa dan tidak menyempitkan tipe `item.href`,
        // sehingga `<Link to>` menolaknya. Rantai `===` adalah type guard.
        if (
          item.href === '/admin' ||
          item.href === '/admin/jadwal' ||
          item.href === '/admin/warta' ||
          item.href === '/admin/renungan'
        ) {
          return (
            <Link
              key={item.href}
              to={item.href}
              activeOptions={{ exact: item.exact }}
              onClick={() => setOpen(false)}
              className={className}
            >
              <Icon aria-hidden="true" className="size-4 shrink-0" />
              {item.label()}
            </Link>
          )
        }

        return (
          <a key={item.href} href={item.href} onClick={() => setOpen(false)} className={className}>
            <Icon aria-hidden="true" className="size-4 shrink-0" />
            {item.label()}
          </a>
        )
      })}
    </nav>
  )

  return (
    <div className="bg-surface-2 flex min-h-svh">
      {/* Sidebar desktop */}
      <aside className="border-border bg-surface hidden w-60 shrink-0 border-r lg:block">
        <div className="border-border flex h-16 items-center gap-2.5 border-b px-4">
          <Logo variant="mark" size={28} />
          <span className="font-serif text-sm font-semibold">GMIM Musafir</span>
        </div>
        {nav}
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="border-border bg-surface flex h-16 shrink-0 items-center justify-between gap-3 border-b px-4">
          <button
            type="button"
            className="text-ink hover:bg-surface-2 inline-flex h-11 w-11 items-center justify-center rounded-md lg:hidden"
            aria-expanded={open}
            aria-label={m.admin_open_menu()}
            onClick={() => setOpen((v) => !v)}
          >
            {open ? (
              <X aria-hidden="true" className="size-5" />
            ) : (
              <Menu aria-hidden="true" className="size-5" />
            )}
          </button>

          <span className="text-muted truncate text-sm">{email}</span>

          <Button variant="ghost" size="sm" onClick={keluar}>
            <LogOut aria-hidden="true" className="size-4" />
            {m.admin_sign_out()}
          </Button>
        </header>

        {/* Drawer mobile — hanya dirender saat terbuka, seperti panel nav situs publik. */}
        {open && <div className="border-border bg-surface border-b lg:hidden">{nav}</div>}

        <main className="min-w-0 flex-1 p-4 lg:p-6">{children}</main>
      </div>
    </div>
  )
}

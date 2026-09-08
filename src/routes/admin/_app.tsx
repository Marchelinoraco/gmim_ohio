import { createFileRoute, Outlet } from '@tanstack/react-router'
import { ensureAdmin } from '@/lib/auth.functions'
import { AdminShell } from '@/components/admin/admin-shell'

/**
 * Pathless layout `_app` — SATU gerbang untuk seluruh `/admin/*` kecuali
 * `/admin/login`, yang sengaja berada di luarnya.
 *
 * Pemeriksaan sesi ditaruh di sini, bukan diulang tiap halaman: pemeriksaan yang
 * tersebar adalah pemeriksaan yang suatu hari terlewat di satu halaman baru.
 * Halaman berikutnya cukup dinamai `admin._app.<nama>.tsx` dan otomatis dijaga.
 *
 * Ini gerbang untuk PENGALAMAN PENGGUNA. Gerbang keamanan sesungguhnya ada di
 * tiap server fn mutasi, yang memanggil `ensureAdmin()` sendiri — route yang
 * dijaga tidak menghalangi siapa pun memanggil server fn-nya langsung.
 */
export const Route = createFileRoute('/admin/_app')({
  beforeLoad: async () => {
    const { user } = await ensureAdmin()
    return { user }
  },
  loader: ({ context }) => ({ email: context.user.email }),
  head: () => ({ meta: [{ name: 'robots', content: 'noindex' }] }),
  component: AdminLayout,
})

function AdminLayout() {
  const { email } = Route.useLoaderData()
  return (
    <AdminShell email={email}>
      <Outlet />
    </AdminShell>
  )
}

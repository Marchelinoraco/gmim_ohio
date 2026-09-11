import { useState } from 'react'
import { createFileRoute, Link, useRouter } from '@tanstack/react-router'
import * as m from '@/paraglide/messages'
import { getLocale } from '@/paraglide/runtime'
import { formatDateLong } from '@/lib/datetime'
import { listServicesForAdmin, type AdminServiceRow } from '@/features/schedule/admin-queries'
import { deleteService, setServiceStatus } from '@/features/schedule/mutations'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

export const Route = createFileRoute('/admin/_app/jadwal/')({
  loader: () => listServicesForAdmin({ data: {} }),
  component: JadwalDaftar,
})

function JadwalDaftar() {
  const rows = Route.useLoaderData()
  const router = useRouter()
  const locale = getLocale()
  // Baris yang sedang dikonfirmasi hapus. `null` = dialog tertutup.
  const [akanDihapus, setAkanDihapus] = useState<AdminServiceRow | null>(null)

  async function ubahStatus(row: AdminServiceRow) {
    await setServiceStatus({
      data: { id: row.id, status: row.status === 'published' ? 'draft' : 'published' },
    })
    await router.invalidate()
  }

  async function hapus() {
    if (!akanDihapus) return
    await deleteService({ data: akanDihapus.id })
    setAkanDihapus(null)
    await router.invalidate()
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-serif text-2xl font-semibold">{m.admin_schedule_title()}</h1>
        <div className="flex gap-2">
          <Button asChild variant="outline" size="sm">
            <Link to="/admin/jadwal/generator">{m.admin_schedule_generator()}</Link>
          </Button>
          <Button asChild variant="primary" size="sm">
            <Link to="/admin/jadwal/baru">{m.admin_schedule_new()}</Link>
          </Button>
        </div>
      </div>

      {rows.length === 0 ? (
        <p className="text-muted text-sm">{m.admin_schedule_empty()}</p>
      ) : (
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{m.admin_schedule_col_date()}</TableHead>
                <TableHead>{m.admin_schedule_col_category()}</TableHead>
                <TableHead>{m.admin_schedule_col_theme()}</TableHead>
                <TableHead>{m.admin_schedule_col_status()}</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="whitespace-nowrap">
                    {formatDateLong(r.serviceDate, locale)} · {r.startTime.slice(0, 5)}
                  </TableCell>
                  <TableCell>
                    {r.categoryNameId}
                    {r.kolomName ? ` · ${r.kolomName}` : ''}
                  </TableCell>
                  <TableCell className="text-muted">{r.themeId ?? '—'}</TableCell>
                  <TableCell>
                    {r.status === 'published'
                      ? m.admin_schedule_status_published()
                      : m.admin_schedule_status_draft()}
                  </TableCell>
                  <TableCell className="flex flex-wrap gap-1.5">
                    <Button asChild variant="ghost" size="sm">
                      <Link to="/admin/jadwal/$id" params={{ id: r.id }}>
                        {m.admin_schedule_edit()}
                      </Link>
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => ubahStatus(r)}>
                      {r.status === 'published'
                        ? m.admin_schedule_unpublish()
                        : m.admin_schedule_publish()}
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => setAkanDihapus(r)}>
                      {m.admin_schedule_delete()}
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Dialog, bukan window.confirm: window.confirm memblok thread dan tak bisa
          dibaca pembaca layar dengan konteks yang sama. */}
      <Dialog open={akanDihapus !== null} onOpenChange={(o) => !o && setAkanDihapus(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{m.admin_schedule_delete_confirm()}</DialogTitle>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAkanDihapus(null)}>
              {m.admin_service_cancel()}
            </Button>
            <Button variant="primary" onClick={hapus}>
              {m.admin_schedule_delete()}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

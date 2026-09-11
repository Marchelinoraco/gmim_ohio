import { useState } from 'react'
import { createFileRoute, Link, useRouter } from '@tanstack/react-router'
import * as m from '@/paraglide/messages'
import { getLocale } from '@/paraglide/runtime'
import { formatDateLong } from '@/lib/datetime'
import { listBulletinsForAdmin, type AdminBulletinRow } from '@/features/content/admin-queries'
import { deleteBulletin, setBulletinStatus } from '@/features/content/bulletin-mutations'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

export const Route = createFileRoute('/admin/_app/warta/')({
  loader: () => listBulletinsForAdmin(),
  component: WartaDaftar,
})

function WartaDaftar() {
  const rows = Route.useLoaderData()
  const router = useRouter()
  const locale = getLocale()
  const [akanDihapus, setAkanDihapus] = useState<AdminBulletinRow | null>(null)

  async function ubahStatus(row: AdminBulletinRow) {
    await setBulletinStatus({
      data: { id: row.id, status: row.status === 'published' ? 'draft' : 'published' },
    })
    await router.invalidate()
  }

  async function hapus() {
    if (!akanDihapus) return
    await deleteBulletin({ data: akanDihapus.id })
    setAkanDihapus(null)
    await router.invalidate()
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-serif text-2xl font-semibold">{m.admin_bulletin_title()}</h1>
        <Button asChild variant="primary" size="sm">
          <Link to="/admin/warta/baru">{m.admin_bulletin_new()}</Link>
        </Button>
      </div>

      {rows.length === 0 ? (
        <p className="text-muted text-sm">{m.admin_bulletin_empty()}</p>
      ) : (
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{m.admin_bulletin_week()}</TableHead>
                <TableHead>{m.admin_bulletin_title_id()}</TableHead>
                <TableHead>{m.admin_bulletin_has_pdf()}</TableHead>
                <TableHead>{m.admin_schedule_col_status()}</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="whitespace-nowrap">
                    {formatDateLong(r.weekDate, locale)}
                  </TableCell>
                  <TableCell>{r.titleId}</TableCell>
                  <TableCell className="text-muted">{r.punyaPdf ? '✓' : '—'}</TableCell>
                  <TableCell>
                    {r.status === 'published'
                      ? m.admin_schedule_status_published()
                      : m.admin_schedule_status_draft()}
                  </TableCell>
                  <TableCell className="flex flex-wrap gap-1.5">
                    <Button asChild variant="ghost" size="sm">
                      <Link to="/admin/warta/$id" params={{ id: r.id }}>
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
            <DialogTitle>{m.admin_bulletin_delete_confirm()}</DialogTitle>
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

import { useState } from 'react'
import { createFileRoute, Link, useRouter } from '@tanstack/react-router'
import * as m from '@/paraglide/messages'
import { getLocale } from '@/paraglide/runtime'
import { formatDateLong } from '@/lib/datetime'
import { listDevotionalsForAdmin, type AdminDevotionalRow } from '@/features/content/admin-queries'
import { deleteDevotional, setDevotionalStatus } from '@/features/content/devotional-mutations'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

export const Route = createFileRoute('/admin/_app/renungan/')({
  loader: () => listDevotionalsForAdmin(),
  component: RenunganDaftar,
})

function RenunganDaftar() {
  const rows = Route.useLoaderData()
  const router = useRouter()
  const locale = getLocale()
  const [akanDihapus, setAkanDihapus] = useState<AdminDevotionalRow | null>(null)

  async function ubahStatus(row: AdminDevotionalRow) {
    await setDevotionalStatus({
      data: { id: row.id, status: row.status === 'published' ? 'draft' : 'published' },
    })
    await router.invalidate()
  }

  async function hapus() {
    if (!akanDihapus) return
    await deleteDevotional({ data: akanDihapus.id })
    setAkanDihapus(null)
    await router.invalidate()
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-serif text-2xl font-semibold">{m.admin_devotional_title()}</h1>
        <Button asChild variant="primary" size="sm">
          <Link to="/admin/renungan/baru">{m.admin_devotional_new()}</Link>
        </Button>
      </div>

      {rows.length === 0 ? (
        <p className="text-muted text-sm">{m.admin_devotional_empty()}</p>
      ) : (
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{m.admin_devotional_date()}</TableHead>
                <TableHead>{m.admin_bulletin_title_id()}</TableHead>
                <TableHead>{m.admin_devotional_author()}</TableHead>
                <TableHead>{m.admin_schedule_col_status()}</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="whitespace-nowrap">
                    {formatDateLong(r.publishedDate, locale)}
                  </TableCell>
                  <TableCell>{r.titleId}</TableCell>
                  <TableCell className="text-muted">{r.authorName}</TableCell>
                  <TableCell>
                    {r.status === 'published'
                      ? m.admin_schedule_status_published()
                      : m.admin_schedule_status_draft()}
                  </TableCell>
                  <TableCell className="flex flex-wrap gap-1.5">
                    <Button asChild variant="ghost" size="sm">
                      <Link to="/admin/renungan/$id" params={{ id: r.id }}>
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

      <Dialog open={akanDihapus !== null} onOpenChange={(o) => !o && setAkanDihapus(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{m.admin_devotional_delete_confirm()}</DialogTitle>
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

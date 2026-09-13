import { useState } from 'react'
import { createFileRoute, Link, useRouter } from '@tanstack/react-router'
import * as m from '@/paraglide/messages'
import { getLocale } from '@/paraglide/runtime'
import { formatDateLong } from '@/lib/datetime'
import { listAlbumsForAdmin, type AdminAlbumRow } from '@/features/gallery/admin-queries'
import { deleteAlbum, setAlbumStatus } from '@/features/gallery/mutations'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

export const Route = createFileRoute('/admin/_app/galeri/')({
  loader: () => listAlbumsForAdmin(),
  component: GaleriDaftar,
})

function GaleriDaftar() {
  const rows = Route.useLoaderData()
  const router = useRouter()
  const locale = getLocale()
  const [akanDihapus, setAkanDihapus] = useState<AdminAlbumRow | null>(null)

  async function ubahStatus(row: AdminAlbumRow) {
    await setAlbumStatus({
      data: { id: row.id, status: row.status === 'published' ? 'draft' : 'published' },
    })
    await router.invalidate()
  }

  async function hapus() {
    if (!akanDihapus) return
    await deleteAlbum({ data: akanDihapus.id })
    setAkanDihapus(null)
    await router.invalidate()
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-serif text-2xl font-semibold">{m.admin_gallery_title()}</h1>
        <Button asChild variant="primary" size="sm">
          <Link to="/admin/galeri/baru">{m.admin_gallery_new()}</Link>
        </Button>
      </div>

      {rows.length === 0 ? (
        <p className="text-muted text-sm">{m.admin_gallery_empty()}</p>
      ) : (
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{m.admin_gallery_col_cover()}</TableHead>
                <TableHead>{m.admin_gallery_col_title()}</TableHead>
                <TableHead>{m.admin_gallery_col_date()}</TableHead>
                <TableHead>{m.admin_gallery_col_items()}</TableHead>
                <TableHead>{m.admin_schedule_col_status()}</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((r) => (
                <TableRow key={r.id}>
                  <TableCell>
                    {r.coverImageUrl ? (
                      // Sampul dirender kecil; `alt` kosong karena judulnya ada
                      // di sel sebelahnya — mengulanginya hanya menambah
                      // kebisingan bagi pembaca layar.
                      <img
                        src={r.coverImageUrl}
                        alt=""
                        className="border-border h-10 w-14 rounded border object-cover"
                      />
                    ) : (
                      <span className="text-muted text-xs">—</span>
                    )}
                  </TableCell>
                  <TableCell className="font-medium">{r.titleId}</TableCell>
                  <TableCell className="whitespace-nowrap">
                    {formatDateLong(r.albumDate, locale)}
                  </TableCell>
                  <TableCell>{r.itemCount}</TableCell>
                  <TableCell>
                    {r.status === 'published'
                      ? m.admin_schedule_status_published()
                      : m.admin_schedule_status_draft()}
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-2">
                      <Button asChild variant="outline" size="sm">
                        <Link to="/admin/galeri/$id" params={{ id: r.id }}>
                          {m.admin_gallery_edit()}
                        </Link>
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => ubahStatus(r)}>
                        {r.status === 'published'
                          ? m.admin_schedule_unpublish()
                          : m.admin_schedule_publish()}
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => setAkanDihapus(r)}>
                        {m.admin_schedule_delete()}
                      </Button>
                    </div>
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
            <DialogTitle>{m.admin_gallery_delete_confirm()}</DialogTitle>
          </DialogHeader>
          <p className="text-muted text-sm">{akanDihapus?.titleId}</p>
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

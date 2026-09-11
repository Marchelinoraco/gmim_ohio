import { useState } from 'react'
import { createFileRoute, useRouter } from '@tanstack/react-router'
import * as m from '@/paraglide/messages'
import { getLocale } from '@/paraglide/runtime'
import { formatDateLong } from '@/lib/datetime'
import { listMessagesForAdmin, type AdminMessageRow } from '@/features/master/admin-queries'
import { deleteMessage, setMessageStatus } from '@/features/master/mutations'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

export const Route = createFileRoute('/admin/_app/pesan/')({
  loader: () => listMessagesForAdmin(),
  component: Pesan,
})

const LABEL_STATUS = {
  new: () => m.admin_messages_status_new(),
  read: () => m.admin_messages_status_read(),
  done: () => m.admin_messages_status_done(),
} as const

/** Taut permanen ber-underline; lihat komentar di tempat pemakaiannya. */
const taut = 'text-primary underline underline-offset-2'

function Pesan() {
  const rows = Route.useLoaderData()
  const router = useRouter()
  const locale = getLocale()
  const [akanDihapus, setAkanDihapus] = useState<AdminMessageRow | null>(null)
  const [dibaca, setDibaca] = useState<AdminMessageRow | null>(null)

  async function ubahStatus(row: AdminMessageRow, status: 'read' | 'done') {
    await setMessageStatus({ data: { id: row.id, status } })
    await router.invalidate()
  }

  async function hapus() {
    if (!akanDihapus) return
    await deleteMessage({ data: akanDihapus.id })
    setAkanDihapus(null)
    await router.invalidate()
  }

  return (
    <div className="flex flex-col gap-6">
      <h1 className="font-serif text-2xl font-semibold">{m.admin_messages_title()}</h1>

      {rows.length === 0 ? (
        <p className="text-muted text-sm">{m.admin_messages_empty()}</p>
      ) : (
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{m.admin_messages_from()}</TableHead>
                <TableHead>{m.admin_messages_message()}</TableHead>
                <TableHead>{m.admin_messages_received()}</TableHead>
                <TableHead>{m.admin_messages_status()}</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((r) => (
                <TableRow key={r.id}>
                  <TableCell>
                    <div className="flex flex-col gap-0.5">
                      <span className="font-medium">{r.name}</span>
                      {/* Underline permanen, bukan hover:underline — taut yang
                          dibedakan hanya oleh warna tidak memenuhi WCAG 1.4.1,
                          dan di tema gelap kontrasnya terhadap teks sekitar
                          hanya 1.05:1. */}
                      <a className={taut} href={`mailto:${r.email}`}>
                        {r.email}
                      </a>
                      {r.phone && (
                        <a className={taut} href={`tel:${r.phone}`}>
                          {r.phone}
                        </a>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="max-w-sm">
                    {/* Dipotong, TAPI selalu ada jalan melihat penuh: memotong
                        tanpa itu membuat pesan panjang tak bisa dibaca sama
                        sekali. */}
                    <p className="line-clamp-2 text-sm">{r.message}</p>
                    <button type="button" className={`${taut} text-xs`} onClick={() => setDibaca(r)}>
                      {m.admin_messages_read_full()}
                    </button>
                  </TableCell>
                  <TableCell className="whitespace-nowrap">
                    {/* Stempel waktu disimpan UTC; sepuluh karakter pertama ISO
                        adalah tanggal UTC-nya — deterministik lintas mesin. */}
                    {formatDateLong(r.createdAt.slice(0, 10), locale)}
                  </TableCell>
                  <TableCell>{LABEL_STATUS[r.status]()}</TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-2">
                      {r.status === 'new' && (
                        <Button variant="outline" size="sm" onClick={() => ubahStatus(r, 'read')}>
                          {m.admin_messages_mark_read()}
                        </Button>
                      )}
                      {r.status !== 'done' && (
                        <Button variant="outline" size="sm" onClick={() => ubahStatus(r, 'done')}>
                          {m.admin_messages_mark_done()}
                        </Button>
                      )}
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

      <Dialog open={dibaca !== null} onOpenChange={(o) => !o && setDibaca(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{dibaca?.name}</DialogTitle>
          </DialogHeader>
          {/* whitespace-pre-wrap: pesan diketik pengunjung, barisnya bermakna. */}
          <p className="text-ink max-h-96 overflow-y-auto text-sm whitespace-pre-wrap">
            {dibaca?.message}
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDibaca(null)}>
              {m.admin_service_cancel()}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog, bukan window.confirm: window.confirm memblok thread dan tak bisa
          dibaca pembaca layar dengan konteks yang sama. */}
      <Dialog open={akanDihapus !== null} onOpenChange={(o) => !o && setAkanDihapus(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{m.admin_messages_delete_confirm()}</DialogTitle>
          </DialogHeader>
          <p className="text-muted text-sm">{akanDihapus?.name}</p>
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

import { useState } from 'react'
import { createFileRoute, useRouter } from '@tanstack/react-router'
import * as m from '@/paraglide/messages'
import { CATEGORY_COLOR_TOKENS } from '@/db/schema/worship'
import {
  listCategoriesForAdmin,
  listKolomForAdmin,
  type AdminCategoryRow,
  type AdminKolomRow,
} from '@/features/master/admin-queries'
import {
  createKolom,
  deleteKolom,
  updateCategory,
  updateKolom,
} from '@/features/master/mutations'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

export const Route = createFileRoute('/admin/_app/master/')({
  loader: async () => ({
    categories: await listCategoriesForAdmin(),
    kolom: await listKolomForAdmin(),
  }),
  component: MasterData,
})

/** Baris kolom yang belum tersimpan — `id` kosong menandainya baru. */
type DraftKolom = Omit<AdminKolomRow, 'id'> & { id: string }

const KOLOM_BARU: DraftKolom = {
  id: '',
  name: '',
  number: 0,
  coordinatorName: null,
  coordinatorPhone: null,
  isActive: true,
}

const field = 'border-border bg-surface text-ink w-full rounded border px-2 py-1.5 text-sm'

function MasterData() {
  const { categories, kolom } = Route.useLoaderData()
  const router = useRouter()
  // Satu wilayah umpan balik untuk seluruh halaman. `<Toaster>` belum terpasang
  // di layout mana pun, jadi `toast()` tidak akan terlihat sama sekali.
  const [kabar, setKabar] = useState('')
  const [akanDihapus, setAkanDihapus] = useState<AdminKolomRow | null>(null)
  const [baris, setBaris] = useState<DraftKolom[]>([])

  async function segarkan(pesan: string) {
    setKabar(pesan)
    await router.invalidate()
  }

  async function simpanKolom(k: DraftKolom) {
    const data = {
      name: k.name,
      number: k.number,
      coordinatorName: k.coordinatorName ?? undefined,
      coordinatorPhone: k.coordinatorPhone ?? undefined,
      isActive: k.isActive,
    }
    if (k.id) await updateKolom({ data: { ...data, id: k.id } })
    else {
      await createKolom({ data })
      setBaris((v) => v.filter((b) => b !== k))
    }
    await segarkan(m.admin_master_saved())
  }

  async function hapus() {
    if (!akanDihapus) return
    const { dipakai } = await deleteKolom({ data: akanDihapus.id })
    setAkanDihapus(null)
    // Jangan diam saat penghapusan ditolak: pengurus yang menekan Hapus dan
    // tidak melihat apa-apa akan menyimpulkan aplikasinya rusak.
    await segarkan(
      dipakai > 0 ? m.admin_master_kolom_in_use({ jumlah: dipakai }) : m.admin_master_saved(),
    )
  }

  return (
    <div className="flex flex-col gap-8">
      <h1 className="font-serif text-2xl font-semibold">{m.admin_master_title()}</h1>

      <p role="status" aria-live="polite" className="text-muted min-h-5 text-sm">
        {kabar}
      </p>

      <section className="flex flex-col gap-3">
        <h2 className="font-serif text-lg font-semibold">{m.admin_master_categories()}</h2>
        {/* Alasan tidak ada tombol "Tambah" ditulis di sini, bukan disembunyikan:
            pengurus harus tahu sebelum mencari tombolnya. */}
        <p className="text-muted max-w-prose text-sm">{m.admin_master_categories_note()}</p>

        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{m.admin_master_name_id()}</TableHead>
                <TableHead>{m.admin_master_name_en()}</TableHead>
                <TableHead>{m.admin_master_slug()}</TableHead>
                <TableHead>{m.admin_master_color()}</TableHead>
                <TableHead>{m.admin_master_order()}</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {categories.map((c) => (
                <BarisKategori
                  key={c.id}
                  awal={c}
                  onSimpan={async (v) => {
                    await updateCategory({ data: v })
                    await segarkan(m.admin_master_saved())
                  }}
                />
              ))}
            </TableBody>
          </Table>
        </div>
      </section>

      <section className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-serif text-lg font-semibold">{m.admin_master_kolom()}</h2>
          <Button
            variant="primary"
            size="sm"
            onClick={() => setBaris((v) => [...v, { ...KOLOM_BARU }])}
          >
            {m.admin_master_kolom_new()}
          </Button>
        </div>

        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{m.admin_master_kolom_name()}</TableHead>
                <TableHead>{m.admin_master_kolom_number()}</TableHead>
                <TableHead>{m.admin_master_coordinator()}</TableHead>
                <TableHead>{m.admin_master_coordinator_phone()}</TableHead>
                <TableHead>{m.admin_master_active()}</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {kolom.map((k) => (
                <BarisKolom
                  key={k.id}
                  awal={k}
                  onSimpan={simpanKolom}
                  onHapus={() => setAkanDihapus(k)}
                />
              ))}
              {baris.map((k, i) => (
                <BarisKolom
                  key={`baru-${i}`}
                  awal={k}
                  onSimpan={simpanKolom}
                  onHapus={() => setBaris((v) => v.filter((b) => b !== k))}
                />
              ))}
            </TableBody>
          </Table>
        </div>
      </section>

      <Dialog open={akanDihapus !== null} onOpenChange={(o) => !o && setAkanDihapus(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{m.admin_schedule_delete_confirm()}</DialogTitle>
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

function BarisKategori({
  awal,
  onSimpan,
}: {
  awal: AdminCategoryRow
  onSimpan: (v: AdminCategoryRow) => Promise<void>
}) {
  const [v, setV] = useState(awal)
  const [sending, setSending] = useState(false)

  async function simpan() {
    if (sending) return
    setSending(true)
    try {
      await onSimpan(v)
    } finally {
      setSending(false)
    }
  }

  return (
    <TableRow>
      <TableCell>
        <Input
          aria-label={`${m.admin_master_name_id()} — ${awal.key}`}
          value={v.nameId}
          onChange={(e) => setV({ ...v, nameId: e.target.value })}
        />
      </TableCell>
      <TableCell>
        <Input
          aria-label={`${m.admin_master_name_en()} — ${awal.key}`}
          value={v.nameEn}
          onChange={(e) => setV({ ...v, nameEn: e.target.value })}
        />
      </TableCell>
      <TableCell>
        <Input
          aria-label={`${m.admin_master_slug()} — ${awal.key}`}
          value={v.slug}
          onChange={(e) => setV({ ...v, slug: e.target.value })}
        />
      </TableCell>
      <TableCell>
        <div className="flex items-center gap-2">
          {/* Satu-satunya tempat warna ditulis inline, dan nilainya token CSS —
              bukan hex — jadi contoh ini ikut bertukar warna bersama tema. */}
          <span
            aria-hidden="true"
            className="border-border size-4 shrink-0 rounded-full border"
            style={{ backgroundColor: v.color }}
          />
          <select
            aria-label={`${m.admin_master_color()} — ${awal.key}`}
            className={field}
            value={v.color}
            onChange={(e) => setV({ ...v, color: e.target.value })}
          >
            {CATEGORY_COLOR_TOKENS.map((t) => (
              <option key={t} value={t}>
                {t.slice('var(--color-cat-'.length, -1)}
              </option>
            ))}
          </select>
        </div>
      </TableCell>
      <TableCell>
        <Input
          type="number"
          min={0}
          className="w-20"
          aria-label={`${m.admin_master_order()} — ${awal.key}`}
          value={v.sortOrder}
          onChange={(e) => setV({ ...v, sortOrder: Number(e.target.value) })}
        />
      </TableCell>
      <TableCell>
        <Button variant="outline" size="sm" disabled={sending} onClick={simpan}>
          {sending ? m.admin_service_saving() : m.admin_service_save()}
        </Button>
      </TableCell>
    </TableRow>
  )
}

function BarisKolom({
  awal,
  onSimpan,
  onHapus,
}: {
  awal: DraftKolom
  onSimpan: (v: DraftKolom) => Promise<void>
  onHapus: () => void
}) {
  const [v, setV] = useState(awal)
  const [sending, setSending] = useState(false)
  const nama = awal.name || m.admin_master_kolom_new()

  async function simpan() {
    if (sending) return
    setSending(true)
    try {
      await onSimpan(v)
    } finally {
      setSending(false)
    }
  }

  return (
    <TableRow>
      <TableCell>
        <Input
          aria-label={`${m.admin_master_kolom_name()} — ${nama}`}
          value={v.name}
          onChange={(e) => setV({ ...v, name: e.target.value })}
        />
      </TableCell>
      <TableCell>
        <Input
          type="number"
          min={1}
          className="w-20"
          aria-label={`${m.admin_master_kolom_number()} — ${nama}`}
          value={v.number}
          onChange={(e) => setV({ ...v, number: Number(e.target.value) })}
        />
      </TableCell>
      <TableCell>
        <Input
          aria-label={`${m.admin_master_coordinator()} — ${nama}`}
          value={v.coordinatorName ?? ''}
          onChange={(e) => setV({ ...v, coordinatorName: e.target.value })}
        />
      </TableCell>
      <TableCell>
        <Input
          aria-label={`${m.admin_master_coordinator_phone()} — ${nama}`}
          value={v.coordinatorPhone ?? ''}
          onChange={(e) => setV({ ...v, coordinatorPhone: e.target.value })}
        />
      </TableCell>
      <TableCell>
        <input
          type="checkbox"
          aria-label={`${m.admin_master_active()} — ${nama}`}
          className="size-4"
          checked={v.isActive}
          onChange={(e) => setV({ ...v, isActive: e.target.checked })}
        />
      </TableCell>
      <TableCell>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" disabled={sending} onClick={simpan}>
            {sending ? m.admin_service_saving() : m.admin_service_save()}
          </Button>
          <Button variant="ghost" size="sm" onClick={onHapus}>
            {m.admin_schedule_delete()}
          </Button>
        </div>
      </TableCell>
    </TableRow>
  )
}

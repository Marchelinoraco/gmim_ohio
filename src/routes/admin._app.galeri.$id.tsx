import { useState } from 'react'
import { createFileRoute, notFound, useRouter } from '@tanstack/react-router'
import * as m from '@/paraglide/messages'
import { youtubeId } from '@/lib/video'
import { UnggahGambar } from '@/components/admin/unggah-gambar'
import { AlbumForm } from '@/components/admin/album-form'
import { getAlbumForAdmin, type AdminItemRow } from '@/features/gallery/admin-queries'
import {
  addItem,
  deleteItem,
  reorderItems,
  updateAlbum,
  updateItem,
} from '@/features/gallery/mutations'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export const Route = createFileRoute('/admin/_app/galeri/$id')({
  loader: async ({ params }) => {
    const album = await getAlbumForAdmin({ data: params.id })
    if (!album) throw notFound()
    return album
  },
  component: KelolaAlbum,
})

function KelolaAlbum() {
  const album = Route.useLoaderData()
  const router = useRouter()
  const [kabar, setKabar] = useState('')
  const [akanDihapus, setAkanDihapus] = useState<AdminItemRow | null>(null)
  const [youtube, setYoutube] = useState('')
  const [galatYoutube, setGalatYoutube] = useState('')

  async function segarkan(pesan = m.admin_gallery_saved()) {
    setKabar(pesan)
    await router.invalidate()
  }

  /**
   * Pindahkan satu item satu posisi. Seluruh urutan dikirim ulang, bukan hanya
   * dua yang bertukar: server menyimpannya dalam satu transaksi, jadi tidak ada
   * keadaan antara di mana dua item berbagi posisi yang sama.
   */
  async function pindah(i: number, arah: -1 | 1) {
    const ids = album.items.map((x) => x.id)
    const j = i + arah
    if (j < 0 || j >= ids.length) return
    const a = ids[i]
    const b = ids[j]
    if (!a || !b) return
    ids[i] = b
    ids[j] = a
    await reorderItems({ data: { albumId: album.id, ids } })
    await segarkan()
  }

  async function tambahYoutube() {
    setGalatYoutube('')
    // Diperiksa di klien memakai fungsi yang SAMA dengan yang dipakai server dan
    // yang merender embed-nya — supaya pengurus tahu sebelum menekan, bukan
    // setelah menerima galat server.
    if (!youtubeId(youtube)) {
      setGalatYoutube(m.admin_gallery_bad_youtube())
      return
    }
    await addItem({ data: { albumId: album.id, type: 'youtube', youtubeUrl: youtube } })
    setYoutube('')
    await segarkan()
  }

  async function hapusItem() {
    if (!akanDihapus) return
    await deleteItem({ data: akanDihapus.id })
    setAkanDihapus(null)
    await segarkan()
  }

  return (
    <div className="flex flex-col gap-8">
      <h1 className="font-serif text-2xl font-semibold">{album.titleId}</h1>

      <p role="status" aria-live="polite" className="text-muted min-h-5 text-sm">
        {kabar}
      </p>

      <Card>
        <CardHeader>
          <CardTitle>{m.admin_gallery_title()}</CardTitle>
        </CardHeader>
        <CardContent>
          <AlbumForm
            awal={album}
            onSubmit={async (input) => {
              await updateAlbum({ data: { ...input, id: album.id } })
              await segarkan()
            }}
            onCancel={() => router.navigate({ to: '/admin/galeri' })}
          />
        </CardContent>
      </Card>

      <section className="flex flex-col gap-4">
        <h2 className="font-serif text-lg font-semibold">{m.admin_gallery_items_title()}</h2>

        {album.items.length === 0 ? (
          <p className="text-muted text-sm">{m.admin_gallery_items_empty()}</p>
        ) : (
          <ul className="flex flex-col gap-3">
            {album.items.map((item, i) => (
              <BarisItem
                key={item.id}
                item={item}
                pertama={i === 0}
                terakhir={i === album.items.length - 1}
                onNaik={() => pindah(i, -1)}
                onTurun={() => pindah(i, 1)}
                onHapus={() => setAkanDihapus(item)}
                onSimpan={async (captionId, captionEn) => {
                  await updateItem({
                    data: {
                      id: item.id,
                      albumId: album.id,
                      type: item.type,
                      imageUrl: item.imageUrl ?? undefined,
                      youtubeUrl: item.youtubeUrl ?? undefined,
                      captionId,
                      captionEn,
                    },
                  })
                  await segarkan()
                }}
              />
            ))}
          </ul>
        )}

        <div className="border-border flex flex-col gap-4 rounded border p-4 sm:flex-row sm:items-start sm:gap-8">
          <div className="flex-1">
            <UnggahGambar
              value={null}
              label={m.admin_gallery_add_photo()}
              onChange={async (url) => {
                if (!url) return
                // Disimpan begitu unggahnya selesai: menunggu tombol Simpan
                // terpisah membuat foto yang sudah terlanjur ada di Blob bisa
                // hilang jejaknya kalau halaman ditutup.
                await addItem({ data: { albumId: album.id, type: 'image', imageUrl: url } })
                await segarkan()
              }}
            />
          </div>

          <div className="flex flex-1 flex-col gap-1.5">
            <Input
              aria-label={m.admin_gallery_youtube_url()}
              placeholder="https://www.youtube.com/watch?v=…"
              value={youtube}
              onChange={(e) => setYoutube(e.target.value)}
            />
            <p role="status" aria-live="polite" className="text-destructive min-h-5 text-sm">
              {galatYoutube}
            </p>
            <div>
              <Button variant="outline" size="sm" onClick={tambahYoutube}>
                {m.admin_gallery_add_youtube()}
              </Button>
            </div>
          </div>
        </div>
      </section>

      <Dialog open={akanDihapus !== null} onOpenChange={(o) => !o && setAkanDihapus(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{m.admin_gallery_item_delete_confirm()}</DialogTitle>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAkanDihapus(null)}>
              {m.admin_service_cancel()}
            </Button>
            <Button variant="primary" onClick={hapusItem}>
              {m.admin_schedule_delete()}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function BarisItem({
  item,
  pertama,
  terakhir,
  onNaik,
  onTurun,
  onHapus,
  onSimpan,
}: {
  item: AdminItemRow
  pertama: boolean
  terakhir: boolean
  onNaik: () => void
  onTurun: () => void
  onHapus: () => void
  onSimpan: (captionId: string, captionEn: string) => Promise<void>
}) {
  const [capId, setCapId] = useState(item.captionId ?? '')
  const [capEn, setCapEn] = useState(item.captionEn ?? '')
  const [sending, setSending] = useState(false)

  async function simpan() {
    if (sending) return
    setSending(true)
    try {
      await onSimpan(capId, capEn)
    } finally {
      setSending(false)
    }
  }

  const vid = item.youtubeUrl ? youtubeId(item.youtubeUrl) : null

  return (
    <li className="border-border flex flex-col gap-3 rounded border p-3 sm:flex-row sm:items-start">
      {/* Pratinjau: gambar apa adanya, YouTube lewat thumbnail resmi — memuat
          iframe untuk tiap item akan menyeret puluhan pemutar video ke halaman
          yang cuma perlu menunjukkan urutan. */}
      {item.type === 'image' && item.imageUrl ? (
        <img
          src={item.imageUrl}
          alt=""
          className="border-border h-24 w-32 shrink-0 rounded border object-cover"
        />
      ) : vid ? (
        <img
          src={`https://i.ytimg.com/vi/${vid}/mqdefault.jpg`}
          alt=""
          className="border-border h-24 w-32 shrink-0 rounded border object-cover"
        />
      ) : (
        <div className="border-border bg-surface-2 h-24 w-32 shrink-0 rounded border" />
      )}

      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <div className="grid gap-2 sm:grid-cols-2">
          <Input
            aria-label={`${m.admin_gallery_caption_id()} — ${item.id.slice(0, 8)}`}
            placeholder={m.admin_gallery_caption_id()}
            value={capId}
            onChange={(e) => setCapId(e.target.value)}
          />
          <Input
            aria-label={`${m.admin_gallery_caption_en()} — ${item.id.slice(0, 8)}`}
            placeholder={m.admin_gallery_caption_en()}
            value={capEn}
            onChange={(e) => setCapEn(e.target.value)}
          />
        </div>

        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" disabled={sending} onClick={simpan}>
            {sending ? m.admin_service_saving() : m.admin_service_save()}
          </Button>
          {/* Tombol arah, bukan seret-lepas: seret tidak bisa dioperasikan lewat
              papan ketik tanpa kerja tambahan yang besar, dan tombol arah
              langsung benar untuk pembaca layar. */}
          <Button variant="ghost" size="sm" disabled={pertama} onClick={onNaik}>
            {m.admin_gallery_move_up()}
          </Button>
          <Button variant="ghost" size="sm" disabled={terakhir} onClick={onTurun}>
            {m.admin_gallery_move_down()}
          </Button>
          <Button variant="ghost" size="sm" onClick={onHapus}>
            {m.admin_schedule_delete()}
          </Button>
        </div>
      </div>
    </li>
  )
}

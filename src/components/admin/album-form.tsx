import { type FormEvent, useId, useState } from 'react'
import * as m from '@/paraglide/messages'
import { UnggahGambar } from '@/components/admin/unggah-gambar'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import type { AlbumInput } from '@/features/gallery/mutations'

type Awal = {
  titleId: string
  titleEn: string
  albumDate: string
  coverImageUrl: string | null
  sortOrder: number
  status: 'draft' | 'published'
}

type Props = {
  awal?: Awal
  onSubmit: (input: AlbumInput) => Promise<void>
  onCancel: () => void
}

/**
 * Form album — dipakai halaman buat DAN halaman kelola.
 *
 * Validasi sungguhan ada di server (`albumInputSchema`); form hanya mengirim
 * dan menampilkan galatnya. Pola sama dengan `bulletin-form.tsx`.
 */
export function AlbumForm({ awal, onSubmit, onCancel }: Props) {
  const id = useId()
  const [titleId, setTitleId] = useState(awal?.titleId ?? '')
  const [titleEn, setTitleEn] = useState(awal?.titleEn ?? '')
  const [albumDate, setAlbumDate] = useState(awal?.albumDate ?? '')
  const [cover, setCover] = useState<string | null>(awal?.coverImageUrl ?? null)
  const [sortOrder, setSortOrder] = useState(awal?.sortOrder ?? 0)
  const [status, setStatus] = useState<'draft' | 'published'>(awal?.status ?? 'draft')
  const [sending, setSending] = useState(false)
  const [galat, setGalat] = useState('')

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    // `disabled` memblok klik tapi bukan submit lewat Enter.
    if (sending) return
    setSending(true)
    setGalat('')
    try {
      await onSubmit({
        titleId,
        titleEn,
        albumDate,
        coverImageUrl: cover,
        sortOrder,
        status,
      } as unknown as AlbumInput)
    } catch (err) {
      setGalat(err instanceof Error ? err.message : String(err))
      setSending(false)
    }
  }

  const field = 'border-border bg-surface text-ink w-full rounded border px-3 py-2 text-sm'

  return (
    <form onSubmit={submit} className="flex max-w-2xl flex-col gap-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor={`${id}-tid`}>{m.admin_gallery_title_id()}</Label>
          <Input
            id={`${id}-tid`}
            required
            value={titleId}
            onChange={(e) => setTitleId(e.target.value)}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor={`${id}-ten`}>{m.admin_gallery_title_en()}</Label>
          <Input
            id={`${id}-ten`}
            required
            value={titleEn}
            onChange={(e) => setTitleEn(e.target.value)}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor={`${id}-date`}>{m.admin_gallery_date()}</Label>
          <Input
            id={`${id}-date`}
            type="date"
            required
            value={albumDate}
            onChange={(e) => setAlbumDate(e.target.value)}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor={`${id}-order`}>{m.admin_gallery_order()}</Label>
          <Input
            id={`${id}-order`}
            type="number"
            min={0}
            value={sortOrder}
            onChange={(e) => setSortOrder(Number(e.target.value))}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor={`${id}-status`}>{m.admin_service_status()}</Label>
          <select
            id={`${id}-status`}
            className={field}
            value={status}
            onChange={(e) => setStatus(e.target.value as 'draft' | 'published')}
          >
            <option value="draft">{m.admin_schedule_status_draft()}</option>
            <option value="published">{m.admin_schedule_status_published()}</option>
          </select>
        </div>
      </div>

      <UnggahGambar value={cover} onChange={setCover} label={m.admin_gallery_cover()} />

      <p
        id={`${id}-err`}
        role="status"
        aria-live="polite"
        className="text-destructive min-h-5 text-sm"
      >
        {galat}
      </p>

      <div className="flex gap-2">
        <Button type="submit" variant="primary" disabled={sending} aria-describedby={`${id}-err`}>
          {sending ? m.admin_service_saving() : m.admin_service_save()}
        </Button>
        <Button type="button" variant="outline" onClick={onCancel}>
          {m.admin_service_cancel()}
        </Button>
      </div>
    </form>
  )
}

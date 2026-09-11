import { type FormEvent, lazy, Suspense, useId, useState } from 'react'
import * as m from '@/paraglide/messages'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import type { BulletinInput } from '@/features/content/bulletin-mutations'
import type { AdminBulletinDetail } from '@/features/content/admin-queries'

/**
 * Editor di-lazy load supaya bundle Tiptap (ProseMirror + ekstensinya) tidak
 * ikut ke halaman admin lain yang tak memakainya.
 */
const RichTextEditor = lazy(() =>
  import('@/components/admin/rich-text-editor').then((mod) => ({ default: mod.RichTextEditor })),
)

/** Placeholder setinggi editor supaya tata letak tidak melompat saat bundle-nya tiba. */
function EditorFallback() {
  return <div className="border-border bg-surface-2 h-52 w-full animate-pulse rounded border" />
}

type Props = {
  awal?: AdminBulletinDetail
  onSubmit: (input: BulletinInput) => Promise<void>
  onCancel: () => void
}

/** `null` dari server jadi `''` untuk input terkendali; dibalik lagi oleh Zod. */
const s = (v: string | null | undefined) => v ?? ''

/**
 * Form warta — dipakai halaman buat DAN ubah.
 *
 * Pola state-nya mengikuti `service-form.tsx`: `useState` + `useId`, tanpa form
 * library. Validasi sungguhan ada di server (`bulletinInputSchema`); form ini
 * hanya mengirim dan menampilkan galat yang dikembalikannya.
 *
 * Aturan "butuh isi atau PDF" SENGAJA tidak diduplikasi di klien — ia sudah ada
 * di Zod dan di constraint database. Menyalinnya ke sini membuat tiga tempat
 * yang bisa saling menyimpang.
 */
export function BulletinForm({ awal, onSubmit, onCancel }: Props) {
  const id = useId()
  const [weekDate, setWeekDate] = useState(s(awal?.weekDate))
  const [titleId, setTitleId] = useState(s(awal?.titleId))
  const [titleEn, setTitleEn] = useState(s(awal?.titleEn))
  const [summaryId, setSummaryId] = useState(s(awal?.summaryId))
  const [summaryEn, setSummaryEn] = useState(s(awal?.summaryEn))
  const [bodyId, setBodyId] = useState(s(awal?.bodyId))
  const [bodyEn, setBodyEn] = useState(s(awal?.bodyEn))
  const [pdfUrl, setPdfUrl] = useState(s(awal?.pdfUrl))
  const [status, setStatus] = useState<'draft' | 'published'>(awal?.status ?? 'draft')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    // `disabled` memblok klik tapi bukan submit lewat Enter.
    if (sending) return
    setSending(true)
    setError('')
    try {
      await onSubmit({
        weekDate,
        titleId,
        titleEn,
        summaryId,
        summaryEn,
        bodyId,
        bodyEn,
        pdfUrl,
        status,
      } as unknown as BulletinInput)
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
      setSending(false)
    }
  }

  const field = 'border-border bg-surface text-ink w-full rounded border px-3 py-2 text-sm'

  return (
    <form onSubmit={submit} className="flex max-w-3xl flex-col gap-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor={`${id}-week`}>{m.admin_bulletin_week()}</Label>
          <Input
            id={`${id}-week`}
            type="date"
            required
            value={weekDate}
            onChange={(e) => setWeekDate(e.target.value)}
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
        <div className="flex flex-col gap-1.5">
          <Label htmlFor={`${id}-title-id`}>{m.admin_bulletin_title_id()}</Label>
          <Input
            id={`${id}-title-id`}
            required
            value={titleId}
            onChange={(e) => setTitleId(e.target.value)}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor={`${id}-title-en`}>{m.admin_bulletin_title_en()}</Label>
          <Input
            id={`${id}-title-en`}
            required
            value={titleEn}
            onChange={(e) => setTitleEn(e.target.value)}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor={`${id}-sum-id`}>{m.admin_bulletin_summary_id()}</Label>
          <Input
            id={`${id}-sum-id`}
            required
            value={summaryId}
            onChange={(e) => setSummaryId(e.target.value)}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor={`${id}-sum-en`}>{m.admin_bulletin_summary_en()}</Label>
          <Input
            id={`${id}-sum-en`}
            required
            value={summaryEn}
            onChange={(e) => setSummaryEn(e.target.value)}
          />
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor={`${id}-pdf`}>{m.admin_bulletin_pdf()}</Label>
        <Input
          id={`${id}-pdf`}
          type="url"
          value={pdfUrl}
          onChange={(e) => setPdfUrl(e.target.value)}
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label>{m.admin_bulletin_body_id()}</Label>
        <Suspense fallback={<EditorFallback />}>
          <RichTextEditor
            value={bodyId}
            onChange={setBodyId}
            label={m.admin_bulletin_body_id()}
          />
        </Suspense>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label>{m.admin_bulletin_body_en()}</Label>
        <Suspense fallback={<EditorFallback />}>
          <RichTextEditor
            value={bodyEn}
            onChange={setBodyEn}
            label={m.admin_bulletin_body_en()}
          />
        </Suspense>
      </div>

      <p
        id={`${id}-err`}
        role="status"
        aria-live="polite"
        className="text-destructive min-h-5 text-sm"
      >
        {error}
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

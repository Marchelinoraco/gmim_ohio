import { type FormEvent, lazy, Suspense, useId, useState } from 'react'
import * as m from '@/paraglide/messages'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { DUPLICATE_SLUG, type DevotionalInput } from '@/features/content/devotional-mutations'
import type { AdminDevotionalDetail } from '@/features/content/admin-queries'

/** Editor di-lazy load supaya bundle Tiptap tidak ikut ke halaman admin lain. */
const RichTextEditor = lazy(() =>
  import('@/components/admin/rich-text-editor').then((mod) => ({ default: mod.RichTextEditor })),
)

function EditorFallback() {
  return <div className="border-border bg-surface-2 h-52 w-full animate-pulse rounded border" />
}

type Props = {
  awal?: AdminDevotionalDetail
  onSubmit: (input: DevotionalInput) => Promise<void>
  onCancel: () => void
}

const s = (v: string | null | undefined) => v ?? ''

/**
 * Form renungan — dipakai halaman buat DAN ubah.
 *
 * Pola state-nya mengikuti `bulletin-form.tsx`. Validasi sungguhan ada di server
 * (`devotionalInputSchema`); form hanya mengirim dan menampilkan galatnya.
 */
export function DevotionalForm({ awal, onSubmit, onCancel }: Props) {
  const id = useId()
  const [slug, setSlug] = useState(s(awal?.slug))
  const [titleId, setTitleId] = useState(s(awal?.titleId))
  const [titleEn, setTitleEn] = useState(s(awal?.titleEn))
  const [authorName, setAuthorName] = useState(s(awal?.authorName))
  const [publishedDate, setPublishedDate] = useState(s(awal?.publishedDate))
  const [coverImageUrl, setCoverImageUrl] = useState(s(awal?.coverImageUrl))
  const [excerptId, setExcerptId] = useState(s(awal?.excerptId))
  const [excerptEn, setExcerptEn] = useState(s(awal?.excerptEn))
  const [bodyId, setBodyId] = useState(s(awal?.bodyId))
  const [bodyEn, setBodyEn] = useState(s(awal?.bodyEn))
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
        slug,
        titleId,
        titleEn,
        authorName,
        publishedDate,
        coverImageUrl,
        excerptId,
        excerptEn,
        bodyId,
        bodyEn,
        status,
      } as unknown as DevotionalInput)
    } catch (err) {
      // Server melempar KODE, bukan kalimat siap-tampil: ia tak tahu bahasa yang
      // sedang dipakai. Tanpa pemetaan ini, pengurus melihat string
      // "DUPLICATE_SLUG" mentah.
      const pesan = err instanceof Error ? err.message : String(err)
      setError(pesan.includes(DUPLICATE_SLUG) ? m.admin_devotional_duplicate() : pesan)
      setSending(false)
    }
  }

  const field = 'border-border bg-surface text-ink w-full rounded border px-3 py-2 text-sm'

  return (
    <form onSubmit={submit} className="flex max-w-3xl flex-col gap-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5 sm:col-span-2">
          <Label htmlFor={`${id}-slug`}>{m.admin_devotional_slug()}</Label>
          <Input
            id={`${id}-slug`}
            required
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
            aria-describedby={`${id}-slug-hint`}
          />
          <p id={`${id}-slug-hint`} className="text-muted text-xs">
            {m.admin_devotional_slug_hint()}
          </p>
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
          <Label htmlFor={`${id}-author`}>{m.admin_devotional_author()}</Label>
          <Input
            id={`${id}-author`}
            required
            value={authorName}
            onChange={(e) => setAuthorName(e.target.value)}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor={`${id}-date`}>{m.admin_devotional_date()}</Label>
          <Input
            id={`${id}-date`}
            type="date"
            required
            value={publishedDate}
            onChange={(e) => setPublishedDate(e.target.value)}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor={`${id}-excerpt-id`}>{m.admin_devotional_excerpt_id()}</Label>
          <Input
            id={`${id}-excerpt-id`}
            required
            value={excerptId}
            onChange={(e) => setExcerptId(e.target.value)}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor={`${id}-excerpt-en`}>{m.admin_devotional_excerpt_en()}</Label>
          <Input
            id={`${id}-excerpt-en`}
            required
            value={excerptEn}
            onChange={(e) => setExcerptEn(e.target.value)}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor={`${id}-cover`}>{m.admin_devotional_cover()}</Label>
          <Input
            id={`${id}-cover`}
            type="url"
            value={coverImageUrl}
            onChange={(e) => setCoverImageUrl(e.target.value)}
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

      <div className="flex flex-col gap-1.5">
        <Label>{m.admin_bulletin_body_id()}</Label>
        <Suspense fallback={<EditorFallback />}>
          <RichTextEditor value={bodyId} onChange={setBodyId} label={m.admin_bulletin_body_id()} />
        </Suspense>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label>{m.admin_bulletin_body_en()}</Label>
        <Suspense fallback={<EditorFallback />}>
          <RichTextEditor value={bodyEn} onChange={setBodyEn} label={m.admin_bulletin_body_en()} />
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

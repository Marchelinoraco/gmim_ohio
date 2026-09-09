import { type FormEvent, useId, useState } from 'react'
import * as m from '@/paraglide/messages'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import type { ServiceInput } from '@/features/schedule/mutations'
import type { AdminServiceDetail } from '@/features/schedule/admin-queries'

export type KategoriPilihan = { id: string; key: string; nameId: string }
export type KolomPilihan = { id: string; name: string }

type Props = {
  kategori: KategoriPilihan[]
  kolom: KolomPilihan[]
  awal?: AdminServiceDetail
  onSubmit: (input: ServiceInput) => Promise<void>
  onCancel: () => void
}

/** `null` dari server jadi `''` untuk input terkendali; dibalik lagi saat submit. */
const s = (v: string | null | undefined) => v ?? ''

/**
 * Form ibadah — dipakai halaman buat DAN ubah.
 *
 * Pola state-nya mengikuti `contact-form.tsx`: `useState` + `useId`, tanpa form
 * library. Validasi sungguhan ada di server (`serviceInputSchema`); form ini
 * hanya mengirim dan menampilkan galat yang dikembalikannya, supaya tidak ada
 * dua sumber kebenaran yang bisa saling menyimpang.
 *
 * Field lokasi rumah dirender HANYA saat lokasi = rumah. Menyembunyikannya
 * lewat CSS akan mengirim nilai yang tak terlihat pengurus — dan `hostAddress`
 * yang tertinggal dari pilihan sebelumnya akan tayang di halaman publik.
 */
export function ServiceForm({ kategori, kolom, awal, onSubmit, onCancel }: Props) {
  const id = useId()
  const [categoryId, setCategoryId] = useState(awal?.categoryId ?? kategori[0]?.id ?? '')
  const [kolomId, setKolomId] = useState(s(awal?.kolomId))
  const [serviceDate, setServiceDate] = useState(s(awal?.serviceDate))
  const [startTime, setStartTime] = useState(s(awal?.startTime).slice(0, 5))
  const [endTime, setEndTime] = useState(s(awal?.endTime).slice(0, 5))
  const [locationType, setLocationType] = useState<'gedung_gereja' | 'rumah'>(
    awal?.locationType ?? 'gedung_gereja',
  )
  const [hostFamilyName, setHostFamilyName] = useState(s(awal?.hostFamilyName))
  const [hostAddress, setHostAddress] = useState(s(awal?.hostAddress))
  const [locationNote, setLocationNote] = useState(s(awal?.locationNote))
  const [themeId, setThemeId] = useState(s(awal?.themeId))
  const [themeEn, setThemeEn] = useState(s(awal?.themeEn))
  const [bibleReading, setBibleReading] = useState(s(awal?.bibleReading))
  const [preacherName, setPreacherName] = useState(s(awal?.preacherName))
  const [liturgistName, setLiturgistName] = useState(s(awal?.liturgistName))
  const [status, setStatus] = useState<'draft' | 'published'>(awal?.status ?? 'draft')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')

  const kategoriTerpilih = kategori.find((k) => k.id === categoryId)
  const perluKolom = kategoriTerpilih?.key === 'kolom'
  const diRumah = locationType === 'rumah'

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    // `disabled` memblok klik tapi bukan submit lewat Enter.
    if (sending) return
    setSending(true)
    setError('')
    try {
      await onSubmit({
        categoryId,
        kolomId: perluKolom && kolomId ? kolomId : null,
        templateId: awal?.templateId ?? null,
        serviceDate,
        startTime,
        endTime: endTime || null,
        locationType,
        hostFamilyName: diRumah ? hostFamilyName : null,
        hostAddress: diRumah ? hostAddress : null,
        locationNote: diRumah ? locationNote : null,
        themeId,
        themeEn,
        bibleReading,
        preacherName,
        liturgistName,
        status,
      } as ServiceInput)
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
      setSending(false)
    }
  }

  const field = 'border-border bg-surface text-ink w-full rounded border px-3 py-2 text-sm'

  return (
    <form onSubmit={submit} className="flex max-w-2xl flex-col gap-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor={`${id}-cat`}>{m.admin_service_category()}</Label>
          <select
            id={`${id}-cat`}
            className={field}
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
          >
            {kategori.map((k) => (
              <option key={k.id} value={k.id}>
                {k.nameId}
              </option>
            ))}
          </select>
        </div>

        {perluKolom && (
          <div className="flex flex-col gap-1.5">
            <Label htmlFor={`${id}-kolom`}>{m.admin_service_kolom()}</Label>
            <select
              id={`${id}-kolom`}
              className={field}
              value={kolomId}
              onChange={(e) => setKolomId(e.target.value)}
            >
              <option value="">—</option>
              {kolom.map((k) => (
                <option key={k.id} value={k.id}>
                  {k.name}
                </option>
              ))}
            </select>
          </div>
        )}

        <div className="flex flex-col gap-1.5">
          <Label htmlFor={`${id}-date`}>{m.admin_service_date()}</Label>
          <Input
            id={`${id}-date`}
            type="date"
            required
            value={serviceDate}
            onChange={(e) => setServiceDate(e.target.value)}
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor={`${id}-start`}>{m.admin_service_start()}</Label>
          <Input
            id={`${id}-start`}
            type="time"
            required
            value={startTime}
            onChange={(e) => setStartTime(e.target.value)}
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor={`${id}-end`}>{m.admin_service_end()}</Label>
          <Input
            id={`${id}-end`}
            type="time"
            value={endTime}
            onChange={(e) => setEndTime(e.target.value)}
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor={`${id}-loc`}>{m.admin_service_location()}</Label>
          <select
            id={`${id}-loc`}
            className={field}
            value={locationType}
            onChange={(e) => setLocationType(e.target.value as 'gedung_gereja' | 'rumah')}
          >
            <option value="gedung_gereja">{m.admin_service_loc_church()}</option>
            <option value="rumah">{m.admin_service_loc_home()}</option>
          </select>
        </div>
      </div>

      {diRumah && (
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor={`${id}-host`}>{m.admin_service_host()}</Label>
            <Input
              id={`${id}-host`}
              value={hostFamilyName}
              onChange={(e) => setHostFamilyName(e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor={`${id}-addr`}>{m.admin_service_host_address()}</Label>
            <Input
              id={`${id}-addr`}
              value={hostAddress}
              onChange={(e) => setHostAddress(e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-1.5 sm:col-span-2">
            <Label htmlFor={`${id}-note`}>{m.admin_service_location_note()}</Label>
            <Input
              id={`${id}-note`}
              value={locationNote}
              onChange={(e) => setLocationNote(e.target.value)}
            />
          </div>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor={`${id}-theme-id`}>{m.admin_service_theme_id()}</Label>
          <Input
            id={`${id}-theme-id`}
            value={themeId}
            onChange={(e) => setThemeId(e.target.value)}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor={`${id}-theme-en`}>{m.admin_service_theme_en()}</Label>
          <Input
            id={`${id}-theme-en`}
            value={themeEn}
            onChange={(e) => setThemeEn(e.target.value)}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor={`${id}-read`}>{m.admin_service_reading()}</Label>
          <Input
            id={`${id}-read`}
            value={bibleReading}
            onChange={(e) => setBibleReading(e.target.value)}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor={`${id}-preach`}>{m.admin_service_preacher()}</Label>
          <Input
            id={`${id}-preach`}
            value={preacherName}
            onChange={(e) => setPreacherName(e.target.value)}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor={`${id}-lit`}>{m.admin_service_liturgist()}</Label>
          <Input
            id={`${id}-lit`}
            value={liturgistName}
            onChange={(e) => setLiturgistName(e.target.value)}
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

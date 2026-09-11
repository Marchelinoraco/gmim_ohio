import { useId, useState, type ReactNode } from 'react'
import * as m from '@/paraglide/messages'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

/**
 * Tujuh form `site_settings`, satu per kunci.
 *
 * Masing-masing punya tombol Simpan sendiri karena `updateSetting` memang
 * per-kunci: menyimpan satu bagian tidak menyentuh enam lainnya.
 *
 * Nilai awal datang MENTAH dari database. Kalau bentuknya tidak cocok schema,
 * form tetap dirender dengan nilai default dan sebuah peringatan — bukan
 * dilempar. Membetulkan isi yang rusak mustahil kalau halamannya sendiri gagal
 * dimuat.
 */

type Props = { nilai: unknown; onSimpan: (value: unknown) => Promise<void> }

/** Ambil field string dari nilai mentah; apa pun yang bukan string jadi ''. */
function teks(v: unknown, key: string): string {
  const o = v as Record<string, unknown> | null
  const x = o?.[key]
  return typeof x === 'string' ? x : ''
}

function angka(v: unknown, key: string): string {
  const o = v as Record<string, unknown> | null
  const x = o?.[key]
  return typeof x === 'number' ? String(x) : ''
}

/** `true` bila nilai tersimpan bukan objek — bentuknya tidak terbaca. */
function rusak(v: unknown): boolean {
  return v === null || typeof v !== 'object' || Array.isArray(v)
}

/**
 * Bingkai bersama: peringatan bentuk rusak, galat server, dan tombol Simpan.
 * Tiap form hanya perlu menyediakan field-nya dan cara menyusun nilainya.
 */
function Bingkai({
  nilai,
  onSimpan,
  susun,
  children,
}: Props & { susun: () => unknown; children: ReactNode }) {
  const id = useId()
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')

  async function simpan() {
    // `disabled` memblok klik tapi bukan submit lewat Enter.
    if (sending) return
    setSending(true)
    setError('')
    try {
      await onSimpan(susun())
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="flex flex-col gap-4">
      {rusak(nilai) && <p className="text-destructive text-sm">{m.admin_settings_broken()}</p>}
      {children}
      <p
        id={`${id}-err`}
        role="status"
        aria-live="polite"
        className="text-destructive min-h-5 text-sm"
      >
        {error}
      </p>
      <div>
        <Button variant="primary" size="sm" disabled={sending} onClick={simpan}>
          {sending ? m.admin_service_saving() : m.admin_service_save()}
        </Button>
      </div>
    </div>
  )
}

/** Satu field berlabel. `label` juga jadi nama aksesibel yang dipakai e2e. */
function Field({
  label,
  value,
  onChange,
  type = 'text',
}: {
  label: string
  value: string
  onChange: (v: string) => void
  type?: string
}) {
  const id = useId()
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={id}>{label}</Label>
      <Input id={id} type={type} value={value} onChange={(e) => onChange(e.target.value)} />
    </div>
  )
}

export function HeroForm({ nilai, onSimpan }: Props) {
  const [titleId, setTitleId] = useState(teks(nilai, 'titleId'))
  const [titleEn, setTitleEn] = useState(teks(nilai, 'titleEn'))
  const [taglineId, setTaglineId] = useState(teks(nilai, 'taglineId'))
  const [taglineEn, setTaglineEn] = useState(teks(nilai, 'taglineEn'))
  const [image, setImage] = useState(teks(nilai, 'image'))

  return (
    <Bingkai
      nilai={nilai}
      onSimpan={onSimpan}
      susun={() => ({ titleId, titleEn, taglineId, taglineEn, image })}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label={m.admin_settings_title_id()} value={titleId} onChange={setTitleId} />
        <Field label={m.admin_settings_title_en()} value={titleEn} onChange={setTitleEn} />
        <Field label={m.admin_settings_tagline_id()} value={taglineId} onChange={setTaglineId} />
        <Field label={m.admin_settings_tagline_en()} value={taglineEn} onChange={setTaglineEn} />
      </div>
      <Field label={m.admin_settings_hero_image()} value={image} onChange={setImage} />
    </Bingkai>
  )
}

export function ServiceTimesForm({ nilai, onSimpan }: Props) {
  const [id, setId] = useState(teks(nilai, 'id'))
  const [en, setEn] = useState(teks(nilai, 'en'))

  return (
    <Bingkai nilai={nilai} onSimpan={onSimpan} susun={() => ({ id, en })}>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label={m.admin_settings_text_id()} value={id} onChange={setId} />
        <Field label={m.admin_settings_text_en()} value={en} onChange={setEn} />
      </div>
    </Bingkai>
  )
}

export function ContactInfoForm({ nilai, onSimpan }: Props) {
  const [phone, setPhone] = useState(teks(nilai, 'phone'))
  const [email, setEmail] = useState(teks(nilai, 'email'))
  const [hoursId, setHoursId] = useState(teks(nilai, 'officeHoursId'))
  const [hoursEn, setHoursEn] = useState(teks(nilai, 'officeHoursEn'))
  const [mapsUrl, setMapsUrl] = useState(teks(nilai, 'mapsUrl'))
  const [lat, setLat] = useState(angka(nilai, 'lat'))
  const [lng, setLng] = useState(angka(nilai, 'lng'))

  // Koordinat kosong disimpan NULL, bukan 0: titik 0,0 adalah lokasi nyata di
  // Samudra Atlantik, dan peta akan menunjuk ke sana dengan yakin.
  const koordinat = (v: string) => (v.trim() === '' ? null : Number(v))

  return (
    <Bingkai
      nilai={nilai}
      onSimpan={onSimpan}
      susun={() => ({
        phone,
        email,
        officeHoursId: hoursId,
        officeHoursEn: hoursEn,
        mapsUrl,
        lat: koordinat(lat),
        lng: koordinat(lng),
      })}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label={m.admin_settings_phone()} value={phone} onChange={setPhone} />
        <Field label={m.admin_settings_email()} value={email} onChange={setEmail} />
        <Field label={m.admin_settings_hours_id()} value={hoursId} onChange={setHoursId} />
        <Field label={m.admin_settings_hours_en()} value={hoursEn} onChange={setHoursEn} />
        <Field label={m.admin_settings_lat()} value={lat} onChange={setLat} />
        <Field label={m.admin_settings_lng()} value={lng} onChange={setLng} />
      </div>
      <Field label={m.admin_settings_maps()} value={mapsUrl} onChange={setMapsUrl} />
    </Bingkai>
  )
}

export function SocialLinksForm({ nilai, onSimpan }: Props) {
  const [facebook, setFacebook] = useState(teks(nilai, 'facebook'))
  const [instagram, setInstagram] = useState(teks(nilai, 'instagram'))
  const [youtube, setYoutube] = useState(teks(nilai, 'youtube'))

  return (
    <Bingkai nilai={nilai} onSimpan={onSimpan} susun={() => ({ facebook, instagram, youtube })}>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label={m.admin_settings_facebook()} value={facebook} onChange={setFacebook} />
        <Field label={m.admin_settings_instagram()} value={instagram} onChange={setInstagram} />
        <Field label={m.admin_settings_youtube()} value={youtube} onChange={setYoutube} />
      </div>
    </Bingkai>
  )
}

type Kontak = { kunci: string; name: string; phone: string }

export function PastoralContactsForm({ nilai, onSimpan }: Props) {
  // Bentuknya Record<string, {name, phone}> dengan kunci bebas, jadi dirender
  // sebagai daftar pasangan yang bisa ditambah dan dihapus.
  const [orang, setOrang] = useState<Kontak[]>(() => {
    if (rusak(nilai)) return []
    return Object.entries(nilai as Record<string, unknown>).map(([kunci, v]) => ({
      kunci,
      name: teks(v, 'name'),
      phone: teks(v, 'phone'),
    }))
  })

  const ubah = (i: number, patch: Partial<Kontak>) =>
    setOrang((v) => v.map((o, n) => (n === i ? { ...o, ...patch } : o)))

  return (
    <Bingkai
      nilai={nilai}
      onSimpan={onSimpan}
      susun={() =>
        Object.fromEntries(
          orang
            .filter((o) => o.kunci.trim() !== '')
            .map((o) => [o.kunci.trim(), { name: o.name, phone: o.phone }]),
        )
      }
    >
      {orang.map((o, i) => (
        <div key={i} className="grid gap-3 sm:grid-cols-[1fr_1fr_1fr_auto] sm:items-end">
          <Field
            label={m.admin_settings_person_key()}
            value={o.kunci}
            onChange={(v) => ubah(i, { kunci: v })}
          />
          <Field
            label={m.admin_settings_person_name()}
            value={o.name}
            onChange={(v) => ubah(i, { name: v })}
          />
          <Field
            label={m.admin_settings_person_phone()}
            value={o.phone}
            onChange={(v) => ubah(i, { phone: v })}
          />
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setOrang((v) => v.filter((_, n) => n !== i))}
          >
            {m.admin_settings_row_remove()}
          </Button>
        </div>
      ))}
      <div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setOrang((v) => [...v, { kunci: '', name: '', phone: '' }])}
        >
          {m.admin_settings_person_add()}
        </Button>
      </div>
    </Bingkai>
  )
}

export function LiveStreamForm({ nilai, onSimpan }: Props) {
  const id = useId()
  const awal = nilai as { isLive?: unknown } | null
  const [isLive, setIsLive] = useState(awal?.isLive === true)
  const [url, setUrl] = useState(teks(nilai, 'url'))
  const [archiveUrl, setArchiveUrl] = useState(teks(nilai, 'archiveUrl'))

  return (
    <Bingkai nilai={nilai} onSimpan={onSimpan} susun={() => ({ isLive, url, archiveUrl })}>
      {/* Inilah yang menyalakan penanda "sedang siaran" di situs publik. */}
      <div className="flex items-center gap-2">
        <input
          id={id}
          type="checkbox"
          className="size-4"
          checked={isLive}
          onChange={(e) => setIsLive(e.target.checked)}
        />
        <Label htmlFor={id}>{m.admin_settings_is_live()}</Label>
      </div>
      <Field label={m.admin_settings_live_url()} value={url} onChange={setUrl} />
      <Field label={m.admin_settings_archive_url()} value={archiveUrl} onChange={setArchiveUrl} />
    </Bingkai>
  )
}

type Rekening = { bank: string; number: string; holder: string }

export function GivingInfoForm({ nilai, onSimpan }: Props) {
  const [accounts, setAccounts] = useState<Rekening[]>(() => {
    const a = (nilai as { accounts?: unknown } | null)?.accounts
    if (!Array.isArray(a)) return []
    return a.map((x) => ({ bank: teks(x, 'bank'), number: teks(x, 'number'), holder: teks(x, 'holder') }))
  })
  const [noteId, setNoteId] = useState(teks(nilai, 'noteId'))
  const [noteEn, setNoteEn] = useState(teks(nilai, 'noteEn'))

  const ubah = (i: number, patch: Partial<Rekening>) =>
    setAccounts((v) => v.map((o, n) => (n === i ? { ...o, ...patch } : o)))

  return (
    <Bingkai nilai={nilai} onSimpan={onSimpan} susun={() => ({ accounts, noteId, noteEn })}>
      {/* Daftar rekening bisa ditambah dan dihapus: inilah yang membuat pengurus
          akhirnya bisa mengganti placeholder yang tayang sekarang. */}
      {accounts.map((a, i) => (
        <div key={i} className="grid gap-3 sm:grid-cols-[1fr_1fr_1fr_auto] sm:items-end">
          <Field
            label={m.admin_settings_account_bank()}
            value={a.bank}
            onChange={(v) => ubah(i, { bank: v })}
          />
          <Field
            label={m.admin_settings_account_number()}
            value={a.number}
            onChange={(v) => ubah(i, { number: v })}
          />
          <Field
            label={m.admin_settings_account_holder()}
            value={a.holder}
            onChange={(v) => ubah(i, { holder: v })}
          />
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setAccounts((v) => v.filter((_, n) => n !== i))}
          >
            {m.admin_settings_row_remove()}
          </Button>
        </div>
      ))}
      <div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setAccounts((v) => [...v, { bank: '', number: '', holder: '' }])}
        >
          {m.admin_settings_account_add()}
        </Button>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label={m.admin_settings_note_id()} value={noteId} onChange={setNoteId} />
        <Field label={m.admin_settings_note_en()} value={noteEn} onChange={setNoteEn} />
      </div>
    </Bingkai>
  )
}

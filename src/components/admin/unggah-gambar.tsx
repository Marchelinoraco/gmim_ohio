import { useId, useRef, useState } from 'react'
import * as m from '@/paraglide/messages'
import { pesanTolakan } from '@/lib/unggah'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'

type Props = {
  value: string | null
  onChange: (url: string | null) => void
  label: string
}

/**
 * Tombol unggah gambar + pratinjau.
 *
 * Berkasnya dikirim LANGSUNG dari browser ke Vercel Blob; `/api/blob/upload`
 * hanya menerbitkan token. Lihat docblock route itu soal kenapa (batas body
 * 4,5 MB fungsi Vercel vs foto ponsel 3–6 MB).
 *
 * Komponen ini TIDAK menyentuh database. Ia mengembalikan URL lewat `onChange`;
 * halaman yang memanggilnya yang memutuskan kapan menyimpan.
 */
export function UnggahGambar({ value, onChange, label }: Props) {
  const id = useId()
  const input = useRef<HTMLInputElement>(null)
  const [persen, setPersen] = useState<number | null>(null)
  const [galat, setGalat] = useState('')

  async function pilih(file: File | undefined) {
    if (!file) return
    setGalat('')

    // `accept` pada <input> hanya memandu pemilih berkas — ia bisa dilewati
    // dengan seret-lepas atau "All Files". Penolakan sesungguhnya di sini,
    // sebelum satu byte pun terkirim.
    const tolak = pesanTolakan(file)
    if (tolak) {
      setGalat(tolak === 'TERLALU_BESAR' ? m.admin_upload_too_large() : m.admin_upload_bad_type())
      return
    }

    setPersen(0)
    try {
      const { upload } = await import('@vercel/blob/client')
      const hasil = await upload(file.name, file, {
        access: 'public',
        handleUploadUrl: '/api/blob/upload',
        onUploadProgress: (p) => setPersen(Math.round(p.percentage)),
      })
      onChange(hasil.url)
    } catch (err) {
      console.error('[unggah] gagal:', err)
      setGalat(m.admin_upload_failed())
    } finally {
      setPersen(null)
      // Kosongkan input supaya memilih berkas yang SAMA lagi tetap memicu
      // onChange — tanpa ini, mencoba ulang setelah gagal tidak melakukan apa pun.
      if (input.current) input.current.value = ''
    }
  }

  const sedangUnggah = persen !== null

  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor={id}>{label}</Label>

      {value && (
        <img
          src={value}
          alt={m.admin_upload_preview_alt()}
          className="border-border bg-surface-2 h-32 w-auto max-w-full rounded border object-contain"
        />
      )}

      <input
        ref={input}
        id={id}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/avif"
        className="sr-only"
        onChange={(e) => pilih(e.target.files?.[0])}
      />

      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={sedangUnggah}
          onClick={() => input.current?.click()}
        >
          {value ? m.admin_upload_replace() : m.admin_upload_choose()}
        </Button>
        {value && !sedangUnggah && (
          <Button type="button" variant="ghost" size="sm" onClick={() => onChange(null)}>
            {m.admin_upload_remove()}
          </Button>
        )}
      </div>

      {/* Progres di wilayah live: foto besar di jaringan lambat butuh puluhan
          detik, dan tanpa umpan balik pengurus akan menekan tombolnya
          berkali-kali. Galat dirender di wilayah yang sama supaya pembaca layar
          mengumumkan keduanya. */}
      <p role="status" aria-live="polite" className="min-h-5 text-sm">
        {sedangUnggah && (
          <span className="text-muted">{m.admin_upload_uploading({ persen: persen ?? 0 })}</span>
        )}
        {galat && <span className="text-destructive">{galat}</span>}
      </p>
    </div>
  )
}

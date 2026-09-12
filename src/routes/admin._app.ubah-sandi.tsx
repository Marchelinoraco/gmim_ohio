import { type FormEvent, useId, useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import * as m from '@/paraglide/messages'
import {
  changeAdminPassword,
  SAME_PASSWORD,
  WRONG_PASSWORD,
} from '@/features/admin/password'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export const Route = createFileRoute('/admin/_app/ubah-sandi')({
  component: UbahSandi,
})

function UbahSandi() {
  const id = useId()
  const [sekarang, setSekarang] = useState('')
  const [baru, setBaru] = useState('')
  const [ulangi, setUlangi] = useState('')
  const [sending, setSending] = useState(false)
  const [galat, setGalat] = useState('')
  const [kabar, setKabar] = useState('')

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    // `disabled` memblok klik tapi bukan submit lewat Enter.
    if (sending) return
    setGalat('')
    setKabar('')

    // Ulangan diperiksa DI SINI, bukan di server: ia penjaga salah-ketik di
    // layar, bukan batas keamanan. Mengirimnya hanya menyalin rahasia yang sama
    // dua kali lewat jaringan tanpa menambah jaminan apa pun.
    if (baru !== ulangi) {
      setGalat(m.admin_password_mismatch())
      return
    }
    if (baru.length < 8) {
      setGalat(m.admin_password_short())
      return
    }

    setSending(true)
    try {
      await changeAdminPassword({ data: { currentPassword: sekarang, newPassword: baru } })
      setKabar(m.admin_password_ok())
      setSekarang('')
      setBaru('')
      setUlangi('')
    } catch (err) {
      // Server melempar KODE, bukan kalimat: ia tak tahu bahasa yang dipakai.
      const pesan = err instanceof Error ? err.message : String(err)
      if (pesan.includes(WRONG_PASSWORD)) setGalat(m.admin_password_wrong())
      else if (pesan.includes(SAME_PASSWORD)) setGalat(m.admin_password_same())
      else setGalat(pesan)
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <h1 className="font-serif text-2xl font-semibold">{m.admin_password_title()}</h1>

      <Card className="max-w-xl">
        <CardHeader>
          <CardTitle>{m.admin_password_title()}</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={submit} className="flex flex-col gap-4">
            {/* Pencabutan sesi lain disebutkan SEBELUM tombol, bukan setelahnya:
                kalau pengurus masuk di ponsel jemaat gereja, ia perlu tahu
                konsekuensinya sebelum menekan, bukan sesudah. */}
            <p className="text-muted text-sm">{m.admin_password_intro()}</p>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor={`${id}-sekarang`}>{m.admin_password_current()}</Label>
              <Input
                id={`${id}-sekarang`}
                type="password"
                required
                autoComplete="current-password"
                value={sekarang}
                onChange={(e) => setSekarang(e.target.value)}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor={`${id}-baru`}>{m.admin_password_new()}</Label>
              <Input
                id={`${id}-baru`}
                type="password"
                required
                minLength={8}
                autoComplete="new-password"
                aria-describedby={`${id}-hint`}
                value={baru}
                onChange={(e) => setBaru(e.target.value)}
              />
              <p id={`${id}-hint`} className="text-muted text-xs">
                {m.admin_password_hint()}
              </p>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor={`${id}-ulangi`}>{m.admin_password_confirm()}</Label>
              <Input
                id={`${id}-ulangi`}
                type="password"
                required
                autoComplete="new-password"
                value={ulangi}
                onChange={(e) => setUlangi(e.target.value)}
              />
            </div>

            <p
              id={`${id}-err`}
              role="status"
              aria-live="polite"
              className="text-destructive min-h-5 text-sm"
            >
              {galat}
            </p>
            <p role="status" aria-live="polite" className="text-muted min-h-5 text-sm">
              {kabar}
            </p>

            <div>
              <Button
                type="submit"
                variant="primary"
                disabled={sending}
                aria-describedby={`${id}-err`}
              >
                {sending ? m.admin_password_saving() : m.admin_password_submit()}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}

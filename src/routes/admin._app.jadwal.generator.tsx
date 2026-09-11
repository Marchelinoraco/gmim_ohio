import { useState } from 'react'
import { createFileRoute, useRouter } from '@tanstack/react-router'
import * as m from '@/paraglide/messages'
import { todayEastern, addDays } from '@/lib/datetime'
import {
  previewGeneration,
  applyGeneration,
  type GenerationPreview,
} from '@/features/schedule/generator'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'

export const Route = createFileRoute('/admin/_app/jadwal/generator')({
  component: Generator,
})

function Generator() {
  const router = useRouter()
  const [from, setFrom] = useState(todayEastern())
  const [to, setTo] = useState(addDays(todayEastern(), 55))
  const [pratinjau, setPratinjau] = useState<GenerationPreview | null>(null)
  const [hasil, setHasil] = useState<number | null>(null)
  const [sibuk, setSibuk] = useState(false)
  const [error, setError] = useState('')

  async function jalankan(fn: () => Promise<void>) {
    if (sibuk) return
    setSibuk(true)
    setError('')
    try {
      await fn()
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setSibuk(false)
    }
  }

  return (
    <div className="flex max-w-2xl flex-col gap-6">
      <h1 className="font-serif text-2xl font-semibold">{m.admin_schedule_generator_title()}</h1>

      {/* Selalu terlihat, bukan hanya setelah pratinjau: pengurus harus tahu
          hasilnya draf SEBELUM menekan apa pun. */}
      <p className="text-muted text-sm">{m.admin_schedule_generator_note()}</p>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="gen-from">{m.admin_schedule_generator_from()}</Label>
          <Input id="gen-from" type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="gen-to">{m.admin_schedule_generator_to()}</Label>
          <Input id="gen-to" type="date" value={to} onChange={(e) => setTo(e.target.value)} />
        </div>
      </div>

      <div className="flex gap-2">
        <Button
          variant="outline"
          disabled={sibuk}
          onClick={() =>
            jalankan(async () => {
              setHasil(null)
              setPratinjau(await previewGeneration({ data: { from, to } }))
            })
          }
        >
          {m.admin_schedule_generator_preview()}
        </Button>
        {/* Terkunci sampai pratinjau dijalankan: pengurus tidak boleh bisa
            menulis tanpa melihat dulu apa yang akan dibuat. */}
        <Button
          variant="primary"
          disabled={sibuk || pratinjau === null}
          onClick={() =>
            jalankan(async () => {
              const r = await applyGeneration({ data: { from, to } })
              setHasil(r.dibuat)
              setPratinjau(null)
              await router.invalidate()
            })
          }
        >
          {m.admin_schedule_generator_apply()}
        </Button>
      </div>

      <p role="status" aria-live="polite" className="text-destructive min-h-5 text-sm">
        {error}
      </p>

      {pratinjau && (
        <Card>
          <CardContent className="flex flex-col gap-2 py-4">
            <p className="font-serif text-2xl font-semibold">{pratinjau.total}</p>
            <ul className="text-muted flex flex-col gap-1 text-sm">
              {pratinjau.perKategori.map((k) => (
                <li key={k.nama}>
                  {k.nama}: {k.jumlah}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {hasil !== null && (
        <p className="text-ink text-sm">
          {hasil === 0 ? (
            m.admin_schedule_generator_none()
          ) : (
            <>
              <strong>{hasil}</strong> {m.admin_schedule_generator_result()}
            </>
          )}
        </p>
      )}
    </div>
  )
}

import { createFileRoute } from '@tanstack/react-router'
import * as m from '@/paraglide/messages'
import { getAdminSummary, hariTersisa } from '@/features/admin/summary'
import { todayEastern, formatDateLong } from '@/lib/datetime'
import { getLocale } from '@/paraglide/runtime'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export const Route = createFileRoute('/admin/_app/')({
  loader: () => getAdminSummary(),
  component: AdminHome,
})

/** Ambang peringatan: di bawah ini, sisa jadwal ditampilkan sebagai galat. */
const AMBANG_KRITIS = 21

function AdminHome() {
  const s = Route.useLoaderData()
  const locale = getLocale()
  const sisa = hariTersisa(s.jadwal.terisiSampai, todayEastern())

  const kartu = [
    { judul: m.admin_nav_schedule(), ...s.jadwal },
    { judul: m.admin_nav_bulletins(), ...s.warta },
    { judul: m.admin_nav_devotionals(), ...s.renungan },
    { judul: m.admin_nav_gallery(), ...s.galeri },
  ]

  return (
    <div className="flex flex-col gap-6">
      <h1 className="font-serif text-2xl font-semibold">{m.admin_home_title()}</h1>

      {/* Sisa jadwal ditaruh PALING ATAS dan diberi warna saat menipis. Ini yang
          selama ini tidak terlihat di permukaan mana pun: seed mengisi 8 minggu
          lalu berhenti, dan tak ada peringatan sampai /jadwal mendadak kosong. */}
      <Card>
        <CardContent className="py-4">
          {sisa === null ? (
            <p className="text-destructive text-sm font-medium">{m.admin_schedule_none()}</p>
          ) : sisa < 0 ? (
            <p className="text-destructive text-sm font-medium">{m.admin_schedule_expired()}</p>
          ) : (
            <p className={sisa <= AMBANG_KRITIS ? 'text-destructive text-sm font-medium' : 'text-ink text-sm'}>
              {m.admin_schedule_filled_until()}{' '}
              <strong>{formatDateLong(s.jadwal.terisiSampai!, locale)}</strong> — {sisa}{' '}
              {m.admin_schedule_days_left()}
            </p>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {kartu.map((k) => (
          <Card key={k.judul}>
            <CardHeader>
              <CardTitle className="text-muted text-sm font-medium">{k.judul}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="font-serif text-3xl font-semibold">{k.total}</p>
              {k.draft > 0 && (
                <p className="text-muted mt-1 text-sm">
                  {k.draft} {m.admin_summary_draft()}
                </p>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {s.pesanBaru > 0 && (
        <Card>
          <CardContent className="py-4">
            <p className="text-ink text-sm">
              <strong>{s.pesanBaru}</strong> {m.admin_messages_new()}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

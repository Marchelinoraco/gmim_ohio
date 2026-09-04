import * as m from '@/paraglide/messages'
import { addDays, formatDateLong, formatMonthYear, lastDayOfMonth } from '@/lib/datetime'

/**
 * `groupByDate` + `monthGrid` + `<MonthCalendar>` — dua fungsi murni + satu
 * komponen tampilan untuk `/jadwal` (Task 7 memakai `groupByDate` untuk view
 * "daftar"; Task 8 memakai `monthGrid` + `<MonthCalendar>` untuk view
 * "kalender").
 *
 * Sengaja TIDAK mengimpor `utcMidnight`/`parseDate` dari `@/lib/datetime` —
 * keduanya fungsi privat modul itu (tak diekspor). Aritmetika grid kalender di
 * sini dibangun ulang sebagai fungsi murni mandiri di atas `addDays` +
 * `new Date(\`\${iso}T00:00:00Z\`)` untuk membaca hari-dalam-minggu — pola
 * UTC-midnight yang SAMA dengan `datetime.ts`, tapi diduplikasi secara sengaja
 * di sini karena helper aslinya privat. Suffix `T00:00:00Z` WAJIB ada di
 * setiap parsing tanggal di file ini supaya tak ada penggeseran hari akibat
 * parsing sebagai waktu lokal mesin. `lastDayOfMonth`/`formatDateLong`/
 * `formatMonthYear` SUDAH publik di `datetime.ts` (Task 8) sehingga diimpor
 * langsung, bukan diduplikasi — beda dengan `dayOfWeek` di bawah.
 */

/** Bentuk minimal yang dibutuhkan `groupByDate` — hanya menyentuh `serviceDate`. */
type Dated = { serviceDate: string }

/**
 * Kelompokkan array servis per tanggal (`serviceDate`), urutan grup MAUPUN
 * urutan anggota dalam grup mengikuti urutan kemunculan di `services` (bukan
 * diurutkan ulang) — pemanggil (`listServices`, sudah urut tanggal+jam) yang
 * bertanggung jawab atas urutan akhir.
 *
 * Generik atas `T extends Dated`, BUKAN mengimpor `UpcomingService` dari
 * `@/features/schedule/services` — modul komponen ini sengaja tak bergantung
 * pada lapisan fitur; satu-satunya field yang disentuh adalah `serviceDate`.
 * `Map` dipakai (bukan array + pencarian indeks) supaya insertion-order
 * grup terjaga tanpa perlu akses indeks manual (aman dari
 * `noUncheckedIndexedAccess`).
 */
export function groupByDate<T extends Dated>(
  services: T[],
): Array<{ date: string; services: T[] }> {
  const groups = new Map<string, { date: string; services: T[] }>()
  for (const service of services) {
    const existing = groups.get(service.serviceDate)
    if (existing) {
      existing.services.push(service)
    } else {
      groups.set(service.serviceDate, { date: service.serviceDate, services: [service] })
    }
  }
  return Array.from(groups.values())
}

/** Hari-dalam-minggu (0=Minggu … 6=Sabtu) dari `YYYY-MM-DD`, aritmetika UTC murni. */
function dayOfWeek(date: string): number {
  return new Date(`${date}T00:00:00Z`).getUTCDay()
}

/**
 * Grid kalender bulan `month` (`'YYYY-MM'`) → array minggu, tiap minggu 7
 * string `YYYY-MM-DD` Minggu–Sabtu, termasuk tanggal bulan tetangga sebagai
 * pengisi di minggu pertama/terakhir. Jumlah minggu mengikuti bulan (5 atau 6
 * baris) — TIDAK dipaksa selalu 6.
 *
 * Murni: tak ada state/efek samping, hanya `addDays` + pembacaan
 * hari-dalam-minggu UTC.
 */
export function monthGrid(month: string): string[][] {
  const firstOfMonth = `${month}-01`
  const lastOfMonth = lastDayOfMonth(month)
  const gridStart = addDays(firstOfMonth, -dayOfWeek(firstOfMonth))

  const weeks: string[][] = []
  let cursor = gridStart
  let reachedEnd = false
  while (!reachedEnd) {
    const week: string[] = []
    for (let i = 0; i < 7; i++) {
      week.push(cursor)
      if (cursor === lastOfMonth) reachedEnd = true
      cursor = addDays(cursor, 1)
    }
    weeks.push(week)
  }
  return weeks
}

/** Geser `month` (`'YYYY-MM'`) satu bulan ke belakang/depan lewat `addDays`. */
function shiftMonth(month: string, direction: -1 | 1): string {
  const anchor = direction === 1 ? addDays(lastDayOfMonth(month), 1) : addDays(`${month}-01`, -1)
  return anchor.slice(0, 7)
}

type CalendarService = { serviceDate: string; category: { color: string } }

/**
 * `<MonthCalendar>` — grid kalender bulanan untuk view "kalender" `/jadwal`
 * (Task 8). Komponen presentasional TERKENDALI PENUH: `month`/`selectedDate`
 * datang dari pemanggil (route, lewat `ScheduleSearch.bulan`), navigasi bulan
 * & pemilihan tanggal dilaporkan lewat `onChangeMonth`/`onSelectDate` — tak
 * ada state/router internal di sini, sama seperti pola `<ScheduleFilters>`.
 *
 * Sel di luar bulan aktif (pengisi minggu pertama/terakhir dari `monthGrid`)
 * diredupkan `text-muted` tapi TETAP dirender (bukan kosong) supaya grid tetap
 * persegi 7 kolom. Sel yang punya ≥1 ibadah adalah `<button>` (satu-satunya
 * cara memicu `onSelectDate`) dengan titik warna per kategori (dedup by
 * `color`) memakai `style` inline — pola sama dengan `<CategoryBadge>`, karena
 * `category.color` adalah string CSS var mentah dari DB, bukan kelas
 * Tailwind. Sel tanpa ibadah dirender sebagai `<div>` non-interaktif (nomor
 * tanggal saja, tak ada yang bisa diklik).
 *
 * `aria-label` sel ibadah pakai `m.jadwal_calendar_day_label({ date, count })`
 * (kunci pesan ditambahkan di Task 8) dengan `date` yang sudah dilokalkan lewat
 * `formatDateLong` — jadi pembaca layar mendengar kalimat penuh berlokal
 * ("Senin, 31 Agustus 2026, 2 ibadah" / "Monday, 31 August 2026, 2 services"),
 * bukan `YYYY-MM-DD` mentah.
 *
 * `locale` (baru di Task 8) dipakai untuk `formatMonthYear` (label bulan/tahun
 * di antara tombol navigasi — jawaban atas "kalender ini bulan apa") dan
 * `formatDateLong` di `aria-label`.
 *
 * Label bulan/tahun sengaja `<p aria-live="polite">`, BUKAN `<h3>`/heading apa
 * pun — ia keterangan widget kalender (pola sama dengan date-picker aksesibel
 * pada umumnya: label bulan/tahun bagian dari widget, bukan garis besar
 * dokumen), bukan bagian dari struktur heading halaman. `jadwal.tsx` merender
 * `<SectionTitle>` (`h2`) untuk tanggal terpilih TEPAT DI BAWAH kalender ini —
 * kalau label ini `<h3>` maka urutan heading di DOM jadi `h1 → h3 → h2`
 * (melompati `h2` dari `h1`, lalu `h2` muncul setelah `h3` tanpa level valid
 * di antaranya), merusak navigasi heading pembaca layar. `aria-live="polite"`
 * membuat perubahan bulan (klik tombol navigasi) diumumkan ke pembaca layar —
 * label tombol prev/next saja tak menyampaikan bulan barunya.
 */
export function MonthCalendar({
  month,
  services,
  locale,
  selectedDate,
  onSelectDate,
  onChangeMonth,
}: {
  month: string
  services: CalendarService[]
  locale: 'id' | 'en'
  selectedDate?: string
  onSelectDate: (date: string) => void
  onChangeMonth: (nextMonth: string) => void
}) {
  const weeks = monthGrid(month)

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <button
          type="button"
          aria-label={m.jadwal_calendar_prev_month()}
          onClick={() => onChangeMonth(shiftMonth(month, -1))}
          className="border-border bg-surface text-ink hover:bg-surface-2 focus-visible:ring-secondary/60 focus-visible:ring-offset-surface inline-flex h-9 w-9 items-center justify-center rounded-md border outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
        >
          ‹
        </button>
        <p className="text-ink font-serif text-lg" aria-live="polite">
          {formatMonthYear(month, locale)}
        </p>
        <button
          type="button"
          aria-label={m.jadwal_calendar_next_month()}
          onClick={() => onChangeMonth(shiftMonth(month, 1))}
          className="border-border bg-surface text-ink hover:bg-surface-2 focus-visible:ring-secondary/60 focus-visible:ring-offset-surface inline-flex h-9 w-9 items-center justify-center rounded-md border outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
        >
          ›
        </button>
      </div>

      <div className="grid grid-cols-7 gap-1">
        {weeks.flat().map((date) => {
          const outsideMonth = date.slice(0, 7) !== month
          const dayServices = services.filter((s) => s.serviceDate === date)
          const hasServices = dayServices.length > 0
          const isSelected = date === selectedDate
          const dayNumber = Number(date.slice(8, 10))
          const colors = Array.from(new Set(dayServices.map((s) => s.category.color)))

          const cellClass = [
            'flex min-h-14 flex-col items-center gap-1 rounded-md border p-1.5 text-sm',
            'border-border',
            outsideMonth ? 'text-muted' : 'text-ink',
            isSelected ? 'bg-surface-2' : 'bg-surface',
          ].join(' ')

          const dots = colors.length > 0 && (
            <span className="flex gap-0.5">
              {colors.map((color) => (
                <span
                  key={color}
                  className="h-1.5 w-1.5 rounded-full"
                  style={{ backgroundColor: color }}
                />
              ))}
            </span>
          )

          if (!hasServices) {
            return (
              <div key={date} className={cellClass}>
                <span>{dayNumber}</span>
              </div>
            )
          }

          return (
            <button
              key={date}
              type="button"
              aria-label={m.jadwal_calendar_day_label({
                date: formatDateLong(date, locale),
                count: dayServices.length,
              })}
              onClick={() => onSelectDate(date)}
              className={`${cellClass} hover:bg-surface-2 focus-visible:ring-secondary/60 focus-visible:ring-offset-surface outline-none focus-visible:ring-2 focus-visible:ring-offset-2`}
            >
              <span>{dayNumber}</span>
              {dots}
            </button>
          )
        })}
      </div>
    </div>
  )
}

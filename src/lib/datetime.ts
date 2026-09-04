import { TZDate } from '@date-fns/tz'

/**
 * Zona waktu kanonik untuk SEMUA jadwal ibadah GMIM Musafir (Columbus, Ohio).
 * Semua `startTime` di aplikasi adalah wall-clock Eastern; modul ini satu-satunya
 * tempat konversi zona waktu terjadi.
 */
export const EASTERN = 'America/New_York'

interface DateParts {
  year: number
  month: number // 1-based
  day: number
}

interface TimeParts {
  hours: number
  minutes: number
  seconds: number
}

/** Ambil elemen array pada indeks terhitung; lempar bila di luar rentang. */
function at<T>(items: readonly T[], index: number): T {
  const value = items[index]
  if (value === undefined) {
    throw new RangeError(`Indeks di luar rentang: ${index}`)
  }
  return value
}

/** Uraikan `"YYYY-MM-DD"` → bagian tanggal. Lempar `RangeError` untuk input tak valid. */
function parseDate(iso: string): DateParts {
  const parts = iso.split('-')
  const year = Number(parts[0])
  const month = Number(parts[1])
  const day = Number(parts[2])
  if (
    parts.length !== 3 ||
    !Number.isInteger(year) ||
    !Number.isInteger(month) ||
    !Number.isInteger(day) ||
    month < 1 ||
    month > 12 ||
    day < 1 ||
    day > 31
  ) {
    throw new RangeError(`Tanggal harus format YYYY-MM-DD: ${JSON.stringify(iso)}`)
  }
  return { year, month, day }
}

/** Uraikan `"HH:mm"` atau `"HH:mm:ss"` → bagian waktu. Lempar `RangeError` untuk input tak valid. */
function parseTime(time: string): TimeParts {
  const parts = time.split(':')
  const hours = Number(parts[0])
  const minutes = Number(parts[1])
  const seconds = parts.length > 2 ? Number(parts[2]) : 0
  if (
    parts.length < 2 ||
    parts.length > 3 ||
    !Number.isInteger(hours) ||
    !Number.isInteger(minutes) ||
    !Number.isInteger(seconds) ||
    hours < 0 ||
    hours > 23 ||
    minutes < 0 ||
    minutes > 59 ||
    seconds < 0 ||
    seconds > 59
  ) {
    throw new RangeError(`Waktu harus format HH:mm atau HH:mm:ss: ${JSON.stringify(time)}`)
  }
  return { hours, minutes, seconds }
}

/** `Date` (tengah malam UTC) untuk kalkulasi kalender murni — bukan instant ibadah. */
function utcMidnight({ year, month, day }: DateParts): Date {
  return new Date(Date.UTC(year, month - 1, day))
}

const DOW_ID = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'] as const
const MONTH_ID = [
  'Januari',
  'Februari',
  'Maret',
  'April',
  'Mei',
  'Juni',
  'Juli',
  'Agustus',
  'September',
  'Oktober',
  'November',
  'Desember',
] as const

/**
 * Gabung `YYYY-MM-DD` + `HH:mm[:ss]` sebagai wall-clock Eastern → `Date`
 * (instant UTC yang benar, memperhitungkan DST: EDT = UTC-4, EST = UTC-5).
 */
export function toInstant(serviceDate: string, startTime: string): Date {
  const { year, month, day } = parseDate(serviceDate)
  const { hours, minutes, seconds } = parseTime(startTime)
  const zoned = new TZDate(year, month - 1, day, hours, minutes, seconds, EASTERN)
  return new Date(zoned.getTime())
}

/**
 * Tanggal panjang berlokalisasi, mis. `"Senin, 31 Agustus 2026"` (id) /
 * `"Monday, 31 August 2026"` (en).
 */
export function formatDateLong(serviceDate: string, locale: 'id' | 'en'): string {
  const parts = parseDate(serviceDate)
  const utc = utcMidnight(parts)
  if (locale === 'id') {
    return `${at(DOW_ID, utc.getUTCDay())}, ${parts.day} ${at(MONTH_ID, parts.month - 1)} ${parts.year}`
  }
  // en-GB + timeZone UTC → "Monday, 31 August 2026" deterministik lintas mesin
  // (tanpa timeZone, mesin dengan offset negatif menggeser tanggal ke hari sebelumnya).
  return new Intl.DateTimeFormat('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(utc)
}

/**
 * Tanggal + jam berlokalisasi, mis. `"Senin, 31 Agustus 2026 · 10.00"` (id) /
 * `"Monday, 31 August 2026 · 10:00 AM"` (en).
 */
export function formatServiceDateTime(
  serviceDate: string,
  startTime: string,
  locale: 'id' | 'en',
): string {
  const { hours, minutes } = parseTime(startTime)
  if (locale === 'id') {
    const hh = String(hours).padStart(2, '0')
    const mm = String(minutes).padStart(2, '0')
    return `${formatDateLong(serviceDate, 'id')} · ${hh}.${mm}`
  }
  const time = new Intl.DateTimeFormat('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
    timeZone: 'UTC',
  }).format(new Date(Date.UTC(2000, 0, 1, hours, minutes)))
  return `${formatDateLong(serviceDate, 'en')} · ${time}`
}

/** Offset UTC Eastern pada `date` (`YYYY-MM-DD`) — `-04:00` (EDT) atau `-05:00` (EST), tergantung DST. */
export function easternOffset(date: string): string {
  const { year, month, day } = parseDate(date)
  const zoned = new TZDate(year, month - 1, day, 12, 0, 0, EASTERN) // tengah hari — jauh dari batas DST manapun
  const offsetMinutes = -zoned.getTimezoneOffset()
  const sign = offsetMinutes >= 0 ? '+' : '-'
  const abs = Math.abs(offsetMinutes)
  const hh = String(Math.floor(abs / 60)).padStart(2, '0')
  const mm = String(abs % 60).padStart(2, '0')
  return `${sign}${hh}:${mm}`
}

/**
 * Tanggal Eastern "hari ini" sebagai `"YYYY-MM-DD"` (wall-clock Eastern). Kolom
 * `serviceDate` juga wall-clock Eastern, jadi membandingkannya dengan tanggal
 * turunan-UTC (`new Date().toISOString().slice(0,10)`) salah di sekitar tengah
 * malam — mis. pukul 23.30 Eastern (03.30 UTC keesokan harinya) UTC sudah "besok"
 * sementara jadwal ibadah masih memakai tanggal "hari ini". `now` opsional supaya
 * bisa diuji deterministik.
 */
export function todayEastern(now: Date = new Date()): string {
  const zoned = new TZDate(now.getTime(), EASTERN)
  const year = zoned.getFullYear()
  const month = String(zoned.getMonth() + 1).padStart(2, '0')
  const day = String(zoned.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

/** `YYYY-MM-DD` sejumlah `days` setelah `date`. Kalender murni, tanpa jam. */
export function addDays(date: string, days: number): string {
  const dt = utcMidnight(parseDate(date))
  dt.setUTCDate(dt.getUTCDate() + days)
  return dt.toISOString().slice(0, 10)
}

/** Tanggal terakhir (`YYYY-MM-DD`) dari bulan `YYYY-MM`. */
export function lastDayOfMonth(month: string): string {
  const year = Number(month.slice(0, 4))
  const monthNum = Number(month.slice(5, 7))
  const nextMonth =
    monthNum === 12 ? `${year + 1}-01` : `${year}-${String(monthNum + 1).padStart(2, '0')}`
  return addDays(`${nextMonth}-01`, -1)
}

/** "Desember 2026" (id) / "December 2026" (en) — nama bulan penuh + tahun. */
export function formatMonthYear(month: string, locale: 'id' | 'en'): string {
  const year = Number(month.slice(0, 4))
  const monthIndex = Number(month.slice(5, 7)) - 1
  if (locale === 'id') return `${at(MONTH_ID, monthIndex)} ${year}`
  return new Intl.DateTimeFormat('en-GB', {
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(Date.UTC(year, monthIndex, 1)))
}

/** Senin (`YYYY-MM-DD`) dari minggu yang memuat `date`. Idempoten bila `date` sudah Senin. */
export function isoWeekStart(date: string): string {
  const dt = utcMidnight(parseDate(date))
  const distanceToMonday = (dt.getUTCDay() + 6) % 7 // 0=Minggu → 6, 1=Senin → 0, ...
  dt.setUTCDate(dt.getUTCDate() - distanceToMonday)
  return dt.toISOString().slice(0, 10)
}

/**
 * Semua tanggal `YYYY-MM-DD` dalam rentang inklusif `[fromISO, toISO]` yang jatuh
 * pada `dayOfWeek` (0=Minggu … 6=Sabtu). Dipakai generator template (Rencana 3).
 */
export function datesForWeekday(fromISO: string, toISO: string, dayOfWeek: number): string[] {
  if (!Number.isInteger(dayOfWeek) || dayOfWeek < 0 || dayOfWeek > 6) {
    throw new RangeError(`dayOfWeek harus bilangan bulat 0-6: ${JSON.stringify(dayOfWeek)}`)
  }
  const cursor = utcMidnight(parseDate(fromISO))
  const end = utcMidnight(parseDate(toISO))
  const out: string[] = []
  while (cursor.getTime() <= end.getTime()) {
    if (cursor.getUTCDay() === dayOfWeek) {
      out.push(cursor.toISOString().slice(0, 10))
    }
    cursor.setUTCDate(cursor.getUTCDate() + 1)
  }
  return out
}

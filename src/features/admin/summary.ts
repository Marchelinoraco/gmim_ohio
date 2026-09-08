import { createServerFn } from '@tanstack/react-start'
import { ensureAdmin } from '@/lib/auth.functions'

export type DomainSummary = { total: number; draft: number }

export type AdminSummary = {
  jadwal: DomainSummary & { terisiSampai: string | null }
  warta: DomainSummary
  renungan: DomainSummary
  galeri: DomainSummary
  pesanBaru: number
}

/**
 * Selisih hari antara tanggal ibadah terakhir dan hari ini. `null` bila belum
 * ada jadwal sama sekali.
 *
 * Nilai negatif SENGAJA tidak dijepit ke nol — "habis 6 hari lalu" adalah
 * informasi yang harus terlihat, dan menampilkannya sebagai nol menyamarkan
 * situs yang sudah kehilangan seluruh halaman jadwalnya.
 *
 * Keduanya string `YYYY-MM-DD` waktu Eastern, sejalan dengan `serviceDate` yang
 * memang disimpan sebagai wall-clock Eastern (lihat `src/lib/datetime.ts`).
 */
export function hariTersisa(sampai: string | null, hariIni: string): number | null {
  if (!sampai) return null
  const MS_PER_HARI = 86_400_000
  return Math.round((Date.parse(`${sampai}T00:00:00Z`) - Date.parse(`${hariIni}T00:00:00Z`)) / MS_PER_HARI)
}

export const getAdminSummary = createServerFn({ method: 'GET' }).handler(
  async (): Promise<AdminSummary> => {
    await ensureAdmin()

    const { db } = await import('@/db')
    const { bulletins, devotionals, galleryAlbums, worshipServices, contactMessages } = await import(
      '@/db/schema'
    )
    const { count, eq, max, sql } = await import('drizzle-orm')

    // Satu query per tabel, masing-masing mengembalikan total + jumlah draft
    // dalam satu lintasan — `filter` di sisi SQL, bukan menarik semua baris lalu
    // menghitung di JS.
    const draft = sql<number>`count(*) filter (where status = 'draft')`.mapWith(Number)

    const [jadwal] = await db
      .select({ total: count(), draft, terisiSampai: max(worshipServices.serviceDate) })
      .from(worshipServices)
    const [warta] = await db.select({ total: count(), draft }).from(bulletins)
    const [renungan] = await db.select({ total: count(), draft }).from(devotionals)
    const [galeri] = await db.select({ total: count(), draft }).from(galleryAlbums)
    const [pesan] = await db
      .select({ total: count() })
      .from(contactMessages)
      .where(eq(contactMessages.status, 'new'))

    return {
      jadwal: {
        total: jadwal?.total ?? 0,
        draft: jadwal?.draft ?? 0,
        terisiSampai: jadwal?.terisiSampai ?? null,
      },
      warta: { total: warta?.total ?? 0, draft: warta?.draft ?? 0 },
      renungan: { total: renungan?.total ?? 0, draft: renungan?.draft ?? 0 },
      galeri: { total: galeri?.total ?? 0, draft: galeri?.draft ?? 0 },
      pesanBaru: pesan?.total ?? 0,
    }
  },
)

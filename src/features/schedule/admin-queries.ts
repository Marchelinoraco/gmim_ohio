import { createServerFn } from '@tanstack/react-start'
import { ensureAdmin } from '@/lib/auth.functions'

export type AdminServiceFilter = {
  from?: string
  to?: string
  categoryId?: string
  status?: 'draft' | 'published'
}

export type AdminServiceRow = {
  id: string
  serviceDate: string
  startTime: string
  status: 'draft' | 'published'
  categoryNameId: string
  categoryColor: string
  kolomName: string | null
  themeId: string | null
}

export type AdminServiceDetail = AdminServiceRow & {
  categoryId: string
  kolomId: string | null
  templateId: string | null
  endTime: string | null
  locationType: 'gedung_gereja' | 'rumah'
  hostFamilyName: string | null
  hostAddress: string | null
  locationNote: string | null
  themeEn: string | null
  bibleReading: string | null
  preacherName: string | null
  liturgistName: string | null
}

/**
 * Daftar jadwal untuk dashboard. Berbeda dari `listServices` publik dalam dua
 * hal yang disengaja: ia menampilkan draft (pengurus perlu melihat yang belum
 * terbit), dan ia tidak memaksa `from = hari ini` (pengurus perlu meninjau dan
 * membetulkan jadwal yang sudah lewat).
 *
 * `ensureAdmin()` dipanggil di sini, bukan hanya di route: route yang dijaga
 * tidak menghalangi siapa pun memanggil server fn ini langsung lewat HTTP.
 *
 * `limit: 500` supaya satu halaman tidak menarik seluruh tabel saat jadwal
 * bertahun-tahun menumpuk. Filter rentang tanggal yang menyempitkannya, bukan
 * paging — pengurus bekerja per periode, bukan menyapu seluruh riwayat.
 */
export const listServicesForAdmin = createServerFn({ method: 'GET' })
  .validator((f: AdminServiceFilter = {}) => f)
  .handler(async ({ data: f }): Promise<AdminServiceRow[]> => {
    await ensureAdmin()
    const { db } = await import('@/db')

    const rows = await db.query.worshipServices.findMany({
      where: (s, { and, eq, gte, lte }) =>
        and(
          f.from ? gte(s.serviceDate, f.from) : undefined,
          f.to ? lte(s.serviceDate, f.to) : undefined,
          f.categoryId ? eq(s.categoryId, f.categoryId) : undefined,
          f.status ? eq(s.status, f.status) : undefined,
        ),
      orderBy: (s, { asc }) => [asc(s.serviceDate), asc(s.startTime)],
      limit: 500,
      with: {
        category: { columns: { nameId: true, color: true } },
        kolom: { columns: { name: true } },
      },
    })

    return rows.map((r) => ({
      id: r.id,
      serviceDate: r.serviceDate,
      startTime: r.startTime,
      status: r.status,
      categoryNameId: r.category.nameId,
      categoryColor: r.category.color,
      kolomName: r.kolom?.name ?? null,
      themeId: r.themeId,
    }))
  })

export const getServiceForAdmin = createServerFn({ method: 'GET' })
  .validator((id: string) => id)
  .handler(async ({ data: id }): Promise<AdminServiceDetail | null> => {
    await ensureAdmin()
    const { db } = await import('@/db')

    const r = await db.query.worshipServices.findFirst({
      where: (s, { eq }) => eq(s.id, id),
      with: {
        category: { columns: { nameId: true, color: true } },
        kolom: { columns: { name: true } },
      },
    })
    if (!r) return null

    return {
      id: r.id,
      serviceDate: r.serviceDate,
      startTime: r.startTime,
      status: r.status,
      categoryNameId: r.category.nameId,
      categoryColor: r.category.color,
      kolomName: r.kolom?.name ?? null,
      themeId: r.themeId,
      categoryId: r.categoryId,
      kolomId: r.kolomId,
      templateId: r.templateId,
      endTime: r.endTime,
      locationType: r.locationType,
      hostFamilyName: r.hostFamilyName,
      hostAddress: r.hostAddress,
      locationNote: r.locationNote,
      themeEn: r.themeEn,
      bibleReading: r.bibleReading,
      preacherName: r.preacherName,
      liturgistName: r.liturgistName,
    }
  })

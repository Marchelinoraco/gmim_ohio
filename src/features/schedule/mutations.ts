import { z } from 'zod'
import { createServerFn } from '@tanstack/react-start'
import { ensureAdmin } from '@/lib/auth.functions'

/** `''` dan spasi-saja jadi null; kolom opsional tak boleh menyimpan string kosong. */
const opsional = z
  .string()
  .trim()
  .transform((v) => (v === '' ? null : v))
  .nullable()
  .optional()
  .transform((v) => v ?? null)

/** Tanggal kalender sungguhan — `2026-02-30` ditolak, bukan digeser diam-diam. */
const tanggal = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Format tanggal harus YYYY-MM-DD')
  .refine((v) => {
    const [y, m, d] = v.split('-').map(Number)
    const dt = new Date(Date.UTC(y!, m! - 1, d!))
    return dt.getUTCFullYear() === y && dt.getUTCMonth() === m! - 1 && dt.getUTCDate() === d
  }, 'Tanggal itu tidak ada di kalender')

const jam = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Format jam harus HH:MM')

export const serviceInputSchema = z
  .object({
    categoryId: z.uuid(),
    kolomId: z
      .uuid()
      .nullable()
      .optional()
      .transform((v) => v ?? null),
    templateId: z
      .uuid()
      .nullable()
      .optional()
      .transform((v) => v ?? null),
    serviceDate: tanggal,
    startTime: jam,
    endTime: z
      .union([jam, z.literal('')])
      .nullable()
      .optional()
      .transform((v) => (v ? v : null)),
    locationType: z.enum(['gedung_gereja', 'rumah']),
    hostFamilyName: opsional,
    hostAddress: opsional,
    locationNote: opsional,
    themeId: opsional,
    themeEn: opsional,
    bibleReading: opsional,
    preacherName: opsional,
    liturgistName: opsional,
    status: z.enum(['draft', 'published']),
  })
  .refine((v) => !v.endTime || v.endTime > v.startTime, {
    message: 'Jam selesai harus setelah jam mulai',
    path: ['endTime'],
  })
  // Ibadah rumah tanpa penunjuk lokasi apa pun tayang sebagai "Lokasi menyusul"
  // selamanya, dan tak ada yang sadar sampai jemaat kebingungan.
  .refine((v) => v.locationType !== 'rumah' || Boolean(v.hostFamilyName ?? v.locationNote), {
    message: 'Ibadah di rumah butuh nama tuan rumah atau catatan lokasi',
    path: ['hostFamilyName'],
  })

export type ServiceInput = z.infer<typeof serviceInputSchema>

export const createService = createServerFn({ method: 'POST' })
  .validator((d: unknown) => serviceInputSchema.parse(d))
  .handler(async ({ data }): Promise<{ id: string }> => {
    await ensureAdmin()
    const { db } = await import('@/db')
    const { worshipServices } = await import('@/db/schema')
    const [row] = await db.insert(worshipServices).values(data).returning({ id: worshipServices.id })
    if (!row) throw new Error('Gagal menyimpan ibadah')
    return { id: row.id }
  })

export const updateService = createServerFn({ method: 'POST' })
  .validator((d: unknown) => z.object({ id: z.uuid() }).and(serviceInputSchema).parse(d))
  .handler(async ({ data }): Promise<{ id: string }> => {
    await ensureAdmin()
    const { id, ...rest } = data
    const { db } = await import('@/db')
    const { worshipServices } = await import('@/db/schema')
    const { eq } = await import('drizzle-orm')
    // `updatedAt` disetel eksplisit — Drizzle tidak melakukannya sendiri, dan
    // tanpa ini kolom itu berbohong tentang kapan baris terakhir disunting.
    const [row] = await db
      .update(worshipServices)
      .set({ ...rest, updatedAt: new Date() })
      .where(eq(worshipServices.id, id))
      .returning({ id: worshipServices.id })
    if (!row) throw new Error('Ibadah tidak ditemukan')
    return { id: row.id }
  })

export const deleteService = createServerFn({ method: 'POST' })
  .validator((id: unknown) => z.uuid().parse(id))
  .handler(async ({ data: id }): Promise<{ ok: true }> => {
    await ensureAdmin()
    const { db } = await import('@/db')
    const { worshipServices } = await import('@/db/schema')
    const { eq } = await import('drizzle-orm')
    await db.delete(worshipServices).where(eq(worshipServices.id, id))
    return { ok: true }
  })

export const setServiceStatus = createServerFn({ method: 'POST' })
  .validator((d: unknown) =>
    z.object({ id: z.uuid(), status: z.enum(['draft', 'published']) }).parse(d),
  )
  .handler(async ({ data }): Promise<{ ok: true }> => {
    await ensureAdmin()
    const { db } = await import('@/db')
    const { worshipServices } = await import('@/db/schema')
    const { eq } = await import('drizzle-orm')
    await db
      .update(worshipServices)
      .set({ status: data.status, updatedAt: new Date() })
      .where(eq(worshipServices.id, data.id))
    return { ok: true }
  })

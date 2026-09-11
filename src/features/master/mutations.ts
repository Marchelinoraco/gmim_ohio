import { z } from 'zod'
import { createServerFn } from '@tanstack/react-start'
import { ensureAdmin } from '@/lib/auth.functions'
import { CATEGORY_COLOR_TOKENS } from '@/db/schema/worship'

const wajibIsi = z.string().trim().min(1, 'Wajib diisi')

/** Teks opsional: string kosong dan spasi belaka disimpan sebagai NULL. */
const opsional = z
  .string()
  .trim()
  .optional()
  .transform((v) => (v ? v : null))

/**
 * Kategori hanya bisa DIUBAH, tidak ditambah atau dihapus: `key`-nya pgEnum
 * enam nilai, dan menambah nilai enum menuntut migrasi. Karena itu skema ini
 * tidak memuat `key` sama sekali — ia tak pernah berubah lewat dashboard.
 */
export const categoryInputSchema = z.object({
  id: z.uuid(),
  nameId: wajibIsi,
  nameEn: wajibIsi,
  slug: z
    .string()
    .trim()
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Slug hanya boleh huruf kecil, angka, dan tanda hubung'),
  // Daftar tertutup, bukan regex: regex akan meloloskan token berbentuk benar
  // yang tidak ada di app.css, dan badge kategori lalu kehilangan warnanya
  // tanpa error apa pun.
  color: z.enum(CATEGORY_COLOR_TOKENS),
  sortOrder: z.number().int().min(0),
})

export type CategoryInput = z.infer<typeof categoryInputSchema>

export const kolomInputSchema = z.object({
  name: wajibIsi,
  number: z.number().int().positive('Nomor kolom harus bilangan bulat positif'),
  coordinatorName: opsional,
  coordinatorPhone: opsional,
  isActive: z.boolean(),
})

export type KolomInput = z.infer<typeof kolomInputSchema>

const kolomUpdateSchema = kolomInputSchema.extend({ id: z.uuid() })

export const updateCategory = createServerFn({ method: 'POST' })
  .validator((d: unknown) => categoryInputSchema.parse(d))
  .handler(async ({ data }): Promise<{ ok: true }> => {
    await ensureAdmin()
    const { id, ...rest } = data
    const { db } = await import('@/db')
    const { worshipCategories } = await import('@/db/schema')
    const { eq } = await import('drizzle-orm')
    await db
      .update(worshipCategories)
      .set({ ...rest, updatedAt: new Date() })
      .where(eq(worshipCategories.id, id))
    return { ok: true }
  })

export const createKolom = createServerFn({ method: 'POST' })
  .validator((d: unknown) => kolomInputSchema.parse(d))
  .handler(async ({ data }): Promise<{ id: string }> => {
    await ensureAdmin()
    const { db } = await import('@/db')
    const { kolom } = await import('@/db/schema')
    const [row] = await db.insert(kolom).values(data).returning({ id: kolom.id })
    if (!row) throw new Error('Gagal menyimpan kolom')
    return { id: row.id }
  })

export const updateKolom = createServerFn({ method: 'POST' })
  .validator((d: unknown) => kolomUpdateSchema.parse(d))
  .handler(async ({ data }): Promise<{ ok: true }> => {
    await ensureAdmin()
    const { id, ...rest } = data
    const { db } = await import('@/db')
    const { kolom } = await import('@/db/schema')
    const { eq } = await import('drizzle-orm')
    await db
      .update(kolom)
      .set({ ...rest, updatedAt: new Date() })
      .where(eq(kolom.id, id))
    return { ok: true }
  })

/**
 * Hapus kolom — tapi menolak bila masih dipakai ibadah.
 *
 * `worship_services.kolomId` punya FK ke sini, jadi menghapus kolom yang
 * terpakai akan ditolak database dengan pesan yang tak berarti bagi pengurus.
 * Mengembalikan jumlah pemakainya membuat form bisa menyarankan jalan yang
 * benar: nonaktifkan lewat `isActive`, supaya generator berhenti memakainya
 * sementara jadwal lama tetap utuh.
 */
export const deleteKolom = createServerFn({ method: 'POST' })
  .validator((id: unknown) => z.uuid().parse(id))
  .handler(async ({ data: id }): Promise<{ ok: true; dipakai: number }> => {
    await ensureAdmin()
    const { db } = await import('@/db')
    const { kolom, worshipServices } = await import('@/db/schema')
    const { eq } = await import('drizzle-orm')

    const dipakai = await db.$count(worshipServices, eq(worshipServices.kolomId, id))
    if (dipakai > 0) return { ok: true, dipakai }

    await db.delete(kolom).where(eq(kolom.id, id))
    return { ok: true, dipakai: 0 }
  })

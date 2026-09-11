import { z } from 'zod'
import { createServerFn } from '@tanstack/react-start'
import { ensureAdmin } from '@/lib/auth.functions'

const tanggal = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Format tanggal harus YYYY-MM-DD')
  .refine((v) => {
    const [y, mo, d] = v.split('-').map(Number)
    const dt = new Date(Date.UTC(y!, mo! - 1, d!))
    return dt.getUTCFullYear() === y && dt.getUTCMonth() === mo! - 1 && dt.getUTCDate() === d
  }, 'Tanggal itu tidak ada di kalender')

const wajibIsi = z.string().trim().min(1, 'Wajib diisi')

/**
 * Body renungan WAJIB ada di kedua bahasa — kolomnya NOT NULL, beda dari warta
 * yang boleh berisi PDF saja. Markup hampa dari editor yang dikosongkan
 * (`<p></p>`, `<p><br></p>`) tetap dihitung kosong.
 */
const badanWajib = z.string().refine((v) => {
  const teks = v
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/g, ' ')
    .trim()
  return teks !== ''
}, 'Isi renungan wajib diisi')

/**
 * Slug masuk ke URL publik `/renungan/<slug>`. Dibatasi huruf kecil, angka, dan
 * tanda hubung supaya tautannya tidak pernah perlu di-encode.
 */
const slug = z
  .string()
  .trim()
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Slug hanya boleh huruf kecil, angka, dan tanda hubung')

const urlOpsional = z
  .string()
  .optional()
  .transform((v) => (v?.trim() ? v.trim() : null))
  .refine((v) => v === null || /^https?:\/\//.test(v), {
    message: 'Alamat gambar harus diawali http:// atau https://',
  })

export const devotionalInputSchema = z.object({
  slug,
  titleId: wajibIsi,
  titleEn: wajibIsi,
  authorName: wajibIsi,
  publishedDate: tanggal,
  coverImageUrl: urlOpsional,
  excerptId: wajibIsi,
  excerptEn: wajibIsi,
  bodyId: badanWajib,
  bodyEn: badanWajib,
  status: z.enum(['draft', 'published']),
})

export type DevotionalInput = z.infer<typeof devotionalInputSchema>

/**
 * Kode galat yang dikenali form, bukan pesan siap-tampil — server fn tak tahu
 * bahasa yang sedang dipakai. Pola yang sama dengan `DUPLICATE_SERVICE` di
 * `@/features/schedule/mutations`.
 */
export const DUPLICATE_SLUG = 'DUPLICATE_SLUG'

/** Postgres unique_violation — di sini artinya slug sudah dipakai renungan lain. */
function slugBentrok(e: unknown): boolean {
  const kode =
    (e as { cause?: { code?: string }; code?: string })?.cause?.code ??
    (e as { code?: string })?.code
  return kode === '23505'
}

/**
 * Sanitasi di titik SIMPAN. Lapisan baca tetap menyanitasi lagi — itu melindungi
 * baris yang sudah telanjur tersimpan sebelum ini.
 */
async function bersihkan<T extends { bodyId: string; bodyEn: string }>(input: T): Promise<T> {
  const { sanitizeRichText } = await import('@/lib/sanitize')
  return { ...input, bodyId: sanitizeRichText(input.bodyId), bodyEn: sanitizeRichText(input.bodyEn) }
}

export const createDevotional = createServerFn({ method: 'POST' })
  .validator((d: unknown) => devotionalInputSchema.parse(d))
  .handler(async ({ data }): Promise<{ id: string }> => {
    await ensureAdmin()
    const { db } = await import('@/db')
    const { devotionals } = await import('@/db/schema')
    try {
      const [row] = await db
        .insert(devotionals)
        .values(await bersihkan(data))
        .returning({ id: devotionals.id })
      if (!row) throw new Error('Gagal menyimpan renungan')
      return { id: row.id }
    } catch (e) {
      if (slugBentrok(e)) throw new Error(DUPLICATE_SLUG, { cause: e })
      throw e
    }
  })

export const updateDevotional = createServerFn({ method: 'POST' })
  .validator((d: unknown) => z.object({ id: z.uuid() }).and(devotionalInputSchema).parse(d))
  .handler(async ({ data }): Promise<{ id: string }> => {
    await ensureAdmin()
    const { id, ...rest } = data
    const { db } = await import('@/db')
    const { devotionals } = await import('@/db/schema')
    const { eq } = await import('drizzle-orm')
    try {
      const [row] = await db
        .update(devotionals)
        .set({ ...(await bersihkan(rest)), updatedAt: new Date() })
        .where(eq(devotionals.id, id))
        .returning({ id: devotionals.id })
      if (!row) throw new Error('Renungan tidak ditemukan')
      return { id: row.id }
    } catch (e) {
      if (slugBentrok(e)) throw new Error(DUPLICATE_SLUG, { cause: e })
      throw e
    }
  })

export const deleteDevotional = createServerFn({ method: 'POST' })
  .validator((id: unknown) => z.uuid().parse(id))
  .handler(async ({ data: id }): Promise<{ ok: true }> => {
    await ensureAdmin()
    const { db } = await import('@/db')
    const { devotionals } = await import('@/db/schema')
    const { eq } = await import('drizzle-orm')
    await db.delete(devotionals).where(eq(devotionals.id, id))
    return { ok: true }
  })

export const setDevotionalStatus = createServerFn({ method: 'POST' })
  .validator((d: unknown) =>
    z.object({ id: z.uuid(), status: z.enum(['draft', 'published']) }).parse(d),
  )
  .handler(async ({ data }): Promise<{ ok: true }> => {
    await ensureAdmin()
    const { db } = await import('@/db')
    const { devotionals } = await import('@/db/schema')
    const { eq } = await import('drizzle-orm')
    await db
      .update(devotionals)
      .set({ status: data.status, updatedAt: new Date() })
      .where(eq(devotionals.id, data.id))
    return { ok: true }
  })

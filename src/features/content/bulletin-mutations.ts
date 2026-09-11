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

/** Buang tag dan entitas, sisakan teksnya — untuk menilai "benar-benar ada isinya". */
function teksSaja(html: string): string {
  return html
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/g, ' ')
    .trim()
}

/**
 * Body dari editor. Tiptap menghasilkan `<p></p>` atau `<p><br></p>` untuk
 * editor yang dikosongkan — secara teknis ada isinya, tapi bagi pembaca itu
 * kosong. Diperlakukan sebagai null supaya constraint `bulletin_has_content`
 * tidak lolos oleh markup hampa dan warta terbit tanpa isi.
 */
const badanOpsional = z
  .string()
  .optional()
  .transform((v) => (teksSaja(v ?? '') === '' ? null : (v ?? null)))

const urlOpsional = z
  .string()
  .optional()
  .transform((v) => (v?.trim() ? v.trim() : null))
  .refine((v) => v === null || /^https?:\/\//.test(v), {
    message: 'Alamat berkas harus diawali http:// atau https://',
  })

export const bulletinInputSchema = z
  .object({
    weekDate: tanggal,
    titleId: wajibIsi,
    titleEn: wajibIsi,
    summaryId: wajibIsi,
    summaryEn: wajibIsi,
    bodyId: badanOpsional,
    bodyEn: badanOpsional,
    pdfUrl: urlOpsional,
    status: z.enum(['draft', 'published']),
  })
  // Cermin constraint `bulletin_has_content` di database. Divalidasi di sini
  // supaya pengurus dapat kalimat yang bisa dipahami, bukan error constraint
  // mentah dari Postgres.
  .refine((v) => Boolean(v.pdfUrl ?? v.bodyId), {
    message: 'Warta butuh isi atau berkas PDF',
    path: ['bodyId'],
  })

export type BulletinInput = z.infer<typeof bulletinInputSchema>

/**
 * Sanitasi di titik SIMPAN, supaya yang tersimpan di database sudah bersih.
 *
 * Lapisan baca (`src/features/content/bulletins.ts`) tetap menyanitasi lagi —
 * itu melindungi baris yang sudah telanjur tersimpan sebelum ini, dan tetap jadi
 * lapis kedua kalau suatu hari ada jalur tulis yang lupa menyanitasi.
 */
async function bersihkan<T extends { bodyId: string | null; bodyEn: string | null }>(
  input: T,
): Promise<T> {
  const { sanitizeRichText } = await import('@/lib/sanitize')
  return {
    ...input,
    bodyId: input.bodyId === null ? null : sanitizeRichText(input.bodyId),
    bodyEn: input.bodyEn === null ? null : sanitizeRichText(input.bodyEn),
  }
}

export const createBulletin = createServerFn({ method: 'POST' })
  .validator((d: unknown) => bulletinInputSchema.parse(d))
  .handler(async ({ data }): Promise<{ id: string }> => {
    await ensureAdmin()
    const { db } = await import('@/db')
    const { bulletins } = await import('@/db/schema')
    const [row] = await db
      .insert(bulletins)
      .values(await bersihkan(data))
      .returning({ id: bulletins.id })
    if (!row) throw new Error('Gagal menyimpan warta')
    return { id: row.id }
  })

export const updateBulletin = createServerFn({ method: 'POST' })
  .validator((d: unknown) => z.object({ id: z.uuid() }).and(bulletinInputSchema).parse(d))
  .handler(async ({ data }): Promise<{ id: string }> => {
    await ensureAdmin()
    const { id, ...rest } = data
    const { db } = await import('@/db')
    const { bulletins } = await import('@/db/schema')
    const { eq } = await import('drizzle-orm')
    // `updatedAt` disetel eksplisit — Drizzle tidak melakukannya sendiri.
    const [row] = await db
      .update(bulletins)
      .set({ ...(await bersihkan(rest)), updatedAt: new Date() })
      .where(eq(bulletins.id, id))
      .returning({ id: bulletins.id })
    if (!row) throw new Error('Warta tidak ditemukan')
    return { id: row.id }
  })

export const deleteBulletin = createServerFn({ method: 'POST' })
  .validator((id: unknown) => z.uuid().parse(id))
  .handler(async ({ data: id }): Promise<{ ok: true }> => {
    await ensureAdmin()
    const { db } = await import('@/db')
    const { bulletins } = await import('@/db/schema')
    const { eq } = await import('drizzle-orm')
    await db.delete(bulletins).where(eq(bulletins.id, id))
    return { ok: true }
  })

export const setBulletinStatus = createServerFn({ method: 'POST' })
  .validator((d: unknown) =>
    z.object({ id: z.uuid(), status: z.enum(['draft', 'published']) }).parse(d),
  )
  .handler(async ({ data }): Promise<{ ok: true }> => {
    await ensureAdmin()
    const { db } = await import('@/db')
    const { bulletins } = await import('@/db/schema')
    const { eq } = await import('drizzle-orm')
    await db
      .update(bulletins)
      .set({ status: data.status, updatedAt: new Date() })
      .where(eq(bulletins.id, data.id))
    return { ok: true }
  })

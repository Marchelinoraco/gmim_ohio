import { z } from 'zod'
import { createServerFn } from '@tanstack/react-start'
import { ensureAdmin } from '@/lib/auth.functions'
import { youtubeId } from '@/lib/video'
import { adalahUrlBlob } from '@/lib/unggah'

const wajibIsi = z.string().trim().min(1, 'Wajib diisi')

/**
 * Teks opsional: string kosong, spasi belaka, `undefined`, dan `null` semuanya
 * disimpan sebagai NULL.
 *
 * `nullish()`, bukan `optional()`. Form mengirim `null` saat sampul atau caption
 * dikosongkan — bukan `undefined` — dan skema yang hanya menerima `undefined`
 * menolak album tanpa sampul, dengan galat yang muncul sebagai dump JSON Zod di
 * layar pengurus.
 */
const opsional = z
  .string()
  .trim()
  .nullish()
  .transform((v) => (v ? v : null))

export const albumInputSchema = z.object({
  titleId: wajibIsi,
  titleEn: wajibIsi,
  // Kolom `date` Postgres; formatnya dikunci di sini supaya galat datang dengan
  // pesan yang bisa dibaca, bukan dari driver saat menulis.
  albumDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Tanggal harus berformat YYYY-MM-DD'),
  coverImageUrl: opsional,
  sortOrder: z.number().int().min(0),
  status: z.enum(['draft', 'published']),
})

export type AlbumInput = z.infer<typeof albumInputSchema>

/**
 * Satu item galeri — gambar ATAU tautan YouTube.
 *
 * Dua kolom URL hidup berdampingan di tabel, jadi `superRefine` yang memastikan
 * yang terisi memang yang sesuai tipenya. Item gambar tanpa `imageUrl` merender
 * kotak kosong di galeri, dan item YouTube yang URL-nya tak terbaca menghasilkan
 * bingkai kosong — keduanya gagal DIAM, tanpa error apa pun yang terlihat
 * pengurus maupun jemaat.
 */
export const itemInputSchema = z
  .object({
    albumId: z.uuid(),
    type: z.enum(['image', 'youtube']),
    imageUrl: opsional,
    youtubeUrl: opsional,
    captionId: opsional,
    captionEn: opsional,
  })
  .superRefine((v, ctx) => {
    if (v.type === 'image' && !v.imageUrl) {
      ctx.addIssue({ code: 'custom', path: ['imageUrl'], message: 'Alamat gambar wajib diisi' })
    }
    if (v.type === 'youtube') {
      if (!v.youtubeUrl) {
        ctx.addIssue({ code: 'custom', path: ['youtubeUrl'], message: 'Tautan YouTube wajib diisi' })
      } else if (!youtubeId(v.youtubeUrl)) {
        // Divalidasi memakai fungsi yang SAMA dengan yang merender embed-nya.
        ctx.addIssue({ code: 'custom', path: ['youtubeUrl'], message: 'Tautan YouTube tidak dikenali' })
      }
    }
  })

export type ItemInput = z.infer<typeof itemInputSchema>

/**
 * Urutan baru satu album.
 *
 * Id kembar ditolak: dua baris berebut satu posisi menghasilkan urutan yang
 * berubah sendiri setiap kali halaman dimuat ulang.
 */
export const urutanSchema = z.object({
  albumId: z.uuid(),
  ids: z
    .array(z.uuid())
    .min(1)
    .refine((v) => new Set(v).size === v.length, 'Ada id yang kembar'),
})

export const createAlbum = createServerFn({ method: 'POST' })
  .validator((d: unknown) => albumInputSchema.parse(d))
  .handler(async ({ data }): Promise<{ id: string }> => {
    await ensureAdmin()
    const { db } = await import('@/db')
    const { galleryAlbums } = await import('@/db/schema')
    const [row] = await db.insert(galleryAlbums).values(data).returning({ id: galleryAlbums.id })
    if (!row) throw new Error('Gagal menyimpan album')
    return { id: row.id }
  })

export const updateAlbum = createServerFn({ method: 'POST' })
  .validator((d: unknown) => albumInputSchema.extend({ id: z.uuid() }).parse(d))
  .handler(async ({ data }): Promise<{ ok: true }> => {
    await ensureAdmin()
    const { id, ...rest } = data
    const { db } = await import('@/db')
    const { galleryAlbums } = await import('@/db/schema')
    const { eq } = await import('drizzle-orm')
    await db
      .update(galleryAlbums)
      .set({ ...rest, updatedAt: new Date() })
      .where(eq(galleryAlbums.id, id))
    return { ok: true }
  })

export const setAlbumStatus = createServerFn({ method: 'POST' })
  .validator((d: unknown) =>
    z.object({ id: z.uuid(), status: z.enum(['draft', 'published']) }).parse(d),
  )
  .handler(async ({ data }): Promise<{ ok: true }> => {
    await ensureAdmin()
    const { db } = await import('@/db')
    const { galleryAlbums } = await import('@/db/schema')
    const { eq } = await import('drizzle-orm')
    await db
      .update(galleryAlbums)
      .set({ status: data.status, updatedAt: new Date() })
      .where(eq(galleryAlbums.id, data.id))
    return { ok: true }
  })

/**
 * Hapus berkas di Blob — tapi HANYA kalau berkasnya memang di sana.
 *
 * Ada dua jenis URL gambar di tabel ini: 18 foto seed menunjuk berkas statis
 * `/gallery/*.jpg` yang di-commit ke repo, foto baru menunjuk Vercel Blob.
 * Memanggil `del()` untuk yang pertama sia-sia; melewatkan yang kedua
 * meninggalkan berkas yatim yang terus dibayar selamanya.
 *
 * Galatnya ditelan dengan sengaja: berkas yang sudah lenyap tidak boleh
 * menggagalkan penghapusan barisnya. Baris yang tertinggal justru menampilkan
 * gambar rusak di situs publik — kerusakan yang lebih buruk daripada satu
 * berkas yatim.
 */
async function hapusBlobBilaPerlu(url: string | null) {
  if (!adalahUrlBlob(url)) return
  try {
    const { del } = await import('@vercel/blob')
    await del(url!)
  } catch (err) {
    console.error('[galeri] gagal menghapus blob:', url, err)
  }
}

export const addItem = createServerFn({ method: 'POST' })
  .validator((d: unknown) => itemInputSchema.parse(d))
  .handler(async ({ data }): Promise<{ id: string }> => {
    await ensureAdmin()
    const { db } = await import('@/db')
    const { galleryItems } = await import('@/db/schema')
    const { sql, eq } = await import('drizzle-orm')

    // Item baru selalu di urutan terakhir. `coalesce(max+1, 0)` dihitung di
    // database, bukan dari daftar yang sudah dimuat klien: dua penambahan yang
    // hampir bersamaan akan memberi nomor yang sama kalau dihitung di klien.
    const [row] = await db
      .insert(galleryItems)
      .values({
        ...data,
        sortOrder: sql`(select coalesce(max(${galleryItems.sortOrder}) + 1, 0) from ${galleryItems} where ${eq(galleryItems.albumId, data.albumId)})`,
      })
      .returning({ id: galleryItems.id })
    if (!row) throw new Error('Gagal menyimpan item')
    return { id: row.id }
  })

export const updateItem = createServerFn({ method: 'POST' })
  .validator((d: unknown) => itemInputSchema.extend({ id: z.uuid() }).parse(d))
  .handler(async ({ data }): Promise<{ ok: true }> => {
    await ensureAdmin()
    const { db } = await import('@/db')
    const { galleryItems } = await import('@/db/schema')
    const { eq } = await import('drizzle-orm')
    // Field disebut satu per satu, dan `albumId` sengaja TIDAK ikut:
    // memindahkan item antar-album bukan bagian dari alur ini, dan membiarkan
    // kolom itu bisa ditulis membuka jalan memindahkannya tanpa sengaja.
    await db
      .update(galleryItems)
      .set({
        type: data.type,
        imageUrl: data.imageUrl,
        youtubeUrl: data.youtubeUrl,
        captionId: data.captionId,
        captionEn: data.captionEn,
        updatedAt: new Date(),
      })
      .where(eq(galleryItems.id, data.id))
    return { ok: true }
  })

export const deleteItem = createServerFn({ method: 'POST' })
  .validator((id: unknown) => z.uuid().parse(id))
  .handler(async ({ data: id }): Promise<{ ok: true }> => {
    await ensureAdmin()
    const { db } = await import('@/db')
    const { galleryItems } = await import('@/db/schema')
    const { eq } = await import('drizzle-orm')

    const row = await db.query.galleryItems.findFirst({
      where: (i, { eq: e }) => e(i.id, id),
      columns: { imageUrl: true },
    })
    await db.delete(galleryItems).where(eq(galleryItems.id, id))
    await hapusBlobBilaPerlu(row?.imageUrl ?? null)
    return { ok: true }
  })

export const deleteAlbum = createServerFn({ method: 'POST' })
  .validator((id: unknown) => z.uuid().parse(id))
  .handler(async ({ data: id }): Promise<{ ok: true }> => {
    await ensureAdmin()
    const { db } = await import('@/db')
    const { galleryAlbums } = await import('@/db/schema')
    const { eq } = await import('drizzle-orm')

    // URL dikumpulkan SEBELUM barisnya hilang: FK `onDelete: 'cascade'` akan
    // menghapus seluruh item bersama albumnya, dan setelah itu tak ada lagi
    // jejak berkas mana yang perlu dibersihkan dari Blob.
    const album = await db.query.galleryAlbums.findFirst({
      where: (a, { eq: e }) => e(a.id, id),
      columns: { coverImageUrl: true },
      with: { items: { columns: { imageUrl: true } } },
    })
    const url = [album?.coverImageUrl ?? null, ...(album?.items ?? []).map((i) => i.imageUrl)]

    await db.delete(galleryAlbums).where(eq(galleryAlbums.id, id))
    for (const u of url) await hapusBlobBilaPerlu(u)
    return { ok: true }
  })

export const reorderItems = createServerFn({ method: 'POST' })
  .validator((d: unknown) => urutanSchema.parse(d))
  .handler(async ({ data }): Promise<{ ok: true }> => {
    await ensureAdmin()
    const { db } = await import('@/db')
    const { galleryItems } = await import('@/db/schema')
    const { and, eq } = await import('drizzle-orm')

    // Satu transaksi: urutan yang setengah tersimpan lebih buruk daripada
    // urutan lama, karena dua item bisa berakhir di posisi yang sama.
    await db.transaction(async (tx) => {
      for (const [i, id] of data.ids.entries()) {
        await tx
          .update(galleryItems)
          .set({ sortOrder: i, updatedAt: new Date() })
          .where(and(eq(galleryItems.id, id), eq(galleryItems.albumId, data.albumId)))
      }
    })
    return { ok: true }
  })

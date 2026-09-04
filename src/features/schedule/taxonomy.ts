import { createServerFn } from '@tanstack/react-start'
import type { kolom, worshipCategories } from '@/db/schema'

/**
 * Lapisan taksonomi untuk penjadwalan ibadah: kategori ibadah & kolom.
 *
 * `listCategories` mengembalikan semua kategori ibadah (6 baris di-seed, tidak
 * pernah dibuat lewat UI). `listKolom` mengembalikan kolom aktif yang boleh
 * dipilih waktu membuat jadwal. Tidak ada filter `status`; `listKolom` hanya
 * filter `isActive` sebab kolom tetap tersimpan saat di-nonaktifkan.
 *
 * `@/db` di-import lazy DI DALAM tiap handler supaya modul route yang memuat
 * server fn ini tidak ikut meng-evaluasi `@/lib/env` saat bundling.
 */

export type WorshipCategory = typeof worshipCategories.$inferSelect
export type Kolom = typeof kolom.$inferSelect

/** 6 kategori ibadah, urut `sortOrder`. Di-seed, tidak pernah dibuat lewat UI. */
export const listCategories = createServerFn({ method: 'GET' }).handler(
  async (): Promise<WorshipCategory[]> => {
    const { db } = await import('@/db')
    return db.query.worshipCategories.findMany({ orderBy: (c, { asc }) => [asc(c.sortOrder)] })
  },
)

/** Kolom aktif, urut nomor. */
export const listKolom = createServerFn({ method: 'GET' }).handler(async (): Promise<Kolom[]> => {
  const { db } = await import('@/db')
  return db.query.kolom.findMany({
    where: (k, { eq }) => eq(k.isActive, true),
    orderBy: (k, { asc }) => [asc(k.number)],
  })
})

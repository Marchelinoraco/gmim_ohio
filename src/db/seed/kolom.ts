import { kolom } from '@/db/schema'

// `@/db` di-import lazy di dalam `seedKolom()` — lihat catatan di `categories.ts`.

/**
 * Kolom (wilayah pelayanan) placeholder 1–4. Data riil diisi pengurus di
 * Rencana 3; di sini hanya cukup untuk merender daftar & relasi jadwal.
 */
export const PLACEHOLDER_KOLOM = [1, 2, 3, 4].map((n) => ({ name: `Kolom ${n}`, number: n }))

/**
 * Idempoten via guard "tabel kosong": hanya insert saat belum ada baris kolom
 * sama sekali, supaya edit pengurus tidak tertimpa saat seed di-run ulang.
 */
export async function seedKolom() {
  const { db } = await import('@/db')
  const existing = await db.$count(kolom)
  if (existing > 0) return existing
  await db.insert(kolom).values(PLACEHOLDER_KOLOM)
  return PLACEHOLDER_KOLOM.length
}

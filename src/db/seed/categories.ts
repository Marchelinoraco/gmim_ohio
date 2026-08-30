import { worshipCategories } from '@/db/schema'

// `@/db` (pool + validasi env) di-import lazy di dalam fungsi seed supaya
// konsumen yang cuma butuh konstanta `WORSHIP_CATEGORIES` (halaman Rencana 2,
// test) tidak ikut menarik koneksi database.

/**
 * 6 kategori ibadah GMIM Musafir. `key` = nilai enum `worship_category_key`
 * (skema Task 10); `color` = CSS custom property token (`--color-cat-*`) yang
 * dirender langsung di komponen. Urutan tampil = `sortOrder`.
 */
export const WORSHIP_CATEGORIES = [
  {
    key: 'ibadah_jemaat',
    nameId: 'Ibadah Jemaat',
    nameEn: 'Congregational Service',
    slug: 'ibadah-jemaat',
    color: 'var(--color-cat-jemaat)',
    sortOrder: 1,
  },
  {
    key: 'kaum_bapa',
    nameId: 'Pria/Kaum Bapa',
    nameEn: "Men's Fellowship",
    slug: 'kaum-bapa',
    color: 'var(--color-cat-bapa)',
    sortOrder: 2,
  },
  {
    key: 'kaum_ibu',
    nameId: 'Wanita/Kaum Ibu',
    nameEn: "Women's Fellowship",
    slug: 'kaum-ibu',
    color: 'var(--color-cat-ibu)',
    sortOrder: 3,
  },
  {
    key: 'pemuda_remaja',
    nameId: 'Pemuda & Remaja',
    nameEn: 'Youth & Teens',
    slug: 'pemuda-remaja',
    color: 'var(--color-cat-pemuda)',
    sortOrder: 4,
  },
  {
    key: 'sekolah_minggu',
    nameId: 'Anak Sekolah Minggu',
    nameEn: 'Sunday School',
    slug: 'sekolah-minggu',
    color: 'var(--color-cat-sekolah-minggu)',
    sortOrder: 5,
  },
  {
    key: 'kolom',
    nameId: 'Kolom',
    nameEn: 'Kolom (Zone)',
    slug: 'kolom',
    color: 'var(--color-cat-kolom)',
    sortOrder: 6,
  },
] as const

/**
 * Idempoten: `onConflictDoUpdate` pada `worship_categories.key` (unik). Re-run
 * menyelaraskan nama/slug/warna/urutan tanpa menyentuh `id` atau relasi jadwal.
 */
export async function seedCategories() {
  const { db } = await import('@/db')
  for (const c of WORSHIP_CATEGORIES) {
    await db
      .insert(worshipCategories)
      .values(c)
      .onConflictDoUpdate({
        target: worshipCategories.key,
        set: {
          nameId: c.nameId,
          nameEn: c.nameEn,
          slug: c.slug,
          color: c.color,
          sortOrder: c.sortOrder,
        },
      })
  }
  return WORSHIP_CATEGORIES.length
}

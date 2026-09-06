/**
 * `<CategoryBadge>` — pil warna kategori ibadah (mis. "Kaum Bapa", "Sekolah Minggu").
 *
 * `category.color` di DB adalah string CSS var mentah (`var(--color-cat-jemaat)`),
 * BUKAN kelas Tailwind — Tailwind tak bisa membuat kelas dari string runtime, jadi
 * warnanya diset lewat `style` inline. Ini SATU-SATUNYA pengecualian terdokumentasi
 * terhadap aturan "token utility saja"; kelas Tailwind tetap dipakai untuk bentuk/
 * tata letak/warna teks.
 *
 * Keenam token `--color-cat-*` sudah divalidasi WCAG AA terhadap `text-surface` di
 * KEDUA tema (Rencana 1 Task 8b) — jangan ganti pasangan warna ini.
 */

export type CategoryBadgeCategory = {
  nameId: string
  nameEn: string
  color: string
}

export function CategoryBadge({
  category,
  locale,
}: {
  category: CategoryBadgeCategory
  locale: 'id' | 'en'
}) {
  return (
    <span
      // `w-fit` WAJIB: di dalam flex-column (mis. `CardHeader` pada kartu
      // `/pelayanan`) default `align-items: stretch` membuat pil ini melar
      // selebar kartu dan terbaca seperti bilah rusak, bukan badge.
      className="text-surface inline-flex w-fit items-center rounded-full px-2.5 py-0.5 text-xs font-semibold"
      style={{ backgroundColor: category.color }}
    >
      {locale === 'id' ? category.nameId : category.nameEn}
    </span>
  )
}

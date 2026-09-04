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
      className="text-surface inline-flex items-center rounded px-2 py-0.5 text-xs font-semibold"
      style={{ backgroundColor: category.color }}
    >
      {locale === 'id' ? category.nameId : category.nameEn}
    </span>
  )
}

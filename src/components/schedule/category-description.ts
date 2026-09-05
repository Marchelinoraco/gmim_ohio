import * as m from '@/paraglide/messages'
import type { WorshipCategory } from '@/features/schedule/taxonomy'

/**
 * Deskripsi singkat tiap kategori ibadah (spec §5.5) — hidup di katalog i18n,
 * BUKAN di DB. Sumber TUNGGAL dipakai bersama `/pelayanan` (kartu indeks) dan
 * `/pelayanan/$slug` (subtitle `<PageHero>`, Task 11) — jangan duplikasi
 * literalnya di kedua tempat.
 *
 * Pemetaan `category.key` → pesan ditulis eksplisit (bukan template string
 * dinamis) karena Paraglide meng-compile satu fungsi per kunci pesan; kunci
 * dinamis (`m[\`pelayanan_desc_${key}\`]`) tak bisa di-resolve compiler-nya.
 */
export const CATEGORY_DESCRIPTIONS = {
  ibadah_jemaat: () => m.pelayanan_desc_ibadah_jemaat(),
  kaum_bapa: () => m.pelayanan_desc_kaum_bapa(),
  kaum_ibu: () => m.pelayanan_desc_kaum_ibu(),
  pemuda_remaja: () => m.pelayanan_desc_pemuda_remaja(),
  sekolah_minggu: () => m.pelayanan_desc_sekolah_minggu(),
  kolom: () => m.pelayanan_desc_kolom(),
} as const satisfies Record<WorshipCategory['key'], () => string>

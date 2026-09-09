import { datesForWeekday } from '@/lib/datetime'

export type PlanTemplate = {
  id: string
  categoryId: string
  categoryKey: string
  dayOfWeek: number
  startTime: string
  endTime: string | null
  defaultLocationType: 'gedung_gereja' | 'rumah'
}

export type PlanKolom = { id: string }

export type PlanInput = {
  templates: PlanTemplate[]
  kolomAktif: PlanKolom[]
  from: string
  to: string
}

export type PlannedService = {
  templateId: string
  categoryId: string
  kolomId: string | null
  serviceDate: string
  startTime: string
  endTime: string | null
  locationType: 'gedung_gereja' | 'rumah'
  status: 'draft'
}

/**
 * Menghitung ibadah apa saja yang SEHARUSNYA ada dalam sebuah rentang, tanpa
 * menyentuh database sama sekali. Dipisah begitu supaya seluruh perilaku yang
 * sulit — fan-out kolom, batas rentang, pewarisan jam — bisa diuji tanpa
 * Postgres, dan supaya lapisan penyimpanannya tinggal memanggil ini.
 *
 * Hasilnya SELALU `draft`. Generator tidak pernah menerbitkan apa pun: pengurus
 * meninjau lebih dulu, dan itu satu-satunya hal yang memisahkan "alat bantu"
 * dari "sesuatu yang mengumumkan ibadah karangan ke jemaat".
 *
 * Idempotensi BUKAN urusan fungsi ini — ia hanya menghitung. Penyaringan
 * duplikat terjadi di lapisan penyimpanan lewat `onConflictDoNothing` di atas
 * `ws_template_date_uq`, yang sejak migrasi 0005 memperlakukan `kolom_id` NULL
 * sebagai sama.
 */
export function planServices({ templates, kolomAktif, from, to }: PlanInput): PlannedService[] {
  const out: PlannedService[] = []

  for (const tpl of templates) {
    for (const serviceDate of datesForWeekday(from, to, tpl.dayOfWeek)) {
      // Kategori `kolom` menghasilkan satu ibadah PER kolom aktif; kategori lain
      // satu per tanggal. Tanpa kolom aktif, kategori kolom tidak menghasilkan
      // apa pun — lebih baik kosong daripada satu ibadah tanpa tuan rumah.
      const targets: (string | null)[] =
        tpl.categoryKey === 'kolom' ? kolomAktif.map((k) => k.id) : [null]

      for (const kolomId of targets) {
        out.push({
          templateId: tpl.id,
          categoryId: tpl.categoryId,
          kolomId,
          serviceDate,
          startTime: tpl.startTime,
          endTime: tpl.endTime,
          locationType: tpl.defaultLocationType,
          status: 'draft',
        })
      }
    }
  }

  return out
}

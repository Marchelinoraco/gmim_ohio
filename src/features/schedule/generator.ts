import { z } from 'zod'
import { createServerFn } from '@tanstack/react-start'
import { datesForWeekday } from '@/lib/datetime'
import { ensureAdmin } from '@/lib/auth.functions'

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

export type GenerationPreview = {
  total: number
  perKategori: { nama: string; jumlah: number }[]
  from: string
  to: string
}

const rentangSchema = z
  .object({
    from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  })
  .refine((v) => v.to >= v.from, {
    message: 'Tanggal akhir harus setelah tanggal mulai',
    path: ['to'],
  })
  // Rentang terbuka lebar akan menghasilkan ribuan baris draf yang harus
  // ditinjau satu per satu. Setahun sudah jauh melampaui kebutuhan nyata.
  .refine((v) => Date.parse(v.to) - Date.parse(v.from) <= 366 * 86_400_000, {
    message: 'Rentang maksimal satu tahun',
    path: ['to'],
  })

/** Template aktif + kolom aktif, dibaca sekali dan dipakai bersama pratinjau & penerap. */
async function muatBahan() {
  const { db } = await import('@/db')
  const templates = await db.query.scheduleTemplates.findMany({
    where: (t, { eq }) => eq(t.isActive, true),
    with: { category: { columns: { key: true } } },
  })
  const kolomAktif = await db.query.kolom.findMany({
    where: (k, { eq }) => eq(k.isActive, true),
    columns: { id: true },
  })
  return {
    templates: templates.map((t) => ({
      id: t.id,
      categoryId: t.categoryId,
      categoryKey: t.category.key,
      dayOfWeek: t.dayOfWeek,
      startTime: t.startTime,
      endTime: t.endTime,
      defaultLocationType: t.defaultLocationType,
    })),
    kolomAktif,
  }
}

/**
 * Menghitung apa yang AKAN dibuat, tanpa menulis apa pun. Pengurus melihat ini
 * lebih dulu — generator yang langsung menulis adalah generator yang suatu hari
 * mengisi situs dengan ratusan ibadah yang tak seorang pun minta.
 *
 * Angka di sini adalah batas ATAS: baris yang sudah ada akan disaring
 * `onConflictDoNothing` saat diterapkan, jadi jumlah yang benar-benar dibuat
 * bisa lebih kecil. `applyGeneration` mengembalikan jumlah sungguhannya.
 */
export const previewGeneration = createServerFn({ method: 'GET' })
  .validator((d: unknown) => rentangSchema.parse(d))
  .handler(async ({ data }): Promise<GenerationPreview> => {
    await ensureAdmin()
    const { db } = await import('@/db')
    const { templates, kolomAktif } = await muatBahan()
    const rencana = planServices({ templates, kolomAktif, from: data.from, to: data.to })

    const cats = await db.query.worshipCategories.findMany({ columns: { id: true, nameId: true } })
    const namaById = new Map(cats.map((c) => [c.id, c.nameId]))
    const hitung = new Map<string, number>()
    for (const s of rencana) {
      const nama = namaById.get(s.categoryId) ?? s.categoryId
      hitung.set(nama, (hitung.get(nama) ?? 0) + 1)
    }

    return {
      total: rencana.length,
      perKategori: [...hitung]
        .map(([nama, jumlah]) => ({ nama, jumlah }))
        .sort((a, b) => a.nama.localeCompare(b.nama)),
      from: data.from,
      to: data.to,
    }
  })

/**
 * Menulis rencana ke database, INKREMENTAL.
 *
 * `onConflictDoNothing` di atas `ws_template_date_uq` yang menjamin baris yang
 * sudah ada tidak tersentuh — termasuk baris yang sudah disunting pengurus.
 * Inilah beda intinya dari jalur `DELETE FROM worship_services` yang dipakai
 * sampai Rencana 3a, yang handoff 2b §3 peringatkan akan menghapus editan
 * pengurus begitu dashboard ada.
 *
 * Constraint itu baru benar-benar melindungi lima kategori non-kolom sejak
 * migrasi 0005 memperkuatnya jadi NULLS NOT DISTINCT.
 */
export const applyGeneration = createServerFn({ method: 'POST' })
  .validator((d: unknown) => rentangSchema.parse(d))
  .handler(async ({ data }): Promise<{ dibuat: number }> => {
    await ensureAdmin()
    const { db } = await import('@/db')
    const { worshipServices } = await import('@/db/schema')
    const { templates, kolomAktif } = await muatBahan()
    const rencana = planServices({ templates, kolomAktif, from: data.from, to: data.to })
    if (rencana.length === 0) return { dibuat: 0 }

    const inserted = await db
      .insert(worshipServices)
      .values(rencana)
      .onConflictDoNothing()
      .returning({ id: worshipServices.id })

    return { dibuat: inserted.length }
  })

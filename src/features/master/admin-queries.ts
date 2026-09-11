import { createServerFn } from '@tanstack/react-start'
import { ensureAdmin } from '@/lib/auth.functions'

/**
 * Nilai JSON apa adanya.
 *
 * `unknown` ditolak batas server fn — ia tak bisa membuktikan nilainya bisa
 * diserialisasi. Kolom `site_settings.value` bertipe `jsonb`, jadi isinya
 * memang selalu JSON; tipe ini menyatakan fakta itu alih-alih memaksakannya
 * lewat cast.
 */
export type JsonValue = string | number | boolean | null | JsonValue[] | { [k: string]: JsonValue }

export type AdminCategoryRow = {
  id: string
  key: string
  nameId: string
  nameEn: string
  slug: string
  color: string
  sortOrder: number
}

export type AdminKolomRow = {
  id: string
  name: string
  number: number
  coordinatorName: string | null
  coordinatorPhone: string | null
  isActive: boolean
}

export type AdminMessageRow = {
  id: string
  name: string
  email: string
  phone: string | null
  message: string
  status: 'new' | 'read' | 'done'
  createdAt: string
}

/**
 * Keenam kategori ibadah untuk dashboard.
 *
 * `ensureAdmin()` dipanggil di sini, bukan hanya di route: route yang dijaga
 * tidak menghalangi siapa pun memanggil server fn ini langsung lewat HTTP.
 */
export const listCategoriesForAdmin = createServerFn({ method: 'GET' }).handler(
  async (): Promise<AdminCategoryRow[]> => {
    await ensureAdmin()
    const { db } = await import('@/db')
    return db.query.worshipCategories.findMany({
      orderBy: (c, { asc }) => [asc(c.sortOrder)],
      columns: {
        id: true,
        key: true,
        nameId: true,
        nameEn: true,
        slug: true,
        color: true,
        sortOrder: true,
      },
    })
  },
)

/**
 * Seluruh kolom, termasuk yang nonaktif.
 *
 * Sengaja TIDAK memfilter `isActive`: dashboard perlu melihat kolom nonaktif
 * untuk bisa mengaktifkannya kembali. Daftar publiklah yang memfilter — kalau
 * query ini ikut memfilter, kolom yang dinonaktifkan akan lenyap dari dashboard
 * dan tak ada jalan menghidupkannya lagi selain lewat SQL.
 */
export const listKolomForAdmin = createServerFn({ method: 'GET' }).handler(
  async (): Promise<AdminKolomRow[]> => {
    await ensureAdmin()
    const { db } = await import('@/db')
    return db.query.kolom.findMany({
      orderBy: (k, { asc }) => [asc(k.number)],
      columns: {
        id: true,
        name: true,
        number: true,
        coordinatorName: true,
        coordinatorPhone: true,
        isActive: true,
      },
    })
  },
)

/**
 * Nilai mentah ketujuh setting, di-key dengan key DB.
 *
 * Sengaja mentah (belum lewat `parseSiteSettings`): form perlu menampilkan apa
 * yang BENAR-BENAR tersimpan, termasuk bila bentuknya rusak. Mengembalikan hasil
 * parse akan menyembunyikan kerusakan di balik nilai default, dan pengurus tidak
 * akan pernah tahu ada yang perlu dibetulkan.
 */
export const getSettingsForAdmin = createServerFn({ method: 'GET' }).handler(
  async (): Promise<Record<string, JsonValue>> => {
    await ensureAdmin()
    const { db } = await import('@/db')
    const rows = await db.query.siteSettings.findMany({ columns: { key: true, value: true } })
    return Object.fromEntries(rows.map((r) => [r.key, r.value as JsonValue]))
  },
)

/**
 * Pesan yang masuk lewat form kontak, terbaru dulu.
 *
 * `limit: 500` dengan alasan yang sama seperti `listServicesForAdmin`: satu
 * halaman tidak boleh menarik seluruh tabel setelah bertahun-tahun pesan
 * menumpuk.
 */
export const listMessagesForAdmin = createServerFn({ method: 'GET' }).handler(
  async (): Promise<AdminMessageRow[]> => {
    await ensureAdmin()
    const { db } = await import('@/db')
    const rows = await db.query.contactMessages.findMany({
      orderBy: (msg, { desc }) => [desc(msg.createdAt)],
      limit: 500,
    })
    return rows.map((r) => ({
      id: r.id,
      name: r.name,
      email: r.email,
      phone: r.phone,
      message: r.message,
      status: r.status,
      // Date tidak selamat melewati batas server fn dengan utuh; ISO string
      // menyeberang apa adanya dan diformat di klien sesuai locale aktif.
      createdAt: r.createdAt.toISOString(),
    }))
  },
)

# Rencana 3d — Master Data & Pesan Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Pengurus bisa mengisi sendiri data yang hari ini kosong atau placeholder — email, telepon, jam kantor, rekening persembahan, koordinator kolom, nama kategori — dan membaca pesan yang masuk dari form kontak.

**Architecture:** Schema Zod ketujuh `site_settings` sudah ada dan dipakai jalur baca; plan ini mengeksposnya supaya jalur tulis memakai schema yang SAMA, bukan salinan yang bisa menyimpang. Di atasnya, satu file mutasi per domain dengan pola `ensureAdmin() → validasi Zod → tulis`, lalu tiga halaman admin.

**Tech Stack:** TanStack Start (React 19), Drizzle ORM + Postgres (Neon), Zod v4, Tailwind CSS v4, shadcn/ui, Vitest, Playwright.

**Spec:** `docs/superpowers/specs/2026-09-07-rencana-3-admin-dashboard.md` (§Fase 5)

## Global Constraints

- **Token saja** — tanpa class `dark:`, tanpa hex literal di komponen. Satu pengecualian terdokumentasi: `style={{ backgroundColor: category.color }}` di `<CategoryBadge>`.
- **Benar di kedua tema** — semua pasangan teks/latar ≥ WCAG AA.
- **Dwibahasa** — tiap kunci UI ada di `messages/id.json` DAN `messages/en.json`, nama kunci identik.
- `src/components/ui/**` prettier-ignored.
- **Bahasa komentar & commit: Indonesia.**
- **Gerbang hijau tiap task**: `pnpm lint`, `pnpm typecheck`, `pnpm build`, `pnpm test` (baseline **242** unit), `pnpm test:e2e` (baseline **142** lulus + 6 skipped).
- **Jangan pernah menjalankan dua `pnpm test:e2e` bersamaan** — `reuseExistingServer` membuat run tumpang tindih menghasilkan kegagalan palsu. Bersihkan dengan `lsof -ti:3000` kalau ragu.
- **Tiap route admin baru**: taruh di bawah `admin._app`, panggil `ensureAdmin()` di server fn-nya, DAN tambahkan path-nya ke daftar gerbang di `tests/e2e/admin.spec.ts`.
- **Halaman daftar dinamai `.index.tsx`** — sebagai `<nama>.tsx` ia menjadi PARENT bagi anak-anaknya, dan tanpa `<Outlet/>` halaman anak tidak muncul sama sekali sementara typecheck, lint, dan build tetap hijau. Terjadi nyata di Rencana 3b.
- **`DATABASE_URL` menunjuk database yang melayani situs live.**

---

## Keadaan yang diverifikasi sebelum plan ini disusun

| Fakta | Konsekuensi untuk plan |
|---|---|
| `worship_categories.key` adalah **pgEnum** enam nilai | Kategori **tidak bisa ditambah atau dihapus** — hanya nama, warna, dan urutan yang bisa diubah. Tidak ada tombol "Tambah Kategori". |
| `color` menyimpan `var(--color-cat-*)`, bukan hex | Form memakai **select** enam token, bukan color picker. Hex di kolom itu memutus tema gelap. |
| Schema Zod ketujuh setting sudah ada di `src/features/content/site-settings.ts` (`SCHEMAS`, belum diekspor) | Jalur tulis memakai schema yang sama — Task 1. |
| `contact_messages` **kosong** | Halaman pesan mulai dari empty state; e2e harus mengirim form kontak publik lebih dulu untuk punya data. |
| `contact_info.phone`/`email`/`officeHours*` string kosong | `/kunjungi` menyembunyikan barisnya. Ini yang plan ini bikin bisa diisi. |
| `kolom` 1–4 tanpa koordinator | Sama. |

---

## File Structure

| File | Tanggung jawab |
|---|---|
| `src/features/content/site-settings.ts` (modify) | Ekspor `SCHEMAS` sebagai `SETTING_SCHEMAS` |
| `src/db/schema/worship.ts` (modify) | Ekspor `CATEGORY_COLOR_TOKENS` |
| `tests/unit/master-validation.test.ts` (create) | Uji validasi kategori, kolom, dan setting |
| `src/features/master/admin-queries.ts` (create) | Baca kategori, kolom, settings, pesan |
| `src/features/master/mutations.ts` (create) | CRUD kategori, kolom, setting, status pesan |
| `src/routes/admin._app.master.index.tsx` (create) | Halaman kategori + kolom |
| `src/routes/admin._app.pengaturan.index.tsx` (create) | Tujuh form `site_settings` |
| `src/routes/admin._app.pesan.index.tsx` (create) | Daftar pesan + ubah status |
| `src/components/admin/setting-forms.tsx` (create) | Tujuh form kecil, satu per kunci |
| `tests/e2e/admin-master.spec.ts` (create) | Alur end-to-end |
| `messages/{id,en}.json` (modify) | Kunci UI |

---

## Task 1: Satu sumber untuk validasi setting & warna kategori

Dua daftar yang saat ini hidup di satu tempat dan akan dipakai di tempat lain. Keduanya diekspor lebih dulu, dengan test yang menjaganya tidak menyimpang — pola yang sama dengan `ALLOWED_TAGS` di Rencana 3c.

**Files:**
- Modify: `src/features/content/site-settings.ts`
- Modify: `src/db/schema/worship.ts`
- Test: `tests/unit/master-validation.test.ts`

**Interfaces:**
- Consumes: —
- Produces: `SETTING_SCHEMAS: Record<SiteSettingsKey, z.ZodType>` dari `@/features/content/site-settings`; `CATEGORY_COLOR_TOKENS: readonly string[]` dari `@/db/schema/worship`.

- [ ] **Step 1: Tulis test yang gagal**

Buat `tests/unit/master-validation.test.ts`:

```ts
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, it, expect } from 'vitest'
import { SETTING_SCHEMAS, SITE_SETTINGS_KEYS } from '@/features/content/site-settings'
import { CATEGORY_COLOR_TOKENS } from '@/db/schema/worship'

const CSS = readFileSync(fileURLToPath(new URL('../../src/styles/app.css', import.meta.url)), 'utf8')

describe('SETTING_SCHEMAS', () => {
  it('punya schema untuk SETIAP kunci setting', () => {
    for (const key of SITE_SETTINGS_KEYS) {
      expect(SETTING_SCHEMAS[key]).toBeDefined()
    }
  })

  // Jalur tulis memakai schema yang sama dengan jalur baca. Kalau salah satu
  // kunci tak punya schema, mutasinya akan menulis apa pun tanpa diperiksa.
  it('menolak bentuk yang salah untuk contact_info', () => {
    const r = SETTING_SCHEMAS.contact_info.safeParse({ phone: 123 })
    expect(r.success).toBe(false)
  })

  it('menerima bentuk yang benar untuk contact_info', () => {
    const r = SETTING_SCHEMAS.contact_info.safeParse({
      phone: '+1 614 000 0000',
      email: 'a@b.test',
      officeHoursId: 'Senin–Jumat',
      officeHoursEn: 'Mon–Fri',
      mapsUrl: 'https://maps.google.com/?q=x',
      lat: null,
      lng: null,
    })
    expect(r.success).toBe(true)
  })

  it('menerima giving_info dengan daftar rekening', () => {
    const r = SETTING_SCHEMAS.giving_info.safeParse({
      accounts: [{ bank: 'Bank A', number: '123', holder: 'GMIM Musafir' }],
      noteId: 'catatan',
      noteEn: 'note',
    })
    expect(r.success).toBe(true)
  })
})

describe('CATEGORY_COLOR_TOKENS', () => {
  it('berisi enam token, satu per kategori', () => {
    expect(CATEGORY_COLOR_TOKENS).toHaveLength(6)
  })

  it('semuanya berbentuk var(--color-cat-*)', () => {
    for (const t of CATEGORY_COLOR_TOKENS) {
      expect(t).toMatch(/^var\(--color-cat-[a-z-]+\)$/)
    }
  })

  // Token yang tidak ada di app.css akan membuat badge kategori kehilangan
  // warnanya — dan gagalnya diam, karena CSS variable yang tak dikenal hanya
  // menghasilkan nilai kosong tanpa error apa pun.
  it('setiap token benar-benar terdefinisi di app.css', () => {
    for (const t of CATEGORY_COLOR_TOKENS) {
      const nama = t.slice('var('.length, -1)
      expect(CSS, `${nama} tidak ada di app.css`).toContain(`${nama}:`)
    }
  })
})
```

- [ ] **Step 2: Jalankan test — pastikan GAGAL**

Run: `pnpm test tests/unit/master-validation.test.ts`
Expected: FAIL — `SETTING_SCHEMAS` dan `CATEGORY_COLOR_TOKENS` belum diekspor.

- [ ] **Step 3: Ekspor `SETTING_SCHEMAS`**

Di `src/features/content/site-settings.ts`, ubah deklarasi `const SCHEMAS` jadi diekspor dengan nama yang jelas dari luar modul, dan pertahankan pemakaian internalnya:

```ts
/**
 * Peta key DB (snake_case) → schema Zod-nya. Satu-satunya tempat pasangan
 * key→schema didefinisikan; `parseSiteSettings` (ketat) dan `parseSiteSettingsSafe`
 * (tahan-banting) sama-sama membacanya lewat `buildSiteSettings` — jadi tak ada
 * dua salinan literal objek yang bisa lepas sinkron.
 *
 * Diekspor supaya jalur TULIS dashboard memakai schema yang sama persis dengan
 * jalur baca. Kalau keduanya disalin terpisah, form bisa menyimpan bentuk yang
 * lolos validasinya sendiri tapi ditolak saat dibaca halaman publik — dan
 * kerusakannya baru terlihat oleh pengunjung, bukan oleh pengurus.
 */
export const SETTING_SCHEMAS = {
  hero: heroSchema,
  service_times: serviceTimesSchema,
  contact_info: contactInfoSchema,
  social_links: socialLinksSchema,
  pastoral_contacts: pastoralContactsSchema,
  live_stream: liveStreamSchema,
  giving_info: givingInfoSchema,
} satisfies Record<SiteSettingsKey, z.ZodType>
```

Lalu ganti seluruh pemakaian `SCHEMAS` di file itu menjadi `SETTING_SCHEMAS`. Jangan menyisakan dua konstanta — cari dengan `grep -n "SCHEMAS" src/features/content/site-settings.ts` dan pastikan hanya satu nama yang tersisa.

- [ ] **Step 4: Ekspor `CATEGORY_COLOR_TOKENS`**

Di `src/db/schema/worship.ts`, tambahkan tepat di bawah `worshipCategoryKey`:

```ts
/**
 * Token warna yang boleh disimpan di `worship_categories.color`.
 *
 * Kolom itu menyimpan NAMA TOKEN CSS, bukan hex — supaya badge kategori ikut
 * bertukar warna saat tema berganti. Menyimpan hex ke sana memutus tema gelap
 * secara diam-diam: badge tetap memakai warna terang di atas latar gelap.
 *
 * Urutannya sejajar `worshipCategoryKey` di atas. Dipakai form admin sebagai
 * daftar pilihan, jadi token yang tidak ada di sini tidak akan pernah bisa
 * dipilih — lebih kuat daripada memvalidasi teks bebas setelahnya.
 */
export const CATEGORY_COLOR_TOKENS = [
  'var(--color-cat-jemaat)',
  'var(--color-cat-bapa)',
  'var(--color-cat-ibu)',
  'var(--color-cat-pemuda)',
  'var(--color-cat-sekolah-minggu)',
  'var(--color-cat-kolom)',
] as const
```

- [ ] **Step 5: Jalankan test — pastikan LULUS**

Run: `pnpm test tests/unit/master-validation.test.ts`
Expected: PASS (7 test).

- [ ] **Step 6: Gerbang + commit**

```bash
pnpm lint && pnpm typecheck && pnpm test && pnpm build
git add src/features/content/site-settings.ts src/db/schema/worship.ts tests/unit/master-validation.test.ts
git commit -m "Ekspor SETTING_SCHEMAS & CATEGORY_COLOR_TOKENS sebagai satu sumber

Schema ketujuh site_settings sudah ada dan dipakai jalur baca; mengeksposnya
membuat jalur tulis memakai schema yang SAMA. Kalau keduanya disalin terpisah,
form bisa menyimpan bentuk yang lolos validasinya sendiri tapi ditolak saat
dibaca halaman publik — dan kerusakannya baru terlihat oleh pengunjung.

worship_categories.color menyimpan nama token CSS, bukan hex, supaya badge
ikut bertukar warna saat tema berganti. Daftar token diekspor supaya form
admin memakainya sebagai pilihan, bukan teks bebas. Test memverifikasi tiap
token benar-benar ada di app.css — token yang tak terdefinisi membuat badge
kehilangan warna tanpa error apa pun."
```

---

## Task 2: Query admin master data

**Files:**
- Create: `src/features/master/admin-queries.ts`

**Interfaces:**
- Consumes: `ensureAdmin`.
- Produces:
  - `listCategoriesForAdmin(): Promise<AdminCategoryRow[]>` — `{ id, key, nameId, nameEn, slug, color, sortOrder }`
  - `listKolomForAdmin(): Promise<AdminKolomRow[]>` — `{ id, name, number, coordinatorName, coordinatorPhone, isActive }`
  - `getSettingsForAdmin(): Promise<Record<string, unknown>>` — peta key DB → nilai mentah
  - `listMessagesForAdmin(): Promise<AdminMessageRow[]>` — `{ id, name, email, phone, message, status, createdAt }`

- [ ] **Step 1: Tulis modulnya**

Buat `src/features/master/admin-queries.ts`:

```ts
import { createServerFn } from '@tanstack/react-start'
import { ensureAdmin } from '@/lib/auth.functions'

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

export const listKolomForAdmin = createServerFn({ method: 'GET' }).handler(
  async (): Promise<AdminKolomRow[]> => {
    await ensureAdmin()
    const { db } = await import('@/db')
    // TIDAK memfilter `isActive`: dashboard perlu melihat yang nonaktif untuk
    // bisa mengaktifkannya kembali. `listKolom` publik yang memfilter.
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
  async (): Promise<Record<string, unknown>> => {
    await ensureAdmin()
    const { db } = await import('@/db')
    const rows = await db.query.siteSettings.findMany({ columns: { key: true, value: true } })
    return Object.fromEntries(rows.map((r) => [r.key, r.value]))
  },
)

export const listMessagesForAdmin = createServerFn({ method: 'GET' }).handler(
  async (): Promise<AdminMessageRow[]> => {
    await ensureAdmin()
    const { db } = await import('@/db')
    const rows = await db.query.contactMessages.findMany({
      orderBy: (m, { desc }) => [desc(m.createdAt)],
      limit: 500,
    })
    return rows.map((r) => ({
      id: r.id,
      name: r.name,
      email: r.email,
      phone: r.phone,
      message: r.message,
      status: r.status,
      createdAt: r.createdAt.toISOString(),
    }))
  },
)
```

- [ ] **Step 2: Gerbang + commit**

```bash
pnpm lint && pnpm typecheck && pnpm test && pnpm build
git add src/features/master/admin-queries.ts
git commit -m "Tambah query master data untuk dashboard

listKolomForAdmin sengaja TIDAK memfilter isActive: dashboard perlu melihat
kolom nonaktif untuk bisa mengaktifkannya kembali. listKolom publik yang
memfilter.

getSettingsForAdmin mengembalikan nilai MENTAH, bukan hasil parseSiteSettings.
Form perlu menampilkan apa yang benar-benar tersimpan, termasuk bila bentuknya
rusak — hasil parse akan menyembunyikan kerusakan di balik nilai default dan
pengurus tidak akan pernah tahu ada yang perlu dibetulkan."
```

---

## Task 3: Mutasi kategori & kolom

**Files:**
- Create: `src/features/master/mutations.ts`
- Modify: `tests/unit/master-validation.test.ts`

**Interfaces:**
- Consumes: `CATEGORY_COLOR_TOKENS` (Task 1), `ensureAdmin`.
- Produces: `categoryInputSchema`, `updateCategory`, `kolomInputSchema`, `createKolom`, `updateKolom`, `deleteKolom`.

- [ ] **Step 1: Tambahkan test yang gagal**

Tambahkan di akhir `tests/unit/master-validation.test.ts`:

```ts
import { categoryInputSchema, kolomInputSchema } from '@/features/master/mutations'

const kategori = {
  id: '11111111-1111-4111-8111-111111111111',
  nameId: 'Ibadah Jemaat',
  nameEn: 'Congregational Service',
  slug: 'ibadah-jemaat',
  color: 'var(--color-cat-jemaat)',
  sortOrder: 1,
}

describe('categoryInputSchema', () => {
  it('menerima input yang sah', () => {
    expect(categoryInputSchema.safeParse(kategori).success).toBe(true)
  })

  // Hex di kolom ini memutus tema gelap: badge tetap memakai warna terang di
  // atas latar gelap, dan tak ada error apa pun yang muncul.
  it('menolak warna hex', () => {
    expect(categoryInputSchema.safeParse({ ...kategori, color: '#5b21b6' }).success).toBe(false)
  })

  it('menolak token yang tidak ada di daftar', () => {
    const r = categoryInputSchema.safeParse({ ...kategori, color: 'var(--color-cat-ngawur)' })
    expect(r.success).toBe(false)
  })

  it('menolak slug ber-spasi atau huruf kapital', () => {
    expect(categoryInputSchema.safeParse({ ...kategori, slug: 'Ibadah Jemaat' }).success).toBe(false)
  })

  it('menolak nama kosong', () => {
    expect(categoryInputSchema.safeParse({ ...kategori, nameId: '  ' }).success).toBe(false)
  })
})

const kolomBaru = { name: 'Kolom 5', number: 5, isActive: true }

describe('kolomInputSchema', () => {
  it('menerima input minimal', () => {
    expect(kolomInputSchema.safeParse(kolomBaru).success).toBe(true)
  })

  it('menolak nomor nol atau negatif', () => {
    expect(kolomInputSchema.safeParse({ ...kolomBaru, number: 0 }).success).toBe(false)
    expect(kolomInputSchema.safeParse({ ...kolomBaru, number: -1 }).success).toBe(false)
  })

  it('menolak nomor pecahan', () => {
    expect(kolomInputSchema.safeParse({ ...kolomBaru, number: 1.5 }).success).toBe(false)
  })

  it('mengubah koordinator kosong jadi null', () => {
    const r = kolomInputSchema.safeParse({ ...kolomBaru, coordinatorName: '  ' })
    expect(r.success).toBe(true)
    if (r.success) expect(r.data.coordinatorName).toBeNull()
  })
})
```

- [ ] **Step 2: Jalankan test — pastikan GAGAL**

Run: `pnpm test tests/unit/master-validation.test.ts`
Expected: FAIL — modul `@/features/master/mutations` belum ada.

- [ ] **Step 3: Tulis mutasi kategori & kolom**

Buat `src/features/master/mutations.ts`:

```ts
import { z } from 'zod'
import { createServerFn } from '@tanstack/react-start'
import { ensureAdmin } from '@/lib/auth.functions'
import { CATEGORY_COLOR_TOKENS } from '@/db/schema/worship'

const wajibIsi = z.string().trim().min(1, 'Wajib diisi')

const opsional = z
  .string()
  .trim()
  .optional()
  .transform((v) => (v ? v : null))

/**
 * Kategori hanya bisa DIUBAH, tidak ditambah atau dihapus: `key`-nya pgEnum
 * enam nilai, dan menambah nilai enum menuntut migrasi. Karena itu skema ini
 * tidak memuat `key` — ia tak pernah berubah lewat dashboard.
 */
export const categoryInputSchema = z.object({
  id: z.uuid(),
  nameId: wajibIsi,
  nameEn: wajibIsi,
  slug: z
    .string()
    .trim()
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Slug hanya boleh huruf kecil, angka, dan tanda hubung'),
  // Daftar tertutup, bukan regex: ia menolak token berbentuk benar tapi tidak
  // ada di app.css, yang akan membuat badge kehilangan warnanya tanpa error.
  color: z.enum(CATEGORY_COLOR_TOKENS),
  sortOrder: z.number().int().min(0),
})

export type CategoryInput = z.infer<typeof categoryInputSchema>

export const kolomInputSchema = z.object({
  name: wajibIsi,
  number: z.number().int().positive('Nomor kolom harus bilangan bulat positif'),
  coordinatorName: opsional,
  coordinatorPhone: opsional,
  isActive: z.boolean(),
})

export type KolomInput = z.infer<typeof kolomInputSchema>

export const updateCategory = createServerFn({ method: 'POST' })
  .validator((d: unknown) => categoryInputSchema.parse(d))
  .handler(async ({ data }): Promise<{ ok: true }> => {
    await ensureAdmin()
    const { id, ...rest } = data
    const { db } = await import('@/db')
    const { worshipCategories } = await import('@/db/schema')
    const { eq } = await import('drizzle-orm')
    await db
      .update(worshipCategories)
      .set({ ...rest, updatedAt: new Date() })
      .where(eq(worshipCategories.id, id))
    return { ok: true }
  })

export const createKolom = createServerFn({ method: 'POST' })
  .validator((d: unknown) => kolomInputSchema.parse(d))
  .handler(async ({ data }): Promise<{ id: string }> => {
    await ensureAdmin()
    const { db } = await import('@/db')
    const { kolom } = await import('@/db/schema')
    const [row] = await db.insert(kolom).values(data).returning({ id: kolom.id })
    if (!row) throw new Error('Gagal menyimpan kolom')
    return { id: row.id }
  })

export const updateKolom = createServerFn({ method: 'POST' })
  .validator((d: unknown) => z.object({ id: z.uuid() }).and(kolomInputSchema).parse(d))
  .handler(async ({ data }): Promise<{ ok: true }> => {
    await ensureAdmin()
    const { id, ...rest } = data
    const { db } = await import('@/db')
    const { kolom } = await import('@/db/schema')
    const { eq } = await import('drizzle-orm')
    await db
      .update(kolom)
      .set({ ...rest, updatedAt: new Date() })
      .where(eq(kolom.id, id))
    return { ok: true }
  })

/**
 * Kolom yang sudah dipakai ibadah TIDAK boleh dihapus — `worship_services.kolomId`
 * punya FK ke sini, dan menghapusnya akan ditolak database dengan pesan yang tak
 * berarti bagi pengurus. Nonaktifkan lewat `isActive` adalah jalan yang benar:
 * generator berhenti memakainya, jadwal lama tetap utuh.
 */
export const deleteKolom = createServerFn({ method: 'POST' })
  .validator((id: unknown) => z.uuid().parse(id))
  .handler(async ({ data: id }): Promise<{ ok: true; dipakai?: number }> => {
    await ensureAdmin()
    const { db } = await import('@/db')
    const { kolom, worshipServices } = await import('@/db/schema')
    const { eq } = await import('drizzle-orm')

    const dipakai = await db.$count(worshipServices, eq(worshipServices.kolomId, id))
    if (dipakai > 0) return { ok: true, dipakai }

    await db.delete(kolom).where(eq(kolom.id, id))
    return { ok: true }
  })
```

- [ ] **Step 4: Jalankan test — pastikan LULUS**

Run: `pnpm test tests/unit/master-validation.test.ts`
Expected: PASS (16 test — 7 dari Task 1 + 9 baru).

- [ ] **Step 5: Gerbang + commit**

```bash
pnpm lint && pnpm typecheck && pnpm test && pnpm build
git add src/features/master/mutations.ts tests/unit/master-validation.test.ts
git commit -m "Tambah mutasi kategori & kolom

Kategori hanya bisa DIUBAH, tidak ditambah atau dihapus: key-nya pgEnum enam
nilai dan menambah nilai enum menuntut migrasi. Skemanya karena itu tidak
memuat key sama sekali.

Warna divalidasi sebagai daftar tertutup, bukan regex: regex akan meloloskan
token berbentuk benar yang tidak ada di app.css, dan badge kategori lalu
kehilangan warnanya tanpa error apa pun.

deleteKolom menolak menghapus kolom yang masih dipakai ibadah dan
mengembalikan jumlah pemakainya, supaya form bisa menyarankan menonaktifkan
alih-alih menghapus. FK-nya akan menolak dengan pesan yang tak berarti bagi
pengurus."
```

---

## Task 4: Mutasi setting & status pesan

**Files:**
- Modify: `src/features/master/mutations.ts`
- Modify: `tests/unit/master-validation.test.ts`

**Interfaces:**
- Consumes: `SETTING_SCHEMAS` (Task 1).
- Produces: `updateSetting`, `setMessageStatus`, `deleteMessage`.

- [ ] **Step 1: Tambahkan test yang gagal**

Tambahkan di `tests/unit/master-validation.test.ts`:

```ts
import { settingInputSchema } from '@/features/master/mutations'

describe('settingInputSchema', () => {
  it('menerima key yang dikenal dengan nilai berbentuk benar', () => {
    const r = settingInputSchema.safeParse({
      key: 'social_links',
      value: { facebook: 'https://fb.test', instagram: '', youtube: '' },
    })
    expect(r.success).toBe(true)
  })

  it('menolak key yang tidak dikenal', () => {
    const r = settingInputSchema.safeParse({ key: 'ngawur', value: {} })
    expect(r.success).toBe(false)
  })

  // Nilai divalidasi memakai schema yang SAMA dengan jalur baca. Tanpa ini,
  // form bisa menyimpan bentuk yang nanti ditolak halaman publik.
  it('menolak nilai yang bentuknya salah untuk key-nya', () => {
    const r = settingInputSchema.safeParse({ key: 'social_links', value: { facebook: 123 } })
    expect(r.success).toBe(false)
  })

  it('menolak nilai yang kekurangan field', () => {
    const r = settingInputSchema.safeParse({ key: 'service_times', value: { id: 'x' } })
    expect(r.success).toBe(false)
  })
})
```

- [ ] **Step 2: Jalankan test — pastikan GAGAL**

Run: `pnpm test tests/unit/master-validation.test.ts`
Expected: FAIL — `settingInputSchema` belum ada.

- [ ] **Step 3: Tambahkan mutasi setting & pesan**

Tambahkan di `src/features/master/mutations.ts`:

```ts
import { SETTING_SCHEMAS, SITE_SETTINGS_KEYS } from '@/features/content/site-settings'

/**
 * Satu setting, divalidasi memakai schema jalur BACA.
 *
 * `superRefine` memilih schema berdasarkan `key`, jadi bentuk yang disimpan
 * dijamin bentuk yang bisa dibaca halaman publik. Kalau validasinya disalin
 * terpisah, form bisa menyimpan sesuatu yang lolos di sini tapi ditolak saat
 * dibaca — dan kerusakannya baru terlihat oleh pengunjung.
 */
export const settingInputSchema = z
  .object({
    key: z.enum(SITE_SETTINGS_KEYS),
    value: z.unknown(),
  })
  .superRefine((v, ctx) => {
    const hasil = SETTING_SCHEMAS[v.key].safeParse(v.value)
    if (hasil.success) return
    for (const issue of hasil.error.issues) {
      ctx.addIssue({ code: 'custom', path: ['value', ...issue.path], message: issue.message })
    }
  })

export const updateSetting = createServerFn({ method: 'POST' })
  .validator((d: unknown) => settingInputSchema.parse(d))
  .handler(async ({ data }): Promise<{ ok: true }> => {
    const { user } = await ensureAdmin()
    const { db } = await import('@/db')
    const { siteSettings } = await import('@/db/schema')
    const { eq } = await import('drizzle-orm')
    // `updatedBy` kolomnya sudah ada sejak Rencana 1 dan sudah FK ke `user`,
    // tapi belum pernah diisi — tanpa ini tak ada jejak siapa mengubah apa.
    await db
      .update(siteSettings)
      .set({ value: data.value, updatedBy: user.id, updatedAt: new Date() })
      .where(eq(siteSettings.key, data.key))
    return { ok: true }
  })

export const setMessageStatus = createServerFn({ method: 'POST' })
  .validator((d: unknown) =>
    z.object({ id: z.uuid(), status: z.enum(['new', 'read', 'done']) }).parse(d),
  )
  .handler(async ({ data }): Promise<{ ok: true }> => {
    await ensureAdmin()
    const { db } = await import('@/db')
    const { contactMessages } = await import('@/db/schema')
    const { eq } = await import('drizzle-orm')
    await db
      .update(contactMessages)
      .set({ status: data.status, updatedAt: new Date() })
      .where(eq(contactMessages.id, data.id))
    return { ok: true }
  })

export const deleteMessage = createServerFn({ method: 'POST' })
  .validator((id: unknown) => z.uuid().parse(id))
  .handler(async ({ data: id }): Promise<{ ok: true }> => {
    await ensureAdmin()
    const { db } = await import('@/db')
    const { contactMessages } = await import('@/db/schema')
    const { eq } = await import('drizzle-orm')
    await db.delete(contactMessages).where(eq(contactMessages.id, id))
    return { ok: true }
  })
```

Catatan: `ensureAdmin()` mengembalikan `{ user: session.user }` (lihat `src/lib/auth.functions.ts:20-27`), jadi `user.id` tersedia. Semua pemanggil yang ada membuangnya dengan `await ensureAdmin()` tanpa destructuring — `updateSetting` adalah yang PERTAMA memakai nilai kembaliannya.

- [ ] **Step 4: Jalankan test — pastikan LULUS**

Run: `pnpm test tests/unit/master-validation.test.ts`
Expected: PASS (20 test).

- [ ] **Step 5: Gerbang + commit**

```bash
pnpm lint && pnpm typecheck && pnpm test && pnpm build
git add src/features/master/mutations.ts tests/unit/master-validation.test.ts
git commit -m "Tambah mutasi site_settings & status pesan

Nilai setting divalidasi memakai schema jalur BACA lewat superRefine yang
memilih schema berdasarkan key. Bentuk yang disimpan karena itu dijamin bentuk
yang bisa dibaca halaman publik; kalau validasinya disalin terpisah, form bisa
menyimpan sesuatu yang lolos di sini tapi ditolak saat dibaca — dan
kerusakannya baru terlihat oleh pengunjung.

updatedBy akhirnya diisi. Kolomnya sudah ada sejak Rencana 1 dan sudah FK ke
user, tapi belum pernah dipakai, jadi selama ini tak ada jejak siapa mengubah
pengaturan apa."
```

---

## Task 5: Halaman master data — kategori & kolom

**Files:**
- Create: `src/routes/admin._app.master.index.tsx`
- Modify: `src/components/admin/admin-shell.tsx`, `messages/{id,en}.json`

**Interfaces:**
- Consumes: Task 2 dan 3.
- Produces: route `/admin/master`.

- [ ] **Step 1: Tambahkan kunci pesan**

Ke kedua katalog, nama kunci identik:

```json
  "admin_master_title": "Master Data",
  "admin_master_categories": "Kategori Ibadah",
  "admin_master_categories_note": "Kategori tidak bisa ditambah atau dihapus — hanya nama, warna, dan urutannya yang bisa diubah.",
  "admin_master_kolom": "Kolom",
  "admin_master_kolom_new": "Tambah Kolom",
  "admin_master_name_id": "Nama (Indonesia)",
  "admin_master_name_en": "Nama (Inggris)",
  "admin_master_slug": "Slug",
  "admin_master_color": "Warna",
  "admin_master_order": "Urutan",
  "admin_master_kolom_name": "Nama",
  "admin_master_kolom_number": "Nomor",
  "admin_master_coordinator": "Koordinator",
  "admin_master_coordinator_phone": "Telepon koordinator",
  "admin_master_active": "Aktif",
  "admin_master_inactive": "Nonaktif",
  "admin_master_kolom_in_use": "Kolom ini dipakai {jumlah} ibadah, jadi tidak bisa dihapus. Nonaktifkan saja — generator berhenti memakainya dan jadwal lama tetap utuh.",
  "admin_master_saved": "Tersimpan.",
```

Inggris: "Master Data", "Worship Categories", "Categories cannot be added or removed — only their name, colour, and order can change.", "Kolom", "Add Kolom", "Name (Indonesian)", "Name (English)", "Slug", "Colour", "Order", "Name", "Number", "Coordinator", "Coordinator phone", "Active", "Inactive", "This kolom is used by {jumlah} services, so it cannot be deleted. Deactivate it instead — the generator stops using it and existing schedules stay intact.", "Saved."

- [ ] **Step 2: Bangun halaman**

Buat `src/routes/admin._app.master.index.tsx` dengan `createFileRoute('/admin/_app/master/')`.

Loader mengambil `listCategoriesForAdmin()` dan `listKolomForAdmin()` bersamaan.

Dua bagian di satu halaman:

**Kategori** — `<Table>` dengan satu baris per kategori, tiap sel yang bisa diubah berupa input/select yang menyimpan saat ditekan tombol Simpan per baris. Kolom: Nama (ID), Nama (EN), Slug, Warna (select dari `CATEGORY_COLOR_TOKENS`, tiap opsi menampilkan contoh warnanya lewat `style={{ backgroundColor: token }}` — satu-satunya pengecualian hex-di-komponen yang terdokumentasi, dan di sini nilainya token, bukan hex), Urutan (number).

Di atas tabel, tampilkan `admin_master_categories_note` — pengurus harus tahu kenapa tak ada tombol Tambah sebelum ia mencarinya.

**Kolom** — `<Table>` serupa dengan tombol "Tambah Kolom" yang menambahkan baris kosong. Kolom: Nama, Nomor, Koordinator, Telepon, Aktif (checkbox), aksi Simpan dan Hapus.

Saat `deleteKolom` mengembalikan `{ dipakai: n }` dengan `n > 0`, JANGAN diamkan: tampilkan `admin_master_kolom_in_use` dengan angkanya di wilayah `role="status"`. Pengurus yang menekan Hapus dan tidak melihat apa-apa akan menyimpulkan aplikasinya rusak.

Umpan balik simpan memakai wilayah `role="status"` `aria-live="polite"` berisi `admin_master_saved`, bukan `<Toaster>` — Toaster belum dipasang di layout mana pun (utang dari handoff 3a).

- [ ] **Step 3: Naikkan nav Master ke `<Link>`**

Di `admin-shell.tsx`, tambahkan `'/admin/master'` ke rantai perbandingan eksplisit. **Bukan** `daftar.includes(...)`: `includes` mengembalikan boolean biasa dan tidak menyempitkan tipe `item.href`, sehingga `<Link to>` menolaknya. Dicoba dan ditolak typecheck di Rencana 3c.

- [ ] **Step 4: Verifikasi lewat probe Playwright**

Probe sementara yang masuk memakai `SEED_ADMIN_*` (pola di `tests/e2e/admin.spec.ts`), lalu membuktikan `/admin/master` menampilkan enam baris kategori dan empat baris kolom, serta select warna berisi enam opsi. **Hapus probe sebelum commit.**

- [ ] **Step 5: Gerbang + commit**

```bash
pnpm lint && pnpm typecheck && pnpm test && pnpm build
pnpm test:e2e   # sendirian
git add src/routes/ src/components/admin/admin-shell.tsx messages/
git commit -m "Tambah halaman master data: kategori & kolom

Kategori tidak punya tombol Tambah, dan alasannya ditulis di halaman —
key-nya pgEnum, jadi menambah kategori menuntut migrasi. Pengurus harus tahu
itu sebelum mencari tombolnya.

Warna dipilih dari daftar tertutup yang menampilkan contoh warnanya, bukan
diketik. Hex di kolom itu memutus tema gelap tanpa error apa pun.

Menghapus kolom yang masih dipakai ibadah memberi pesan yang menyarankan
menonaktifkan, bukan diam. Pengurus yang menekan Hapus dan tidak melihat
apa-apa akan menyimpulkan aplikasinya rusak."
```

---

## Task 6: Halaman pengaturan situs

**Files:**
- Create: `src/components/admin/setting-forms.tsx`
- Create: `src/routes/admin._app.pengaturan.index.tsx`
- Modify: `src/components/admin/admin-shell.tsx`, `messages/{id,en}.json`

**Interfaces:**
- Consumes: `getSettingsForAdmin` (Task 2), `updateSetting` (Task 4), `SETTING_SCHEMAS` (Task 1).
- Produces: route `/admin/pengaturan`.

- [ ] **Step 1: Tambahkan kunci pesan**

Tujuh judul bagian plus label field. Ke kedua katalog:

```json
  "admin_settings_title": "Pengaturan Situs",
  "admin_settings_hero": "Hero Beranda",
  "admin_settings_service_times": "Jam Ibadah (teks beranda)",
  "admin_settings_contact": "Kontak",
  "admin_settings_social": "Media Sosial",
  "admin_settings_pastoral": "Kontak Pastoral",
  "admin_settings_live": "Ibadah Live",
  "admin_settings_giving": "Persembahan",
  "admin_settings_hero_title_id": "Judul (Indonesia)",
  "admin_settings_hero_title_en": "Judul (Inggris)",
  "admin_settings_hero_tagline_id": "Tagline (Indonesia)",
  "admin_settings_hero_tagline_en": "Tagline (Inggris)",
  "admin_settings_hero_image": "Alamat gambar hero",
  "admin_settings_phone": "Telepon",
  "admin_settings_email": "Email",
  "admin_settings_hours_id": "Jam kantor (Indonesia)",
  "admin_settings_hours_en": "Jam kantor (Inggris)",
  "admin_settings_maps": "Alamat Google Maps",
  "admin_settings_is_live": "Sedang siaran",
  "admin_settings_live_url": "Alamat siaran",
  "admin_settings_archive_url": "Alamat arsip siaran",
  "admin_settings_account_bank": "Bank",
  "admin_settings_account_number": "Nomor rekening",
  "admin_settings_account_holder": "Atas nama",
  "admin_settings_account_add": "Tambah rekening",
  "admin_settings_account_remove": "Hapus rekening",
  "admin_settings_note_id": "Catatan (Indonesia)",
  "admin_settings_note_en": "Catatan (Inggris)",
```

Inggris: padanan langsung — "Site Settings", "Homepage Hero", "Service Times (homepage text)", "Contact", "Social Media", "Pastoral Contacts", "Live Service", "Giving", lalu label field sesuai namanya.

- [ ] **Step 2: Bangun tujuh form**

Buat `src/components/admin/setting-forms.tsx` berisi satu komponen per kunci, masing-masing menerima `{ nilai: unknown; onSimpan: (value: unknown) => Promise<void> }`.

Semuanya mengikuti pola `service-form.tsx`: `useState` + `useId`, tanpa form library, galat server di `role="status"` `aria-live="polite"`, tombol terkunci saat mengirim dengan guard `if (sending) return`.

Yang perlu perhatian khusus:

- **`giving_info`** punya array `accounts`. Form harus bisa menambah dan menghapus baris rekening. Ini yang membuat pengurus akhirnya bisa mengganti placeholder `XXXX-XXXX-XXXX` yang tayang sekarang.
- **`pastoral_contacts`** bentuknya `Record<string, { name, phone }>` — kunci bebas. Render sebagai daftar pasangan yang bisa ditambah/dihapus, dengan field kunci, nama, dan telepon.
- **`live_stream.isLive`** boolean — checkbox. Ini yang menyalakan penanda "sedang siaran" di situs publik, jadi beri label yang jelas.
- **`contact_info.lat`/`lng`** number-atau-null. Kosongkan → `null`, jangan `0`: koordinat `0,0` adalah titik nyata di Samudra Atlantik, dan peta akan menunjuk ke sana.

Nilai awal tiap form datang MENTAH dari `getSettingsForAdmin`. Kalau bentuknya tidak cocok schema, jangan lempar — render form dengan nilai default dan tampilkan peringatan bahwa isi tersimpan tidak terbaca. Pengurus perlu bisa membetulkannya, dan itu mustahil kalau halamannya sendiri gagal dimuat.

- [ ] **Step 3: Bangun halaman**

Buat `src/routes/admin._app.pengaturan.index.tsx` dengan `createFileRoute('/admin/_app/pengaturan/')`.

Loader memanggil `getSettingsForAdmin()`. Halaman merender tujuh `<Card>`, satu per kunci, masing-masing berisi form dari Task 6 Step 2 dan tombol Simpan sendiri. Menyimpan satu bagian tidak menyentuh enam lainnya — `updateSetting` memang per-kunci.

Tambahkan `/admin/pengaturan` ke nav sidebar (rantai perbandingan eksplisit) dan ke `NAV` dengan ikon `Settings`. Pindahkan `/admin/master` ke label yang membedakannya, mis. ikon `Layers` untuk Master Data dan `Settings` untuk Pengaturan — dua item dengan ikon sama membingungkan.

- [ ] **Step 4: Verifikasi lewat probe Playwright**

Probe sementara yang membuktikan `/admin/pengaturan` menampilkan ketujuh judul bagian, dan bahwa mengubah satu field lalu Simpan benar-benar tersimpan (muat ulang halaman, nilainya bertahan). Pakai `social_links.facebook` sebagai kelinci percobaan — ia tidak dipakai halaman publik (footer menarik dari `SITE.facebookUrl`), jadi mengubahnya tidak mengubah apa yang dilihat jemaat. **Kembalikan nilainya seperti semula setelah probe, dan hapus probe sebelum commit.**

- [ ] **Step 5: Gerbang + commit**

```bash
pnpm lint && pnpm typecheck && pnpm test && pnpm build
pnpm test:e2e   # sendirian
git add src/components/admin/setting-forms.tsx src/routes/ src/components/admin/admin-shell.tsx messages/
git commit -m "Tambah halaman pengaturan situs: tujuh form site_settings

Satu form per kunci dengan tombol Simpan sendiri — updateSetting memang
per-kunci, jadi menyimpan satu bagian tidak menyentuh enam lainnya.

giving_info bisa menambah dan menghapus baris rekening: inilah yang membuat
pengurus akhirnya bisa mengganti placeholder XXXX-XXXX-XXXX yang tayang
sekarang. contact_info membuat email, telepon, dan jam kantor bisa diisi —
ketiganya kosong hari ini sehingga /kunjungi menyembunyikan barisnya.

Koordinat kosong disimpan null, bukan 0: titik 0,0 adalah lokasi nyata di
Samudra Atlantik dan peta akan menunjuk ke sana.

Nilai yang bentuknya rusak tidak membuat halaman gagal dimuat — form tetap
dirender dengan peringatan, karena membetulkannya mustahil kalau halamannya
sendiri tidak bisa dibuka."
```

---

## Task 7: Halaman pesan

**Files:**
- Create: `src/routes/admin._app.pesan.index.tsx`
- Modify: `src/components/admin/admin-shell.tsx`, `messages/{id,en}.json`

**Interfaces:**
- Consumes: `listMessagesForAdmin` (Task 2), `setMessageStatus`, `deleteMessage` (Task 4).
- Produces: route `/admin/pesan`.

- [ ] **Step 1: Tambahkan kunci pesan**

```json
  "admin_messages_title": "Pesan Masuk",
  "admin_messages_empty": "Belum ada pesan masuk.",
  "admin_messages_from": "Pengirim",
  "admin_messages_message": "Pesan",
  "admin_messages_received": "Diterima",
  "admin_messages_status_new": "Baru",
  "admin_messages_status_read": "Dibaca",
  "admin_messages_status_done": "Selesai",
  "admin_messages_mark_read": "Tandai dibaca",
  "admin_messages_mark_done": "Tandai selesai",
  "admin_messages_delete_confirm": "Hapus pesan ini? Tindakan ini tidak bisa dibatalkan.",
```

Inggris: "Messages", "No messages yet.", "From", "Message", "Received", "New", "Read", "Done", "Mark as read", "Mark as done", "Delete this message? This cannot be undone."

- [ ] **Step 2: Bangun halaman**

Buat `src/routes/admin._app.pesan.index.tsx` dengan `createFileRoute('/admin/_app/pesan/')`.

`<Table>` dengan kolom Pengirim (nama + email + telepon), Pesan, Diterima, Status, dan aksi. Aksi mengikuti alur `new → read → done`, plus Hapus lewat `<Dialog>` konfirmasi.

Pesan bisa panjang; batasi tampilannya dan sediakan cara melihat penuh — `<Dialog>` berisi isi lengkap sudah cukup, jangan memotong tanpa jalan melihat sisanya.

Email pengirim ditampilkan sebagai `mailto:` bertaut. Telepon sebagai `tel:` kalau ada. Keduanya memakai `underline` permanen, bukan `hover:underline` — lihat alasannya di commit penyegaran visual: link yang dibedakan hanya oleh warna tidak memenuhi WCAG 1.4.1, dan di tema gelap kontras link terhadap teks hanya 1.05:1.

Tambahkan `/admin/pesan` ke nav sidebar (rantai perbandingan eksplisit).

- [ ] **Step 3: Verifikasi lewat probe Playwright**

`contact_messages` KOSONG, jadi probe harus membuat datanya lewat jalur pengunjung sungguhan: buka `/kunjungi`, isi form kontak, kirim. Lalu masuk sebagai admin dan buktikan pesan itu muncul di `/admin/pesan` dengan status "Baru".

Form kontak punya honeypot bernama `website` yang HARUS dibiarkan kosong — mengisinya membuat server diam-diam membuang pesannya (`{ ok: true }` tanpa simpan), dan probe akan terlihat gagal tanpa alasan yang jelas. Lihat `src/components/forms/contact-form.tsx`.

Hapus pesan uji lewat dashboard setelah probe, dan hapus probe sebelum commit.

- [ ] **Step 4: Gerbang + commit**

```bash
pnpm lint && pnpm typecheck && pnpm test && pnpm build
pnpm test:e2e   # sendirian
git add src/routes/ src/components/admin/admin-shell.tsx messages/
git commit -m "Tambah halaman pesan masuk

Alur status new -> read -> done akhirnya terpakai. Kolomnya sudah ada sejak
Rencana 1 dan belum pernah disentuh, jadi selama ini pesan yang masuk tidak
punya cara ditandai sudah ditangani.

Email dan telepon pengirim bertaut mailto:/tel: dengan underline permanen,
bukan hover:underline — link yang dibedakan hanya oleh warna tidak memenuhi
WCAG 1.4.1, dan di tema gelap kontrasnya terhadap teks sekitar cuma 1.05:1."
```

---

## Task 8: E2E alur master data

**Files:**
- Create: `tests/e2e/admin-master.spec.ts`
- Modify: `tests/e2e/admin.spec.ts`

**Interfaces:**
- Consumes: seluruh route Task 5, 6, 7.
- Produces: —

- [ ] **Step 1: Tambahkan route baru ke daftar gerbang**

Di `tests/e2e/admin.spec.ts`, tambahkan ke daftar yang sudah memuat delapan path:

```ts
  '/admin/master',
  '/admin/pengaturan',
  '/admin/pesan',
```

- [ ] **Step 2: Tulis e2e alur**

Buat `tests/e2e/admin-master.spec.ts`. Baca `tests/e2e/admin-konten.spec.ts` lebih dulu dan tiru strukturnya — ia sudah memuat semua pola yang mahal dipelajari:

- `test.describe.configure({ mode: 'serial' })` dan `test.setTimeout(180_000)` dengan alasan tertulis
- dibatasi `chromium` lewat `testInfo.project.name`
- helper `warm()` untuk endpoint dan route
- **penanda unik per run** dari `Date.now()`
- **helper yang memuat ulang dari server sebelum memeriksa hasil**, bukan mengandalkan tabel yang diperbarui `router.invalidate()` — tabel itu kosong sesaat selagi loader berjalan, sehingga asersi bisa lulus sebelum mutasinya tersimpan
- **filter pembersihan TANPA anchor `^`** — teks baris tabel dimulai dengan kolom pertama, bukan judul

Tiga alur:

1. **Kontak bisa diisi dan tampil di publik.** Ubah `contact_info.email` lewat `/admin/pengaturan`, simpan, lalu buka `/kunjungi` dan buktikan email itu muncul. **Kembalikan ke nilai semula di akhir** — ini data yang dibaca jemaat. Ini alur paling berharga di sini: ia membuktikan pengaturan benar-benar sampai ke halaman publik, bukan hanya tersimpan.

2. **Kategori: warna hanya bisa dipilih dari daftar.** Buktikan select warna berisi tepat enam opsi dan tidak ada input teks bebas untuk warna. Tidak perlu menyimpan — yang dijaga adalah pengurus tak punya jalan memasukkan hex.

3. **Pesan masuk muncul dan bisa ditandai.** Kirim form kontak di `/kunjungi` (biarkan honeypot `website` kosong), lalu buktikan pesan muncul di `/admin/pesan` dengan status Baru, tandai Dibaca, lalu hapus.

- [ ] **Step 3: Buktikan test benar-benar menangkap**

Untuk alur 1, sementara ubah `updateSetting` supaya mengabaikan `data.value` dan menulis nilai lama (mis. `set({ updatedAt: new Date() })` saja).

Run: `pnpm test:e2e tests/e2e/admin-master.spec.ts --project=chromium`
Expected: **GAGAL** di alur 1 — email baru tidak muncul di `/kunjungi`.

Kembalikan, jalankan ulang, pastikan hijau. Salin kedua output ke laporan.

- [ ] **Step 4: Pastikan tidak ada sisa**

```bash
cat > zz-probe.mjs <<'EOF'
import 'dotenv/config'
import pg from 'pg'
const c = new pg.Client({ connectionString: process.env.DATABASE_URL })
await c.connect()
console.log('pesan uji tertinggal:',
  (await c.query(`select count(*)::int n from contact_messages where name like 'Uji Otomatis%'`)).rows[0].n)
console.log('contact_info sekarang:',
  JSON.stringify((await c.query(`select value from site_settings where key='contact_info'`)).rows[0].value))
console.log('kolom:', (await c.query('select count(*)::int n from kolom')).rows[0].n)
await c.end()
EOF
npx tsx zz-probe.mjs; rm -f zz-probe.mjs
```

Expected: pesan uji `0`, `contact_info` kembali seperti sebelum test (email dan phone string kosong), `kolom` tetap 4.

- [ ] **Step 5: Gerbang penuh + commit**

```bash
pnpm lint && pnpm typecheck && pnpm test && pnpm build
pnpm test:e2e   # sendirian, DUA KALI berturut-turut
git add tests/e2e/
git commit -m "Kunci alur master data dengan e2e

Tiga alur. Yang pertama paling berharga: mengubah contact_info lewat dashboard
harus benar-benar sampai ke /kunjungi — itu membuktikan pengaturan tidak
sekadar tersimpan tapi juga terbaca halaman publik. Diverifikasi merah lebih
dulu dengan membuat updateSetting mengabaikan nilainya.

Alur ketiga mengirim form kontak sungguhan dari /kunjungi, karena
contact_messages kosong dan tak ada jalan lain punya data yang realistis.
Honeypot 'website' dibiarkan kosong — mengisinya membuat server diam-diam
membuang pesannya dan test akan terlihat gagal tanpa alasan jelas.

Nilai contact_info dikembalikan seperti semula di akhir: ini data yang dibaca
jemaat, bukan fixture."
```

---

## Setelah plan ini

Sisa Rencana 3:

- **Rencana unggah** — PDF tata ibadah (3b), PDF warta dan sampul renungan (3c), foto galeri. Ditunda bersama supaya lapisan unggahnya ditulis sekali.
- **Galeri** — album, item, urutkan, sampul, plus tautan YouTube yang didukung komponen sejak Rencana 2b tapi tak pernah bisa diisi. Bergantung pada rencana unggah untuk benar-benar berguna.
- **Kelola `schedule_templates` lewat UI** (ditunda dari 3b).

Utang yang masih berlaku:

- **Alias `muted`/`accent` maknanya bentrok** — kontras baris terpilih 2.95:1 terang dan 2.03:1 gelap, di bawah AA. Plan ini menambah tiga tabel lagi, jadi ia kini terlihat di enam halaman. **Ini utang paling mendesak yang tersisa** dan sebaiknya dikerjakan sebelum menambah tabel lain.
- **`<Toaster>` belum dipasang** di layout mana pun; plan ini sengaja memakai `role="status"` alih-alih `toast()`.
- **E2E menulis ke database yang melayani situs live.** Plan ini menambah tiga alur lagi, salah satunya mengubah pengaturan yang dibaca jemaat lalu mengembalikannya. Database test terpisah tetap utang yang sebenarnya.
- **Terbitkan-massal untuk generator jadwal** — 72 draf harus diterbitkan satu per satu.

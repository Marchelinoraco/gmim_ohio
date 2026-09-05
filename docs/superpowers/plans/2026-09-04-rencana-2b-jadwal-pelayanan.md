# Rencana 2b — Jadwal Ibadah, Pelayanan, dan Peluncuran Situs

> **Untuk pekerja agentik:** SUB-SKILL WAJIB: `superpowers:subagent-driven-development` (disarankan) atau `superpowers:executing-plans`. Langkah pakai checkbox `- [ ]`.

**Goal:** Membangun fitur inti Jadwal Ibadah + halaman Pelayanan/Kolom, lalu **membalik `SITE.comingSoon` menjadi `false`** sehingga seluruh situs publik GMIM Musafir resmi diluncurkan di gmimmusafir.org.

**Architecture:** Query jadwal ditambahkan ke `src/features/schedule/services.ts` (pola `createServerFn` + lazy `@/db` yang sudah terkunci di Rencana 2a). `/jadwal` punya dua tampilan (Daftar ↔ Kalender) yang state-nya hidup di query string agar bisa dibagikan. Halaman Pelayanan memakai query yang sama, difilter per kategori. Peluncuran dilakukan sebagai SATU commit atomik di akhir, karena 16 penanda `TODO(2b)` harus berubah serentak.

**Tech Stack:** TanStack Start · TanStack Router (file routes, loaders, search params) · Drizzle · Paraglide i18n · Tailwind v4 tokens · Vitest · Playwright.

**Spec:** `docs/superpowers/specs/2026-08-29-gmim-musafir-website-design.md` (§3.1 peta menu, §3.2 Pelayanan/Jadwal, §5.2 model data jadwal).

**Rencana sebelumnya:** `docs/superpowers/plans/2026-08-30-rencana-2a-situs-publik.md` (SELESAI, merged). Ledger + seluruh ruling: `.superpowers/sdd/2026-08-30-rencana-2a-situs-publik/progress.md`.

## Global Constraints

- Package manager `pnpm`. `@/*` → `src/*`. Gaya repo: single-quote, tanpa titik koma, printWidth 100. `src/components/ui/**` tetap prettier-ignored.
- **Dwibahasa:** tiap key UI ada di `messages/id.json` DAN `messages/en.json`. Konten DB dwibahasa lewat kolom `*_id` / `*_en`. `id` default tanpa prefix, `en` di `/en`.
- **Zona waktu:** SEMUA tampilan tanggal/jam lewat `src/lib/datetime.ts` (Eastern). `serviceDate`/`startTime` adalah wall-clock Eastern. JANGAN bandingkan dengan tanggal turunan-UTC — pakai `todayEastern()`.
- **Tema:** token saja (`bg-surface`, `text-ink`, `text-muted`, `border-border`, `--color-cat-*`). TANPA `dark:`, TANPA hex. Benar di KEDUA tema, pasangan teks/latar ≥ WCAG AA.
- **DB hanya baca**, setiap query difilter `status = 'published'`. Migrasi hanya ke Neon `dev` (`.neon` pin `dev`). JANGAN sentuh `production`.
- **Batas server:** `@/db`, `@/lib/env`, dan modul server-only di-import lazy DI DALAM handler `createServerFn`. Route loader bersifat isomorfik — bukan batas server.
- **Pola input server fn (terkunci Rencana 2a):** `.validator((x: T) => x).handler(async ({ data: x }) => …)`, dipanggil `fn({ data })`.
- **Route detail non-nested:** file detail memakai akhiran `_` (`jadwal_.$id.tsx`) supaya tidak ter-nest di bawah route daftar yang tak punya `<Outlet/>`.
- **Guard uuid:** route yang key-nya kolom `uuid` WAJIB pre-check pola sebelum query, kalau tidak id ngawur jadi Postgres `22P02` (500) bukan 404.
- Disiplin: TDD untuk logika murni. DRY. YAGNI. Commit tiap task.
- Tiap task berakhir dengan `pnpm lint` + `pnpm typecheck` + `pnpm test` + `pnpm test:e2e` + `pnpm build` HIJAU, dan `prettier --check "src/**/*.{ts,tsx}" "tests/**/*.ts"` bersih.

---

## Struktur File

```
src/
  features/schedule/
    services.ts          # (modifikasi) + listServices, getService, listServicesInRange
    taxonomy.ts          # (baru) listCategories(), listKolom()
  components/schedule/
    category-badge.tsx   # (baru) badge warna kategori
    service-card.tsx     # (baru) kartu satu ibadah — dipakai /jadwal, /pelayanan, Beranda
    schedule-filters.tsx # (baru) filter kategori + kolom, state di query string
    month-calendar.tsx   # (baru) grid kalender bulanan
  components/site/
    hero-media.tsx       # (baru) ekstraksi video/poster/scrim bersama
  routes/
    jadwal.tsx           # (baru) daftar + kalender, search params
    jadwal_.$id.tsx      # (baru) detail + JSON-LD Event
    pelayanan.tsx        # (baru) indeks 6 kategori
    pelayanan_.kolom.tsx # (baru) penjelasan kolom + daftar kolom + jadwal per kolom
    pelayanan_.$slug.tsx # (baru) halaman kategori + jadwalnya
  db/seed/
    schedule.ts          # (baru) schedule_templates + worship_services
    index.ts             # (modifikasi) panggil seedSchedule
messages/id.json, en.json # (modifikasi) +jadwal_*, +pelayanan_*
tests/unit/
  schedule-filters.test.ts # (baru) parsing/serialisasi query string
  schedule-group.test.ts   # (baru) pengelompokan per tanggal + grid kalender
tests/e2e/
  jadwal.spec.ts           # (baru)
  public-pages.spec.ts     # (modifikasi, Task 14)
```

**Boundary:**
- `src/features/schedule/*` = satu-satunya jalur baca jadwal. Route loader memanggilnya, tidak query `db` langsung.
- `<ServiceCard>` dipakai `/jadwal`, `/pelayanan/*`, dan Beranda — satu sumber tampilan kartu ibadah.
- Konten statis deskripsi kategori ada di `messages/*.json`, BUKAN DB (spec §5.5).

---

## Task 1: Taksonomi — `listCategories` + `listKolom`

**Files:**
- Create: `src/features/schedule/taxonomy.ts`

**Interfaces:**
- Consumes: `worshipCategories`, `kolom` dari `@/db/schema`.
- Produces:
  - `type WorshipCategory = typeof worshipCategories.$inferSelect`
  - `type Kolom = typeof kolom.$inferSelect`
  - `listCategories(): Promise<WorshipCategory[]>` — urut `sortOrder` asc.
  - `listKolom(): Promise<Kolom[]>` — hanya `isActive`, urut `number` asc.

- [ ] **Step 1: Implementasi**

Ikuti persis pola `src/features/content/bulletins.ts` (docblock Indonesia, lazy import di dalam handler).

```ts
import { createServerFn } from '@tanstack/react-start'
import type { kolom, worshipCategories } from '@/db/schema'

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
```

- [ ] **Step 2:** `pnpm build` → `pnpm typecheck` → `pnpm lint`. **Commit** — `"Tambah query taksonomi kategori & kolom"`

---

## Task 2: Query jadwal berfilter

**Files:**
- Modify: `src/features/schedule/services.ts`

**Interfaces:**
- Consumes: `todayEastern()` dari `@/lib/datetime`; `UpcomingService` yang sudah ada.
- Produces:
  - `type ServiceFilter = { categorySlug?: string; kolomId?: string; from?: string; to?: string }`
  - `listServices({ data: ServiceFilter }): Promise<UpcomingService[]>` — published, urut `serviceDate` asc lalu `startTime` asc. `from` default `todayEastern()`. Tanpa `to` = tak terbatas.
  - `getService({ data: id }): Promise<UpcomingService | null>`
- `listUpcomingServices` yang sudah ada TIDAK diubah (Beranda memakainya).

- [ ] **Step 1: Implementasi**

`categorySlug` difilter lewat relasi kategori. Drizzle relational query tidak bisa `where` pada relasi, jadi resolusikan slug → id dulu:

```ts
export type ServiceFilter = {
  categorySlug?: string
  kolomId?: string
  from?: string
  to?: string
}

export const listServices = createServerFn({ method: 'GET' })
  .validator((f: ServiceFilter = {}) => f)
  .handler(async ({ data: f }): Promise<UpcomingService[]> => {
    const { db } = await import('@/db')
    const { todayEastern } = await import('@/lib/datetime')
    const from = f.from ?? todayEastern()

    // slug → id lebih dulu; relational query tak bisa `where` pada relasi.
    let categoryId: string | undefined
    if (f.categorySlug) {
      const cat = await db.query.worshipCategories.findFirst({
        where: (c, { eq }) => eq(c.slug, f.categorySlug!),
        columns: { id: true },
      })
      // slug tak dikenal → tak ada hasil (bukan "semua"), supaya URL ngawur
      // tidak diam-diam menampilkan seluruh jadwal.
      if (!cat) return []
      categoryId = cat.id
    }

    return db.query.worshipServices.findMany({
      where: (s, { and, eq, gte, lte }) =>
        and(
          eq(s.status, 'published'),
          gte(s.serviceDate, from),
          f.to ? lte(s.serviceDate, f.to) : undefined,
          categoryId ? eq(s.categoryId, categoryId) : undefined,
          f.kolomId ? eq(s.kolomId, f.kolomId) : undefined,
        ),
      orderBy: (s, { asc }) => [asc(s.serviceDate), asc(s.startTime)],
      with: {
        category: { columns: { key: true, nameId: true, nameEn: true, color: true, slug: true } },
        kolom: { columns: { name: true } },
      },
    })
  })
```

> `and(...)` Drizzle mengabaikan argumen `undefined`, jadi filter opsional aman disusun begini.
> **Perluas `UpcomingService.category` dengan `slug`** (Task 2 menambahkannya) — halaman kategori butuh slug untuk tautan.

`getService` — key `uuid`, jadi route pemanggil WAJIB pre-check pola:

```ts
export const getService = createServerFn({ method: 'GET' })
  .validator((id: string) => id)
  .handler(async ({ data: id }): Promise<UpcomingService | null> => {
    const { db } = await import('@/db')
    const row = await db.query.worshipServices.findFirst({
      where: (s, { and, eq }) => and(eq(s.id, id), eq(s.status, 'published')),
      with: {
        category: { columns: { key: true, nameId: true, nameEn: true, color: true, slug: true } },
        kolom: { columns: { name: true } },
      },
    })
    return row ?? null
  })
```

- [ ] **Step 2:** `pnpm build` → `pnpm typecheck` → `pnpm lint` → `pnpm test`. **Commit** — `"Tambah query jadwal berfilter"`

---

## Task 3: Seed jadwal (template + ibadah)

**Files:**
- Create: `src/db/seed/schedule.ts`
- Modify: `src/db/seed/index.ts`
- Test: perluas `tests/unit/seed-data.test.ts`

**Interfaces:**
- Produces: `SCHEDULE_TEMPLATES` (konstanta), `seedSchedule()` — idempoten lewat guard `db.$count(worshipServices) > 0`.

- [ ] **Step 1: Template**

Enam template mingguan, konsisten dengan isi warta placeholder yang sudah di-seed di Rencana 2a:

| Kategori | Hari | Jam | Lokasi |
|---|---|---|---|
| `ibadah_jemaat` | Minggu (0) | 10:00 | `gedung_gereja` |
| `sekolah_minggu` | Minggu (0) | 10:00 | `gedung_gereja` |
| `kaum_ibu` | Kamis (4) | 10:00 | `rumah` |
| `pemuda_remaja` | Sabtu (6) | 17:00 | `rumah` |
| `kaum_bapa` | Sabtu (6) | 19:00 | `rumah` |
| `kolom` | Rabu (3) | 19:00 | `rumah` |

```ts
export const SCHEDULE_TEMPLATES = [
  { categoryKey: 'ibadah_jemaat', dayOfWeek: 0, startTime: '10:00:00', endTime: '12:00:00', defaultLocationType: 'gedung_gereja' },
  { categoryKey: 'sekolah_minggu', dayOfWeek: 0, startTime: '10:00:00', endTime: '11:00:00', defaultLocationType: 'gedung_gereja' },
  { categoryKey: 'kaum_ibu', dayOfWeek: 4, startTime: '10:00:00', endTime: '12:00:00', defaultLocationType: 'rumah' },
  { categoryKey: 'pemuda_remaja', dayOfWeek: 6, startTime: '17:00:00', endTime: '19:00:00', defaultLocationType: 'rumah' },
  { categoryKey: 'kaum_bapa', dayOfWeek: 6, startTime: '19:00:00', endTime: '21:00:00', defaultLocationType: 'rumah' },
  { categoryKey: 'kolom', dayOfWeek: 3, startTime: '19:00:00', endTime: '21:00:00', defaultLocationType: 'rumah' },
] as const
```

- [ ] **Step 2: Generator ibadah**

Rentang **dinamis relatif tanggal seed dijalankan**, bukan tanggal hardcode — supaya situs selalu menampilkan ibadah mendatang, tidak basi seminggu setelah seed. Catat alasan ini di docblock.

```ts
export async function seedSchedule() {
  const { db } = await import('@/db')
  const { worshipCategories, kolom, scheduleTemplates, worshipServices } = await import('@/db/schema')
  const { todayEastern, datesForWeekday } = await import('@/lib/datetime')

  if ((await db.$count(worshipServices)) > 0) return 0

  const cats = await db.select().from(worshipCategories)
  const catByKey = new Map(cats.map((c) => [c.key, c]))
  const kolomRows = await db.select().from(kolom)

  const from = todayEastern()
  const to = addDays(from, 56) // 8 minggu ke depan

  const templateRows = await db
    .insert(scheduleTemplates)
    .values(
      SCHEDULE_TEMPLATES.map((t) => {
        const cat = catByKey.get(t.categoryKey)
        if (!cat) throw new Error(`Kategori ${t.categoryKey} belum di-seed`)
        return {
          categoryId: cat.id,
          dayOfWeek: t.dayOfWeek,
          startTime: t.startTime,
          endTime: t.endTime,
          defaultLocationType: t.defaultLocationType,
        }
      }),
    )
    .returning()

  const services = []
  for (const tpl of templateRows) {
    const cat = cats.find((c) => c.id === tpl.categoryId)
    if (!cat) continue
    for (const date of datesForWeekday(from, to, tpl.dayOfWeek)) {
      // Kategori `kolom` → satu ibadah PER kolom aktif; lainnya satu per tanggal.
      const targets = cat.key === 'kolom' ? kolomRows : [null]
      for (const k of targets) {
        services.push(buildService({ tpl, cat, kolom: k, date, seq: services.length }))
      }
    }
  }

  await db.insert(worshipServices).values(services)
  return services.length
}
```

`buildService` memilih tema/bacaan/pelayan/tuan rumah dengan `seq % daftar.length` supaya berputar
deterministik, mengisi `hostFamilyName` HANYA saat `locationType === 'rumah'`, dan selalu menyetel
`status: 'published'`, `liturgyPdfUrl: null`.

Aturan isi:
- Kategori non-kolom → satu ibadah per tanggal template.
- Kategori `kolom` → satu ibadah **per kolom aktif** per tanggal (4 kolom = 4 entri), `kolomId` diisi, `hostFamilyName` berputar dari daftar nama keluarga placeholder.
- `locationType: 'rumah'` → `hostFamilyName` WAJIB diisi (Rencana 2a menemukan fallback yang menyesatkan kalau null).
- `themeId`/`themeEn`, `bibleReading`, `preacherName`, `liturgistName` diisi dari daftar placeholder yang berputar. `liturgyPdfUrl: null`.
- Semua `status: 'published'`.

Nama keluarga placeholder (Minahasa, wajar): `Kel. Mamahit`, `Kel. Rorimpandey`, `Kel. Tumbelaka`, `Kel. Wowor`, `Kel. Sondakh`, `Kel. Lumintang`.

Tema placeholder (id/en berpasangan): `Hidup dalam Syukur`/`Living in Gratitude`, `Dipanggil untuk Melayani`/`Called to Serve`, `Damai Sejahtera di Tengah Perubahan`/`Peace Amid Change`, `Kasih yang Menyembuhkan`/`Love That Heals`.

Bacaan: `Mazmur 23:1-6`, `2 Korintus 12:9-10`, `1 Tesalonika 5:16-18`, `Yohanes 15:9-12`.

- [ ] **Step 3: Helper rentang tanggal**

`datesForWeekday(fromISO, toISO, dayOfWeek)` sudah ada di `src/lib/datetime.ts`. Yang belum ada: menghitung `toISO` = 8 minggu setelah `fromISO`. Tambahkan ke `datetime.ts` (modul pemilik logika tanggal):

```ts
/** `YYYY-MM-DD` sejumlah `days` setelah `date`. Kalender murni, tanpa jam. */
export function addDays(date: string, days: number): string {
  const dt = utcMidnight(parseDate(date))
  dt.setUTCDate(dt.getUTCDate() + days)
  return dt.toISOString().slice(0, 10)
}
```

Test di `tests/unit/datetime.test.ts`:
```ts
describe('addDays', () => {
  it('menambah hari biasa', () => {
    expect(addDays('2026-09-04', 7)).toBe('2026-09-11')
  })
  it('menyeberang pergantian bulan', () => {
    expect(addDays('2026-08-30', 5)).toBe('2026-09-04')
  })
  it('menyeberang pergantian tahun', () => {
    expect(addDays('2026-12-30', 3)).toBe('2027-01-02')
  })
})
```

- [ ] **Step 4: Wire + test invarian**

`src/db/seed/index.ts` — panggil `seedSchedule()` setelah `seedKolom()` (butuh kategori & kolom sudah ada).

Perluas `tests/unit/seed-data.test.ts`:
```ts
describe('SCHEDULE_TEMPLATES', () => {
  it('menutup keenam kategori tepat sekali kecuali yang memang ganda', () => {
    const keys = SCHEDULE_TEMPLATES.map((t) => t.categoryKey)
    expect(new Set(keys).size).toBe(6)
  })
  it('dayOfWeek 0-6 dan startTime format HH:mm:ss', () => {
    for (const t of SCHEDULE_TEMPLATES) {
      expect(t.dayOfWeek).toBeGreaterThanOrEqual(0)
      expect(t.dayOfWeek).toBeLessThanOrEqual(6)
      expect(t.startTime).toMatch(/^\d{2}:\d{2}:\d{2}$/)
    }
  })
})
```

- [ ] **Step 5: Jalankan** — `pnpm db:seed` 2× (idempoten) ke Neon `dev`. Verifikasi jumlah baris `worship_services` > 0 dan ada entri per kategori. `pnpm test` + `pnpm typecheck`. **Commit** — `"Seed jadwal ibadah placeholder"`

---

## Task 4: `<CategoryBadge>` + `<ServiceCard>`

**Files:**
- Create: `src/components/schedule/category-badge.tsx`, `src/components/schedule/service-card.tsx`
- Modify: `messages/*.json` (+`jadwal_*` dasar)

**Interfaces:**
- Produces:
  - `<CategoryBadge category={{ nameId, nameEn, color }} />` — pill warna kategori.
  - `<ServiceCard service={UpcomingService} locale={'id'|'en'} href? />` — kartu satu ibadah.

- [ ] **Step 1: Key pesan** (KEDUA katalog)

`jadwal_at_church` ("di Gedung Gereja" / "at the church building"), `jadwal_at_home` ("di rumah {host}" / "at {host}"), `jadwal_location_tba` ("Lokasi menyusul" / "Location to be announced"), `jadwal_theme` ("Tema" / "Theme"), `jadwal_reading` ("Bacaan" / "Reading"), `jadwal_preacher` ("Pelayan Firman" / "Preacher"), `jadwal_liturgist` ("Pemimpin Ibadah" / "Liturgist"), `jadwal_download_liturgy` ("Unduh tata ibadah" / "Download the order of service").

- [ ] **Step 2: `<CategoryBadge>`**

`color` di DB berisi string CSS var (`var(--color-cat-jemaat)`) — dirender lewat `style`, karena Tailwind tidak bisa membuat kelas dinamis:

```tsx
export function CategoryBadge({ category, locale }: {
  category: { nameId: string; nameEn: string; color: string }
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
```

> Token `--color-cat-*` sudah divalidasi WCAG AA terhadap `text-surface` di KEDUA tema (Rencana 1 Task 8b). Jangan ganti pasangan warnanya.

- [ ] **Step 3: `<ServiceCard>`**

Isi: `<CategoryBadge>`, `formatServiceDateTime(serviceDate, startTime, locale)`, lokasi (gedung gereja vs `jadwal_at_home({host})`, fallback `jadwal_location_tba` bila `hostFamilyName` null), tema (locale), bacaan. Bila `href` diberikan, seluruh kartu dibungkus `<Link to="/jadwal/$id" params={{ id }}>` dengan focus-ring yang sama seperti `warta.tsx`.

Pakai `<Card>` dari `@/components/ui/card`. Ikuti temuan Rencana 2a: bila ada gambar cover, Card butuh `overflow-hidden pt-0` **kondisional** — kartu ibadah tidak punya cover, jadi tidak perlu.

- [ ] **Step 4:** render di `/tokens` untuk review visual KEDUA tema. `pnpm build`. **Commit** — `"Tambah badge kategori + kartu ibadah"`

---

## Task 5: Filter jadwal (query string) — TDD

**Files:**
- Create: `src/components/schedule/schedule-filters.tsx`
- Test: `tests/unit/schedule-filters.test.ts`

**Interfaces:**
- Produces:
  - `type ScheduleSearch = { view: 'daftar' | 'kalender'; kategori?: string; kolom?: string; bulan?: string }`
  - `parseScheduleSearch(raw: Record<string, unknown>): ScheduleSearch` — murni, memvalidasi & memberi default.
  - `<ScheduleFilters categories kolomList value onChange />`

- [ ] **Step 1: Test (TDD)**

```ts
import { describe, it, expect } from 'vitest'
import { parseScheduleSearch } from '@/components/schedule/schedule-filters'

describe('parseScheduleSearch', () => {
  it('default: tampilan daftar, tanpa filter', () => {
    expect(parseScheduleSearch({})).toEqual({ view: 'daftar' })
  })
  it('menerima view kalender + bulan', () => {
    expect(parseScheduleSearch({ view: 'kalender', bulan: '2026-09' })).toEqual({
      view: 'kalender', bulan: '2026-09',
    })
  })
  it('view tak dikenal jatuh ke daftar', () => {
    expect(parseScheduleSearch({ view: 'grafik' }).view).toBe('daftar')
  })
  it('bulan berformat salah dibuang', () => {
    expect(parseScheduleSearch({ view: 'kalender', bulan: 'September' }).bulan).toBeUndefined()
  })
  it('meneruskan kategori & kolom sebagai string', () => {
    const s = parseScheduleSearch({ kategori: 'kaum-ibu', kolom: 'abc' })
    expect(s.kategori).toBe('kaum-ibu')
    expect(s.kolom).toBe('abc')
  })
  it('nilai non-string dibuang', () => {
    expect(parseScheduleSearch({ kategori: 42 }).kategori).toBeUndefined()
  })
})
```

- [ ] **Step 2: Jalankan → gagal.** `pnpm vitest run tests/unit/schedule-filters.test.ts`

- [ ] **Step 3: Implementasi `parseScheduleSearch`**

```ts
const MONTH_RE = /^\d{4}-(0[1-9]|1[0-2])$/
const str = (v: unknown): string | undefined => (typeof v === 'string' && v ? v : undefined)

export function parseScheduleSearch(raw: Record<string, unknown>): ScheduleSearch {
  const view = raw.view === 'kalender' ? 'kalender' : 'daftar'
  const bulan = str(raw.bulan)
  return {
    view,
    kategori: str(raw.kategori),
    kolom: str(raw.kolom),
    bulan: bulan && MONTH_RE.test(bulan) ? bulan : undefined,
  }
}
```

- [ ] **Step 4: `<ScheduleFilters>`**

Baris tombol/`<select>`: "Semua" + 6 kategori; bila kategori terpilih = `kolom`, muncul `<select>` kedua berisi daftar kolom. Perubahan memanggil `onChange(next)`; route yang menuliskannya ke query string lewat `navigate({ search })`. Aksesibel: tiap kontrol punya `<label>` atau `aria-label`.

- [ ] **Step 5:** test lolos + `pnpm build`. **Commit** — `"Tambah filter jadwal berbasis query string"`

---

## Task 6: Pengelompokan tanggal + grid kalender — TDD

**Files:**
- Create: `src/components/schedule/month-calendar.tsx`
- Test: `tests/unit/schedule-group.test.ts`

**Interfaces:**
- Produces:
  - `groupByDate(services): Array<{ date: string; services: UpcomingService[] }>` — murni, urutan masuk dipertahankan.
  - `monthGrid(month: string): string[][]` — murni; `'2026-09'` → array minggu, tiap minggu 7 string `YYYY-MM-DD` (Minggu–Sabtu), termasuk tanggal bulan tetangga sebagai pengisi.
  - `<MonthCalendar month services selectedDate onSelectDate onChangeMonth />`

- [ ] **Step 1: Test (TDD)**

```ts
import { describe, it, expect } from 'vitest'
import { groupByDate, monthGrid } from '@/components/schedule/month-calendar'

const svc = (id: string, date: string) => ({ id, serviceDate: date }) as never

describe('groupByDate', () => {
  it('mengelompokkan per tanggal, urutan dipertahankan', () => {
    const out = groupByDate([svc('a', '2026-09-06'), svc('b', '2026-09-06'), svc('c', '2026-09-09')])
    expect(out.map((g) => g.date)).toEqual(['2026-09-06', '2026-09-09'])
    expect(out[0]?.services).toHaveLength(2)
  })
  it('array kosong → array kosong', () => {
    expect(groupByDate([])).toEqual([])
  })
})

describe('monthGrid', () => {
  it('tiap minggu berisi 7 hari', () => {
    for (const week of monthGrid('2026-09')) expect(week).toHaveLength(7)
  })
  it('minggu pertama memuat tanggal 1 bulan tsb', () => {
    expect(monthGrid('2026-09')[0]).toContain('2026-09-01')
  })
  it('dimulai hari Minggu', () => {
    // 2026-09-01 adalah Selasa → grid mulai 2026-08-30 (Minggu).
    expect(monthGrid('2026-09')[0]?.[0]).toBe('2026-08-30')
  })
  it('memuat hari terakhir bulan tsb', () => {
    expect(monthGrid('2026-09').flat()).toContain('2026-09-30')
  })
})
```

- [ ] **Step 2: Jalankan → gagal → Step 3: implementasi.**

`monthGrid` memakai aritmetika UTC-midnight (pola `utcMidnight` di `datetime.ts`) — kalender murni, tak ada konversi zona waktu, jadi aman di luar modul datetime. Ekspor keduanya dari `month-calendar.tsx`.

- [ ] **Step 4: `<MonthCalendar>`**

Grid 7 kolom. Tiap sel: nomor tanggal + titik warna per kategori yang ada ibadah hari itu (`style={{ backgroundColor: category.color }}`). Tanggal di luar bulan aktif diredupkan (`text-muted`). Sel yang punya ibadah adalah `<button>` dengan `aria-label` berisi tanggal + jumlah ibadah; klik memanggil `onSelectDate`. Navigasi bulan: dua `<button>` prev/next dengan `aria-label` dari key pesan.

- [ ] **Step 5:** test lolos + `pnpm build`. **Commit** — `"Tambah pengelompokan tanggal + grid kalender"`

---

## Task 7: `/jadwal` — tampilan Daftar

**Files:**
- Create: `src/routes/jadwal.tsx`
- Modify: `messages/*.json` (+`jadwal_*` halaman)

**Interfaces:** Consumes `listServices`, `listCategories`, `listKolom`, `parseScheduleSearch`, `<ScheduleFilters>`, `<ServiceCard>`, `groupByDate`, `pageMeta`, `formatDateLong`.

- [ ] **Step 1: Key** — `jadwal_title` ("Jadwal Ibadah" / "Worship Schedule"), `jadwal_subtitle`, `jadwal_empty` ("Belum ada ibadah terjadwal." / "No services scheduled yet."), `jadwal_view_list` ("Daftar" / "List"), `jadwal_view_calendar` ("Kalender" / "Calendar"), `jadwal_filter_all` ("Semua" / "All"), `jadwal_filter_category` ("Kategori" / "Category"), `jadwal_filter_kolom` ("Kolom" / "Kolom").

- [ ] **Step 2: Route + search params**

```tsx
export const Route = createFileRoute('/jadwal')({
  validateSearch: (raw: Record<string, unknown>) => parseScheduleSearch(raw),
  loaderDeps: ({ search }) => search,
  loader: ({ deps }) =>
    Promise.all([
      listServices({ data: { categorySlug: deps.kategori, kolomId: deps.kolom } }),
      listCategories(),
      listKolom(),
    ]),
  head: () =>
    pageMeta({
      path: '/jadwal',
      titleId: 'Jadwal Ibadah',
      titleEn: 'Worship Schedule',
      descId:
        'Jadwal ibadah GMIM Musafir Columbus Ohio — Ibadah Jemaat, kategorial, dan ibadah kolom di rumah anggota, lengkap dengan tema dan pelayan firman.',
      descEn:
        'Worship schedule of GMIM Musafir Columbus Ohio — congregational, category, and neighbourhood (kolom) services, with themes and preachers.',
      locale: getLocale(),
    }),
  component: Jadwal,
})
```

> `loaderDeps` WAJIB — tanpa itu loader tidak dijalankan ulang saat filter berubah.

- [ ] **Step 3: Komponen**

`<PageHero title={m.jadwal_title()} subtitle={m.jadwal_subtitle()} />`, lalu `<Container>` → `<Section>`:
- Toggle Daftar/Kalender: dua `<button>` yang `navigate({ search: (s) => ({ ...s, view }) })`.
- `<ScheduleFilters>`; perubahan menulis ke query string.
- Bila `view === 'daftar'`: `groupByDate(services)` → tiap grup `<h2>` `formatDateLong(date, locale)` lalu daftar `<ServiceCard href>`.
- `services.length === 0` → `<EmptyState title={m.jadwal_empty()} />`.
- Tampilan kalender menyusul di Task 8; sementara cabang `kalender` merender daftar yang sama (jangan biarkan layar kosong).

- [ ] **Step 4:** verifikasi `pnpm dev` — `/jadwal`, `/jadwal?kategori=kaum-ibu`, `/en/jadwal`. `pnpm build`. **Commit** — `"Tambah halaman Jadwal Ibadah (tampilan daftar)"`

---

## Task 8: `/jadwal` — tampilan Kalender

**Files:**
- Modify: `src/routes/jadwal.tsx`

- [ ] **Step 1: Rentang bulan di loader**

Saat `view === 'kalender'`, loader mengambil sebulan penuh, bukan "hari ini ke depan":

```ts
const bulan = deps.bulan ?? todayEastern().slice(0, 7)
const from = deps.view === 'kalender' ? `${bulan}-01` : undefined
const to = deps.view === 'kalender' ? lastDayOfMonth(bulan) : undefined
```

Tambahkan `lastDayOfMonth(month: string): string` ke `src/lib/datetime.ts` + testnya:
```ts
describe('lastDayOfMonth', () => {
  it('bulan 30 hari', () => expect(lastDayOfMonth('2026-09')).toBe('2026-09-30'))
  it('bulan 31 hari', () => expect(lastDayOfMonth('2026-12')).toBe('2026-12-31'))
  it('Februari tahun kabisat', () => expect(lastDayOfMonth('2028-02')).toBe('2028-02-29'))
  it('Februari tahun biasa', () => expect(lastDayOfMonth('2026-02')).toBe('2026-02-28'))
})
```

- [ ] **Step 2: Render**

`view === 'kalender'` → `<MonthCalendar>` + panel di bawahnya berisi `<ServiceCard>` untuk `selectedDate` (default: tanggal pertama bulan itu yang ada ibadah). Navigasi bulan menulis `bulan` ke query string.

- [ ] **Step 3:** verifikasi `/jadwal?view=kalender&bulan=2026-09` KEDUA tema + navigasi bulan. `pnpm test` + `pnpm build`. **Commit** — `"Tambah tampilan kalender pada Jadwal Ibadah"`

---

## Task 9: `/jadwal/$id` — detail + JSON-LD Event

**Files:**
- Create: `src/routes/jadwal_.$id.tsx`
- Modify: `messages/*.json` (+`jadwal_back`, `jadwal_share_wa`)

- [ ] **Step 1: Key** — `jadwal_back` ("Kembali ke jadwal" / "Back to the schedule"), `jadwal_share_wa` ("Bagikan lewat WhatsApp" / "Share on WhatsApp").

- [ ] **Step 2: Route + guard uuid**

Ikuti `src/routes/warta_.$id.tsx` persis:
```tsx
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

loader: async ({ params }) => {
  if (!UUID_RE.test(params.id)) throw notFound()
  const service = await getService({ data: params.id })
  if (!service) throw notFound()
  return service
},
```

- [ ] **Step 3: JSON-LD Event di `head()`**

Pakai varian `{ 'script:ld+json': {...} }` seperti `renungan_.$slug.tsx`:
```ts
{
  '@context': 'https://schema.org',
  '@type': 'Event',
  name: locale === 'id'
    ? (s.themeId ?? s.category.nameId)
    : (s.themeEn ?? s.category.nameEn),
  startDate: `${s.serviceDate}T${s.startTime}${easternOffset(s.serviceDate)}`,
  ...(s.endTime && {
    endDate: `${s.serviceDate}T${s.endTime}${easternOffset(s.serviceDate)}`,
  }),
  eventAttendanceMode: 'https://schema.org/OfflineEventAttendanceMode',
  eventStatus: 'https://schema.org/EventScheduled',
  location: {
    '@type': 'Place',
    name: s.locationType === 'gedung_gereja' ? SITE.name : (s.hostFamilyName ?? SITE.name),
    address: {
      '@type': 'PostalAddress',
      streetAddress: s.locationType === 'gedung_gereja' ? '895 Old Diley Road' : (s.hostAddress ?? '895 Old Diley Road'),
      addressLocality: 'Columbus',
      addressRegion: 'OH',
      addressCountry: 'US',
    },
  },
  organizer: { '@type': 'Organization', name: SITE.name, url: SITE.url },
}
```

> **Offset zona waktu:** jangan hardcode `-04:00`. Eastern berpindah EDT/EST. Tambahkan `easternOffset(date: string): string` ke `datetime.ts` (kembalikan `'-04:00'` atau `'-05:00'` dengan menanyakan `TZDate`), plus test di kedua sisi transisi DST:
```ts
describe('easternOffset', () => {
  it('musim panas = EDT', () => expect(easternOffset('2026-07-01')).toBe('-04:00'))
  it('musim dingin = EST', () => expect(easternOffset('2026-01-15')).toBe('-05:00'))
})
```

- [ ] **Step 4: Komponen**

`<h1>` = tema (locale) atau nama kategori bila tema kosong — halaman ini tanpa `<PageHero>`, jadi judul ini satu-satunya `<h1>`. Di bawahnya: `<CategoryBadge>`, `formatServiceDateTime`, lokasi lengkap (`hostAddress`, `locationNote` bila ada), bacaan, pelayan firman, pemimpin ibadah, tombol unduh PDF bila `liturgyPdfUrl`, tombol bagikan WhatsApp (`https://wa.me/?text=<encoded judul + URL>`), tautan kembali ke `/jadwal`.

- [ ] **Step 5:** verifikasi id nyata dari seed + id ngawur (harus 404, bukan 500). `pnpm build`. **Commit** — `"Tambah halaman detail ibadah + JSON-LD Event"`

---

## Task 10: `/pelayanan` — indeks

**Files:**
- Create: `src/routes/pelayanan.tsx`
- Modify: `messages/*.json` (+`pelayanan_*`)

- [ ] **Step 1: Key** — `pelayanan_title`, `pelayanan_subtitle`, dan deskripsi singkat tiap kategori: `pelayanan_desc_ibadah_jemaat`, `pelayanan_desc_kaum_bapa`, `pelayanan_desc_kaum_ibu`, `pelayanan_desc_pemuda_remaja`, `pelayanan_desc_sekolah_minggu`, `pelayanan_desc_kolom`. Isi ID & EN, 1–2 kalimat, sesuai fakta yang sudah diketahui: Ibadah Jemaat di gedung gereja; kategori lain berputar di rumah anggota.

> Deskripsi kategori ada di katalog i18n, BUKAN DB (spec §5.5).

- [ ] **Step 2: Route**

Loader `listCategories()`. Grid kartu: `<CategoryBadge>` + nama kategori + deskripsi (dipetakan dari `category.key` ke key pesan) + `<Link to="/pelayanan/$slug" params={{ slug: c.slug }}>`.

Pemetaan key → pesan ditulis eksplisit (bukan template string dinamis, karena Paraglide meng-compile fungsi per key):
```ts
const DESC = {
  ibadah_jemaat: () => m.pelayanan_desc_ibadah_jemaat(),
  kaum_bapa: () => m.pelayanan_desc_kaum_bapa(),
  kaum_ibu: () => m.pelayanan_desc_kaum_ibu(),
  pemuda_remaja: () => m.pelayanan_desc_pemuda_remaja(),
  sekolah_minggu: () => m.pelayanan_desc_sekolah_minggu(),
  kolom: () => m.pelayanan_desc_kolom(),
} as const satisfies Record<string, () => string>
```

- [ ] **Step 3:** verifikasi KEDUA locale. `pnpm build`. **Commit** — `"Tambah halaman indeks Pelayanan"`

---

## Task 11: `/pelayanan/$slug` + `/pelayanan/kolom`

**Files:**
- Create: `src/routes/pelayanan_.$slug.tsx`, `src/routes/pelayanan_.kolom.tsx`
- Modify: `messages/*.json` (+`pelayanan_schedule_title`, `pelayanan_coordinator`, `pelayanan_kolom_intro`, `pelayanan_kolom_list_title`, `pelayanan_back`)

**Interfaces:** Consumes `listServices({ data: { categorySlug } })`, `listCategories`, `listKolom`, `getSiteSettings` (untuk `pastoralContacts[slug]`).

- [ ] **Step 1: `/pelayanan/$slug`**

Route literal `pelayanan_.kolom.tsx` didahulukan TanStack di atas `$slug`, jadi `/pelayanan/kolom` tidak pernah masuk ke `$slug` — tidak perlu cabang kondisional.

Loader: `listCategories()` → cari `slug`; tidak ketemu → `throw notFound()`. Lalu `listServices({ data: { categorySlug: params.slug } })` + `getSiteSettings()`.

Render: `<PageHero title={nama kategori} subtitle={deskripsi}>`, section "Jadwal" berisi `groupByDate` → `<ServiceCard href>`, `<EmptyState>` bila kosong, dan kontak koordinator dari `pastoralContacts[slug]` bila ada (sembunyikan bila kosong — disiplin `.trim()` seperti `kunjungi.tsx`).

- [ ] **Step 2: `/pelayanan/kolom`**

Loader: `listKolom()` + `listServices({ data: { categorySlug: 'kolom' } })`.
Render: penjelasan sistem kolom (`pelayanan_kolom_intro`, pakai `<Paragraphs>`), daftar kolom (nama + koordinator bila ada), lalu jadwal **dikelompokkan per kolom** (bukan per tanggal) — tiap kolom `<SectionTitle as="h3">` lalu kartunya.

- [ ] **Step 3:** verifikasi `/pelayanan/kaum-ibu`, `/pelayanan/kolom`, `/pelayanan/ngawur` (404). `pnpm build`. **Commit** — `"Tambah halaman kategori Pelayanan + Kolom"`

---

## Task 12: Integrasi Beranda & Ibadah Live

**Files:**
- Modify: `src/components/site/beranda.tsx`, `src/routes/ibadah-live.tsx`

- [ ] **Step 1: Beranda**

Section "Ibadah Minggu Ini" kini punya data nyata dari seed. Ganti kartu buatan sendiri di `beranda.tsx` dengan `<ServiceCard>` (satu sumber tampilan). CTA hero `/jadwal` tetap `<a>` sampai Task 14 — JANGAN ubah jadi `<Link>` di task ini.

- [ ] **Step 2: Ibadah Live**

Ganti `live_next_note` statis dengan ibadah berikutnya sungguhan:
```ts
loader: () => Promise.all([getSiteSettings(), listUpcomingServices({ data: 1 })]),
```
Bila ada, tampilkan `formatServiceDateTime` + nama kategori; bila tidak, teks lama. Hapus penanda `TODO(2b)` di file ini.

- [ ] **Step 3:** verifikasi `/beranda` menampilkan "Ibadah Minggu Ini" (tak lagi kosong) dan `/ibadah-live` menampilkan ibadah berikutnya. `pnpm build`. **Commit** — `"Isi Ibadah Minggu Ini & jadwal berikutnya dengan data nyata"`

---

## Task 13: Persiapan peluncuran — `<HeroMedia>` + nav typed

**Files:**
- Create: `src/components/site/hero-media.tsx`
- Modify: `src/components/site/beranda.tsx`, `src/components/site/coming-soon.tsx`, `src/components/layout/site-header.tsx`, `src/components/site/site-map-footer.tsx`

> Semua langkah di sini AMAN dilakukan selagi `SITE.comingSoon` masih `true`. Task 14 yang membalik flag; memisahkannya membuat commit peluncuran sekecil mungkin.

- [ ] **Step 1: Ekstrak `<HeroMedia>`**

Blok video/poster/scrim di `beranda.tsx` dan `coming-soon.tsx` identik karakter-per-karakter kecuali `min-h-*` pada `<section>` dan fallback non-video (gradien di coming-soon, `<img>` di beranda). Ekstrak dengan slot fallback:

```tsx
export function HeroMedia({ poster, sources, fallback }: {
  poster: string
  sources: readonly { src: string; type: string }[]
  fallback: ReactNode
}) { … }
```

`<video>` + `<source>` + scrim `from-black/70 via-black/65 to-black/85` pindah ke sini. Kedua pemanggil meneruskan fallback-nya masing-masing. Hapus kedua penanda `TODO(2b)` soal HeroMedia.

> **`coming-soon.tsx` adalah halaman produksi yang sedang live.** Setelah refactor, verifikasi `/` masih byte-identik: jalankan dev server dari worktree di commit sebelum task ini, bandingkan HTML `/` dengan working tree. Catat buktinya di laporan. Jangan ubah logika reduced-motion/sound-toggle.

- [ ] **Step 2: Nav + footer jadi `<Link>` typed**

Sekarang `/pelayanan` dan `/jadwal` sudah ada, jadi `<Link to>` typed bisa dipakai. Di `site-header.tsx`: ubah `NAV_ITEMS` dari `<a href={localizeHref(path)}>` menjadi `<Link to={path}>`. Karena `to` harus literal untuk type-safety, ganti struktur data menjadi array elemen atau map eksplisit — jangan paksakan string dinamis lalu di-cast.

Di `site-map-footer.tsx`: dua `<a href>` untuk `/pelayanan` dan `/jadwal` → `<Link to>`. Di `beranda.tsx`: CTA hero `/jadwal` → `<Link to="/jadwal">`. Hapus keempat penanda `TODO(2b)` terkait.

- [ ] **Step 3:** `pnpm test:e2e` (nav masih tersembunyi selagi coming-soon, tapi footer & Beranda ikut berubah). `pnpm build`. **Commit** — `"Ekstrak HeroMedia + naikkan nav ke Link typed"`

---

## Task 14: PELUNCURAN — balik `SITE.comingSoon`

**Files:**
- Modify: `src/config/site.ts`, `src/routes/index.tsx`, `src/routes/sitemap[.]xml.ts`, `tests/unit/seo.test.ts`, `tests/e2e/public-pages.spec.ts`
- Delete: `src/components/site/coming-soon.tsx`, `src/routes/_dev.beranda.tsx`

> **SATU commit atomik.** Peluncuran sebagian memasang tautan rusak di situs live gereja. Kerjakan seluruh checklist sebelum commit.

- [ ] **Step 1: Prasyarat — verifikasi route sudah ada**

`ls src/routes/pelayanan.tsx src/routes/jadwal.tsx` harus keduanya ada. Bila belum, HENTIKAN — Task 7 & 10 belum selesai.

- [ ] **Step 2: Balik flag**

`src/config/site.ts` → `comingSoon: false`. Perbarui docblock (masih menyebut "Rencana 2"). Hapus penanda `TODO(2b)` di situ.

- [ ] **Step 3: `index.tsx`**

Hapus indireksi `comingSoon`, kedua ternary, import `<ComingSoon>`, dan seluruh blok `head()` coming-soon inline (yang di-preserve byte-identik selama 2a). Loader dan `pageMeta` jadi tanpa syarat.

> Canonical `/` berubah dari `https://gmimmusafir.org/` menjadi `https://gmimmusafir.org` (tanpa slash). Ini **disengaja** — bentuk tanpa slash yang lebih benar, sudah dicatat di ledger 2a.

- [ ] **Step 4: Hapus file**

`git rm src/components/site/coming-soon.tsx src/routes/_dev.beranda.tsx`. Pastikan tak ada import yang tersisa (`grep -rn "coming-soon\|_dev.beranda" src/ tests/`).

- [ ] **Step 5: Sitemap**

`sitemap[.]xml.ts`: tambahkan `/pelayanan` dan `/jadwal` ke `STATIC_PATHS`; tambahkan entri dinamis `/jadwal/<id>` dari ibadah published (pakai `listServices`); hapus cabang `comingSoon` yang kini mati beserta penandanya.

- [ ] **Step 6: Test**

`tests/unit/seo.test.ts`: `pageMeta` berhenti memancarkan `noindex` — balik asersinya, hapus penanda.
`tests/e2e/public-pages.spec.ts`: `PUBLIC_PATHS` buang `/beranda`, tambah `/`, `/jadwal`, `/pelayanan`; asersi sitemap diperluas dari "home saja" menjadi daftar penuh. Hapus kedua penanda.

- [ ] **Step 7: Verifikasi menyeluruh**

```bash
grep -rn "TODO(2b)" src/ tests/    # HARUS kosong
pnpm build && pnpm typecheck && pnpm lint && pnpm test && pnpm test:e2e
```
Lalu `pnpm dev` dan periksa dengan parse HTML (bukan `grep` — file SSR satu baris raksasa):
- `/` menampilkan Beranda, 1 canonical + 3 hreflang, TANPA `noindex`.
- Ketujuh menu header muncul dan semuanya 200 (tidak ada 404).
- `/sitemap.xml` memuat kedelapan path statis + `/pelayanan` + `/jadwal`.

- [ ] **Step 8: Commit** — `"Luncurkan situs publik: SITE.comingSoon = false"`

---

## Task 15: e2e Jadwal & Pelayanan

**Files:**
- Create: `tests/e2e/jadwal.spec.ts`

- [ ] **Step 1: Kasus uji**

- `/jadwal` → 200, satu `<h1>` non-kosong, minimal satu `<ServiceCard>` tampil.
- Filter: klik kategori "Kaum Ibu" → URL memuat `kategori=kaum-ibu`, dan setiap badge kategori yang tampil berbunyi "Wanita/Kaum Ibu". Gunakan `expect.poll` untuk asersi yang berlomba dengan hidrasi (pola `theme.spec.ts`).
- Toggle kalender → URL memuat `view=kalender`, grid muncul; klik tanggal yang punya ibadah → panel di bawah menampilkan kartu.
- `/jadwal` → klik kartu pertama → URL `/jadwal/<uuid>` → tema & badge kategori tampil.
- `/jadwal/bukan-uuid` → 404 (bukan 500).
- `/pelayanan` → 200, enam kartu kategori.
- `/pelayanan/kolom` → 200, daftar kolom tampil.
- `/en/jadwal` → 200, `<html lang="en">`.

- [ ] **Step 2:** `pnpm test:e2e` 3× hijau (kedua project). `pnpm lint` + `pnpm typecheck` + `pnpm build`. **Commit** — `"Tambah e2e Jadwal & Pelayanan"`

---

## Self-Review

**Cakupan spec §3.2 — Rencana 2b:**

| Item spec | Task |
|---|---|
| Pelayanan: indeks 6 kategori | 10 |
| Pelayanan: halaman kategori + jadwalnya + kontak koordinator | 11 |
| Pelayanan: halaman Kolom (penjelasan + daftar + jadwal per kolom) | 11 |
| Jadwal: daftar "Ibadah Mendatang" dikelompokkan per tanggal | 6, 7 |
| Jadwal: kalender bulanan + navigasi + panel per tanggal | 6, 8 |
| Jadwal: filter kategori/kolom tercermin di query string | 5, 7 |
| Jadwal: kartu (badge, jam, lokasi, tema, bacaan, pelayan, PDF) | 4 |
| Jadwal: detail + JSON-LD Event + bagikan WhatsApp | 9 |
| Beranda: "Ibadah Minggu Ini" data nyata | 12 |
| Ibadah Live: jadwal berikutnya sungguhan | 12 |
| §3.1 nav 7 menu aktif | 13, 14 |
| Peluncuran (`comingSoon = false`) + 16 penanda lockstep | 14 |
| §5.2 data jadwal ter-seed | 3 |

**Ditunda ke Rencana 3 (admin):** seluruh CRUD; generator jadwal dari template lewat UI; upload PDF tata ibadah ke Vercel Blob; pengurus mengganti konten placeholder.

**Konsistensi tipe:** `UpcomingService` (Rencana 2a, diperluas `category.slug` di Task 2) dikonsumsi Task 4, 7, 8, 9, 11, 12. `ScheduleSearch` + `parseScheduleSearch` (Task 5) dipakai Task 7 & 8. `groupByDate`/`monthGrid` (Task 6) dipakai Task 7, 8, 11. `<ServiceCard>` (Task 4) dipakai Task 7, 8, 11, 12. `addDays`/`lastDayOfMonth`/`easternOffset` masuk `datetime.ts` (Task 3, 8, 9) — modul pemilik logika tanggal.

**Risiko:**
- Drizzle relational query tak bisa `where` pada relasi → Task 2 meresolusi slug→id lebih dulu; slug tak dikenal mengembalikan `[]`, bukan seluruh jadwal.
- `loaderDeps` mudah terlupa pada route dengan search params → filter tampak tak berfungsi. Ditandai eksplisit di Task 7.
- Offset Eastern untuk JSON-LD `Event` berpindah EDT/EST → Task 9 menambah `easternOffset()` bertest, bukan offset hardcode.
- Seed jadwal memakai rentang dinamis relatif tanggal jalan → e2e harus menyatakan "ada minimal satu kartu", bukan tanggal spesifik.
- Task 14 menyentuh halaman produksi yang live → dipecah (Task 13 menyerap refactor yang aman), dan Task 13 mewajibkan bukti byte-identik `/` setelah ekstraksi `<HeroMedia>`.

# Rencana 3b — Jadwal Ibadah Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Pengurus bisa mengelola jadwal ibadah sendiri lewat dashboard — membuat, mengubah, menerbitkan, menghapus — dan mengisi jadwal berminggu-minggu ke depan lewat generator berpratinjau, menutup tenggat 29 Oktober 2026 saat jadwal hasil seed habis.

**Architecture:** Dua migrasi prasyarat memulihkan idempotensi database lebih dulu (backfill `templateId`, lalu perkuat unique jadi NULLS NOT DISTINCT) — urutannya tidak bisa dibalik. Di atasnya, satu file mutasi per domain dengan pola `ensureAdmin() → validasi Zod → tulis`. Generator dipisah jadi fungsi murni yang bisa diuji tanpa database, dan lapisan tipis yang menulisnya.

**Tech Stack:** TanStack Start (React 19), Drizzle ORM + Postgres (Neon), Zod v4, Tailwind CSS v4, shadcn/ui, Vitest, Playwright.

**Spec:** `docs/superpowers/specs/2026-09-07-rencana-3-admin-dashboard.md` (§Fase 2)

**Handoff wajib dibaca:** `docs/dev/rencana-3a-handoff.md` §1 — dua pemblokir yang Task 1 dan 2 di sini menyelesaikannya.

## Global Constraints

- **Token saja** — tanpa class `dark:`, tanpa hex literal di komponen. Satu pengecualian terdokumentasi: `style={{ backgroundColor: category.color }}` di `<CategoryBadge>`.
- **Benar di kedua tema** — semua pasangan teks/latar ≥ WCAG AA (4.5:1 teks normal, 3:1 UI).
- **Dwibahasa** — tiap kunci UI ada di `messages/id.json` DAN `messages/en.json`, nama kunci identik.
- `src/components/ui/**` prettier-ignored; jangan jalankan prettier di sana.
- **Bahasa komentar & commit: Indonesia.**
- **Gerbang hijau tiap task**: `pnpm lint`, `pnpm typecheck`, `pnpm build`, `pnpm test` (baseline **203** unit), `pnpm test:e2e` (baseline **125** lulus + 3 skipped).
- **Jangan pernah menjalankan dua `pnpm test:e2e` bersamaan** — Playwright memakai `reuseExistingServer`; run tumpang tindih menghasilkan kegagalan palsu. Bersihkan dengan `lsof -ti:3000` kalau ragu.
- **Tiap route admin baru**: taruh di bawah `admin._app`, panggil `ensureAdmin()` di server fn-nya, DAN tambahkan path-nya ke daftar gerbang di `tests/e2e/admin.spec.ts`.
- **`DATABASE_URL` menunjuk database yang melayani situs live.** Tiap migrasi diperiksa isinya sebelum dijalankan.

---

## Keadaan database saat plan ini ditulis

Diverifikasi langsung (read-only) sebelum plan disusun — angka-angka ini yang membuat Task 1 aman:

| Fakta | Nilai |
|---|---|
| `schedule_templates` | 6 baris, **tidak ada duplikat** — tiap `(category_id, day_of_week, start_time)` unik |
| `worship_services` | 72 baris |
| `worship_services` dengan `template_id` terisi | **0** |
| Baris pernah disunting (`updated_at <> created_at`) | **0** |
| Service tanpa template yang cocok | **0** |

Artinya backfill Task 1 deterministik dan mencakup seluruh 72 baris, dan tidak ada editan pengurus yang bisa tertimpa.

Catatan: `ibadah_jemaat` dan `sekolah_minggu` sama-sama `day_of_week` 0 **dan** `start_time` 10:00:00 — yang membedakan hanya `category_id`. Kunci pencocokan karena itu wajib bertiga.

---

## File Structure

| File | Tanggung jawab |
|---|---|
| `drizzle/0004_*.sql` (generated) | Backfill `template_id` |
| `drizzle/0005_*.sql` (generated) | Unique jadi NULLS NOT DISTINCT |
| `src/db/schema/worship.ts` (modify) | `uniqueIndex` → `unique().nullsNotDistinct()` |
| `tests/unit/schema-index.test.ts` (modify) | Kunci semantik NULL, bukan cuma nama kolom |
| `src/features/schedule/admin-queries.ts` (create) | Baca jadwal untuk admin (termasuk draft) |
| `src/features/schedule/mutations.ts` (create) | Buat/ubah/hapus/ubah status + skema Zod |
| `src/features/schedule/generator.ts` (create) | Fungsi murni perencana + server fn penerap |
| `tests/unit/schedule-generator.test.ts` (create) | Uji perencana tanpa database |
| `tests/unit/schedule-validation.test.ts` (create) | Uji skema Zod |
| `src/routes/admin._app.jadwal.tsx` (create) | Daftar jadwal |
| `src/routes/admin._app.jadwal.baru.tsx` (create) | Form buat |
| `src/routes/admin._app.jadwal.$id.tsx` (create) | Form ubah |
| `src/routes/admin._app.jadwal.generator.tsx` (create) | Pratinjau + terapkan |
| `src/components/admin/service-form.tsx` (create) | Form dipakai buat & ubah |
| `tests/e2e/admin-jadwal.spec.ts` (create) | Alur end-to-end |
| `messages/{id,en}.json` (modify) | Kunci UI |

---

## Task 1: Backfill `template_id` pada 72 baris lama

Pemblokir §1.1 handoff. Tanpa ini, `onConflictDoNothing` generator tidak pernah cocok dengan baris yang sudah ada, dan setiap tanggal sampai 2026-10-29 mendapat ibadah kembar di situs yang dibaca jemaat.

**Files:**
- Create: `drizzle/0004_*.sql` (tulis tangan — lihat Step 2)
- Test: `tests/unit/schema-index.test.ts` (belum disentuh di task ini)

**Interfaces:**
- Consumes: —
- Produces: seluruh `worship_services.template_id` terisi. Task 2 bersandar penuh pada ini — tanpa backfill, migrasinya ditolak Postgres.

- [ ] **Step 1: Rekam keadaan sebelum**

```bash
cat > zz-probe.mjs <<'EOF'
import 'dotenv/config'
import pg from 'pg'
const c = new pg.Client({ connectionString: process.env.DATABASE_URL })
await c.connect()
const q = async (s) => (await c.query(s)).rows
console.log('total          :', (await q('select count(*)::int n from worship_services'))[0].n)
console.log('template terisi:', (await q('select count(template_id)::int n from worship_services'))[0].n)
console.log('tak ada template cocok:', (await q(`select count(*)::int n from worship_services s
  where not exists (select 1 from schedule_templates t
    where t.category_id=s.category_id
      and t.day_of_week=extract(dow from s.service_date)::int
      and t.start_time=s.start_time)`))[0].n)
await c.end()
EOF
npx tsx zz-probe.mjs; rm -f zz-probe.mjs
```

Expected: `total 72`, `template terisi 0`, `tak ada template cocok 0`.

**Kalau "tak ada template cocok" bukan 0, HENTIKAN** dan laporkan BLOCKED — artinya ada service yang tidak bisa dipetakan ke template mana pun, dan backfill akan meninggalkan NULL yang membuat Task 2 gagal.

- [ ] **Step 2: Tulis migrasi backfill**

Migrasi ini murni data, bukan schema, jadi drizzle-kit tidak akan menghasilkannya — tulis tangan. Buat `drizzle/0004_backfill_template_id.sql`:

```sql
-- Backfill `template_id` pada worship_services yang lahir dari seed Rencana 2b.
-- Seed sengaja menyetel NULL untuk menghindari bentrok index dua-kolom yang
-- lama; migrasi 0002 sudah membetulkan bentuk index itu, jadi keterhubungan
-- template -> ibadah kini bisa dipulihkan.
--
-- Kunci pencocokan bertiga: category_id + day_of_week + start_time. Bertiga
-- karena `ibadah_jemaat` dan `sekolah_minggu` sama-sama Minggu 10:00 — hanya
-- kategorinya yang membedakan.
--
-- Diverifikasi sebelum ditulis: 6 template tanpa duplikat pada kunci itu, dan
-- 0 dari 72 baris tanpa template yang cocok. Jadi pemetaan ini deterministik.
UPDATE "worship_services" s
SET "template_id" = t."id"
FROM "schedule_templates" t
WHERE s."template_id" IS NULL
  AND t."category_id" = s."category_id"
  AND t."day_of_week" = EXTRACT(DOW FROM s."service_date")::int
  AND t."start_time" = s."start_time";
```

- [ ] **Step 3: Daftarkan migrasi ke journal drizzle**

drizzle-kit melacak migrasi lewat `drizzle/meta/_journal.json`. Karena file ini ditulis tangan, tambahkan entri-nya secara manual mengikuti bentuk entri yang sudah ada — `idx` berikutnya, `tag` sama dengan nama file tanpa `.sql`, `when` epoch milidetik saat ini, `breakpoints` true.

Jangan menyalin `0003_snapshot.json` jadi `0004_snapshot.json`: migrasi ini tidak mengubah schema, jadi snapshot terakhir tetap menggambarkan keadaan yang benar. drizzle-kit hanya membaca snapshot saat MEN-generate migrasi baru, dan Task 2 akan menghasilkan snapshot-nya sendiri.

- [ ] **Step 4: Jalankan migrasi**

Run: `pnpm db:migrate`
Expected: `migrations applied successfully`.

- [ ] **Step 5: Verifikasi hasilnya**

Ulangi probe Step 1.
Expected: `total 72`, **`template terisi 72`**, `tak ada template cocok 0`.

Kalau `template terisi` bukan 72, HENTIKAN dan laporkan angkanya — Task 2 akan gagal dan tidak boleh dicoba.

- [ ] **Step 6: Gerbang penuh**

Run: `pnpm lint && pnpm typecheck && pnpm test && pnpm build`
Expected: semua hijau, 203 unit test (task ini tidak menambah test — perubahannya data, dan pembuktiannya ada di Step 5).

- [ ] **Step 7: Commit**

```bash
git add drizzle/
git commit -m "Backfill template_id pada 72 ibadah hasil seed

Pemblokir §1.1 handoff 3a. Seed Rencana 2b menyetel template_id NULL di
semua baris untuk menghindari bentrok index dua-kolom yang lama; migrasi
0002 sudah membetulkan bentuk index itu, tapi keterhubungan template ->
ibadah tak pernah dipulihkan — 0 dari 72 baris punya template_id.

Akibatnya generator jadwal yang mengandalkan onConflictDoNothing tidak
akan pernah cocok dengan baris lama, dan setiap tanggal sampai 2026-10-29
mendapat ibadah kembar di situs yang dibaca jemaat.

Kunci pencocokan bertiga (category_id + day_of_week + start_time) karena
ibadah_jemaat dan sekolah_minggu sama-sama Minggu 10:00. Diverifikasi
sebelum dijalankan: 6 template tanpa duplikat pada kunci itu, 0 baris
tanpa template yang cocok, dan 0 baris pernah disunting pengurus.

Sesudah: 72 dari 72 terisi."
```

---

## Task 2: Perkuat unique jadi NULLS NOT DISTINCT

Pemblokir §1.2 handoff. Index `(template_id, service_date, kolom_id)` sudah benar bentuknya, tapi `kolom_id` NULL untuk lima kategori non-kolom, dan Postgres menganggap NULL distinct — jadi idempotensi untuk kelima kategori itu masih nol.

**Files:**
- Modify: `src/db/schema/worship.ts`
- Create: `drizzle/0005_*.sql` (via `pnpm db:generate`)
- Test: `tests/unit/schema-index.test.ts`

**Interfaces:**
- Consumes: `template_id` terisi penuh (Task 1).
- Produces: constraint `ws_template_date_uq` yang menolak duplikat meski `kolom_id` NULL. Task 7 dan 8 bersandar pada ini untuk idempotensi generator.

- [ ] **Step 1: Tulis test yang gagal**

Ganti isi `tests/unit/schema-index.test.ts` dengan versi yang menguji **semantik**, bukan cuma nama kolom. Test lama tetap hijau menembus cacat ini — itu sebabnya diganti:

```ts
import { readFileSync, readdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, it, expect } from 'vitest'
import { getTableConfig } from 'drizzle-orm/pg-core'
import { worshipServices } from '@/db/schema'

/**
 * Dua hal dijaga di sini, dan versi pertama test ini hanya menjaga yang pertama.
 *
 * 1. BENTUK — kolom apa saja yang masuk unique. Dibaca dari definisi Drizzle,
 *    jadi jalan tanpa Postgres.
 * 2. SEMANTIK NULL — apakah dua baris dengan `kolom_id` sama-sama NULL dianggap
 *    bentrok. Ini yang benar-benar menentukan idempotensi generator untuk lima
 *    kategori non-kolom (kolom_id selalu NULL di sana), dan bentuk saja tidak
 *    bisa membuktikannya: index tiga-kolom yang "benar" tetap nol proteksi
 *    tanpa NULLS NOT DISTINCT. Dibaca dari SQL migrasi — artefak yang benar-
 *    benar dijalankan Postgres, bukan dari niat yang tertulis di schema.
 */
const DRIZZLE = fileURLToPath(new URL('../../drizzle', import.meta.url))

/** Gabungan seluruh SQL migrasi, urut nama file. */
function allMigrationSql(): string {
  return readdirSync(DRIZZLE)
    .filter((f) => f.endsWith('.sql'))
    .sort()
    .map((f) => readFileSync(`${DRIZZLE}/${f}`, 'utf8'))
    .join('\n')
}

describe('worship_services — ws_template_date_uq', () => {
  const { uniqueConstraints, indexes } = getTableConfig(worshipServices)

  it('mencakup ketiga kolom — tanpa kolom_id, fan-out kolom bentrok', () => {
    const uq = uniqueConstraints.find((c) => c.name === 'ws_template_date_uq')
    const idx = indexes.find((i) => i.config.name === 'ws_template_date_uq')
    const cols =
      uq?.columns.map((c) => c.name) ??
      idx?.config.columns.map((c: unknown) => (c as { name?: string }).name)
    expect(cols).toEqual(['template_id', 'service_date', 'kolom_id'])
  })

  it('memperlakukan NULL sebagai SAMA — tanpa ini, lima kategori non-kolom nol idempotensi', () => {
    const sql = allMigrationSql()
    // Cari pernyataan terakhir yang membuat constraint/index bernama itu.
    const statements = sql.split(';').filter((s) => s.includes('ws_template_date_uq'))
    const last = statements.at(-1) ?? ''
    expect(last.toUpperCase()).toContain('NULLS NOT DISTINCT')
  })
})
```

- [ ] **Step 2: Jalankan test — pastikan GAGAL**

Run: `pnpm test tests/unit/schema-index.test.ts`
Expected: test pertama LULUS (bentuknya sudah benar sejak migrasi 0002), test kedua **GAGAL** — belum ada `NULLS NOT DISTINCT` di migrasi mana pun.

- [ ] **Step 3: Ubah schema**

Di `src/db/schema/worship.ts`, `.nullsNotDistinct()` tidak tersedia pada `uniqueIndex()` di drizzle 0.45 — hanya pada `unique()`. Jadi ganti bentuknya. Tambahkan `unique` ke import dari `drizzle-orm/pg-core`, hapus `uniqueIndex` kalau tak terpakai lagi, lalu ganti baris index dengan:

```ts
    // Unique WAJIB mencakup kolomId DAN memperlakukan NULL sebagai sama.
    //
    // kolomId membedakan empat ibadah kategori `kolom` pada tanggal & template
    // yang sama. Tapi kolomId NULL untuk lima kategori lain, dan Postgres
    // menganggap NULL distinct secara default — artinya tanpa nullsNotDistinct,
    // constraint ini nol proteksi justru untuk mayoritas baris, dan generator
    // yang menjalankan rentang tumpang tindih akan menduplikasi diam-diam.
    //
    // `unique()`, bukan `uniqueIndex()`: di drizzle-orm 0.45 `.nullsNotDistinct()`
    // hanya ada di UniqueConstraintBuilder.
    unique('ws_template_date_uq').on(t.templateId, t.serviceDate, t.kolomId).nullsNotDistinct(),
```

- [ ] **Step 4: Hasilkan migrasi**

Run: `pnpm db:generate`

Baca `drizzle/0005_*.sql`. Yang diharapkan: `DROP INDEX "ws_template_date_uq"` lalu `ALTER TABLE ... ADD CONSTRAINT "ws_template_date_uq" UNIQUE NULLS NOT DISTINCT ("template_id","service_date","kolom_id")`.

**Kalau memuat `DROP TABLE`, `DROP COLUMN`, atau menyentuh tabel lain — JANGAN jalankan `pnpm db:migrate`.** Hentikan dan laporkan isinya.

- [ ] **Step 5: Jalankan test — pastikan LULUS**

Run: `pnpm test tests/unit/schema-index.test.ts`
Expected: kedua test PASS.

- [ ] **Step 6: Terapkan migrasi**

Run: `pnpm db:migrate`
Expected: sukses.

Kalau Postgres menolak dengan pelanggaran unique, itu berarti Task 1 tidak tuntas — **jangan** menghapus baris untuk memaksanya lolos. Hentikan, laporkan, dan periksa ulang backfill.

- [ ] **Step 7: Buktikan constraint benar-benar menolak duplikat**

```bash
cat > zz-probe.mjs <<'EOF'
import 'dotenv/config'
import pg from 'pg'
const c = new pg.Client({ connectionString: process.env.DATABASE_URL })
await c.connect()
const one = (await c.query(`select template_id, service_date, kolom_id, category_id,
  start_time, location_type, status from worship_services where kolom_id is null limit 1`)).rows[0]
try {
  await c.query('begin')
  await c.query(`insert into worship_services
    (template_id, service_date, kolom_id, category_id, start_time, location_type, status)
    values ($1,$2,$3,$4,$5,$6,$7)`,
    [one.template_id, one.service_date, one.kolom_id, one.category_id,
     one.start_time, one.location_type, one.status])
  console.log('HASIL: insert LOLOS → constraint TIDAK bekerja')
} catch (e) {
  console.log('HASIL: insert DITOLAK → constraint bekerja:', e.code, e.constraint ?? '')
} finally {
  await c.query('rollback')
  await c.end()
}
EOF
npx tsx zz-probe.mjs; rm -f zz-probe.mjs
```

Expected: `insert DITOLAK`, kode `23505`. Seluruhnya di dalam transaksi yang di-rollback, jadi tidak ada baris yang benar-benar ditulis.

- [ ] **Step 8: Gerbang penuh**

Run: `pnpm lint && pnpm typecheck && pnpm test && pnpm build`
Expected: hijau, 203 unit test (jumlah tetap — test lama diganti, bukan ditambah).

- [ ] **Step 9: Commit**

```bash
git add src/db/schema/worship.ts drizzle/ tests/unit/schema-index.test.ts
git commit -m "Perkuat ws_template_date_uq: NULLS NOT DISTINCT

Pemblokir §1.2 handoff 3a. Bentuk tiga-kolom dari migrasi 0002 menutup
fan-out kategori kolom, tapi kolom_id NULL untuk lima kategori lain dan
Postgres menganggap NULL distinct — jadi idempotensi untuk mayoritas baris
masih nol. Generator yang dijalankan dua kali, atau dengan rentang tumpang
tindih, akan menduplikasi kelima kategori itu tanpa error apa pun.

unique() bukan uniqueIndex(): di drizzle-orm 0.45 .nullsNotDistinct() hanya
ada di UniqueConstraintBuilder.

Test schema-index diganti, bukan ditambah: versi lama mengunci nama & urutan
kolom tapi diam soal semantik NULL, sehingga tetap hijau menembus cacat ini.
Versi baru membaca SQL migrasi — artefak yang benar-benar dijalankan Postgres
— dan diverifikasi merah lebih dulu. Constraint juga dibuktikan menolak
duplikat sungguhan lewat insert di dalam transaksi yang di-rollback (23505)."
```

---

## Task 3: Server fn baca jadwal untuk admin

Halaman publik hanya membaca `status: 'published'`. Admin butuh melihat draft juga, plus filter dan paging.

**Files:**
- Create: `src/features/schedule/admin-queries.ts`

**Interfaces:**
- Consumes: `ensureAdmin` dari `@/lib/auth.functions`.
- Produces:
  - `listServicesForAdmin(filter?: AdminServiceFilter): Promise<AdminServiceRow[]>`
  - `getServiceForAdmin(id: string): Promise<AdminServiceDetail | null>`
  - `type AdminServiceFilter = { from?: string; to?: string; categoryId?: string; status?: 'draft' | 'published' }`

- [ ] **Step 1: Tulis modulnya**

Buat `src/features/schedule/admin-queries.ts`:

```ts
import { createServerFn } from '@tanstack/react-start'
import { ensureAdmin } from '@/lib/auth.functions'

export type AdminServiceFilter = {
  from?: string
  to?: string
  categoryId?: string
  status?: 'draft' | 'published'
}

export type AdminServiceRow = {
  id: string
  serviceDate: string
  startTime: string
  status: 'draft' | 'published'
  categoryNameId: string
  categoryColor: string
  kolomName: string | null
  themeId: string | null
}

export type AdminServiceDetail = AdminServiceRow & {
  categoryId: string
  kolomId: string | null
  templateId: string | null
  endTime: string | null
  locationType: 'gedung_gereja' | 'rumah'
  hostFamilyName: string | null
  hostAddress: string | null
  locationNote: string | null
  themeEn: string | null
  bibleReading: string | null
  preacherName: string | null
  liturgistName: string | null
}

/**
 * Daftar jadwal untuk dashboard. Berbeda dari `listServices` publik dalam dua
 * hal yang disengaja: ia menampilkan draft (pengurus perlu melihat yang belum
 * terbit), dan ia tidak memaksa `from = hari ini` (pengurus perlu meninjau dan
 * membetulkan jadwal yang sudah lewat).
 *
 * `ensureAdmin()` dipanggil di sini, bukan hanya di route: route yang dijaga
 * tidak menghalangi siapa pun memanggil server fn ini langsung lewat HTTP.
 */
export const listServicesForAdmin = createServerFn({ method: 'GET' })
  .validator((f: AdminServiceFilter = {}) => f)
  .handler(async ({ data: f }): Promise<AdminServiceRow[]> => {
    await ensureAdmin()
    const { db } = await import('@/db')

    const rows = await db.query.worshipServices.findMany({
      where: (s, { and, eq, gte, lte }) =>
        and(
          f.from ? gte(s.serviceDate, f.from) : undefined,
          f.to ? lte(s.serviceDate, f.to) : undefined,
          f.categoryId ? eq(s.categoryId, f.categoryId) : undefined,
          f.status ? eq(s.status, f.status) : undefined,
        ),
      orderBy: (s, { asc }) => [asc(s.serviceDate), asc(s.startTime)],
      limit: 500,
      with: {
        category: { columns: { nameId: true, color: true } },
        kolom: { columns: { name: true } },
      },
    })

    return rows.map((r) => ({
      id: r.id,
      serviceDate: r.serviceDate,
      startTime: r.startTime,
      status: r.status,
      categoryNameId: r.category.nameId,
      categoryColor: r.category.color,
      kolomName: r.kolom?.name ?? null,
      themeId: r.themeId,
    }))
  })

export const getServiceForAdmin = createServerFn({ method: 'GET' })
  .validator((id: string) => id)
  .handler(async ({ data: id }): Promise<AdminServiceDetail | null> => {
    await ensureAdmin()
    const { db } = await import('@/db')

    const r = await db.query.worshipServices.findFirst({
      where: (s, { eq }) => eq(s.id, id),
      with: {
        category: { columns: { nameId: true, color: true } },
        kolom: { columns: { name: true } },
      },
    })
    if (!r) return null

    return {
      id: r.id,
      serviceDate: r.serviceDate,
      startTime: r.startTime,
      status: r.status,
      categoryNameId: r.category.nameId,
      categoryColor: r.category.color,
      kolomName: r.kolom?.name ?? null,
      themeId: r.themeId,
      categoryId: r.categoryId,
      kolomId: r.kolomId,
      templateId: r.templateId,
      endTime: r.endTime,
      locationType: r.locationType,
      hostFamilyName: r.hostFamilyName,
      hostAddress: r.hostAddress,
      locationNote: r.locationNote,
      themeEn: r.themeEn,
      bibleReading: r.bibleReading,
      preacherName: r.preacherName,
      liturgistName: r.liturgistName,
    }
  })
```

- [ ] **Step 2: Verifikasi typecheck**

Run: `pnpm typecheck`
Expected: bersih. Kalau relasi `kolom` atau `category` ditolak, periksa `worshipServicesRelations` di `src/db/schema/worship.ts` — keduanya sudah dideklarasikan di sana; sesuaikan nama, jangan mengubah schema.

- [ ] **Step 3: Gerbang + commit**

```bash
pnpm lint && pnpm typecheck && pnpm test && pnpm build
git add src/features/schedule/admin-queries.ts
git commit -m "Tambah query jadwal untuk dashboard admin

Berbeda dari listServices publik dalam dua hal yang disengaja: menampilkan
draft (pengurus perlu melihat yang belum terbit) dan tidak memaksa from =
hari ini (pengurus perlu membetulkan jadwal yang sudah lewat).

ensureAdmin() dipanggil di server fn, bukan hanya di route — route yang
dijaga tidak menghalangi pemanggilan langsung lewat HTTP."
```

---

## Task 4: Mutasi jadwal + validasi Zod

**Files:**
- Create: `src/features/schedule/mutations.ts`
- Test: `tests/unit/schedule-validation.test.ts`

**Interfaces:**
- Consumes: `ensureAdmin`.
- Produces:
  - `serviceInputSchema` (Zod)
  - `createService(input): Promise<{ id: string }>`
  - `updateService({ id, ...input }): Promise<{ id: string }>`
  - `deleteService(id: string): Promise<{ ok: true }>`
  - `setServiceStatus({ id, status }): Promise<{ ok: true }>`

- [ ] **Step 1: Tulis test yang gagal**

Buat `tests/unit/schedule-validation.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { serviceInputSchema } from '@/features/schedule/mutations'

const valid = {
  categoryId: '11111111-1111-1111-1111-111111111111',
  serviceDate: '2026-10-04',
  startTime: '10:00',
  locationType: 'gedung_gereja' as const,
  status: 'draft' as const,
}

describe('serviceInputSchema', () => {
  it('menerima input minimal yang sah', () => {
    expect(serviceInputSchema.safeParse(valid).success).toBe(true)
  })

  // `datetime.ts` parseDate menerima tanggal mustahil seperti 2026-02-30;
  // lapisan Zod harus menolaknya sebelum sampai ke helper mana pun.
  it('menolak tanggal yang tidak ada di kalender', () => {
    const r = serviceInputSchema.safeParse({ ...valid, serviceDate: '2026-02-30' })
    expect(r.success).toBe(false)
  })

  it('menolak format tanggal selain YYYY-MM-DD', () => {
    expect(serviceInputSchema.safeParse({ ...valid, serviceDate: '04/10/2026' }).success).toBe(false)
  })

  it('menolak jam di luar 00:00–23:59', () => {
    expect(serviceInputSchema.safeParse({ ...valid, startTime: '25:00' }).success).toBe(false)
  })

  it('menolak endTime lebih awal dari startTime', () => {
    const r = serviceInputSchema.safeParse({ ...valid, startTime: '10:00', endTime: '09:00' })
    expect(r.success).toBe(false)
  })

  it('menerima endTime setelah startTime', () => {
    expect(serviceInputSchema.safeParse({ ...valid, startTime: '10:00', endTime: '12:00' }).success).toBe(true)
  })

  // Ibadah di rumah tanpa penunjuk lokasi apa pun akan tayang sebagai
  // "Lokasi menyusul" selamanya tanpa ada yang sadar.
  it('menolak lokasi rumah tanpa tuan rumah maupun catatan lokasi', () => {
    const r = serviceInputSchema.safeParse({ ...valid, locationType: 'rumah' })
    expect(r.success).toBe(false)
  })

  it('menerima lokasi rumah bila tuan rumah diisi', () => {
    const r = serviceInputSchema.safeParse({
      ...valid,
      locationType: 'rumah',
      hostFamilyName: 'Kel. Contoh',
    })
    expect(r.success).toBe(true)
  })

  it('mengubah string kosong jadi null supaya kolom opsional tidak menyimpan ""', () => {
    const r = serviceInputSchema.safeParse({ ...valid, themeId: '', preacherName: '  ' })
    expect(r.success).toBe(true)
    if (r.success) {
      expect(r.data.themeId).toBeNull()
      expect(r.data.preacherName).toBeNull()
    }
  })
})
```

- [ ] **Step 2: Jalankan test — pastikan GAGAL**

Run: `pnpm test tests/unit/schedule-validation.test.ts`
Expected: FAIL — modul belum ada.

- [ ] **Step 3: Tulis mutasi + skema**

Buat `src/features/schedule/mutations.ts`:

```ts
import { z } from 'zod'
import { createServerFn } from '@tanstack/react-start'
import { ensureAdmin } from '@/lib/auth.functions'

/** `''` dan spasi-saja jadi null; kolom opsional tak boleh menyimpan string kosong. */
const opsional = z
  .string()
  .trim()
  .transform((v) => (v === '' ? null : v))
  .nullable()
  .optional()
  .transform((v) => v ?? null)

/** Tanggal kalender sungguhan — `2026-02-30` ditolak, bukan digeser diam-diam. */
const tanggal = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Format tanggal harus YYYY-MM-DD')
  .refine((v) => {
    const [y, m, d] = v.split('-').map(Number)
    const dt = new Date(Date.UTC(y, m - 1, d))
    return dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d
  }, 'Tanggal itu tidak ada di kalender')

const jam = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Format jam harus HH:MM')

export const serviceInputSchema = z
  .object({
    categoryId: z.uuid(),
    kolomId: z.uuid().nullable().optional().transform((v) => v ?? null),
    templateId: z.uuid().nullable().optional().transform((v) => v ?? null),
    serviceDate: tanggal,
    startTime: jam,
    endTime: z.union([jam, z.literal('')]).nullable().optional().transform((v) => (v ? v : null)),
    locationType: z.enum(['gedung_gereja', 'rumah']),
    hostFamilyName: opsional,
    hostAddress: opsional,
    locationNote: opsional,
    themeId: opsional,
    themeEn: opsional,
    bibleReading: opsional,
    preacherName: opsional,
    liturgistName: opsional,
    status: z.enum(['draft', 'published']),
  })
  .refine((v) => !v.endTime || v.endTime > v.startTime, {
    message: 'Jam selesai harus setelah jam mulai',
    path: ['endTime'],
  })
  // Ibadah rumah tanpa penunjuk lokasi apa pun tayang sebagai "Lokasi menyusul"
  // selamanya, dan tak ada yang sadar sampai jemaat kebingungan.
  .refine((v) => v.locationType !== 'rumah' || Boolean(v.hostFamilyName ?? v.locationNote), {
    message: 'Ibadah di rumah butuh nama tuan rumah atau catatan lokasi',
    path: ['hostFamilyName'],
  })

export type ServiceInput = z.infer<typeof serviceInputSchema>

export const createService = createServerFn({ method: 'POST' })
  .validator((d: unknown) => serviceInputSchema.parse(d))
  .handler(async ({ data }): Promise<{ id: string }> => {
    await ensureAdmin()
    const { db } = await import('@/db')
    const { worshipServices } = await import('@/db/schema')
    const [row] = await db.insert(worshipServices).values(data).returning({ id: worshipServices.id })
    if (!row) throw new Error('Gagal menyimpan ibadah')
    return { id: row.id }
  })

export const updateService = createServerFn({ method: 'POST' })
  .validator((d: unknown) => z.object({ id: z.uuid() }).and(serviceInputSchema).parse(d))
  .handler(async ({ data }): Promise<{ id: string }> => {
    await ensureAdmin()
    const { id, ...rest } = data
    const { db } = await import('@/db')
    const { worshipServices } = await import('@/db/schema')
    const { eq } = await import('drizzle-orm')
    // `updatedAt` disetel eksplisit — Drizzle tidak melakukannya sendiri, dan
    // tanpa ini kolom itu berbohong tentang kapan baris terakhir disunting.
    const [row] = await db
      .update(worshipServices)
      .set({ ...rest, updatedAt: new Date() })
      .where(eq(worshipServices.id, id))
      .returning({ id: worshipServices.id })
    if (!row) throw new Error('Ibadah tidak ditemukan')
    return { id: row.id }
  })

export const deleteService = createServerFn({ method: 'POST' })
  .validator((id: unknown) => z.uuid().parse(id))
  .handler(async ({ data: id }): Promise<{ ok: true }> => {
    await ensureAdmin()
    const { db } = await import('@/db')
    const { worshipServices } = await import('@/db/schema')
    const { eq } = await import('drizzle-orm')
    await db.delete(worshipServices).where(eq(worshipServices.id, id))
    return { ok: true }
  })

export const setServiceStatus = createServerFn({ method: 'POST' })
  .validator((d: unknown) => z.object({ id: z.uuid(), status: z.enum(['draft', 'published']) }).parse(d))
  .handler(async ({ data }): Promise<{ ok: true }> => {
    await ensureAdmin()
    const { db } = await import('@/db')
    const { worshipServices } = await import('@/db/schema')
    const { eq } = await import('drizzle-orm')
    await db
      .update(worshipServices)
      .set({ status: data.status, updatedAt: new Date() })
      .where(eq(worshipServices.id, data.id))
    return { ok: true }
  })
```

- [ ] **Step 4: Jalankan test — pastikan LULUS**

Run: `pnpm test tests/unit/schedule-validation.test.ts`
Expected: PASS (9 test).

Kalau Zod v4 menolak `z.uuid()` atau `.and()`, periksa API-nya di `node_modules/zod` dan sesuaikan — jangan menurunkan ketatnya validasi untuk membuat test lolos.

- [ ] **Step 5: Gerbang + commit**

```bash
pnpm lint && pnpm typecheck && pnpm test && pnpm build
git add src/features/schedule/mutations.ts tests/unit/schedule-validation.test.ts
git commit -m "Tambah mutasi jadwal + validasi Zod

Tiap mutasi: ensureAdmin() -> validasi Zod -> tulis. Gerbang ada di server
fn, bukan hanya route.

Validasi menutup dua lubang yang diketahui. Pertama, datetime.ts parseDate
menerima tanggal mustahil seperti 2026-02-30; skema ini menolaknya sebelum
sampai helper mana pun. Kedua, ibadah berlokasi rumah tanpa tuan rumah
maupun catatan lokasi akan tayang sebagai 'Lokasi menyusul' selamanya tanpa
ada yang sadar — kini ditolak di form.

String kosong pada kolom opsional diubah jadi null supaya kolom itu tidak
menyimpan '' yang lolos cek 'ada isinya' di lapisan tampilan.

updatedAt disetel eksplisit di update: Drizzle tidak melakukannya sendiri."
```

---

## Task 5: Perencana generator (fungsi murni)

Inti generator dipisah dari database supaya bisa diuji habis-habisan tanpa Postgres. Task 6 menulis lapisan tipis yang menyimpannya.

**Files:**
- Create: `src/features/schedule/generator.ts`
- Test: `tests/unit/schedule-generator.test.ts`

**Interfaces:**
- Consumes: `datesForWeekday(fromISO, toISO, dayOfWeek): string[]` dari `@/lib/datetime`.
- Produces: `planServices(input: PlanInput): PlannedService[]`

```ts
type PlanTemplate = {
  id: string
  categoryId: string
  categoryKey: string
  dayOfWeek: number
  startTime: string
  endTime: string | null
  defaultLocationType: 'gedung_gereja' | 'rumah'
}
type PlanKolom = { id: string }
type PlanInput = { templates: PlanTemplate[]; kolomAktif: PlanKolom[]; from: string; to: string }
type PlannedService = {
  templateId: string
  categoryId: string
  kolomId: string | null
  serviceDate: string
  startTime: string
  endTime: string | null
  locationType: 'gedung_gereja' | 'rumah'
  status: 'draft'
}
```

- [ ] **Step 1: Tulis test yang gagal**

Buat `tests/unit/schedule-generator.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { planServices } from '@/features/schedule/generator'

const tplJemaat = {
  id: 'tpl-jemaat',
  categoryId: 'cat-jemaat',
  categoryKey: 'ibadah_jemaat',
  dayOfWeek: 0,
  startTime: '10:00:00',
  endTime: '12:00:00',
  defaultLocationType: 'gedung_gereja' as const,
}
const tplKolom = {
  id: 'tpl-kolom',
  categoryId: 'cat-kolom',
  categoryKey: 'kolom',
  dayOfWeek: 3,
  startTime: '19:00:00',
  endTime: null,
  defaultLocationType: 'rumah' as const,
}
const kolomAktif = [{ id: 'k1' }, { id: 'k2' }, { id: 'k3' }, { id: 'k4' }]

describe('planServices', () => {
  it('satu ibadah per tanggal untuk kategori non-kolom', () => {
    // 2026-09-06 dan 2026-09-13 sama-sama Minggu.
    const out = planServices({ templates: [tplJemaat], kolomAktif, from: '2026-09-06', to: '2026-09-13' })
    expect(out).toHaveLength(2)
    expect(out.map((s) => s.serviceDate)).toEqual(['2026-09-06', '2026-09-13'])
    expect(out.every((s) => s.kolomId === null)).toBe(true)
  })

  // Ini yang membuat index tiga-kolom perlu ada sejak awal.
  it('kategori kolom fan-out ke tiap kolom aktif', () => {
    // 2026-09-09 satu-satunya Rabu di rentang ini.
    const out = planServices({ templates: [tplKolom], kolomAktif, from: '2026-09-07', to: '2026-09-12' })
    expect(out).toHaveLength(4)
    expect(out.map((s) => s.kolomId).sort()).toEqual(['k1', 'k2', 'k3', 'k4'])
    expect(new Set(out.map((s) => s.serviceDate))).toEqual(new Set(['2026-09-09']))
  })

  it('kategori kolom tanpa kolom aktif tidak menghasilkan apa pun', () => {
    const out = planServices({ templates: [tplKolom], kolomAktif: [], from: '2026-09-07', to: '2026-09-12' })
    expect(out).toEqual([])
  })

  it('mewarisi jam dan tipe lokasi dari template', () => {
    const [s] = planServices({ templates: [tplJemaat], kolomAktif, from: '2026-09-06', to: '2026-09-06' })
    expect(s).toMatchObject({
      templateId: 'tpl-jemaat',
      startTime: '10:00:00',
      endTime: '12:00:00',
      locationType: 'gedung_gereja',
    })
  })

  // Pengurus harus meninjau sebelum jemaat melihatnya.
  it('selalu menghasilkan draft, tidak pernah published', () => {
    const out = planServices({ templates: [tplJemaat, tplKolom], kolomAktif, from: '2026-09-06', to: '2026-09-30' })
    expect(out.length).toBeGreaterThan(0)
    expect(out.every((s) => s.status === 'draft')).toBe(true)
  })

  it('rentang tanpa hari yang cocok menghasilkan kosong', () => {
    // 2026-09-07 Senin, 2026-09-08 Selasa — tak ada Minggu.
    expect(planServices({ templates: [tplJemaat], kolomAktif, from: '2026-09-07', to: '2026-09-08' })).toEqual([])
  })

  it('menggabungkan beberapa template dalam satu rencana', () => {
    const out = planServices({ templates: [tplJemaat, tplKolom], kolomAktif, from: '2026-09-06', to: '2026-09-12' })
    // 1 Minggu (06) + 1 Rabu (09) × 4 kolom = 5
    expect(out).toHaveLength(5)
  })
})
```

- [ ] **Step 2: Jalankan test — pastikan GAGAL**

Run: `pnpm test tests/unit/schedule-generator.test.ts`
Expected: FAIL — modul belum ada.

- [ ] **Step 3: Tulis perencana**

Buat `src/features/schedule/generator.ts`:

```ts
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
 * `ws_template_date_uq`, yang sejak Task 2 memperlakukan `kolom_id` NULL
 * sebagai sama.
 */
export function planServices({ templates, kolomAktif, from, to }: PlanInput): PlannedService[] {
  const out: PlannedService[] = []

  for (const tpl of templates) {
    for (const serviceDate of datesForWeekday(from, to, tpl.dayOfWeek)) {
      // Kategori `kolom` menghasilkan satu ibadah PER kolom aktif; kategori lain
      // satu per tanggal. Tanpa kolom aktif, kategori kolom tidak menghasilkan
      // apa pun — lebih baik kosong daripada satu ibadah tanpa tuan rumah.
      const targets: (string | null)[] = tpl.categoryKey === 'kolom' ? kolomAktif.map((k) => k.id) : [null]

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
```

- [ ] **Step 4: Jalankan test — pastikan LULUS**

Run: `pnpm test tests/unit/schedule-generator.test.ts`
Expected: PASS (7 test).

- [ ] **Step 5: Gerbang + commit**

```bash
pnpm lint && pnpm typecheck && pnpm test && pnpm build
git add src/features/schedule/generator.ts tests/unit/schedule-generator.test.ts
git commit -m "Tambah perencana jadwal sebagai fungsi murni

planServices() menghitung ibadah apa saja yang seharusnya ada dalam sebuah
rentang tanpa menyentuh database. Dipisah begitu supaya perilaku yang sulit
— fan-out kolom, batas rentang, pewarisan jam dari template — bisa diuji
tanpa Postgres.

Hasilnya SELALU draft. Generator tidak pernah menerbitkan apa pun: pengurus
meninjau lebih dulu, dan itu yang memisahkan alat bantu dari sesuatu yang
mengumumkan ibadah karangan ke jemaat.

Idempotensi sengaja bukan urusan fungsi ini — penyaringan duplikat terjadi
di lapisan penyimpanan lewat constraint yang diperkuat di Task 2."
```

---

## Task 6: Terapkan generator ke database

**Files:**
- Modify: `src/features/schedule/generator.ts`

**Interfaces:**
- Consumes: `planServices` (Task 5), `ensureAdmin`.
- Produces:
  - `previewGeneration({ from, to }): Promise<GenerationPreview>`
  - `applyGeneration({ from, to }): Promise<{ dibuat: number }>`
  - `type GenerationPreview = { total: number; perKategori: { nama: string; jumlah: number }[]; from: string; to: string }`

- [ ] **Step 1: Tambahkan pemuat template + pratinjau + penerap**

Tambahkan di akhir `src/features/schedule/generator.ts`:

```ts
import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import { ensureAdmin } from '@/lib/auth.functions'

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
  .refine((v) => v.to >= v.from, { message: 'Tanggal akhir harus setelah tanggal mulai', path: ['to'] })
  // Rentang terbuka lebar akan menghasilkan ribuan baris draft yang harus
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
      perKategori: [...hitung].map(([nama, jumlah]) => ({ nama, jumlah })).sort((a, b) => a.nama.localeCompare(b.nama)),
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
 * Task 2 memperkuatnya jadi NULLS NOT DISTINCT.
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
```

- [ ] **Step 2: Verifikasi typecheck**

Run: `pnpm typecheck && pnpm test`
Expected: bersih, 219 unit test (203 + 9 validasi + 7 generator).

Kalau relasi `scheduleTemplates.category` ditolak, periksa `worshipCategoriesRelations` di schema — `templates: many(scheduleTemplates)` sudah ada; tambahkan sisi `one(worshipCategories)` di `scheduleTemplatesRelations` bila belum ada, dan jangan mengubah kolom apa pun.

- [ ] **Step 3: Buktikan idempotensi terhadap database sungguhan**

Ini pembuktian paling penting di seluruh plan. Jalankan dua kali dan pastikan yang kedua tidak membuat apa pun:

```bash
cat > zz-probe.mjs <<'EOF'
import 'dotenv/config'
import pg from 'pg'
const c = new pg.Client({ connectionString: process.env.DATABASE_URL })
await c.connect()
const n = async () => (await c.query('select count(*)::int n from worship_services')).rows[0].n
console.log('sebelum:', await n())
await c.end()
EOF
npx tsx zz-probe.mjs
```

Catat angkanya. Lalu jalankan `pnpm dev`, masuk ke `/admin`, dan panggil `applyGeneration` lewat halaman generator di Task 7 — **atau**, kalau Task 7 belum ada, lewati Step 3 ini dan kerjakan setelah Task 7 selesai; jangan memanggil server fn lewat curl tanpa sesi.

Setelah dijalankan dua kali dengan rentang yang sama: jumlah baris harus bertambah pada kali pertama dan **tidak berubah sama sekali** pada kali kedua. Kalau bertambah lagi, idempotensinya rusak — hentikan dan laporkan.

- [ ] **Step 4: Gerbang + commit**

```bash
pnpm lint && pnpm typecheck && pnpm test && pnpm build
git add src/features/schedule/generator.ts
git commit -m "Tambah pratinjau dan penerap generator jadwal

previewGeneration menghitung apa yang AKAN dibuat tanpa menulis apa pun.
Generator yang langsung menulis adalah generator yang suatu hari mengisi
situs dengan ratusan ibadah yang tak seorang pun minta.

applyGeneration inkremental: onConflictDoNothing di atas ws_template_date_uq
menjamin baris yang sudah ada tidak tersentuh, termasuk yang sudah disunting
pengurus. Inilah beda intinya dari jalur DELETE FROM worship_services yang
dipakai sampai sekarang, yang handoff 2b §3 peringatkan akan menghapus
editan pengurus begitu dashboard ada.

Rentang dibatasi satu tahun: rentang terbuka lebar menghasilkan ribuan draft
yang harus ditinjau satu per satu."
```

---

## Task 7: Form ibadah + halaman buat & ubah

**Files:**
- Create: `src/components/admin/service-form.tsx`
- Create: `src/routes/admin._app.jadwal.baru.tsx`
- Create: `src/routes/admin._app.jadwal.$id.tsx`
- Modify: `messages/id.json`, `messages/en.json`

**Interfaces:**
- Consumes: `serviceInputSchema`, `ServiceInput`, `createService`, `updateService` (Task 4); `getServiceForAdmin`, `AdminServiceDetail` (Task 3); `listCategories`, `listKolom` dari `@/features/schedule/taxonomy`.
- Produces: `<ServiceForm>`; route `/admin/jadwal/baru` dan `/admin/jadwal/$id`.

- [ ] **Step 1: Tambahkan kunci pesan**

Ke `messages/id.json`:

```json
  "admin_service_category": "Kategori",
  "admin_service_kolom": "Kolom",
  "admin_service_date": "Tanggal",
  "admin_service_start": "Jam mulai",
  "admin_service_end": "Jam selesai",
  "admin_service_location": "Lokasi",
  "admin_service_loc_church": "Gedung gereja",
  "admin_service_loc_home": "Rumah",
  "admin_service_host": "Nama tuan rumah",
  "admin_service_host_address": "Alamat",
  "admin_service_location_note": "Catatan lokasi",
  "admin_service_theme_id": "Tema (Indonesia)",
  "admin_service_theme_en": "Tema (Inggris)",
  "admin_service_reading": "Bacaan Alkitab",
  "admin_service_preacher": "Pelayan Firman",
  "admin_service_liturgist": "Pemimpin Ibadah",
  "admin_service_status": "Status",
  "admin_service_save": "Simpan",
  "admin_service_saving": "Menyimpan…",
  "admin_service_cancel": "Batal",
  "admin_service_new_title": "Tambah Ibadah",
  "admin_service_edit_title": "Ubah Ibadah",
  "admin_schedule_status_draft": "Draf",
  "admin_schedule_status_published": "Terbit",
```

Dua kunci terakhir (`admin_schedule_status_*`) dipakai oleh pemilih status di form ini DAN oleh kolom Status di daftar Task 8. Ditaruh di sini karena task inilah yang pertama memakainya — Task 8 mendaftarkannya lagi dalam blok kunci halamannya, dan menambahkan kunci yang sudah ada cukup dilewati.

Ke `messages/en.json`, kunci identik: "Category", "Kolom", "Date", "Start time", "End time", "Location", "Church building", "Home", "Host family name", "Address", "Location note", "Theme (Indonesian)", "Theme (English)", "Bible reading", "Preacher", "Liturgist", "Status", "Save", "Saving…", "Cancel", "Add Service", "Edit Service".

- [ ] **Step 2: Tulis `<ServiceForm>`**

Buat `src/components/admin/service-form.tsx`:

```tsx
import { type FormEvent, useId, useState } from 'react'
import * as m from '@/paraglide/messages'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import type { ServiceInput } from '@/features/schedule/mutations'
import type { AdminServiceDetail } from '@/features/schedule/admin-queries'

export type KategoriPilihan = { id: string; key: string; nameId: string }
export type KolomPilihan = { id: string; name: string }

type Props = {
  kategori: KategoriPilihan[]
  kolom: KolomPilihan[]
  awal?: AdminServiceDetail
  onSubmit: (input: ServiceInput) => Promise<void>
  onCancel: () => void
}

/** `null` dari server jadi `''` untuk input terkendali; dibalik lagi saat submit. */
const s = (v: string | null | undefined) => v ?? ''

/**
 * Form ibadah — dipakai halaman buat DAN ubah.
 *
 * Pola state-nya mengikuti `contact-form.tsx`: `useState` + `useId`, tanpa form
 * library. Validasi sungguhan ada di server (`serviceInputSchema`); form ini
 * hanya mengirim dan menampilkan galat yang dikembalikannya, supaya tidak ada
 * dua sumber kebenaran yang bisa saling menyimpang.
 *
 * Field lokasi rumah dirender HANYA saat lokasi = rumah. Menyembunyikannya
 * lewat CSS akan mengirim nilai yang tak terlihat pengurus — dan `hostAddress`
 * yang tertinggal dari pilihan sebelumnya akan tayang di halaman publik.
 */
export function ServiceForm({ kategori, kolom, awal, onSubmit, onCancel }: Props) {
  const id = useId()
  const [categoryId, setCategoryId] = useState(awal?.categoryId ?? kategori[0]?.id ?? '')
  const [kolomId, setKolomId] = useState(s(awal?.kolomId))
  const [serviceDate, setServiceDate] = useState(s(awal?.serviceDate))
  const [startTime, setStartTime] = useState(s(awal?.startTime).slice(0, 5))
  const [endTime, setEndTime] = useState(s(awal?.endTime).slice(0, 5))
  const [locationType, setLocationType] = useState<'gedung_gereja' | 'rumah'>(
    awal?.locationType ?? 'gedung_gereja',
  )
  const [hostFamilyName, setHostFamilyName] = useState(s(awal?.hostFamilyName))
  const [hostAddress, setHostAddress] = useState(s(awal?.hostAddress))
  const [locationNote, setLocationNote] = useState(s(awal?.locationNote))
  const [themeId, setThemeId] = useState(s(awal?.themeId))
  const [themeEn, setThemeEn] = useState(s(awal?.themeEn))
  const [bibleReading, setBibleReading] = useState(s(awal?.bibleReading))
  const [preacherName, setPreacherName] = useState(s(awal?.preacherName))
  const [liturgistName, setLiturgistName] = useState(s(awal?.liturgistName))
  const [status, setStatus] = useState<'draft' | 'published'>(awal?.status ?? 'draft')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')

  const kategoriTerpilih = kategori.find((k) => k.id === categoryId)
  const perluKolom = kategoriTerpilih?.key === 'kolom'
  const diRumah = locationType === 'rumah'

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    // `disabled` memblok klik tapi bukan submit lewat Enter.
    if (sending) return
    setSending(true)
    setError('')
    try {
      await onSubmit({
        categoryId,
        kolomId: perluKolom && kolomId ? kolomId : null,
        templateId: awal?.templateId ?? null,
        serviceDate,
        startTime,
        endTime: endTime || null,
        locationType,
        hostFamilyName: diRumah ? hostFamilyName : null,
        hostAddress: diRumah ? hostAddress : null,
        locationNote: diRumah ? locationNote : null,
        themeId,
        themeEn,
        bibleReading,
        preacherName,
        liturgistName,
        status,
      } as ServiceInput)
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
      setSending(false)
    }
  }

  const field = 'border-border bg-surface text-ink w-full rounded border px-3 py-2 text-sm'

  return (
    <form onSubmit={submit} className="flex max-w-2xl flex-col gap-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor={`${id}-cat`}>{m.admin_service_category()}</Label>
          <select
            id={`${id}-cat`}
            className={field}
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
          >
            {kategori.map((k) => (
              <option key={k.id} value={k.id}>
                {k.nameId}
              </option>
            ))}
          </select>
        </div>

        {perluKolom && (
          <div className="flex flex-col gap-1.5">
            <Label htmlFor={`${id}-kolom`}>{m.admin_service_kolom()}</Label>
            <select
              id={`${id}-kolom`}
              className={field}
              value={kolomId}
              onChange={(e) => setKolomId(e.target.value)}
            >
              <option value="">—</option>
              {kolom.map((k) => (
                <option key={k.id} value={k.id}>
                  {k.name}
                </option>
              ))}
            </select>
          </div>
        )}

        <div className="flex flex-col gap-1.5">
          <Label htmlFor={`${id}-date`}>{m.admin_service_date()}</Label>
          <Input
            id={`${id}-date`}
            type="date"
            required
            value={serviceDate}
            onChange={(e) => setServiceDate(e.target.value)}
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor={`${id}-start`}>{m.admin_service_start()}</Label>
          <Input
            id={`${id}-start`}
            type="time"
            required
            value={startTime}
            onChange={(e) => setStartTime(e.target.value)}
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor={`${id}-end`}>{m.admin_service_end()}</Label>
          <Input
            id={`${id}-end`}
            type="time"
            value={endTime}
            onChange={(e) => setEndTime(e.target.value)}
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor={`${id}-loc`}>{m.admin_service_location()}</Label>
          <select
            id={`${id}-loc`}
            className={field}
            value={locationType}
            onChange={(e) => setLocationType(e.target.value as 'gedung_gereja' | 'rumah')}
          >
            <option value="gedung_gereja">{m.admin_service_loc_church()}</option>
            <option value="rumah">{m.admin_service_loc_home()}</option>
          </select>
        </div>
      </div>

      {diRumah && (
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor={`${id}-host`}>{m.admin_service_host()}</Label>
            <Input
              id={`${id}-host`}
              value={hostFamilyName}
              onChange={(e) => setHostFamilyName(e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor={`${id}-addr`}>{m.admin_service_host_address()}</Label>
            <Input
              id={`${id}-addr`}
              value={hostAddress}
              onChange={(e) => setHostAddress(e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-1.5 sm:col-span-2">
            <Label htmlFor={`${id}-note`}>{m.admin_service_location_note()}</Label>
            <Input
              id={`${id}-note`}
              value={locationNote}
              onChange={(e) => setLocationNote(e.target.value)}
            />
          </div>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor={`${id}-theme-id`}>{m.admin_service_theme_id()}</Label>
          <Input id={`${id}-theme-id`} value={themeId} onChange={(e) => setThemeId(e.target.value)} />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor={`${id}-theme-en`}>{m.admin_service_theme_en()}</Label>
          <Input id={`${id}-theme-en`} value={themeEn} onChange={(e) => setThemeEn(e.target.value)} />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor={`${id}-read`}>{m.admin_service_reading()}</Label>
          <Input id={`${id}-read`} value={bibleReading} onChange={(e) => setBibleReading(e.target.value)} />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor={`${id}-preach`}>{m.admin_service_preacher()}</Label>
          <Input id={`${id}-preach`} value={preacherName} onChange={(e) => setPreacherName(e.target.value)} />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor={`${id}-lit`}>{m.admin_service_liturgist()}</Label>
          <Input id={`${id}-lit`} value={liturgistName} onChange={(e) => setLiturgistName(e.target.value)} />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor={`${id}-status`}>{m.admin_service_status()}</Label>
          <select
            id={`${id}-status`}
            className={field}
            value={status}
            onChange={(e) => setStatus(e.target.value as 'draft' | 'published')}
          >
            <option value="draft">{m.admin_schedule_status_draft()}</option>
            <option value="published">{m.admin_schedule_status_published()}</option>
          </select>
        </div>
      </div>

      <p id={`${id}-err`} role="status" aria-live="polite" className="text-destructive min-h-5 text-sm">
        {error}
      </p>

      <div className="flex gap-2">
        <Button type="submit" variant="primary" disabled={sending} aria-describedby={`${id}-err`}>
          {sending ? m.admin_service_saving() : m.admin_service_save()}
        </Button>
        <Button type="button" variant="outline" onClick={onCancel}>
          {m.admin_service_cancel()}
        </Button>
      </div>
    </form>
  )
}
```

- [ ] **Step 3: Buat route `/admin/jadwal/baru`**

Buat `src/routes/admin._app.jadwal.baru.tsx`:

```tsx
import { createFileRoute, useRouter } from '@tanstack/react-router'
import * as m from '@/paraglide/messages'
import { listCategories, listKolom } from '@/features/schedule/taxonomy'
import { createService } from '@/features/schedule/mutations'
import { ServiceForm } from '@/components/admin/service-form'

export const Route = createFileRoute('/admin/_app/jadwal/baru')({
  loader: async () => ({
    kategori: await listCategories(),
    kolom: await listKolom(),
  }),
  component: JadwalBaru,
})

function JadwalBaru() {
  const { kategori, kolom } = Route.useLoaderData()
  const router = useRouter()

  return (
    <div className="flex flex-col gap-6">
      <h1 className="font-serif text-2xl font-semibold">{m.admin_service_new_title()}</h1>
      <ServiceForm
        kategori={kategori}
        kolom={kolom}
        onSubmit={async (data) => {
          await createService({ data })
          await router.navigate({ to: '/admin/jadwal' })
        }}
        onCancel={() => router.navigate({ to: '/admin/jadwal' })}
      />
    </div>
  )
}
```

Catatan: `listCategories()` dan `listKolom()` sudah ada di `src/features/schedule/taxonomy.ts` dan dipakai halaman publik. Periksa bentuk kembaliannya sebelum memakai — kalau field-nya berbeda dari `KategoriPilihan`/`KolomPilihan`, petakan di loader, jangan mengubah fungsi yang sudah dipakai halaman publik.

- [ ] **Step 4: Buat route `/admin/jadwal/$id`**

Buat `src/routes/admin._app.jadwal.$id.tsx`:

```tsx
import { createFileRoute, notFound, useRouter } from '@tanstack/react-router'
import * as m from '@/paraglide/messages'
import { listCategories, listKolom } from '@/features/schedule/taxonomy'
import { getServiceForAdmin } from '@/features/schedule/admin-queries'
import { updateService } from '@/features/schedule/mutations'
import { ServiceForm } from '@/components/admin/service-form'

export const Route = createFileRoute('/admin/_app/jadwal/$id')({
  loader: async ({ params }) => {
    const awal = await getServiceForAdmin({ data: params.id })
    // 404 jujur, bukan form kosong yang diam-diam membuat baris baru saat disimpan.
    if (!awal) throw notFound()
    return { awal, kategori: await listCategories(), kolom: await listKolom() }
  },
  component: JadwalUbah,
})

function JadwalUbah() {
  const { awal, kategori, kolom } = Route.useLoaderData()
  const router = useRouter()

  return (
    <div className="flex flex-col gap-6">
      <h1 className="font-serif text-2xl font-semibold">{m.admin_service_edit_title()}</h1>
      <ServiceForm
        kategori={kategori}
        kolom={kolom}
        awal={awal}
        onSubmit={async (data) => {
          await updateService({ data: { id: awal.id, ...data } })
          await router.navigate({ to: '/admin/jadwal' })
        }}
        onCancel={() => router.navigate({ to: '/admin/jadwal' })}
      />
    </div>
  )
}
```

- [ ] **Step 5: Verifikasi**

Run: `pnpm lint && pnpm typecheck && pnpm test && pnpm build`
Expected: hijau, 219 unit test.

Route `/admin/jadwal` belum ada sampai Task 8, jadi `router.navigate({ to: '/admin/jadwal' })` akan ditolak typecheck. **Kalau itu terjadi**, sementara pakai `window.location.href = '/admin/jadwal'` dan tinggalkan komentar `// TODO Task 8` — lalu Task 8 Step 5 menaikkannya ke `navigate`. Jangan membuat route stub hanya untuk memuaskan typecheck.

- [ ] **Step 6: Commit**

```bash
git add src/components/admin/service-form.tsx src/routes/ messages/
git commit -m "Tambah form ibadah + halaman buat & ubah

Satu komponen form dipakai keduanya. Validasi sungguhan ada di server
(serviceInputSchema); form hanya mengirim dan menampilkan galatnya, supaya
tidak ada dua sumber kebenaran yang bisa saling menyimpang.

Field lokasi rumah dirender HANYA saat lokasi = rumah, bukan disembunyikan
lewat CSS — kalau tidak, hostAddress yang tertinggal dari pilihan sebelumnya
ikut terkirim dan tayang di halaman publik.

Halaman ubah melempar notFound() untuk id yang tak dikenal, bukan menampilkan
form kosong yang diam-diam membuat baris baru saat disimpan."
```

---

## Task 8: Daftar jadwal + generator

**Files:**
- Create: `src/routes/admin._app.jadwal.tsx`
- Create: `src/routes/admin._app.jadwal.generator.tsx`
- Modify: `src/components/admin/admin-shell.tsx`
- Modify: `messages/id.json`, `messages/en.json`

**Interfaces:**
- Consumes: `listServicesForAdmin` (Task 3); `deleteService`, `setServiceStatus` (Task 4); `previewGeneration`, `applyGeneration` (Task 6).
- Produces: route `/admin/jadwal` dan `/admin/jadwal/generator`.

- [ ] **Step 1: Tambahkan kunci pesan**

Kunci `admin_schedule_*` dari daftar di Task 7 Step 1 sudah mencakup halaman ini. Tambahkan yang belum ada ke kedua katalog:

```json
  "admin_schedule_title": "Jadwal Ibadah",
  "admin_schedule_new": "Tambah Ibadah",
  "admin_schedule_generator": "Isi Otomatis",
  "admin_schedule_empty": "Belum ada ibadah pada rentang ini.",
  "admin_schedule_col_date": "Tanggal",
  "admin_schedule_col_category": "Kategori",
  "admin_schedule_col_theme": "Tema",
  "admin_schedule_col_status": "Status",
  "admin_schedule_status_draft": "Draf",
  "admin_schedule_status_published": "Terbit",
  "admin_schedule_edit": "Ubah",
  "admin_schedule_publish": "Terbitkan",
  "admin_schedule_unpublish": "Jadikan draf",
  "admin_schedule_delete": "Hapus",
  "admin_schedule_delete_confirm": "Hapus ibadah ini? Tindakan ini tidak bisa dibatalkan.",
  "admin_schedule_generator_title": "Isi Jadwal Otomatis",
  "admin_schedule_generator_from": "Dari tanggal",
  "admin_schedule_generator_to": "Sampai tanggal",
  "admin_schedule_generator_preview": "Lihat pratinjau",
  "admin_schedule_generator_apply": "Buat sebagai draf",
  "admin_schedule_generator_result": "ibadah dibuat sebagai draf.",
  "admin_schedule_generator_none": "Tidak ada yang perlu dibuat — semuanya sudah ada.",
  "admin_schedule_generator_note": "Semua ibadah dibuat sebagai draf. Tinjau dulu sebelum diterbitkan.",
```

Inggris: "Worship Schedule", "Add Service", "Auto-fill", "No services in this range.", "Date", "Category", "Theme", "Status", "Draft", "Published", "Edit", "Publish", "Make draft", "Delete", "Delete this service? This cannot be undone.", "Auto-fill Schedule", "From date", "To date", "Preview", "Create as drafts", "services created as drafts.", "Nothing to create — everything already exists.", "Everything is created as a draft. Review before publishing."

- [ ] **Step 2: Buat halaman daftar**

Buat `src/routes/admin._app.jadwal.tsx`:

```tsx
import { useState } from 'react'
import { createFileRoute, Link, useRouter } from '@tanstack/react-router'
import * as m from '@/paraglide/messages'
import { getLocale } from '@/paraglide/runtime'
import { formatDateLong } from '@/lib/datetime'
import { listServicesForAdmin, type AdminServiceRow } from '@/features/schedule/admin-queries'
import { deleteService, setServiceStatus } from '@/features/schedule/mutations'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

export const Route = createFileRoute('/admin/_app/jadwal')({
  loader: () => listServicesForAdmin({ data: {} }),
  component: JadwalDaftar,
})

function JadwalDaftar() {
  const rows = Route.useLoaderData()
  const router = useRouter()
  const locale = getLocale()
  // Baris yang sedang dikonfirmasi hapus. `null` = dialog tertutup.
  const [akanDihapus, setAkanDihapus] = useState<AdminServiceRow | null>(null)

  async function ubahStatus(row: AdminServiceRow) {
    await setServiceStatus({
      data: { id: row.id, status: row.status === 'published' ? 'draft' : 'published' },
    })
    await router.invalidate()
  }

  async function hapus() {
    if (!akanDihapus) return
    await deleteService({ data: akanDihapus.id })
    setAkanDihapus(null)
    await router.invalidate()
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-serif text-2xl font-semibold">{m.admin_schedule_title()}</h1>
        <div className="flex gap-2">
          <Button asChild variant="outline" size="sm">
            <Link to="/admin/jadwal/generator">{m.admin_schedule_generator()}</Link>
          </Button>
          <Button asChild variant="primary" size="sm">
            <Link to="/admin/jadwal/baru">{m.admin_schedule_new()}</Link>
          </Button>
        </div>
      </div>

      {rows.length === 0 ? (
        <p className="text-muted text-sm">{m.admin_schedule_empty()}</p>
      ) : (
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{m.admin_schedule_col_date()}</TableHead>
                <TableHead>{m.admin_schedule_col_category()}</TableHead>
                <TableHead>{m.admin_schedule_col_theme()}</TableHead>
                <TableHead>{m.admin_schedule_col_status()}</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="whitespace-nowrap">
                    {formatDateLong(r.serviceDate, locale)} · {r.startTime.slice(0, 5)}
                  </TableCell>
                  <TableCell>
                    {r.categoryNameId}
                    {r.kolomName ? ` · ${r.kolomName}` : ''}
                  </TableCell>
                  <TableCell className="text-muted">{r.themeId ?? '—'}</TableCell>
                  <TableCell>
                    {r.status === 'published'
                      ? m.admin_schedule_status_published()
                      : m.admin_schedule_status_draft()}
                  </TableCell>
                  <TableCell className="flex flex-wrap gap-1.5">
                    <Button asChild variant="ghost" size="sm">
                      <Link to="/admin/jadwal/$id" params={{ id: r.id }}>
                        {m.admin_schedule_edit()}
                      </Link>
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => ubahStatus(r)}>
                      {r.status === 'published'
                        ? m.admin_schedule_unpublish()
                        : m.admin_schedule_publish()}
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => setAkanDihapus(r)}>
                      {m.admin_schedule_delete()}
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Dialog, bukan window.confirm: window.confirm memblok thread dan tak bisa
          dibaca pembaca layar dengan konteks yang sama. */}
      <Dialog open={akanDihapus !== null} onOpenChange={(o) => !o && setAkanDihapus(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{m.admin_schedule_delete_confirm()}</DialogTitle>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAkanDihapus(null)}>
              {m.admin_service_cancel()}
            </Button>
            <Button variant="primary" onClick={hapus}>
              {m.admin_schedule_delete()}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
```

Catatan: `<Button asChild>` butuh varian `asChild` pada `button.tsx`. Periksa apakah sudah ada (`Slot` dari `radix-ui` sudah diimpor di sana). Kalau belum, bungkus `<Link>` dengan `className={buttonVariants({ variant, size })}` alih-alih menambah prop baru ke komponen yang sudah dipakai halaman publik.

- [ ] **Step 3: Buat halaman generator**

Buat `src/routes/admin._app.jadwal.generator.tsx`:

```tsx
import { useState } from 'react'
import { createFileRoute, useRouter } from '@tanstack/react-router'
import * as m from '@/paraglide/messages'
import { todayEastern, addDays } from '@/lib/datetime'
import {
  previewGeneration,
  applyGeneration,
  type GenerationPreview,
} from '@/features/schedule/generator'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'

export const Route = createFileRoute('/admin/_app/jadwal/generator')({
  component: Generator,
})

function Generator() {
  const router = useRouter()
  const [from, setFrom] = useState(todayEastern())
  const [to, setTo] = useState(addDays(todayEastern(), 55))
  const [pratinjau, setPratinjau] = useState<GenerationPreview | null>(null)
  const [hasil, setHasil] = useState<number | null>(null)
  const [sibuk, setSibuk] = useState(false)
  const [error, setError] = useState('')

  async function jalankan(fn: () => Promise<void>) {
    if (sibuk) return
    setSibuk(true)
    setError('')
    try {
      await fn()
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setSibuk(false)
    }
  }

  return (
    <div className="flex max-w-2xl flex-col gap-6">
      <h1 className="font-serif text-2xl font-semibold">{m.admin_schedule_generator_title()}</h1>

      {/* Selalu terlihat, bukan hanya setelah pratinjau: pengurus harus tahu
          hasilnya draf SEBELUM menekan apa pun. */}
      <p className="text-muted text-sm">{m.admin_schedule_generator_note()}</p>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="gen-from">{m.admin_schedule_generator_from()}</Label>
          <Input id="gen-from" type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="gen-to">{m.admin_schedule_generator_to()}</Label>
          <Input id="gen-to" type="date" value={to} onChange={(e) => setTo(e.target.value)} />
        </div>
      </div>

      <div className="flex gap-2">
        <Button
          variant="outline"
          disabled={sibuk}
          onClick={() =>
            jalankan(async () => {
              setHasil(null)
              setPratinjau(await previewGeneration({ data: { from, to } }))
            })
          }
        >
          {m.admin_schedule_generator_preview()}
        </Button>
        <Button
          variant="primary"
          disabled={sibuk || pratinjau === null}
          onClick={() =>
            jalankan(async () => {
              const r = await applyGeneration({ data: { from, to } })
              setHasil(r.dibuat)
              setPratinjau(null)
              await router.invalidate()
            })
          }
        >
          {m.admin_schedule_generator_apply()}
        </Button>
      </div>

      <p role="status" aria-live="polite" className="text-destructive min-h-5 text-sm">
        {error}
      </p>

      {pratinjau && (
        <Card>
          <CardContent className="flex flex-col gap-2 py-4">
            <p className="font-serif text-2xl font-semibold">{pratinjau.total}</p>
            <ul className="text-muted flex flex-col gap-1 text-sm">
              {pratinjau.perKategori.map((k) => (
                <li key={k.nama}>
                  {k.nama}: {k.jumlah}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {hasil !== null && (
        <p className="text-ink text-sm">
          {hasil === 0 ? (
            m.admin_schedule_generator_none()
          ) : (
            <>
              <strong>{hasil}</strong> {m.admin_schedule_generator_result()}
            </>
          )}
        </p>
      )}
    </div>
  )
}
```

Tombol "Buat sebagai draf" sengaja dikunci sampai pratinjau dijalankan (`pratinjau === null`) — pengurus tidak boleh bisa menulis tanpa melihat dulu apa yang akan dibuat.

- [ ] **Step 4: Naikkan nav Jadwal ke `<Link>`**

Di `src/components/admin/admin-shell.tsx`, item nav `/admin/jadwal` kini punya route sungguhan. Ubah dari `<a href="/admin/jadwal">` jadi `<Link to="/admin/jadwal">`, mengikuti bentuk item `/admin` yang sudah `<Link>`. Item lain tetap `<a>` sampai route-nya lahir.

- [ ] **Step 5: Naikkan navigasi sementara dari Task 7 (kalau ada)**

Kalau Task 7 Step 5 memaksa memakai `window.location.href = '/admin/jadwal'` karena route-nya belum ada, sekarang gantilah ke `router.navigate({ to: '/admin/jadwal' })` dan hapus komentar `// TODO Task 8`. Verifikasi `pnpm typecheck` hijau.

- [ ] **Step 6: Verifikasi lewat probe Playwright**

Subagent tidak punya browser interaktif. Tulis probe sementara `tests/e2e/zz-probe-jadwal.spec.ts` yang masuk memakai `SEED_ADMIN_*` (pola ada di `tests/e2e/admin.spec.ts` — pemanasan endpoint, tunggu `networkidle`), lalu membuktikan:

- `/admin/jadwal` menampilkan tabel dengan minimal satu baris
- `/admin/jadwal/baru` menampilkan field tanggal dan tombol simpan
- `/admin/jadwal/generator` menampilkan kedua field tanggal, dan tombol "Buat sebagai draf" **disabled** sebelum pratinjau ditekan

Jalankan `--project=chromium`, salin hasil ke laporan, **hapus probe sebelum commit**.

- [ ] **Step 7: Buktikan idempotensi generator terhadap database sungguhan**

Ini pembuktian yang ditunda dari Task 6 Step 3, dan yang paling penting di seluruh plan.

Lewat probe Playwright sementara (atau browser kalau tersedia): buka `/admin/jadwal/generator`, pilih rentang yang **sudah terisi penuh** — mis. `from` = hari ini, `to` = hari ini + 7 — tekan pratinjau, lalu "Buat sebagai draf". Catat angka `dibuat`. Ulangi persis sama sekali lagi.

Expected: kali kedua **selalu 0**, dan jumlah baris `worship_services` tidak berubah di antara keduanya. Verifikasi jumlah barisnya:

```bash
cat > zz-probe.mjs <<'EOF'
import 'dotenv/config'
import pg from 'pg'
const c = new pg.Client({ connectionString: process.env.DATABASE_URL })
await c.connect()
console.log('worship_services:', (await c.query('select count(*)::int n from worship_services')).rows[0].n)
await c.end()
EOF
npx tsx zz-probe.mjs; rm -f zz-probe.mjs
```

Kalau kali kedua > 0, idempotensinya rusak — **hentikan dan laporkan**. Jangan menghapus baris duplikat untuk menutupinya; itu berarti constraint Task 2 atau backfill Task 1 tidak bekerja seperti yang diklaim.

- [ ] **Step 8: Gerbang penuh + commit**

```bash
pnpm lint && pnpm typecheck && pnpm test && pnpm build
# jalankan e2e sendirian — jangan tumpang tindih
pnpm test:e2e
git add src/routes/ src/components/admin/ messages/
git commit -m "Tambah daftar jadwal + halaman generator

Daftar menampilkan draf maupun terbit dengan aksi per baris. Hapus memakai
dialog konfirmasi, bukan window.confirm — yang memblok thread dan tak bisa
dibaca pembaca layar dengan konteks yang sama.

Generator mengunci tombol 'Buat sebagai draf' sampai pratinjau dijalankan:
pengurus tidak boleh bisa menulis tanpa melihat dulu apa yang akan dibuat.
Catatan 'semuanya dibuat sebagai draf' selalu terlihat, bukan hanya setelah
pratinjau — pengurus harus tahu itu sebelum menekan apa pun.

Idempotensi dibuktikan terhadap database sungguhan: menjalankan rentang yang
sama dua kali membuat 0 pada kali kedua, dan jumlah baris tidak berubah."
```

---

## Task 9: E2E alur jadwal

**Files:**
- Create: `tests/e2e/admin-jadwal.spec.ts`
- Modify: `tests/e2e/admin.spec.ts`

**Interfaces:**
- Consumes: seluruh route Task 7 dan 8.
- Produces: —

- [ ] **Step 1: Tambahkan route baru ke daftar gerbang**

`tests/e2e/admin.spec.ts` memuat komentar yang menyatakan rencana berikutnya wajib menambahkan path barunya. Lakukan itu:

```ts
for (const path of [
  '/admin',
  '/admin/jadwal',
  '/admin/jadwal/baru',
  '/admin/jadwal/generator',
]) {
```

`/admin/jadwal/$id` tidak dimasukkan — ia butuh id sungguhan, dan gerbangnya sudah terbukti lewat induknya.

- [ ] **Step 2: Tulis e2e alur**

Buat `tests/e2e/admin-jadwal.spec.ts`:

```ts
import { test, expect, type APIRequestContext } from '@playwright/test'

/**
 * Alur jadwal end-to-end: buat draf → tidak bocor ke publik → terbitkan →
 * muncul di publik → hapus → hilang dari keduanya.
 *
 * Langkah ketiga yang paling penting. Draf adalah satu-satunya hal yang
 * memisahkan "pengurus sedang menyusun jadwal" dari "jemaat melihat ibadah yang
 * belum diputuskan" — dan tidak ada test lain yang menjaganya.
 *
 * `mode: 'serial'` karena kelima langkah adalah satu cerita atas satu baris
 * yang sama; menjalankannya paralel akan membuat langkah 3 membaca keadaan yang
 * sudah diubah langkah 4.
 *
 * Tanggal sengaja jauh di masa depan supaya test tidak bergantung pada isi
 * jadwal sungguhan dan tidak mengotori tinjauan pengurus.
 */
test.describe.configure({ mode: 'serial' })

const EMAIL = process.env.SEED_ADMIN_EMAIL
const PASSWORD = process.env.SEED_ADMIN_PASSWORD
const TANGGAL = '2027-01-03'
const TEMA = 'Uji Otomatis — hapus bila tertinggal'

async function warm(request: APIRequestContext, path: string) {
  await expect(async () => {
    const res = await request.get(path)
    expect([200, 300, 301, 302, 303, 307, 308]).toContain(res.status())
  }).toPass({ timeout: 20_000 })
}

async function masuk(page: import('@playwright/test').Page) {
  await page.goto('/admin/login')
  await page.waitForLoadState('networkidle')
  await page.getByLabel(/email/i).fill(EMAIL!)
  await page.getByLabel(/kata sandi|password/i).fill(PASSWORD!)
  await page.getByRole('button', { name: /masuk|sign in/i }).click()
  await expect(page).toHaveURL(/\/admin$/, { timeout: 15_000 })
}

test('alur jadwal: buat draf → terbitkan → hapus', async ({ page, request }, testInfo) => {
  test.skip(testInfo.project.name !== 'chromium', 'alur admin hanya di chromium')
  test.skip(!EMAIL || !PASSWORD, 'SEED_ADMIN_EMAIL/PASSWORD tidak di-set')

  await warm(request, '/api/auth/ok')
  await warm(request, '/admin')
  await masuk(page)

  // 1. Buat sebagai draf.
  await page.goto('/admin/jadwal/baru')
  await page.waitForLoadState('networkidle')
  await page.getByLabel(/tanggal|^date$/i).fill(TANGGAL)
  await page.getByLabel(/jam mulai|start time/i).fill('10:00')
  await page.getByLabel(/tema \(indonesia\)|theme \(indonesian\)/i).fill(TEMA)
  await page.getByRole('button', { name: /simpan|^save$/i }).click()
  await expect(page).toHaveURL(/\/admin\/jadwal$/, { timeout: 15_000 })

  // 2. Tampil di dashboard sebagai draf.
  const baris = page.getByRole('row').filter({ hasText: TEMA })
  await expect(baris).toBeVisible()
  await expect(baris).toContainText(/draf|draft/i)

  // 3. TIDAK bocor ke halaman publik.
  await page.goto('/jadwal')
  await expect(page.getByText(TEMA)).toHaveCount(0)

  // 4. Terbitkan → muncul di publik.
  await page.goto('/admin/jadwal')
  await page.waitForLoadState('networkidle')
  await baris.getByRole('button', { name: /terbitkan|^publish$/i }).click()
  await expect(baris).toContainText(/terbit|published/i)
  await page.goto('/jadwal')
  await expect(page.getByText(TEMA).first()).toBeVisible()

  // 5. Hapus → hilang dari keduanya.
  await page.goto('/admin/jadwal')
  await page.waitForLoadState('networkidle')
  await baris.getByRole('button', { name: /hapus|^delete$/i }).click()
  await page.getByRole('dialog').getByRole('button', { name: /hapus|^delete$/i }).click()
  await expect(page.getByRole('row').filter({ hasText: TEMA })).toHaveCount(0)
  await page.goto('/jadwal')
  await expect(page.getByText(TEMA)).toHaveCount(0)
})
```

- [ ] **Step 3: Buktikan test benar-benar menangkap**

Sementara, ubah `listServicesForAdmin` di `src/features/schedule/admin-queries.ts` supaya selalu memfilter `eq(s.status, 'published')` — menghapus kemampuan melihat draf.

Run: `pnpm test:e2e tests/e2e/admin-jadwal.spec.ts --project=chromium`
Expected: **GAGAL** di langkah 2 (baris draf tidak muncul di dashboard).

Kembalikan perubahannya, jalankan ulang, pastikan hijau. Salin kedua output ke laporan — tanpa bukti merah, test ini tidak terbukti menjaga apa pun.

- [ ] **Step 4: Pastikan tidak ada baris uji yang tertinggal**

Test menghapus barisnya sendiri di langkah 5, tapi kalau ia gagal di tengah, baris ber-tema `TEMA` bisa tertinggal di database yang melayani situs live.

```bash
cat > zz-probe.mjs <<'EOF'
import 'dotenv/config'
import pg from 'pg'
const c = new pg.Client({ connectionString: process.env.DATABASE_URL })
await c.connect()
const r = await c.query(`select id, service_date, status from worship_services where theme_id like 'Uji Otomatis%'`)
console.log('baris uji tertinggal:', r.rowCount)
for (const x of r.rows) console.log('  ', x.id, x.service_date, x.status)
await c.end()
EOF
npx tsx zz-probe.mjs; rm -f zz-probe.mjs
```

Expected: `0`. Kalau ada yang tertinggal, hapus lewat dashboard (bukan lewat SQL langsung — pakai jalur yang sama dengan pengurus), lalu jalankan ulang probe.

- [ ] **Step 5: Gerbang penuh + commit**

```bash
pnpm lint && pnpm typecheck && pnpm test && pnpm build
pnpm test:e2e
git add tests/e2e/
git commit -m "Kunci alur jadwal admin dengan e2e

Satu alur berurutan: buat draf -> tidak bocor ke /jadwal publik -> terbitkan
-> muncul di publik -> hapus -> hilang dari keduanya.

Langkah ketiga yang paling penting dan tidak dijaga test lain mana pun: draf
adalah satu-satunya hal yang memisahkan 'pengurus sedang menyusun jadwal'
dari 'jemaat melihat ibadah yang belum diputuskan'. Diverifikasi merah lebih
dulu dengan membuat query admin memfilter published saja.

Keempat route jadwal ditambahkan ke daftar gerbang di admin.spec.ts, sesuai
catatan yang ditinggalkan Rencana 3a di file itu."
```

---

## Setelah plan ini

Sisa Fase 2 yang sengaja ditunda:

- **Kelola `schedule_templates` lewat UI.** Generator sudah memakainya, jadi pengurus bisa bekerja tanpa ini — tapi mengubah pola mingguan masih menuntut pengembang.
- **Upload PDF tata ibadah** (`liturgyPdfUrl`). Ditunda bersama seluruh urusan unggah ke rencana yang juga menangani sampul renungan dan foto galeri, supaya lapisan unggahnya ditulis sekali.

Utang dari `docs/dev/rencana-3a-handoff.md` §2 yang mendarat di plan ini:

- **Alias `muted`/`accent` maknanya bentrok** antara shadcn dan token GMIM. `bg-muted` menunjuk warna teks, dan kontras baris terpilih terhitung 2.95:1 di terang dan 2.03:1 di gelap — di bawah AA. Task 8 adalah pemakaian pertama `<Table>` dan `<Dialog>`, jadi **kalau baris terpilih atau item hover terlihat salah saat verifikasi Step 6, perbaiki aliasnya di situ juga** — kemungkinan butuh nama alias baru (mis. `--color-muted-surface`), bukan sekadar remap.
- **`<Toaster>` belum dipasang** di layout mana pun. Plan ini tidak memakai `toast()` — umpan balik lewat navigasi dan `role="status"` — jadi tidak memblokir. Pasang saat ada halaman yang benar-benar membutuhkannya.

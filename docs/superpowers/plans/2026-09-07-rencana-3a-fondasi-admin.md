# Rencana 3a — Fondasi Admin Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Membangun prasyarat schema + fondasi dashboard admin sampai pengurus bisa masuk lewat `/admin/login` dan melihat beranda admin yang menampilkan ringkasan isi situs.

**Architecture:** Route `/admin/*` di-SSR seperti route publik. Gerbang tunggal `ensureAdmin()` di `beforeLoad` sebuah pathless layout, sehingga `/admin/login` bisa berada di luar gerbang tanpa redirect loop. Komponen UI ditarik dari shadcn/ui setelah lapisan alias token dipasang, sehingga tiap komponen langsung memakai palet GMIM tanpa duplikasi nilai warna.

**Tech Stack:** TanStack Start (React 19), Drizzle ORM + Postgres (Neon), better-auth, Tailwind CSS v4, shadcn/ui (style `new-york`), lucide-react, Vitest, Playwright.

**Spec:** `docs/superpowers/specs/2026-09-07-rencana-3-admin-dashboard.md`

## Global Constraints

- **Token saja** — tanpa class `dark:`, tanpa hex literal di komponen. Satu pengecualian terdokumentasi: `style={{ backgroundColor: category.color }}` di `<CategoryBadge>`.
- **Benar di kedua tema** — semua pasangan teks/latar ≥ WCAG AA (4.5:1 teks normal, 3:1 UI).
- **Dwibahasa** — tiap kunci UI ada di `messages/id.json` DAN `messages/en.json`. Berlaku juga untuk antarmuka admin.
- `src/components/ui/**` tetap prettier-ignored (lihat `.prettierignore`).
- **Gerbang harus tetap hijau di tiap task**: `pnpm lint`, `pnpm typecheck`, `pnpm build`, `pnpm test` (176 unit saat plan ini ditulis), `pnpm test:e2e` (117 e2e, 1 skipped).
- **Bahasa komentar & commit: Indonesia**, mengikuti seluruh repo.
- Invarian hero tidak boleh dilonggarkan: `autoplay` tidak pernah ada di markup SSR; video tidak autoplay saat `prefers-reduced-motion`.

---

## File Structure

**Fase 0 — prasyarat**

| File | Tanggung jawab |
|---|---|
| `src/db/schema/worship.ts` (modify) | Bentuk `ws_template_date_uq` diperbaiki jadi 3 kolom |
| `drizzle/0002_*.sql` (generated) | Migrasi drop + create index |
| `tests/unit/schema-index.test.ts` (create) | Mengunci bentuk index tanpa perlu database |
| `src/db/seed/index.ts` (modify) | Pagar `SEED_ALLOW_NON_EMPTY` |
| `src/db/seed/guard.ts` (create) | Logika pagar, terpisah supaya bisa diuji |
| `tests/unit/seed-guard.test.ts` (create) | Uji pagar |
| `docs/dev/rencana-2b-handoff.md` (modify) | Tutup §6 dengan keputusan DB |

**Fase 1 — fondasi admin**

| File | Tanggung jawab |
|---|---|
| `src/styles/app.css` (modify) | Token `destructive` + lapisan alias shadcn |
| `tests/unit/dark-palette.test.ts` (modify) | Uji `destructive` + keberadaan alias |
| `src/components/ui/{input,textarea,label,select,dialog,table,dropdown-menu,sonner}.tsx` (create) | Komponen shadcn |
| `src/lib/auth.ts` (modify) | `rateLimit.storage: 'database'` |
| `src/lib/auth.functions.ts` (modify) | Lazy import `@/lib/auth` |
| `src/routes/admin.login.tsx` (create) | Form masuk — DI LUAR gerbang |
| `src/components/admin/login-form.tsx` (create) | Komponen klien form masuk |
| `src/routes/admin._app.tsx` (create) | Pathless layout + gerbang `ensureAdmin()` |
| `src/components/admin/admin-shell.tsx` (create) | Sidebar + topbar |
| `src/routes/admin._app.index.tsx` (create) | Beranda admin |
| `src/features/admin/summary.ts` (create) | Server fn ringkasan isi |
| `tests/unit/admin-summary.test.ts` (create) | Uji perhitungan ringkasan |
| `tests/e2e/admin.spec.ts` (create) | Gerbang + alur masuk |
| `messages/{id,en}.json` (modify) | Kunci UI admin |

---

## Task 1: Perbaiki bentuk index `ws_template_date_uq`

Index ini unique pada `(template_id, service_date)`. Kategori `kolom` butuh satu ibadah **per kolom** pada tanggal dan template yang sama — empat baris. Bentuk sekarang membuat baris ke-2 dan seterusnya bentrok, dan generator jadwal di rencana berikutnya akan kehilangan 3 dari 4 ibadah kolom tanpa error apa pun.

**Files:**
- Modify: `src/db/schema/worship.ts:93`
- Create: `drizzle/0002_*.sql` (via `pnpm db:generate`)
- Test: `tests/unit/schema-index.test.ts`

**Interfaces:**
- Consumes: —
- Produces: index `ws_template_date_uq` berbentuk `(template_id, service_date, kolom_id)`. Generator jadwal di Rencana 3b bersandar pada bentuk ini untuk `onConflictDoNothing`.

- [ ] **Step 1: Tulis test yang gagal**

Buat `tests/unit/schema-index.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { getTableConfig } from 'drizzle-orm/pg-core'
import { worshipServices } from '@/db/schema'

/**
 * Bentuk index dibaca dari definisi Drizzle, bukan dari database — jadi test ini
 * jalan di CI tanpa Postgres dan tetap gagal begitu seseorang mengubah kolomnya.
 *
 * Yang dijaga: kategori `kolom` menghasilkan SATU ibadah per kolom aktif pada
 * tanggal dan template yang sama. Tanpa `kolom_id` di dalam unique index, baris
 * kedua dan seterusnya bentrok — dan generator jadwal yang memakai index ini
 * untuk idempotensi (`onConflictDoNothing`) akan diam-diam menyimpan 1 dari 4.
 */
describe('worship_services — ws_template_date_uq', () => {
  const { indexes } = getTableConfig(worshipServices)
  const uq = indexes.find((i) => i.config.name === 'ws_template_date_uq')

  it('ada dan unique', () => {
    expect(uq).toBeDefined()
    expect(uq?.config.unique).toBe(true)
  })

  it('mencakup kolom_id — tanpa itu fan-out kolom bentrok', () => {
    const cols = uq?.config.columns.map((c: unknown) => (c as { name?: string }).name)
    expect(cols).toEqual(['template_id', 'service_date', 'kolom_id'])
  })
})
```

- [ ] **Step 2: Jalankan test — pastikan GAGAL**

Run: `pnpm test tests/unit/schema-index.test.ts`
Expected: FAIL — `expected [ 'template_id', 'service_date' ] to deeply equal [ 'template_id', 'service_date', 'kolom_id' ]`

- [ ] **Step 3: Perbaiki schema**

Di `src/db/schema/worship.ts`, ganti baris index (di dalam array callback tabel `worshipServices`):

```ts
    // Unique WAJIB mencakup kolomId: kategori `kolom` menghasilkan satu ibadah
    // per kolom aktif pada tanggal & template yang sama — empat baris yang, tanpa
    // kolomId di sini, saling bentrok. Rencana 2b menghindarinya dengan menyetel
    // templateId = NULL di semua baris hasil generate (NULL distinct di Postgres),
    // dan membayarnya dengan hilangnya keterhubungan template -> ibadah.
    uniqueIndex('ws_template_date_uq').on(t.templateId, t.serviceDate, t.kolomId),
```

- [ ] **Step 4: Jalankan test — pastikan LULUS**

Run: `pnpm test tests/unit/schema-index.test.ts`
Expected: PASS (2 test)

- [ ] **Step 5: Buat migrasi**

Run: `pnpm db:generate`

Periksa file `drizzle/0002_*.sql` yang dihasilkan. Isinya harus berupa drop + create index, TANPA `DROP TABLE` atau `ALTER COLUMN` apa pun. Kalau ada, hentikan dan laporkan — itu berarti schema ikut berubah di luar yang dimaksud.

Bentuk yang diharapkan:

```sql
DROP INDEX "ws_template_date_uq";--> statement-breakpoint
CREATE UNIQUE INDEX "ws_template_date_uq" ON "worship_services" USING btree ("template_id","service_date","kolom_id");
```

- [ ] **Step 6: Terapkan migrasi ke database dev**

Run: `pnpm db:migrate`
Expected: selesai tanpa error.

Verifikasi bentuknya benar-benar mendarat:

```bash
psql "$DATABASE_URL" -c "\d worship_services" | grep ws_template_date_uq
```

Expected: memuat `(template_id, service_date, kolom_id)`.

- [ ] **Step 7: Jalankan gerbang penuh**

Run: `pnpm lint && pnpm typecheck && pnpm test && pnpm build`
Expected: semua hijau, unit test 178 (176 + 2 baru).

- [ ] **Step 8: Commit**

```bash
git add src/db/schema/worship.ts drizzle/ tests/unit/schema-index.test.ts
git commit -m "Perbaiki bentuk ws_template_date_uq: sertakan kolom_id

Unique pada (template_id, service_date) tidak kompatibel dengan fan-out
kolom — kategori kolom butuh satu ibadah per kolom aktif pada tanggal dan
template yang sama, dan baris kedua dan seterusnya bentrok. Rencana 2b
menghindarinya dengan menyetel templateId = NULL di semua baris hasil
generate, dan membayarnya dengan hilangnya keterhubungan template -> ibadah.

Generator jadwal Rencana 3b memakai index ini untuk idempotensi; tanpa
perbaikan ini ia menyimpan 1 dari 4 ibadah kolom tanpa error apa pun.

Bentuk index dikunci test yang membaca definisi Drizzle lewat getTableConfig,
jadi tak butuh Postgres dan tetap merah kalau kolomnya diubah."
```

---

## Task 2: Pagar `pnpm db:seed` + tutup pertanyaan jalur data

`db:seed` menulis ke `DATABASE_URL` apa pun yang aktif, tanpa konfirmasi. Produksi memakai database yang sama dengan pengembangan (Neon branch `dev`), jadi begitu pengurus mulai mengisi lewat dashboard, satu `pnpm db:seed` yang salah jalan bisa menimpa data jemaat.

Pagar sengaja kasar — kosong atau tidak. Menandai baris "pernah disunting" lewat `updatedAt` ≠ `createdAt` akan bergantung pada tiap mutasi disiplin menyetel `updatedAt`, dan Drizzle tidak melakukannya sendiri; satu mutasi yang lupa membuat pagar diam-diam berhenti menjaga.

**Files:**
- Create: `src/db/seed/guard.ts`
- Modify: `src/db/seed/index.ts`
- Modify: `docs/dev/rencana-2b-handoff.md`
- Test: `tests/unit/seed-guard.test.ts`

**Interfaces:**
- Consumes: —
- Produces: `assertSeedAllowed(counts: ContentCounts, allowNonEmpty: boolean): void` — melempar `Error` berisi pesan instruktif bila ada isi dan flag tidak diberikan. `type ContentCounts = Record<string, number>`.

- [ ] **Step 1: Tulis test yang gagal**

Buat `tests/unit/seed-guard.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { assertSeedAllowed } from '@/db/seed/guard'

describe('assertSeedAllowed', () => {
  it('mengizinkan saat semua tabel konten kosong — ini setup pertama', () => {
    expect(() => assertSeedAllowed({ bulletins: 0, worship_services: 0 }, false)).not.toThrow()
  })

  it('menolak saat ada isi dan flag tidak diberikan', () => {
    expect(() => assertSeedAllowed({ bulletins: 3, worship_services: 72 }, false)).toThrow(
      /SEED_ALLOW_NON_EMPTY/,
    )
  })

  it('menyebut tabel mana yang berisi, supaya pesannya bisa ditindaklanjuti', () => {
    expect(() => assertSeedAllowed({ bulletins: 3, worship_services: 0 }, false)).toThrow(
      /bulletins \(3\)/,
    )
  })

  it('mengizinkan saat flag diberikan — keputusan sadar', () => {
    expect(() => assertSeedAllowed({ bulletins: 3 }, true)).not.toThrow()
  })
})
```

- [ ] **Step 2: Jalankan test — pastikan GAGAL**

Run: `pnpm test tests/unit/seed-guard.test.ts`
Expected: FAIL — modul `@/db/seed/guard` belum ada.

- [ ] **Step 3: Tulis implementasi**

Buat `src/db/seed/guard.ts`:

```ts
/**
 * Pagar `pnpm db:seed`.
 *
 * Satu database melayani pengembangan DAN situs live (Neon branch `dev` — lihat
 * `docs/dev/rencana-2b-handoff.md` §6), jadi seed yang salah jalan menimpa data
 * jemaat sungguhan. Begitu dashboard admin ada, `db:seed` tidak boleh lagi
 * dijalankan tanpa keputusan sadar.
 *
 * Pemeriksaannya sengaja kasar — kosong atau tidak. Alternatif yang lebih pintar
 * (menandai baris "pernah disunting" lewat `updatedAt` != `createdAt`) bergantung
 * pada tiap mutasi disiplin menyetel `updatedAt`, dan Drizzle tidak melakukannya
 * sendiri; satu mutasi yang lupa akan membuat pagar diam-diam berhenti menjaga.
 * "Kosong atau tidak" tidak punya mode gagal seperti itu.
 */
export type ContentCounts = Record<string, number>

export function assertSeedAllowed(counts: ContentCounts, allowNonEmpty: boolean): void {
  if (allowNonEmpty) return

  const berisi = Object.entries(counts).filter(([, n]) => n > 0)
  if (berisi.length === 0) return

  const rincian = berisi.map(([tabel, n]) => `  - ${tabel} (${n})`).join('\n')
  throw new Error(
    `Tabel konten sudah berisi data:\n${rincian}\n\n` +
      `Seed dihentikan supaya tidak menimpa isi yang mungkin dikelola pengurus lewat ` +
      `dashboard. Database ini juga melayani situs live.\n\n` +
      `Kalau memang disengaja, jalankan ulang dengan:\n` +
      `  SEED_ALLOW_NON_EMPTY=1 pnpm db:seed`,
  )
}
```

- [ ] **Step 4: Jalankan test — pastikan LULUS**

Run: `pnpm test tests/unit/seed-guard.test.ts`
Expected: PASS (4 test)

- [ ] **Step 5: Pasang pagar di runner seed**

Di `src/db/seed/index.ts`, tambahkan import dan panggil pagar sebelum seeder mana pun jalan. Sisipkan tepat di awal `main()`:

```ts
import { assertSeedAllowed } from './guard'
```

```ts
async function main() {
  // Pagar dijalankan SEBELUM seeder mana pun menyentuh database — lihat
  // `guard.ts` untuk alasan kenapa pemeriksaannya sekasar ini.
  const { db } = await import('@/db')
  const { bulletins, devotionals, galleryAlbums, galleryItems, worshipServices } = await import(
    '@/db/schema'
  )
  assertSeedAllowed(
    {
      bulletins: await db.$count(bulletins),
      devotionals: await db.$count(devotionals),
      gallery_albums: await db.$count(galleryAlbums),
      gallery_items: await db.$count(galleryItems),
      worship_services: await db.$count(worshipServices),
    },
    process.env.SEED_ALLOW_NON_EMPTY === '1',
  )

  const categories = await seedCategories()
  // ...sisa main() tidak berubah
```

Catatan: `worship_categories`, `kolom`, dan `site_settings` **tidak** ikut diperiksa — ketiganya data referensi yang memang harus ada dan seeder-nya sudah idempoten per baris.

- [ ] **Step 6: Verifikasi pagar bekerja terhadap database sungguhan**

Run: `pnpm db:seed`
Expected: berhenti dengan pesan yang menyebut tabel berisi + instruksi `SEED_ALLOW_NON_EMPTY=1`. TIDAK ada baris yang ditulis.

Run: `SEED_ALLOW_NON_EMPTY=1 pnpm db:seed`
Expected: jalan seperti biasa dan selesai.

- [ ] **Step 7: Tutup §6 di handoff**

Di `docs/dev/rencana-2b-handoff.md`, ganti pembuka §6 (kalimat "Belum terjawab, dan **jangan ditebak**" beserta daftar 1–4 dibiarkan sebagai riwayat) dengan menambahkan blok keputusan di bawah judul §6:

```markdown
> **TERJAWAB 2026-09-07 (Rencana 3).** Produksi memakai Neon branch **`dev`** —
> bukan `production`. Buktinya: beranda live menampilkan seed galeri yang
> di-commit dari mesin lokal, dan `dev` adalah satu-satunya branch yang tercatat
> pernah dimigrasi. Pemilik proyek memilih menerima keadaan ini alih-alih
> memindahkan produksi, karena jemaat sekecil ini tidak menuntut pemisahan.
>
> Konsekuensinya dijaga kode, bukan kehati-hatian: `pnpm db:seed` kini berhenti
> bila tabel konten sudah berisi apa pun, kecuali dijalankan dengan
> `SEED_ALLOW_NON_EMPTY=1` (lihat `src/db/seed/guard.ts`).
>
> Pertanyaan 1–4 di bawah dibiarkan sebagai riwayat bagaimana keputusan ini
> sampai diambil.
```

- [ ] **Step 8: Jalankan gerbang penuh**

Run: `pnpm lint && pnpm typecheck && pnpm test && pnpm build`
Expected: semua hijau, unit test 182 (178 + 4 baru).

- [ ] **Step 9: Commit**

```bash
git add src/db/seed/ tests/unit/seed-guard.test.ts docs/dev/rencana-2b-handoff.md
git commit -m "Pagari db:seed + tutup pertanyaan jalur data produksi

Satu database melayani pengembangan DAN situs live (Neon branch dev), dan
db:seed menulis ke DATABASE_URL apa pun yang aktif tanpa konfirmasi. Begitu
pengurus mulai mengisi lewat dashboard, satu seed yang salah jalan menimpa
data jemaat.

Pemeriksaannya sengaja kasar — kosong atau tidak. Menandai baris 'pernah
disunting' lewat updatedAt != createdAt akan bergantung pada tiap mutasi
disiplin menyetel updatedAt, dan Drizzle tidak melakukannya sendiri; satu
mutasi yang lupa membuat pagar diam-diam berhenti menjaga.

Handoff 2b §6 ditutup: produksi memakai dev, diterima secara sadar, dan
konsekuensinya kini dijaga kode."
```

---

## Task 3: Lapisan alias token shadcn + warna `destructive`

`components.json` sudah menyatakan shadcn dengan `cssVariables: true`, tapi `app.css` tidak punya satu pun token yang diasumsikan komponen shadcn. `npx shadcn add table` hari ini menghasilkan komponen ber-class yang tidak eksis — tampil tanpa warna. Task ini memasang jembatannya lebih dulu, supaya tujuh komponen berikutnya bisa ditarik tanpa adaptasi tangan.

**Files:**
- Modify: `src/styles/app.css`
- Test: `tests/unit/dark-palette.test.ts`

**Interfaces:**
- Consumes: —
- Produces: token `--color-destructive` / `--dark-destructive`, plus alias `--color-background`, `--color-foreground`, `--color-card`, `--color-card-foreground`, `--color-popover`, `--color-popover-foreground`, `--color-muted-foreground`, `--color-input`, `--color-ring`, `--color-destructive-foreground`. Task 4 dan seterusnya bersandar pada nama-nama ini.

- [ ] **Step 1: Tulis test yang gagal**

Tambahkan di akhir `tests/unit/dark-palette.test.ts`:

```ts
describe('warna destructive — aksi hapus di admin', () => {
  it('light: teks putih di atasnya lolos AA', () => {
    expect(contrast(token('color-destructive'), '#ffffff')).toBeGreaterThanOrEqual(4.5)
  })

  it('dark: lolos AA di kedua permukaan gelap', () => {
    expect(contrast(token('dark-destructive'), SURFACE())).toBeGreaterThanOrEqual(4.5)
    expect(contrast(token('dark-destructive'), SURFACE_2())).toBeGreaterThanOrEqual(4.5)
  })

  it('dark: tetap bukan ungu', () => {
    const hex = token('dark-destructive')
    if (chroma(hex) < 0.12) return
    expect(hue(hex) >= 260 && hue(hex) <= 330).toBe(false)
  })

  // Badge kategori Jemaat juga merah. Keduanya tak pernah berdampingan (satu di
  // halaman publik, satu di tombol hapus admin), tapi jaraknya tetap dijaga
  // supaya tombol hapus tidak terbaca seperti badge.
  it('dark: cukup berbeda terang dari cat-jemaat', () => {
    const beda = contrast(token('dark-destructive'), token('dark-cat-jemaat'))
    expect(beda).toBeGreaterThanOrEqual(1.3)
  })
})

describe('alias token shadcn', () => {
  // Komponen shadcn yang ditarik CLI memakai nama-nama ini. Kalau salah satu
  // hilang, komponennya tampil tanpa warna — dan tak ada yang merah tanpa test
  // ini, karena class Tailwind yang tak dikenal gagal diam-diam.
  it.each([
    'color-background',
    'color-foreground',
    'color-card',
    'color-card-foreground',
    'color-popover',
    'color-popover-foreground',
    'color-muted-foreground',
    'color-input',
    'color-ring',
    'color-destructive',
    'color-destructive-foreground',
  ])('--%s terdefinisi', (name) => {
    expect(() => aliasTarget(name)).not.toThrow()
  })
})
```

Dan tambahkan helper ini tepat di bawah `token()` di file yang sama:

```ts
/**
 * Alias menunjuk token lain (`var(--color-surface)`), bukan hex — jadi `token()`
 * yang mencari `#rrggbb` tidak menemukannya. Helper ini hanya memastikan
 * deklarasinya ADA; nilainya sudah diuji lewat token yang ditunjuknya.
 */
function aliasTarget(name: string): string {
  const found = CSS.match(new RegExp(`--${name}:\\s*(var\\(--[a-z0-9-]+\\)|#[0-9a-fA-F]{6})`))
  if (!found?.[1]) throw new Error(`alias --${name} tidak ditemukan di app.css`)
  return found[1]
}
```

- [ ] **Step 2: Jalankan test — pastikan GAGAL**

Run: `pnpm test tests/unit/dark-palette.test.ts`
Expected: FAIL — `token --color-destructive tidak ditemukan di app.css`.

- [ ] **Step 3: Tambahkan token destructive**

Di `src/styles/app.css`, di dalam blok `:root`, tambahkan setelah `--color-accent`:

```css
  /* Aksi merusak (hapus) di dashboard admin. Putih di atasnya 6.47:1. */
  --color-destructive: #b91c1c;
  --color-destructive-foreground: #ffffff;
```

Dan di blok token dark, setelah `--dark-accent`:

```css
  /* 6.45:1 di --dark-surface. Sengaja lebih jenuh daripada --dark-cat-jemaat
     (#fca5a5) supaya tombol hapus tidak terbaca seperti badge kategori. */
  --dark-destructive: #f87171;
```

- [ ] **Step 4: Petakan destructive di kedua selector dark**

Di **kedua** blok dark (`@media (prefers-color-scheme: dark) :root:not([data-theme='light'])` DAN `:root[data-theme='dark']`), tambahkan baris yang sama — isinya wajib identik seperti dicatat komentar di file:

```css
  --color-destructive: var(--dark-destructive);
```

> **KOREKSI (pasca-implementasi).** Baris ini semula berbunyi "`--color-destructive-foreground` tetap `#ffffff` di kedua tema: teks putih di atas `#f87171` = 6.45:1, lolos AA" — dan itu SALAH. Angka 6.45:1 adalah kontras `#f87171` terhadap `--dark-surface`, bukan terhadap teks di atasnya. Putih di atas `#f87171` sebenarnya hanya **2.77:1 dan GAGAL AA**. Implementer menangkapnya saat mengerjakan task ini dan menambahkan `--dark-destructive-foreground: #1a1714` (6.45:1, lolos), konsisten dengan `--dark-primary-foreground` dan `--dark-accent-foreground` yang juga memakai ink gelap. Yang terpasang di `app.css` adalah nilai yang benar itu, bukan yang tertulis di sini semula.

- [ ] **Step 5: Tambahkan lapisan alias di `@theme inline`**

Di dalam blok `@theme inline`, tambahkan setelah `--color-muted`:

```css
  /* --- Alias nama shadcn -> token GMIM ---------------------------------
     Komponen yang ditarik `npx shadcn add` memakai nama-nama di bawah. Tanpa
     lapisan ini, class seperti `bg-background` atau `border-input` tidak
     menghasilkan apa pun dan komponennya tampil tanpa warna — gagal diam-diam,
     karena Tailwind tidak mengeluh atas class yang tak dikenal.

     Semuanya menunjuk token yang sudah ada, jadi nol nilai warna diduplikasi
     dan dark mode ikut otomatis lewat swap `:root` yang sama. */
  --color-background: var(--color-surface);
  --color-foreground: var(--color-ink);
  --color-card: var(--color-surface);
  --color-card-foreground: var(--color-ink);
  --color-popover: var(--color-surface);
  --color-popover-foreground: var(--color-ink);
  --color-muted-foreground: var(--color-muted);
  --color-input: var(--color-border);
  --color-ring: var(--color-secondary);
  --color-destructive: var(--color-destructive);
  --color-destructive-foreground: var(--color-destructive-foreground);
```

- [ ] **Step 6: Jalankan test — pastikan LULUS**

Run: `pnpm test tests/unit/dark-palette.test.ts`
Expected: PASS — 27 test lama + 15 baru.

- [ ] **Step 7: Verifikasi alias benar-benar menghasilkan warna di browser**

Run: `pnpm dev`, buka `http://localhost:3000/_dev/tokens`, buka DevTools console dan jalankan:

```js
getComputedStyle(document.documentElement).getPropertyValue('--color-background')
```

Expected: mengembalikan nilai non-kosong (`#ffffff` di light). Ulangi setelah menekan tombol "Gelap" di halaman itu — harus berubah ke `#1a1714`.

- [ ] **Step 8: Jalankan gerbang penuh**

Run: `pnpm lint && pnpm typecheck && pnpm test && pnpm build`
Expected: semua hijau, unit test 197.

- [ ] **Step 9: Commit**

```bash
git add src/styles/app.css tests/unit/dark-palette.test.ts
git commit -m "Jembatani token shadcn ke palet GMIM + tambah warna destructive

components.json sudah menyatakan shadcn dengan cssVariables: true, tapi
app.css tidak punya satu pun token yang diasumsikan komponen shadcn —
tak ada --background, --foreground, --card, --popover, --input, --ring.
'npx shadcn add table' hari ini menghasilkan komponen tanpa warna, dan
gagalnya diam-diam karena Tailwind tidak mengeluh atas class tak dikenal.

Lapisan alias di @theme inline memetakan nama shadcn ke token yang sudah
ada — nol nilai warna diduplikasi, dark mode ikut lewat swap :root yang sama.

Admin juga butuh warna hapus yang belum ada di palet: light #b91c1c (putih
di atasnya 6.47:1), dark #f87171 (6.45:1). Versi dark sengaja lebih jenuh
dari --dark-cat-jemaat supaya tombol hapus tak terbaca seperti badge."
```

---

## Task 4: Pasang lucide + tarik komponen shadcn

**Files:**
- Modify: `package.json`
- Create: `src/components/ui/{input,textarea,label,select,dialog,table,dropdown-menu,sonner}.tsx`

**Interfaces:**
- Consumes: alias token dari Task 3.
- Produces: komponen `Input`, `Textarea`, `Label`, `Select` (+ `SelectTrigger`/`SelectContent`/`SelectItem`/`SelectValue`), `Dialog` (+ `DialogTrigger`/`DialogContent`/`DialogHeader`/`DialogTitle`/`DialogFooter`), `Table` (+ `TableHeader`/`TableBody`/`TableRow`/`TableHead`/`TableCell`), `DropdownMenu` (+ `DropdownMenuTrigger`/`DropdownMenuContent`/`DropdownMenuItem`), `Toaster` + `toast`.

- [ ] **Step 1: Pasang dependency**

```bash
pnpm add lucide-react
pnpm add sonner
```

- [ ] **Step 2: Tarik komponen shadcn**

```bash
pnpm dlx shadcn@latest add input textarea label select dialog table dropdown-menu sonner
```

Kalau CLI menawarkan menimpa `button.tsx` atau `card.tsx`, **tolak** — keduanya sudah diadaptasi ke token GMIM dan menimpanya akan mengembalikan varian shadcn bawaan.

- [ ] **Step 3: Periksa hasil tarikan**

Baca tiap file yang dibuat. Untuk setiap class warna yang dipakai, pastikan namanya ada di lapisan alias Task 3 atau di token GMIM. Kalau ada yang memakai nama di luar keduanya (mis. `bg-secondary-foreground`, `text-accent-foreground`), tambahkan aliasnya ke `@theme inline` **dan** ke daftar `it.each` di `tests/unit/dark-palette.test.ts` — jangan mengedit komponennya.

- [ ] **Step 4: Verifikasi typecheck & lint bersih**

Run: `pnpm typecheck && pnpm lint`
Expected: hijau. Kalau `lint` mengeluh soal isi `src/components/ui/**`, periksa `.prettierignore` — folder itu memang dikecualikan dari prettier, tapi tidak dari eslint.

- [ ] **Step 5: Verifikasi visual di kedua tema**

Run: `pnpm dev`, lalu buka `http://localhost:3000/_dev/tokens`.

Tambahkan sementara satu `<Input placeholder="uji" />` dan satu `<Table>` berisi satu baris di halaman itu, lihat keduanya di tema terang dan gelap (tombol tema sudah ada di halaman itu), lalu **hapus lagi** tambahan itu sebelum commit. Yang dicari: teks terbaca, border terlihat, tak ada elemen yang transparan.

- [ ] **Step 6: Jalankan gerbang penuh**

Run: `pnpm lint && pnpm typecheck && pnpm test && pnpm build`
Expected: semua hijau, unit test 197 (tidak bertambah — task ini tidak menambah logika).

- [ ] **Step 7: Commit**

```bash
git add package.json pnpm-lock.yaml src/components/ui/ src/styles/app.css tests/unit/dark-palette.test.ts
git commit -m "Tarik komponen shadcn untuk admin + pasang lucide

components.json menyebut lucide sejak Rencana 1 tapi paketnya tak pernah
dipasang; tujuh ikon yang ada ditulis tangan sebagai SVG inline. Dashboard
butuh puluhan, jadi lucide-react masuk. Ikon lama dibiarkan — menggantinya
tak memberi apa pun dan menyentuh komponen publik yang sudah stabil.

button.tsx dan card.tsx TIDAK ditimpa: keduanya sudah diadaptasi ke token
GMIM sejak Rencana 1."
```

---

## Task 5: Siapkan lapisan auth untuk dipakai

Dua utang teknis yang dicatat handoff Rencana 1, keduanya baru menggigit saat `/admin` sungguhan ada.

**Files:**
- Modify: `src/lib/auth.ts`
- Modify: `src/lib/auth.functions.ts`
- Test: `tests/unit/auth-schema.test.ts` (sudah ada — pastikan tetap hijau)

**Interfaces:**
- Consumes: —
- Produces: `ensureAdmin()` yang aman dipanggil dari route (`throw redirect` ke `/admin/login` bila tak ada sesi valid), dan rate limit login yang bertahan lintas invokasi lambda.

- [ ] **Step 1: Pindahkan `@/lib/auth` ke lazy import**

Di `src/lib/auth.functions.ts`, hapus import top-level `import { auth } from '@/lib/auth'` dan pindahkan ke dalam tiap handler:

```ts
import { createServerFn } from '@tanstack/react-start'
import { getRequestHeaders } from '@tanstack/react-start/server'
import { redirect } from '@tanstack/react-router'

/**
 * Server fn pembungkus better-auth. `auth.ts` server-only, jadi loader/route
 * memanggil helper ini (bukan `auth.api` langsung) supaya batas server/klien
 * tetap jelas.
 *
 * `@/lib/auth` di-import LAZY: import top-level menyeret `@/lib/env` ke graf
 * modul setiap route yang menyentuh file ini, sehingga env yang salah membuat
 * `/admin` membalas 500 alih-alih pesan yang berguna. Dicatat sebagai utang
 * teknis di `docs/dev/rencana-1-handoff.md` sejak Rencana 1.
 */
export const getSession = createServerFn({ method: 'GET' }).handler(async () => {
  const { auth } = await import('@/lib/auth')
  return auth.api.getSession({ headers: getRequestHeaders() })
})

export const ensureAdmin = createServerFn({ method: 'GET' }).handler(async () => {
  const { auth } = await import('@/lib/auth')
  const session = await auth.api.getSession({ headers: getRequestHeaders() })
  if (!session?.user || session.user.role !== 'admin' || !session.user.isActive) {
    throw redirect({ to: '/admin/login' })
  }
  return { user: session.user }
})
```

Catatan: `redirect({ href: '/admin/login' })` yang lama memakai `href` karena route-nya belum ada. Task 6 membuatnya, jadi di sini sudah boleh `to:` yang bertipe. Kalau `to:` ditolak typecheck saat task ini dikerjakan (route belum dibuat), biarkan `href:` dan ubah di Task 6 — jangan memaksa.

- [ ] **Step 2: Aktifkan rate limit berbasis database**

Di `src/lib/auth.ts`, tambahkan ke objek `betterAuth({ ... })`, setelah `emailAndPassword`:

```ts
  /**
   * Default better-auth = penyimpanan in-memory, yang di Vercel berarti tiap
   * lambda punya hitungannya sendiri — praktis tak membatasi apa pun. Baru
   * penting sekarang, karena form login sungguhan mulai live di Rencana 3.
   */
  rateLimit: {
    enabled: true,
    storage: 'database',
  },
```

- [ ] **Step 3: Periksa apakah rate limit menuntut tabel baru**

Run: `pnpm db:generate`

Kalau better-auth versi terpasang menyimpan rate limit di tabel tersendiri, langkah ini menghasilkan migrasi `0003`. Kalau tidak ada perubahan, drizzle-kit melaporkan "No schema changes" — itu juga hasil yang sah, lanjutkan.

Bila migrasi dihasilkan: baca isinya, pastikan hanya `CREATE TABLE` untuk rate limit dan tidak menyentuh tabel lain, lalu jalankan `pnpm db:migrate`.

- [ ] **Step 4: Verifikasi auth masih hidup**

Run: `pnpm test:e2e tests/e2e/auth-smoke.spec.ts`
Expected: 2 test lulus di kedua project — route better-auth ter-mount, pendaftaran publik tetap mati.

- [ ] **Step 5: Verifikasi sign-in sungguhan bekerja**

Dengan `pnpm dev` jalan:

```bash
curl -s -o /dev/null -w "%{http_code}\n" -X POST http://localhost:3000/api/auth/sign-in/email \
  -H 'Content-Type: application/json' \
  -d "{\"email\":\"$SEED_ADMIN_EMAIL\",\"password\":\"$SEED_ADMIN_PASSWORD\"}"
```

Expected: `200`. Kalau `401`, akun admin belum dibuat — jalankan `pnpm seed:admin` lebih dulu.

- [ ] **Step 6: Jalankan gerbang penuh**

Run: `pnpm lint && pnpm typecheck && pnpm test && pnpm build && pnpm test:e2e`
Expected: semua hijau.

- [ ] **Step 7: Commit**

```bash
git add src/lib/auth.ts src/lib/auth.functions.ts drizzle/
git commit -m "Siapkan lapisan auth untuk dipakai route admin

Dua utang teknis dari handoff Rencana 1 yang baru menggigit saat /admin
sungguhan ada:

- @/lib/auth kini di-import lazy di auth.functions.ts. Import top-level
  menyeret @/lib/env ke graf modul tiap route yang menyentuh file ini,
  sehingga env yang salah membuat /admin membalas 500 alih-alih pesan
  yang berguna.
- rateLimit.storage: 'database'. Default in-memory tak berarti apa-apa di
  Vercel, tempat tiap lambda punya hitungannya sendiri. Baru penting
  sekarang karena form login sungguhan mulai live."
```

---

## Task 6: Halaman `/admin/login`

Route ini berada **di luar** gerbang — kalau tidak, `ensureAdmin()` yang me-redirect ke sini akan memicu redirect loop.

**Files:**
- Create: `src/routes/admin.login.tsx`
- Create: `src/components/admin/login-form.tsx`
- Modify: `messages/id.json`, `messages/en.json`

**Interfaces:**
- Consumes: `signIn` dari `@/lib/auth-client`; `Button` dari `@/components/ui/button`; `Input`, `Label` dari Task 4.
- Produces: route `/admin/login`. Task 7 me-redirect ke sini.

- [ ] **Step 1: Tambahkan kunci pesan**

Di `messages/id.json`:

```json
  "admin_login_title": "Masuk Dashboard",
  "admin_login_subtitle": "Khusus pengurus GMIM Musafir.",
  "admin_login_email": "Email",
  "admin_login_password": "Kata sandi",
  "admin_login_submit": "Masuk",
  "admin_login_submitting": "Memproses…",
  "admin_login_error": "Email atau kata sandi salah.",
```

Di `messages/en.json`:

```json
  "admin_login_title": "Sign in to Dashboard",
  "admin_login_subtitle": "For GMIM Musafir administrators only.",
  "admin_login_email": "Email",
  "admin_login_password": "Password",
  "admin_login_submit": "Sign in",
  "admin_login_submitting": "Signing in…",
  "admin_login_error": "Incorrect email or password.",
```

- [ ] **Step 2: Buat komponen form**

Buat `src/components/admin/login-form.tsx`:

```tsx
import { type FormEvent, useId, useState } from 'react'
import { useRouter } from '@tanstack/react-router'
import * as m from '@/paraglide/messages'
import { signIn } from '@/lib/auth-client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

/**
 * Form masuk dashboard — komponen KLIEN. Memakai `@/lib/auth-client`, bukan
 * `@/lib/auth` (server-only).
 *
 * Pola state-nya mengikuti `contact-form.tsx`: `useState` + `useId`, tanpa form
 * library. Pesan galat sengaja SAMA untuk email salah dan kata sandi salah —
 * membedakannya memberi tahu penebak bahwa sebuah email terdaftar.
 */
export function LoginForm() {
  const baseId = useId()
  const emailId = `${baseId}-email`
  const passwordId = `${baseId}-password`
  const errorId = `${baseId}-error`

  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [sending, setSending] = useState(false)
  const [failed, setFailed] = useState(false)

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    // `disabled` memblok klik tapi bukan submit lewat Enter.
    if (sending) return
    setSending(true)
    setFailed(false)
    const { error } = await signIn.email({ email, password })
    if (error) {
      setFailed(true)
      setSending(false)
      return
    }
    // Muat ulang konteks router supaya `beforeLoad` layout admin melihat sesi baru.
    await router.invalidate()
    await router.navigate({ to: '/admin' })
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor={emailId}>{m.admin_login_email()}</Label>
        <Input
          id={emailId}
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor={passwordId}>{m.admin_login_password()}</Label>
        <Input
          id={passwordId}
          type="password"
          autoComplete="current-password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
      </div>

      <p
        id={errorId}
        role="status"
        aria-live="polite"
        className="text-destructive min-h-5 text-sm"
      >
        {failed ? m.admin_login_error() : ''}
      </p>

      <Button type="submit" variant="primary" className="h-11 w-full" disabled={sending} aria-describedby={errorId}>
        {sending ? m.admin_login_submitting() : m.admin_login_submit()}
      </Button>
    </form>
  )
}
```

- [ ] **Step 3: Buat route**

Buat `src/routes/admin.login.tsx`:

```tsx
import { createFileRoute } from '@tanstack/react-router'
import * as m from '@/paraglide/messages'
import { LoginForm } from '@/components/admin/login-form'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

/**
 * `/admin/login` — SENGAJA di luar pathless layout `admin._app.tsx`.
 *
 * Layout itu memasang `ensureAdmin()` di `beforeLoad`, yang me-redirect ke
 * halaman ini saat tak ada sesi. Kalau halaman ini ikut berada di bawahnya,
 * redirect-nya menunjuk ke dirinya sendiri dan jadi loop tak berujung.
 */
export const Route = createFileRoute('/admin/login')({
  head: () => ({ meta: [{ title: 'Masuk Dashboard — GMIM Musafir' }, { name: 'robots', content: 'noindex' }] }),
  component: LoginPage,
})

function LoginPage() {
  return (
    <main className="bg-surface-2 flex min-h-svh items-center justify-center px-4 py-12">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>{m.admin_login_title()}</CardTitle>
          <p className="text-muted text-sm">{m.admin_login_subtitle()}</p>
        </CardHeader>
        <CardContent>
          <LoginForm />
        </CardContent>
      </Card>
    </main>
  )
}
```

Catatan `noindex`: halaman ini tidak boleh masuk indeks Google. Ia juga tidak ditambahkan ke `src/lib/sitemap.ts`.

- [ ] **Step 4: Verifikasi halaman tampil**

Run: `pnpm dev`, buka `http://localhost:3000/admin/login`.
Expected: kartu form masuk tampil, terbaca di tema terang maupun gelap.

- [ ] **Step 5: Verifikasi masuk berhasil**

Isi form dengan `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD` dari `.env`, submit.
Expected: berpindah ke `/admin` (yang masih 404 sampai Task 7 — itu wajar; yang dibuktikan di sini adalah sign-in berhasil dan navigasi terpicu).

Isi dengan kata sandi salah.
Expected: pesan galat muncul, tetap di halaman yang sama.

- [ ] **Step 6: Jalankan gerbang penuh**

Run: `pnpm lint && pnpm typecheck && pnpm test && pnpm build`
Expected: semua hijau.

- [ ] **Step 7: Commit**

```bash
git add src/routes/admin.login.tsx src/components/admin/login-form.tsx messages/
git commit -m "Tambah halaman /admin/login

Route SENGAJA di luar pathless layout admin: layout itu memasang
ensureAdmin() yang me-redirect ke halaman ini, jadi menaruhnya di bawah
gerbang yang sama membuat redirect menunjuk dirinya sendiri.

Pesan galat sama untuk email salah dan kata sandi salah — membedakannya
memberi tahu penebak bahwa sebuah email terdaftar. Halaman ber-noindex dan
tidak masuk sitemap."
```

---

## Task 7: Shell admin + gerbang

**Files:**
- Create: `src/routes/admin._app.tsx`
- Create: `src/components/admin/admin-shell.tsx`
- Modify: `messages/id.json`, `messages/en.json`

**Interfaces:**
- Consumes: `ensureAdmin` dari Task 5; `signOut` dari `@/lib/auth-client`; ikon dari `lucide-react`.
- Produces: layout ber-gerbang untuk seluruh `/admin/*` selain `/admin/login`. Task 8 dan seluruh rencana berikutnya menaruh halamannya sebagai `admin._app.<nama>.tsx`.

- [ ] **Step 1: Tambahkan kunci pesan**

Di `messages/id.json`:

```json
  "admin_nav_home": "Beranda",
  "admin_nav_schedule": "Jadwal",
  "admin_nav_bulletins": "Warta",
  "admin_nav_devotionals": "Renungan",
  "admin_nav_gallery": "Galeri",
  "admin_nav_master": "Master Data",
  "admin_nav_messages": "Pesan",
  "admin_nav_label": "Navigasi dashboard",
  "admin_sign_out": "Keluar",
  "admin_open_menu": "Buka atau tutup menu dashboard",
```

Di `messages/en.json`:

```json
  "admin_nav_home": "Home",
  "admin_nav_schedule": "Schedule",
  "admin_nav_bulletins": "Bulletins",
  "admin_nav_devotionals": "Devotionals",
  "admin_nav_gallery": "Gallery",
  "admin_nav_master": "Master Data",
  "admin_nav_messages": "Messages",
  "admin_nav_label": "Dashboard navigation",
  "admin_sign_out": "Sign out",
  "admin_open_menu": "Toggle dashboard menu",
```

- [ ] **Step 2: Buat shell**

Buat `src/components/admin/admin-shell.tsx`:

```tsx
import { useState } from 'react'
import { Link, useRouter } from '@tanstack/react-router'
import {
  CalendarDays,
  FileText,
  Home,
  Images,
  LogOut,
  Mail,
  Menu,
  Settings,
  X,
} from 'lucide-react'
import * as m from '@/paraglide/messages'
import { signOut } from '@/lib/auth-client'
import { Button } from '@/components/ui/button'
import { Logo } from '@/components/layout/logo'

/**
 * Shell dashboard — sidebar kiri persisten + topbar, mengikuti pola referensi
 * yang dipilih pemilik proyek (`shadcnuikit.com/dashboard/file-manager`).
 *
 * Halaman yang ditautkan sidebar dibangun bertahap di rencana berikutnya; yang
 * belum ada sengaja TETAP ditautkan supaya kerangka navigasinya terlihat utuh
 * sejak awal dan tidak perlu disentuh tiap fase. Route yang belum ada akan
 * memunculkan 404 — itu jujur, dan lebih baik daripada menu yang tumbuh
 * sepotong-sepotong.
 */
const NAV = [
  { to: '/admin', label: () => m.admin_nav_home(), icon: Home, exact: true },
  { to: '/admin/jadwal', label: () => m.admin_nav_schedule(), icon: CalendarDays, exact: false },
  { to: '/admin/warta', label: () => m.admin_nav_bulletins(), icon: FileText, exact: false },
  { to: '/admin/renungan', label: () => m.admin_nav_devotionals(), icon: FileText, exact: false },
  { to: '/admin/galeri', label: () => m.admin_nav_gallery(), icon: Images, exact: false },
  { to: '/admin/master', label: () => m.admin_nav_master(), icon: Settings, exact: false },
  { to: '/admin/pesan', label: () => m.admin_nav_messages(), icon: Mail, exact: false },
] as const

export function AdminShell({ email, children }: { email: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(false)
  const router = useRouter()

  async function keluar() {
    await signOut()
    await router.navigate({ to: '/admin/login' })
  }

  const nav = (
    <nav aria-label={m.admin_nav_label()} className="flex flex-col gap-0.5 p-3">
      {NAV.map((item) => {
        const Icon = item.icon
        return (
          <Link
            key={item.to}
            to={item.to}
            activeOptions={{ exact: item.exact }}
            onClick={() => setOpen(false)}
            className="text-ink hover:bg-surface-2 data-[status=active]:bg-surface-2 data-[status=active]:text-primary flex min-h-11 items-center gap-2.5 rounded-md px-3 text-sm font-medium"
          >
            <Icon aria-hidden="true" className="size-4 shrink-0" />
            {item.label()}
          </Link>
        )
      })}
    </nav>
  )

  return (
    <div className="bg-surface-2 flex min-h-svh">
      {/* Sidebar desktop */}
      <aside className="border-border bg-surface hidden w-60 shrink-0 border-r lg:block">
        <div className="border-border flex h-16 items-center gap-2.5 border-b px-4">
          <Logo variant="mark" size={28} />
          <span className="font-serif text-sm font-semibold">GMIM Musafir</span>
        </div>
        {nav}
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="border-border bg-surface flex h-16 shrink-0 items-center justify-between gap-3 border-b px-4">
          <button
            type="button"
            className="text-ink hover:bg-surface-2 inline-flex h-11 w-11 items-center justify-center rounded-md lg:hidden"
            aria-expanded={open}
            aria-label={m.admin_open_menu()}
            onClick={() => setOpen((v) => !v)}
          >
            {open ? <X aria-hidden="true" className="size-5" /> : <Menu aria-hidden="true" className="size-5" />}
          </button>

          <span className="text-muted truncate text-sm">{email}</span>

          <Button variant="ghost" size="sm" onClick={keluar}>
            <LogOut aria-hidden="true" className="size-4" />
            {m.admin_sign_out()}
          </Button>
        </header>

        {/* Drawer mobile — hanya dirender saat terbuka, seperti panel nav situs publik. */}
        {open && (
          <div className="border-border bg-surface border-b lg:hidden">{nav}</div>
        )}

        <main className="min-w-0 flex-1 p-4 lg:p-6">{children}</main>
      </div>
    </div>
  )
}
```

Catatan: `<Logo>` menerima `variant?: 'full' | 'mark'` dan `size?: number` (`src/components/layout/logo.tsx:18`), jadi pemanggilan di atas sudah benar apa adanya.

- [ ] **Step 3: Buat layout ber-gerbang**

Buat `src/routes/admin._app.tsx`:

```tsx
import { createFileRoute, Outlet } from '@tanstack/react-router'
import { ensureAdmin } from '@/lib/auth.functions'
import { AdminShell } from '@/components/admin/admin-shell'

/**
 * Pathless layout `_app` — SATU gerbang untuk seluruh `/admin/*` kecuali
 * `/admin/login`, yang sengaja berada di luarnya.
 *
 * Pemeriksaan sesi ditaruh di sini, bukan diulang tiap halaman: pemeriksaan yang
 * tersebar adalah pemeriksaan yang suatu hari terlewat di satu halaman baru.
 * Halaman berikutnya cukup dinamai `admin._app.<nama>.tsx` dan otomatis dijaga.
 *
 * Ini gerbang untuk PENGALAMAN PENGGUNA. Gerbang keamanan sesungguhnya ada di
 * tiap server fn mutasi, yang memanggil `ensureAdmin()` sendiri — route yang
 * dijaga tidak menghalangi siapa pun memanggil server fn-nya langsung.
 */
export const Route = createFileRoute('/admin/_app')({
  beforeLoad: async () => {
    const { user } = await ensureAdmin()
    return { user }
  },
  loader: ({ context }) => ({ email: context.user.email }),
  head: () => ({ meta: [{ name: 'robots', content: 'noindex' }] }),
  component: AdminLayout,
})

function AdminLayout() {
  const { email } = Route.useLoaderData()
  return (
    <AdminShell email={email}>
      <Outlet />
    </AdminShell>
  )
}
```

- [ ] **Step 4: Verifikasi gerbang menolak tanpa sesi**

Run: `pnpm dev`. Dalam jendela penyamaran (atau setelah menghapus cookie), buka `http://localhost:3000/admin`.
Expected: dialihkan ke `/admin/login`. Tidak boleh ada isi dashboard yang sempat terlihat.

- [ ] **Step 5: Verifikasi shell tampil setelah masuk**

Masuk lewat `/admin/login`.
Expected: dialihkan ke `/admin`. Sidebar terlihat di layar lebar; di bawah `lg` sidebar tersembunyi dan tombol hamburger membuka drawer. Tombol Keluar mengembalikan ke `/admin/login`.

Halaman `/admin` sendiri masih 404 sampai Task 8 — yang diverifikasi di sini adalah gerbang dan shell.

- [ ] **Step 6: Jalankan gerbang penuh**

Run: `pnpm lint && pnpm typecheck && pnpm test && pnpm build`
Expected: semua hijau.

- [ ] **Step 7: Commit**

```bash
git add src/routes/admin._app.tsx src/components/admin/admin-shell.tsx messages/
git commit -m "Tambah shell admin + gerbang sesi

Gerbang dipasang SEKALI di pathless layout _app, bukan diulang tiap halaman:
pemeriksaan yang tersebar adalah pemeriksaan yang suatu hari terlewat di satu
halaman baru. Halaman berikutnya cukup dinamai admin._app.<nama>.tsx dan
otomatis dijaga.

Ini gerbang untuk pengalaman pengguna. Gerbang keamanan sesungguhnya ada di
tiap server fn mutasi, yang memanggil ensureAdmin() sendiri — route yang
dijaga tidak menghalangi siapa pun memanggil server fn-nya langsung.

Shell mengikuti pola referensi yang dipilih pemilik proyek: sidebar kiri
persisten yang jadi drawer di layar sempit, plus topbar berisi identitas dan
tombol keluar."
```

---

## Task 8: Beranda admin + ringkasan isi

Kartu ringkasan menjawab pertanyaan yang selama ini tak punya jawaban di mana pun: berapa isi tiap domain, berapa yang masih draft, dan **sampai kapan jadwal terisi**. Yang terakhir adalah alasan tenggat 29 Oktober 2026 sempat tidak terlihat siapa pun.

**Files:**
- Create: `src/features/admin/summary.ts`
- Create: `src/routes/admin._app.index.tsx`
- Modify: `messages/id.json`, `messages/en.json`
- Test: `tests/unit/admin-summary.test.ts`

**Interfaces:**
- Consumes: `ensureAdmin` (Task 5); `Card` dari `@/components/ui/card`.
- Produces: `getAdminSummary()` → `AdminSummary`; `hariTersisa(sampai: string | null, hariIni: string): number | null`.

```ts
type DomainSummary = { total: number; draft: number }
type AdminSummary = {
  jadwal: DomainSummary & { terisiSampai: string | null }
  warta: DomainSummary
  renungan: DomainSummary
  galeri: DomainSummary
  pesanBaru: number
}
```

- [ ] **Step 1: Tulis test yang gagal**

Buat `tests/unit/admin-summary.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { hariTersisa } from '@/features/admin/summary'

/**
 * `hariTersisa` dipisah dari query supaya bisa diuji tanpa database. Inilah
 * angka yang membuat kedaluwarsa jadwal terlihat: seed Rencana 2b mengisi 8
 * minggu ke depan dan berhenti, dan tak ada satu pun permukaan yang menunjukkan
 * kapan ia habis sampai `/jadwal` mendadak kosong.
 */
describe('hariTersisa', () => {
  it('menghitung selisih hari', () => {
    expect(hariTersisa('2026-10-29', '2026-09-07')).toBe(52)
  })

  it('nol saat jadwal habis hari ini', () => {
    expect(hariTersisa('2026-09-07', '2026-09-07')).toBe(0)
  })

  it('negatif saat sudah lewat — jangan disembunyikan jadi nol', () => {
    expect(hariTersisa('2026-09-01', '2026-09-07')).toBe(-6)
  })

  it('null saat belum ada jadwal sama sekali', () => {
    expect(hariTersisa(null, '2026-09-07')).toBeNull()
  })
})
```

- [ ] **Step 2: Jalankan test — pastikan GAGAL**

Run: `pnpm test tests/unit/admin-summary.test.ts`
Expected: FAIL — modul belum ada.

- [ ] **Step 3: Tulis server fn ringkasan**

Buat `src/features/admin/summary.ts`:

```ts
import { createServerFn } from '@tanstack/react-start'
import { ensureAdmin } from '@/lib/auth.functions'

export type DomainSummary = { total: number; draft: number }

export type AdminSummary = {
  jadwal: DomainSummary & { terisiSampai: string | null }
  warta: DomainSummary
  renungan: DomainSummary
  galeri: DomainSummary
  pesanBaru: number
}

/**
 * Selisih hari antara tanggal ibadah terakhir dan hari ini. `null` bila belum
 * ada jadwal sama sekali.
 *
 * Nilai negatif SENGAJA tidak dijepit ke nol — "habis 6 hari lalu" adalah
 * informasi yang harus terlihat, dan menampilkannya sebagai nol menyamarkan
 * situs yang sudah kehilangan seluruh halaman jadwalnya.
 *
 * Keduanya string `YYYY-MM-DD` waktu Eastern, sejalan dengan `serviceDate` yang
 * memang disimpan sebagai wall-clock Eastern (lihat `src/lib/datetime.ts`).
 */
export function hariTersisa(sampai: string | null, hariIni: string): number | null {
  if (!sampai) return null
  const MS_PER_HARI = 86_400_000
  return Math.round((Date.parse(`${sampai}T00:00:00Z`) - Date.parse(`${hariIni}T00:00:00Z`)) / MS_PER_HARI)
}

export const getAdminSummary = createServerFn({ method: 'GET' }).handler(
  async (): Promise<AdminSummary> => {
    await ensureAdmin()

    const { db } = await import('@/db')
    const { bulletins, devotionals, galleryAlbums, worshipServices, contactMessages } = await import(
      '@/db/schema'
    )
    const { count, eq, max, sql } = await import('drizzle-orm')

    // Satu query per tabel, masing-masing mengembalikan total + jumlah draft
    // dalam satu lintasan — `filter` di sisi SQL, bukan menarik semua baris lalu
    // menghitung di JS.
    const draft = sql<number>`count(*) filter (where status = 'draft')`.mapWith(Number)

    const [jadwal] = await db
      .select({ total: count(), draft, terisiSampai: max(worshipServices.serviceDate) })
      .from(worshipServices)
    const [warta] = await db.select({ total: count(), draft }).from(bulletins)
    const [renungan] = await db.select({ total: count(), draft }).from(devotionals)
    const [galeri] = await db.select({ total: count(), draft }).from(galleryAlbums)
    const [pesan] = await db
      .select({ total: count() })
      .from(contactMessages)
      .where(eq(contactMessages.status, 'new'))

    return {
      jadwal: {
        total: jadwal?.total ?? 0,
        draft: jadwal?.draft ?? 0,
        terisiSampai: jadwal?.terisiSampai ?? null,
      },
      warta: { total: warta?.total ?? 0, draft: warta?.draft ?? 0 },
      renungan: { total: renungan?.total ?? 0, draft: renungan?.draft ?? 0 },
      galeri: { total: galeri?.total ?? 0, draft: galeri?.draft ?? 0 },
      pesanBaru: pesan?.total ?? 0,
    }
  },
)
```

- [ ] **Step 4: Jalankan test — pastikan LULUS**

Run: `pnpm test tests/unit/admin-summary.test.ts`
Expected: PASS (4 test)

- [ ] **Step 5: Tambahkan kunci pesan**

Di `messages/id.json`:

```json
  "admin_home_title": "Ringkasan",
  "admin_summary_draft": "draf",
  "admin_schedule_filled_until": "Jadwal terisi sampai",
  "admin_schedule_days_left": "hari lagi",
  "admin_schedule_expired": "Jadwal sudah habis — halaman /jadwal kosong.",
  "admin_schedule_none": "Belum ada jadwal sama sekali.",
  "admin_messages_new": "pesan baru",
```

Di `messages/en.json`:

```json
  "admin_home_title": "Overview",
  "admin_summary_draft": "draft",
  "admin_schedule_filled_until": "Schedule filled until",
  "admin_schedule_days_left": "days left",
  "admin_schedule_expired": "Schedule has run out — the /jadwal page is empty.",
  "admin_schedule_none": "No schedule at all yet.",
  "admin_messages_new": "new messages",
```

- [ ] **Step 6: Buat halaman beranda admin**

Buat `src/routes/admin._app.index.tsx`:

```tsx
import { createFileRoute } from '@tanstack/react-router'
import * as m from '@/paraglide/messages'
import { getAdminSummary, hariTersisa } from '@/features/admin/summary'
import { todayEastern, formatDateLong } from '@/lib/datetime'
import { getLocale } from '@/paraglide/runtime'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export const Route = createFileRoute('/admin/_app/')({
  loader: () => getAdminSummary(),
  component: AdminHome,
})

/** Ambang peringatan: di bawah ini, sisa jadwal ditampilkan sebagai galat. */
const AMBANG_KRITIS = 21

function AdminHome() {
  const s = Route.useLoaderData()
  const locale = getLocale()
  const sisa = hariTersisa(s.jadwal.terisiSampai, todayEastern())

  const kartu = [
    { judul: m.admin_nav_schedule(), ...s.jadwal },
    { judul: m.admin_nav_bulletins(), ...s.warta },
    { judul: m.admin_nav_devotionals(), ...s.renungan },
    { judul: m.admin_nav_gallery(), ...s.galeri },
  ]

  return (
    <div className="flex flex-col gap-6">
      <h1 className="font-serif text-2xl font-semibold">{m.admin_home_title()}</h1>

      {/* Sisa jadwal ditaruh PALING ATAS dan diberi warna saat menipis. Ini yang
          selama ini tidak terlihat di permukaan mana pun: seed mengisi 8 minggu
          lalu berhenti, dan tak ada peringatan sampai /jadwal mendadak kosong. */}
      <Card>
        <CardContent className="py-4">
          {sisa === null ? (
            <p className="text-destructive text-sm font-medium">{m.admin_schedule_none()}</p>
          ) : sisa < 0 ? (
            <p className="text-destructive text-sm font-medium">{m.admin_schedule_expired()}</p>
          ) : (
            <p className={sisa <= AMBANG_KRITIS ? 'text-destructive text-sm font-medium' : 'text-ink text-sm'}>
              {m.admin_schedule_filled_until()}{' '}
              <strong>{formatDateLong(s.jadwal.terisiSampai!, locale)}</strong> — {sisa}{' '}
              {m.admin_schedule_days_left()}
            </p>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {kartu.map((k) => (
          <Card key={k.judul}>
            <CardHeader>
              <CardTitle className="text-muted text-sm font-medium">{k.judul}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="font-serif text-3xl font-semibold">{k.total}</p>
              {k.draft > 0 && (
                <p className="text-muted mt-1 text-sm">
                  {k.draft} {m.admin_summary_draft()}
                </p>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {s.pesanBaru > 0 && (
        <Card>
          <CardContent className="py-4">
            <p className="text-ink text-sm">
              <strong>{s.pesanBaru}</strong> {m.admin_messages_new()}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
```

Catatan: `formatDateLong(serviceDate: string, locale: 'id' | 'en'): string` (`src/lib/datetime.ts:132`) — pemanggilan di atas sudah cocok. `terisiSampai` dipastikan non-null oleh cabang `sisa === null` di atasnya, karena keduanya berasal dari nilai yang sama.

- [ ] **Step 7: Verifikasi di browser**

Run: `pnpm dev`, masuk, buka `/admin`.
Expected: kartu sisa jadwal tampil di atas dengan tanggal `2026-10-29` dan sisa hari yang masuk akal; empat kartu domain menampilkan jumlah yang cocok dengan isi database. Benar di kedua tema.

- [ ] **Step 8: Jalankan gerbang penuh**

Run: `pnpm lint && pnpm typecheck && pnpm test && pnpm build`
Expected: semua hijau, unit test 201.

- [ ] **Step 9: Commit**

```bash
git add src/features/admin/ src/routes/admin._app.index.tsx tests/unit/admin-summary.test.ts messages/
git commit -m "Tambah beranda admin dengan ringkasan isi

Kartu sisa jadwal ditaruh paling atas dan berubah warna saat menipis. Ini
yang selama ini tidak terlihat di permukaan mana pun: seed Rencana 2b
mengisi 8 minggu lalu berhenti, dan tak ada peringatan sampai /jadwal
mendadak kosong dan 72 URL lenyap dari sitemap sekaligus.

hariTersisa dipisah dari query supaya bisa diuji tanpa database. Nilai
negatif sengaja tidak dijepit ke nol — 'habis 6 hari lalu' adalah informasi
yang harus terlihat."
```

---

## Task 9: E2E gerbang admin

Invarian keamanan yang paling mudah rusak diam-diam: satu route baru yang lupa ditempatkan di bawah `admin._app` dan gerbangnya bocor tanpa satu test pun merah.

**Files:**
- Create: `tests/e2e/admin.spec.ts`

**Interfaces:**
- Consumes: `/admin`, `/admin/login` dari Task 6 & 7.
- Produces: —

- [ ] **Step 1: Tulis test**

Buat `tests/e2e/admin.spec.ts`:

```ts
import { test, expect } from '@playwright/test'

/**
 * Gerbang `/admin/*`.
 *
 * Test pertama adalah yang paling penting di file ini: ia gagal begitu sebuah
 * halaman admin baru diletakkan di luar pathless layout `admin._app`, yang
 * membuat gerbangnya bocor tanpa gejala lain apa pun.
 *
 * Kredensial diambil dari env yang sama dengan `pnpm seed:admin`. Di CI keduanya
 * tidak di-set, jadi test yang butuh sesi dilewati — gerbangnya sendiri tetap
 * diuji, dan itu bagian yang tak boleh rusak.
 */
const EMAIL = process.env.SEED_ADMIN_EMAIL
const PASSWORD = process.env.SEED_ADMIN_PASSWORD

for (const path of ['/admin', '/admin/jadwal', '/admin/warta', '/admin/galeri']) {
  test(`${path} tanpa sesi → dialihkan ke /admin/login`, async ({ page }) => {
    await page.goto(path)
    await expect(page).toHaveURL(/\/admin\/login$/)
  })
}

test('/admin/login tidak dijaga — kalau ikut dijaga, redirect-nya jadi loop', async ({ page }) => {
  const res = await page.goto('/admin/login')
  expect(res?.status()).toBe(200)
  await expect(page).toHaveURL(/\/admin\/login$/)
})

test('halaman admin ber-noindex', async ({ page }) => {
  const res = await page.goto('/admin/login')
  const html = (await res?.text()) ?? ''
  expect(html).toMatch(/name="robots"[^>]*content="noindex"/)
})

test('masuk dengan kredensial benar → sampai di dashboard', async ({ page }) => {
  test.skip(!EMAIL || !PASSWORD, 'SEED_ADMIN_EMAIL/PASSWORD tidak di-set')

  await page.goto('/admin/login')
  await page.getByLabel(/email/i).fill(EMAIL!)
  await page.getByLabel(/kata sandi|password/i).fill(PASSWORD!)
  await page.getByRole('button', { name: /masuk|sign in/i }).click()

  await expect(page).toHaveURL(/\/admin$/)
  await expect(page.getByRole('navigation', { name: /navigasi dashboard|dashboard navigation/i })).toBeVisible()
})

test('kredensial salah → tetap di halaman masuk dengan pesan galat', async ({ page }) => {
  await page.goto('/admin/login')
  await page.getByLabel(/email/i).fill('bukan@siapa-siapa.test')
  await page.getByLabel(/kata sandi|password/i).fill('salah-sekali-123')
  await page.getByRole('button', { name: /masuk|sign in/i }).click()

  await expect(page.getByRole('status')).toContainText(/salah|incorrect/i)
  await expect(page).toHaveURL(/\/admin\/login$/)
})
```

- [ ] **Step 2: Jalankan e2e**

Run: `pnpm test:e2e tests/e2e/admin.spec.ts`
Expected: semua lulus di kedua project. Kalau `SEED_ADMIN_*` ada di `.env` lokal, test masuk ikut jalan.

- [ ] **Step 3: Buktikan test gerbang benar-benar menangkap**

Sementara, ubah nama file `src/routes/admin._app.index.tsx` → `src/routes/admin.index.tsx` (keluar dari layout ber-gerbang).

Run: `pnpm test:e2e tests/e2e/admin.spec.ts --project=chromium -g "tanpa sesi"`
Expected: **GAGAL** untuk `/admin` — buktinya test ini benar-benar menjaga.

Kembalikan namanya, jalankan ulang, pastikan hijau lagi.

- [ ] **Step 4: Jalankan seluruh gerbang**

Run: `pnpm lint && pnpm typecheck && pnpm test && pnpm build && pnpm test:e2e`
Expected: semua hijau. E2E total 117 + 16 baru (8 test × 2 project, dikurangi yang di-skip di CI).

- [ ] **Step 5: Commit**

```bash
git add tests/e2e/admin.spec.ts
git commit -m "Kunci gerbang /admin dengan e2e

Test pertama di file ini yang paling penting: ia gagal begitu sebuah halaman
admin baru diletakkan di luar pathless layout admin._app, yang membuat
gerbangnya bocor tanpa gejala lain apa pun. Diverifikasi merah lebih dulu
dengan memindahkan halaman beranda admin keluar dari layout.

Test yang butuh sesi dilewati saat SEED_ADMIN_* tidak di-set, sehingga CI
tetap menguji gerbangnya — bagian yang tak boleh rusak — tanpa perlu akun."
```

---

## Setelah plan ini

Rencana berikutnya, masing-masing dengan plan sendiri:

- **3b — Jadwal**: CRUD `worship_services`, kelola `schedule_templates`, generator inkremental dengan pratinjau, upload PDF tata ibadah. **Prioritas tertinggi** — menutup tenggat 29 Oktober 2026.
- **3c — Warta & renungan**: CRUD, editor rich text, sanitasi server, upload PDF & sampul.
- **3d — Galeri**: album, item, upload gambar, urutkan, sampul.
- **3e — Master data & pesan**: kategori (dengan validasi format warna token), kolom, `site_settings` tujuh kunci, `contact_messages`.

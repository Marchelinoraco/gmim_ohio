# Rencana 2a — Situs Publik: halaman marketing & konten

> **Untuk pekerja agentik:** SUB-SKILL WAJIB: `superpowers:subagent-driven-development` (disarankan) atau `superpowers:executing-plans`. Langkah pakai checkbox `- [ ]`.

**Goal:** Membangun seluruh halaman publik GMIM Musafir SELAIN fitur jadwal — Beranda, Tentang, Warta, Renungan, Galeri, Kunjungi (+ form kontak), Persembahan, Ibadah Live — plus lapisan query konten, sanitasi rich-text, seed konten placeholder, dan SEO dasar. Situs tetap coming-soon di produksi; halaman baru diakses lewat URL langsung / preview.

**Architecture:** Route file-based TanStack Start (satu file per halaman, locale ditangani router `rewrite` Paraglide). Data konten dibaca lewat server functions di `src/features/content/`. Konten dinamis (warta/renungan/galeri/pengaturan) dari Neon lewat Drizzle; konten statis (Sejarah, Visi-Misi, dll.) dari katalog i18n. Rich-text disanitasi di server sebelum render. Komponen halaman memakai token tema Rencana 1 + primitif baru di `src/components/site/`.

**Tech Stack:** TanStack Start · TanStack Router (file routes, loaders) · Drizzle · Paraglide i18n · Tailwind v4 tokens · `sanitize-html` (baru) · Vitest · Playwright.

**Spec:** `docs/superpowers/specs/2026-08-29-gmim-musafir-website-design.md` (§3 Situs Publik, §3.3 SEO).

## Global Constraints

- Package manager `pnpm`. `@/*` → `src/*`. Repo style: single-quote, no semicolons, printWidth 100. `src/components/ui/**` tetap prettier-ignored.
- **Dwibahasa:** teks UI + konten statis di `messages/id.json` + `messages/en.json` (tiap key di KEDUA file). Konten DB dwibahasa lewat kolom `*_id` / `*_en`. `id` default tanpa prefix URL, `en` di `/en`. Link internal pakai `localizeHref` atau `<Link>` bertipe (router `rewrite` menangani prefix).
- **Zona waktu:** semua tampilan tanggal/jam lewat `src/lib/datetime.ts` (Eastern). Jangan `new Date()` manipulasi TZ di tempat lain.
- **Tema:** light ungu/putih + dark ungu-hitam sudah ada. Semua komponen baru harus benar di KEDUA tema; pasangan teks/latar ≥ WCAG AA.
- **Keamanan:** semua HTML rich-text dari DB disanitasi di server sebelum dirender. Form kontak: honeypot + rate-limit + validasi Zod di server.
- **DB:** hanya baca (`status = 'published'`). Migrasi jalan di Neon `dev` (`.neon` pin `dev`). JANGAN migrasi `production`. Seed idempoten.
- **`SITE.comingSoon` tetap `true`** sepanjang Rencana 2a — `SiteHeader` masih sembunyikan nav. Halaman baru diuji lewat URL langsung. Nav + flip = Rencana 2b.
- **`@/lib/auth` / `@/db`:** `@/db` server-only (module-level `new Pool()`). Server fn boleh `import` `@/db`. Komponen klien tidak boleh.
- Disiplin: TDD untuk logika murni (sanitizer, parser settings, helper SEO). DRY. YAGNI. Commit tiap task.
- Setiap task berakhir dengan `pnpm lint` + `pnpm typecheck` + `pnpm test` + `pnpm test:e2e` + `pnpm build` HIJAU.

---

## Struktur File (dibuat/dimodifikasi di Rencana 2a)

```
src/
  features/
    content/
      site-settings.ts     # tipe + Zod schema untuk value jsonb tiap key; getSiteSettings() server fn
      bulletins.ts         # listBulletins(), getBulletin(id) server fn
      devotionals.ts       # listDevotionals(), getDevotional(slug) server fn
      gallery.ts           # listGalleryAlbums(), getGalleryAlbum(id) server fn
    contact/
      submit.ts            # submitContactMessage() server fn (POST)
  lib/
    sanitize.ts            # sanitizeRichText(html) — allowlist [TDD]
    seo.ts                 # pageMeta({...}) → head meta/links; churchJsonLd()
  components/
    site/
      container.tsx        # <Container> — max-width + padding
      page-hero.tsx        # <PageHero title subtitle> — band judul halaman
      section.tsx          # <Section> + <SectionTitle>
      prose.tsx            # <Prose html={sanitized}> — wrapper tipografi rich-text
      empty-state.tsx      # <EmptyState icon title message>
      site-map-footer.tsx  # daftar link semua halaman (dipakai SiteFooter)
    forms/
      contact-form.tsx     # <ContactForm> client — panggil submitContactMessage
  routes/
    tentang.tsx            # /tentang — Sejarah, Visi-Misi, Majelis, Pendeta (i18n)
    warta.tsx              # /warta — daftar warta
    warta.$id.tsx          # /warta/:id — detail warta
    renungan.tsx           # /renungan — daftar renungan
    renungan.$slug.tsx     # /renungan/:slug — detail renungan + JSON-LD Article
    galeri.tsx             # /galeri — daftar album
    galeri.$id.tsx         # /galeri/:id — album + lightbox
    kunjungi.tsx           # /kunjungi — alamat, peta, jam, "yang perlu diketahui", form kontak
    persembahan.tsx        # /persembahan — info rekening
    ibadah-live.tsx        # /ibadah-live — embed live / arsip
    sitemap[.]xml.ts       # /sitemap.xml — dinamis
  db/seed/
    bulletins.ts           # 3 warta placeholder
    devotionals.ts         # 3 renungan placeholder
    gallery.ts             # 1 album + 4 item placeholder
    index.ts               # (modifikasi) panggil seed baru
  components/layout/
    site-footer.tsx        # (modifikasi) render <SiteMapFooter> + data dari getSiteSettings
  routes/
    index.tsx              # (modifikasi) render <Beranda> saat !comingSoon; coming-soon tetap saat true
public/
  robots.txt               # (baru)
messages/
  id.json, en.json         # (modifikasi) +key untuk semua halaman baru + konten statis Tentang
tests/
  unit/
    sanitize.test.ts
    site-settings.test.ts
    seo.test.ts
  e2e/
    public-pages.spec.ts
```

**Boundary:**
- `src/features/content/*` = satu-satunya jalur baca konten DB untuk halaman publik. Route loader memanggil ini, tidak query `db` langsung.
- `src/lib/sanitize.ts` = satu-satunya sanitasi HTML. `<Prose>` menolak merender string yang belum lewat sanitizer (terima prop `html` yang secara tipe adalah `SanitizedHtml` branded type).
- Konten statis (Tentang) TIDAK masuk DB — di `messages/*.json`.

---

## Task 1: Lapisan tipe & query Site Settings

**Files:**
- Create: `src/features/content/site-settings.ts`
- Test: `tests/unit/site-settings.test.ts`

**Interfaces:**
- Consumes: `db` dari `@/db`, `siteSettings` dari `@/db/schema`.
- Produces:
  - Tipe `SiteSettings` = `{ hero, serviceTimes, contactInfo, socialLinks, pastoralContacts, liveStream, givingInfo }` (bentuk persis di bawah).
  - `SITE_SETTINGS_KEYS` (array 7 key).
  - `parseSiteSettings(rows: { key: string; value: unknown }[]): SiteSettings` — Zod parse per key, isi default bila key hilang.
  - `getSiteSettings = createServerFn({ method: 'GET' }).handler(...)` → `Promise<SiteSettings>`.

- [ ] **Step 1: Bentuk data (harus cocok `src/db/seed/settings.ts` `DEFAULT_SETTINGS`)**

Baca `src/db/seed/settings.ts` untuk bentuk `DEFAULT_SETTINGS` yang ada. Definisikan Zod schema per key yang cocok:
```ts
import { z } from 'zod'

const hero = z.object({
  titleId: z.string(), titleEn: z.string(),
  taglineId: z.string(), taglineEn: z.string(),
  image: z.string(),
})
const serviceTimes = z.object({ id: z.string(), en: z.string() })
const contactInfo = z.object({
  phone: z.string(), email: z.string(),
  officeHoursId: z.string(), officeHoursEn: z.string(),
  mapsUrl: z.string(), lat: z.number().nullable(), lng: z.number().nullable(),
})
const socialLinks = z.object({ facebook: z.string(), instagram: z.string(), youtube: z.string() })
const pastoralContacts = z.record(z.string(), z.object({ name: z.string(), phone: z.string() }))
const liveStream = z.object({ isLive: z.boolean(), url: z.string(), archiveUrl: z.string() })
const givingInfo = z.object({
  accounts: z.array(z.object({ bank: z.string(), number: z.string(), holder: z.string() })),
  noteId: z.string(), noteEn: z.string(),
})

export const SITE_SETTINGS_SCHEMA = { hero, service_times: serviceTimes, contact_info: contactInfo,
  social_links: socialLinks, pastoral_contacts: pastoralContacts, live_stream: liveStream, giving_info: givingInfo }
```
> Jika bentuk `DEFAULT_SETTINGS` di seed BERBEDA dari asumsi di atas, samakan Zod schema ke bentuk seed yang sebenarnya (seed adalah sumber kebenaran), dan sesuaikan test.

- [ ] **Step 2: Test `parseSiteSettings` (TDD — tulis dulu, harus gagal)**

`tests/unit/site-settings.test.ts`:
```ts
import { describe, it, expect } from 'vitest'
import { parseSiteSettings } from '@/features/content/site-settings'
import { DEFAULT_SETTINGS } from '@/db/seed/settings'

describe('parseSiteSettings', () => {
  it('mem-parse baris dari seed default ke bentuk terstruktur', () => {
    const rows = Object.entries(DEFAULT_SETTINGS).map(([key, value]) => ({ key, value }))
    const s = parseSiteSettings(rows)
    expect(s.hero.titleId.length).toBeGreaterThan(0)
    expect(s.liveStream.isLive).toBe(false)
    expect(Array.isArray(s.givingInfo.accounts)).toBe(true)
  })
  it('mengisi default bila sebuah key hilang', () => {
    const s = parseSiteSettings([]) // tak ada baris
    expect(s.liveStream).toEqual({ isLive: false, url: '', archiveUrl: '' })
    expect(s.givingInfo.accounts).toEqual([])
  })
  it('melempar bila value sebuah key bentuknya salah', () => {
    expect(() => parseSiteSettings([{ key: 'live_stream', value: { isLive: 'yes' } }])).toThrow()
  })
})
```

- [ ] **Step 3: Jalankan → gagal (module belum ada).** `pnpm vitest run tests/unit/site-settings.test.ts`

- [ ] **Step 4: Implementasi `site-settings.ts`**

`parseSiteSettings`: untuk tiap key di `SITE_SETTINGS_SCHEMA`, cari baris; bila ada → `schema.parse(row.value)` (biarkan throw bila salah); bila tak ada → default hardcoded (ambil dari `DEFAULT_SETTINGS` biar satu sumber, atau tulis default eksplisit). Kembalikan objek camelCase (`serviceTimes`, `contactInfo`, dst.).
`getSiteSettings`:
```ts
export const getSiteSettings = createServerFn({ method: 'GET' }).handler(async () => {
  const { db } = await import('@/db')
  const { siteSettings } = await import('@/db/schema')
  const rows = await db.select().from(siteSettings)
  return parseSiteSettings(rows)
})
```
> `import('@/db')` lazy di dalam handler (pola dari `api/auth/$.ts`) supaya `@/db` tak ikut ter-evaluasi saat modul route dimuat.

- [ ] **Step 5: Jalankan test → lolos.** Lalu `pnpm typecheck` + `pnpm lint`.

- [ ] **Step 6: Commit** — `git commit -m "Tambah lapisan tipe + query Site Settings"`

---

## Task 2: Sanitizer rich-text (`src/lib/sanitize.ts`, TDD)

**Files:**
- Create: `src/lib/sanitize.ts`, `src/components/site/prose.tsx`
- Test: `tests/unit/sanitize.test.ts`
- Modify: `package.json` (dep `sanitize-html`)

**Interfaces:**
- Produces:
  - Branded type `SanitizedHtml` (`string & { readonly __brand: 'SanitizedHtml' }`).
  - `sanitizeRichText(dirty: string): SanitizedHtml` — allowlist ketat.
  - `<Prose html={SanitizedHtml} className?>` — render `dangerouslySetInnerHTML` dengan kelas tipografi tema.

- [ ] **Step 1: Install** — `pnpm add sanitize-html` + `pnpm add -D @types/sanitize-html`

- [ ] **Step 2: Test (TDD)**

`tests/unit/sanitize.test.ts`:
```ts
import { describe, it, expect } from 'vitest'
import { sanitizeRichText } from '@/lib/sanitize'

describe('sanitizeRichText', () => {
  it('mempertahankan tag konten yang diizinkan', () => {
    const html = '<h2>Judul</h2><p>Isi <strong>tebal</strong> dan <em>miring</em>.</p><ul><li>a</li></ul>'
    expect(sanitizeRichText(html)).toBe(html)
  })
  it('membuang <script> dan handler event', () => {
    expect(sanitizeRichText('<p onclick="x()">hai</p><script>alert(1)</script>')).toBe('<p>hai</p>')
  })
  it('mengizinkan <a href> tapi memaksa rel & membuang javascript:', () => {
    const out = sanitizeRichText('<a href="https://x.com">x</a><a href="javascript:evil()">y</a>')
    expect(out).toContain('href="https://x.com"')
    expect(out).toContain('rel="noopener noreferrer"')
    expect(out).not.toContain('javascript:')
  })
  it('membuang style, class, id, dan tag tak dikenal', () => {
    expect(sanitizeRichText('<p class="x" style="color:red">a</p><marquee>b</marquee>')).toBe('<p>a</p>b')
  })
  it('string kosong → string kosong', () => {
    expect(sanitizeRichText('')).toBe('')
  })
})
```

- [ ] **Step 3: Jalankan → gagal.**

- [ ] **Step 4: Implementasi**

```ts
import sanitizeHtml from 'sanitize-html'

export type SanitizedHtml = string & { readonly __brand: 'SanitizedHtml' }

const OPTIONS: sanitizeHtml.IOptions = {
  allowedTags: ['h2', 'h3', 'h4', 'p', 'ul', 'ol', 'li', 'strong', 'em', 'a', 'br', 'blockquote'],
  allowedAttributes: { a: ['href'] },
  allowedSchemes: ['http', 'https', 'mailto'],
  transformTags: {
    a: (tagName, attribs) => ({
      tagName,
      attribs: { ...attribs, rel: 'noopener noreferrer', target: '_blank' },
    }),
  },
}

export function sanitizeRichText(dirty: string): SanitizedHtml {
  return sanitizeHtml(dirty ?? '', OPTIONS) as SanitizedHtml
}
```
> Sesuaikan assertion test bila `sanitize-html` menormalkan spasi/atribut sedikit berbeda — utamakan output deterministik & aman, bukan cocok byte-perfect.

- [ ] **Step 5: `<Prose>`**

```tsx
import type { SanitizedHtml } from '@/lib/sanitize'
import { cn } from '@/lib/utils'

export function Prose({ html, className }: { html: SanitizedHtml; className?: string }) {
  return (
    <div
      className={cn('prose-gmim max-w-none', className)}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  )
}
```
Tambah kelas `.prose-gmim` di `src/styles/app.css` (`@layer components`): heading Fraunces + warna `--color-ink`, `p`/`li` `--color-ink`, `a` `--color-primary` underline, spacing enak, `--color-muted` untuk `blockquote`. Cek kontras KEDUA tema.

- [ ] **Step 6:** test lolos + `pnpm build`. **Commit** — `"Tambah sanitizer rich-text + komponen Prose"`

---

## Task 3: Seed konten placeholder (warta, renungan, galeri)

**Files:**
- Create: `src/db/seed/bulletins.ts`, `src/db/seed/devotionals.ts`, `src/db/seed/gallery.ts`
- Modify: `src/db/seed/index.ts`
- Test: perluas `tests/unit/seed-data.test.ts`

**Interfaces:**
- Produces: `seedBulletins()`, `seedDevotionals()`, `seedGallery()` — idempoten (guard tabel kosong / `onConflictDoNothing`).

- [ ] **Step 1: Data placeholder**

`bulletins.ts` — 3 entri, `weekDate` 3 Minggu terakhir, `status: 'published'`, `titleId/En` + `summaryId/En` + `bodyId/En` (HTML rich-text pendek: `<h2>`, 2 `<p>`, `<ul>`), `pdfUrl: null`. Realistis (bahasa gereja GMIM): tema ibadah, pengumuman, jadwal minggu depan.

`devotionals.ts` — 3 entri, `slug` (`renungan-<n>`), `publishedDate`, `authorName` ('Pdt. Allan Robot, S.Th.' / 'Tim Renungan'), `excerptId/En`, `bodyId/En` (HTML 3-4 paragraf + `<blockquote>` ayat), `coverImageUrl: null`, `status: 'published'`.

`gallery.ts` — 1 `galleryAlbums` ('Ibadah Jemaat & Kegiatan') `status: 'published'`, `albumDate`, `coverImageUrl` (pakai `/hero/hero-poster.jpg` sementara). 4 `galleryItems`: 3 `type: 'image'` (`imageUrl: '/hero/hero-poster.jpg'` placeholder, `captionId/En`), 1 `type: 'youtube'` (`youtubeUrl` contoh, mis. `https://www.youtube.com/watch?v=dQw4w9WgXcQ` → ganti dgn video gereja bila ada).

Tiap fungsi seed: guard `if (await db.$count(<table>) > 0) return` untuk bulletins & devotionals (biar re-run aman); gallery: guard album kosong.

- [ ] **Step 2: Wire ke `index.ts`** — panggil `seedBulletins()`, `seedDevotionals()`, `seedGallery()` setelah `seedSettings()`.

- [ ] **Step 3: Test invarian** — perluas `tests/unit/seed-data.test.ts`: tiap `PLACEHOLDER_BULLETINS` punya `titleId`+`titleEn` non-kosong, `status==='published'`, minimal salah satu dari `bodyId`/`pdfUrl`; tiap devotional `slug` unik & `^[a-z0-9-]+$`.

- [ ] **Step 4: Jalankan seed** — `pnpm db:seed` (2×, idempoten) terhadap Neon `dev`. Verifikasi via `pnpm tsx` skrip cepat (hapus setelah): `select count(*) from bulletins/devotionals/gallery_albums/gallery_items`.

- [ ] **Step 5:** `pnpm test` + `pnpm typecheck`. **Commit** — `"Seed konten placeholder: warta, renungan, galeri"`

---

## Task 4: Query warta / renungan / galeri

**Files:**
- Create: `src/features/content/bulletins.ts`, `src/features/content/devotionals.ts`, `src/features/content/gallery.ts`
- Test: (opsional) tidak ada logika murni — verifikasi lewat loader/e2e di task halaman

**Interfaces (semua `createServerFn`, `@/db` di-import lazy, filter `status = 'published'`):**
- `listBulletins()` → `Bulletin[]` (urut `weekDate` desc). `Bulletin` = subset kolom + `bodyId/En` sudah `sanitizeRichText`-kan? **Tidak** — sanitasi di titik render (task halaman) supaya server fn tetap mengembalikan data mentah + tipe jelas. Kembalikan mentah; halaman memanggil `sanitizeRichText`.
- `getBulletin(id: string)` → `Bulletin | null`.
- `listDevotionals()` → `Devotional[]` (urut `publishedDate` desc).
- `getDevotional(slug: string)` → `Devotional | null`.
- `listGalleryAlbums()` → `GalleryAlbum[]` (+ `itemCount`, `coverImageUrl`; urut `sortOrder`, lalu `albumDate` desc).
- `getGalleryAlbum(id: string)` → `{ album: GalleryAlbum; items: GalleryItem[] } | null` (items urut `sortOrder`).

- [ ] **Step 1–3:** Implementasi ketiga file. Pola:
```ts
export const listBulletins = createServerFn({ method: 'GET' }).handler(async () => {
  const { db } = await import('@/db')
  const { bulletins } = await import('@/db/schema')
  const { eq, desc } = await import('drizzle-orm')
  return db.select().from(bulletins).where(eq(bulletins.status, 'published')).orderBy(desc(bulletins.weekDate))
})
```
`getGalleryAlbum` — dua query (album + items) atau `db.query.galleryAlbums.findFirst({ with: { items: ... } })` bila relasi `galleryAlbumsRelations` mendukung (cek `content.ts` — relasi `items` ada). Gunakan relational query bila jalan; kalau tidak, dua `select`.

- [ ] **Step 4:** `pnpm typecheck` + `pnpm build`. **Commit** — `"Tambah query warta, renungan, galeri"`

---

## Task 5: Primitif komponen halaman (`src/components/site/`)

**Files:**
- Create: `container.tsx`, `page-hero.tsx`, `section.tsx`, `empty-state.tsx` di `src/components/site/`
- Modify: `src/routes/_dev.tokens.tsx` (render primitif untuk review — dihapus di rencana polish)

**Interfaces:**
- `<Container children className?>` — `mx-auto w-full max-w-5xl px-4 sm:px-6`.
- `<PageHero title subtitle? children?>` — `<section>` band: judul Fraunces besar `text-primary`/`text-ink`, subtitle `text-muted`, latar `bg-surface-2`, padding vertikal lega. Semantik `<h1>`.
- `<Section id? className children>` + `<SectionTitle as='h2'>` — spacing section konsisten.
- `<EmptyState title message icon?>` — kartu tengah, `text-muted`, ikon inline SVG opsional.

- [ ] **Step 1–3:** Implementasi. Semua pakai token (`bg-surface`, `text-ink`, `text-muted`, `border-border`, `--radius`). Uji di `/tokens` (dev) KEDUA tema.
- [ ] **Step 4:** `pnpm build`. **Commit** — `"Tambah primitif komponen halaman situs"`

---

## Task 6: Helper SEO + JSON-LD Church + robots.txt

**Files:**
- Create: `src/lib/seo.ts`, `public/robots.txt`
- Test: `tests/unit/seo.test.ts`
- Modify: `src/routes/__root.tsx` (JSON-LD Church di `<head>`)

**Interfaces:**
- `pageMeta(opts: { path: string; titleId: string; titleEn: string; descId: string; descEn: string; locale: 'id' | 'en'; image?: string }): { meta: MetaDescriptor[]; links: LinkDescriptor[] }` — hasilkan `<title>`, `description`, OG (`og:title/description/url/type/image/site_name/locale`), `twitter:card`, `<link rel=canonical>`, dan alternate `hreflang` id/en/x-default. URL absolut dari `SITE.url` + `path` (path locale-aware: `en` → `/en${path}`).
- `churchJsonLd(): string` — JSON-LD `@type: Church` (name, url, address `PostalAddress` 895 Old Diley Road Columbus Ohio, `sameAs: [SITE.facebookUrl]`).

- [ ] **Step 1: Test (TDD)**

`tests/unit/seo.test.ts`:
```ts
import { describe, it, expect } from 'vitest'
import { pageMeta, churchJsonLd } from '@/lib/seo'

describe('pageMeta', () => {
  it('id: canonical & og:url tanpa prefix, alternate id/en/x-default', () => {
    const { meta, links } = pageMeta({ path: '/warta', titleId: 'Warta', titleEn: 'Bulletin',
      descId: 'd', descEn: 'd', locale: 'id' })
    const canonical = links.find((l) => l.rel === 'canonical')
    expect(canonical?.href).toBe('https://gmimmusafir.org/warta')
    expect(links.filter((l) => l.rel === 'alternate')).toHaveLength(3)
    expect(meta.find((m) => m.title)?.title).toBe('Warta — GMIM Musafir Columbus Ohio')
    expect(meta.find((m) => m.property === 'og:url')?.content).toBe('https://gmimmusafir.org/warta')
  })
  it('en: canonical & og:url berprefiks /en', () => {
    const { links } = pageMeta({ path: '/warta', titleId: 'Warta', titleEn: 'Bulletin',
      descId: 'd', descEn: 'd', locale: 'en' })
    expect(links.find((l) => l.rel === 'canonical')?.href).toBe('https://gmimmusafir.org/en/warta')
  })
  it('path "/" tidak menghasilkan "//"', () => {
    const { links } = pageMeta({ path: '/', titleId: 'x', titleEn: 'x', descId: 'd', descEn: 'd', locale: 'en' })
    expect(links.find((l) => l.rel === 'canonical')?.href).toBe('https://gmimmusafir.org/en')
  })
})

describe('churchJsonLd', () => {
  it('JSON valid dengan @type Church + alamat', () => {
    const obj = JSON.parse(churchJsonLd())
    expect(obj['@type']).toBe('Church')
    expect(obj.address.streetAddress).toContain('895 Old Diley Road')
  })
})
```

- [ ] **Step 2: gagal → Step 3: implementasi.** Judul format: `<title terlokal> — GMIM Musafir Columbus Ohio` (locale pilih `titleId`/`titleEn`). `MetaDescriptor`/`LinkDescriptor` = tipe dari `@tanstack/react-router` `head()`.

- [ ] **Step 4: `robots.txt`**
```
User-agent: *
Allow: /
Disallow: /api/
Disallow: /tokens
Sitemap: https://gmimmusafir.org/sitemap.xml
```

- [ ] **Step 5: JSON-LD Church di `__root.tsx`** — tambah `<script type="application/ld+json" dangerouslySetInnerHTML={{ __html: churchJsonLd() }} />` di body root (sekali, semua halaman).

- [ ] **Step 6:** test lolos + `pnpm build`. **Commit** — `"Tambah helper SEO + JSON-LD Church + robots.txt"`

---

## Task 7: Halaman Tentang (`/tentang`)

**Files:**
- Create: `src/routes/tentang.tsx`
- Modify: `messages/id.json` + `messages/en.json` (konten statis)

**Interfaces:** Consumes `<Container>`, `<PageHero>`, `<Section>`, `<Prose>` (untuk paragraf panjang — atau JSX langsung), `pageMeta`, `m.*`.

- [ ] **Step 1: Key konten (KEDUA katalog)** — `about_*`:
  `about_title`, `about_subtitle`, `about_history_title` + `about_history_body` (2-3 paragraf sejarah jemaat perantauan GMIM di Columbus — placeholder wajar, tandai `<!-- TODO isi sejarah asli -->` di komentar route), `about_vision_title` + `about_vision_body`, `about_mission_title` + `about_mission_body`, `about_council_title` + `about_council_body` (narasi BPMJ + placeholder "daftar majelis menyusul"), `about_pastor_title` + `about_pastor_body` ("Pdt. Allan Robot, S.Th." + narasi singkat), `about_pastor_name`.
  Isi id & en. Body boleh mengandung `\n\n` antar paragraf — route memecah jadi `<p>`.

- [ ] **Step 2: Route**
```tsx
export const Route = createFileRoute('/tentang')({
  head: () => pageMeta({ path: '/tentang', titleId: 'Tentang Kami', titleEn: 'About Us',
    descId: '...', descEn: '...', locale: getLocale() }),
  component: About,
})
```
`About`: `<PageHero title={m.about_title()} subtitle={m.about_subtitle()} />`, lalu `<Container>` dengan `<Section>` per topik (Sejarah, Visi, Misi, Majelis, Pendeta) — `<SectionTitle>` + paragraf. Anchor `id` per section untuk deep-link.

- [ ] **Step 3: Verifikasi** — `pnpm dev` → `/tentang` + `/en/tentang` KEDUA tema. `pnpm build`.
- [ ] **Step 4: Commit** — `"Tambah halaman Tentang"`

---

## Task 8: Warta — daftar + detail (`/warta`, `/warta/:id`)

**Files:**
- Create: `src/routes/warta.tsx`, `src/routes/warta.$id.tsx`
- Modify: `messages/*.json` (+`warta_*`)

**Interfaces:** Consumes `listBulletins`, `getBulletin` (loader), `sanitizeRichText`, `<Prose>`, `formatDateLong` dari `@/lib/datetime`, `pageMeta`.

- [ ] **Step 1: Key** — `warta_title`, `warta_subtitle`, `warta_empty` ("Belum ada warta."), `warta_download_pdf`, `warta_back`.

- [ ] **Step 2: `/warta` (daftar)**
```tsx
export const Route = createFileRoute('/warta')({
  loader: () => listBulletins(),
  head: () => pageMeta({ path: '/warta', ... , locale: getLocale() }),
  component: WartaList,
})
```
`WartaList`: `<PageHero>`, lalu grid `<Card>` per warta — `formatDateLong(weekDate, locale)`, `title_*`, `summary_*` (locale), link ke `/warta/${id}` via `<Link to="/warta/$id" params={{ id }}>`. `<EmptyState>` bila kosong.

- [ ] **Step 3: `/warta/:id` (detail)**
```tsx
export const Route = createFileRoute('/warta/$id')({
  loader: async ({ params }) => {
    const b = await getBulletin({ data: params.id }) // sesuaikan cara passing param ke server fn
    if (!b) throw notFound()
    return b
  },
  head: ({ loaderData }) => pageMeta({ path: `/warta/${loaderData.id}`,
    titleId: loaderData.titleId, titleEn: loaderData.titleEn, ... , locale: getLocale() }),
  component: WartaDetail,
})
```
`WartaDetail`: judul (locale), tanggal, ringkasan, `{body && <Prose html={sanitizeRichText(bodyLocale)} />}`, tombol unduh PDF bila `pdfUrl` (buka tab baru). Link kembali ke `/warta`. `notFoundComponent` per-route atau biarkan root 404.

> **Cara panggil server fn dari loader:** `createServerFn` menerima input via `.validator()` atau argumen `{ data }`. Cek pola TanStack Start versi terpasang — kalau `getBulletin` butuh input, tambah `.validator((id: string) => id)` dan panggil `getBulletin({ data: params.id })`. Dokumentasikan pola final.

- [ ] **Step 4: e2e ditambah di Task 15.** Verifikasi manual `pnpm dev`: `/warta`, `/warta/<id nyata dari seed>`, `/en/warta`. `pnpm build`.
- [ ] **Step 5: Commit** — `"Tambah halaman Warta (daftar + detail)"`

---

## Task 9: Renungan — daftar + detail (`/renungan`, `/renungan/:slug`) + JSON-LD Article

**Files:**
- Create: `src/routes/renungan.tsx`, `src/routes/renungan.$slug.tsx`
- Modify: `messages/*.json` (+`renungan_*`)

**Interfaces:** Consumes `listDevotionals`, `getDevotional`, `sanitizeRichText`, `<Prose>`, `formatDateLong`, `pageMeta`.

- [ ] **Step 1: Key** — `renungan_title`, `renungan_subtitle`, `renungan_empty`, `renungan_by` ("oleh {author}"), `renungan_back`.

- [ ] **Step 2: `/renungan`** — mirip Warta list: kartu (cover bila ada, judul, tanggal, `renungan_by`, excerpt). Link `/renungan/$slug`.

- [ ] **Step 3: `/renungan/:slug`** — loader `getDevotional({ data: params.slug })` → `notFound()` bila null. Render: cover, judul, tanggal, penulis, `<Prose html={sanitizeRichText(bodyLocale)} />`. **JSON-LD Article** di `head()`: `@type: Article`, `headline`, `datePublished`, `author: { @type: 'Person', name }`, `inLanguage`.

- [ ] **Step 4:** verifikasi manual + `pnpm build`.
- [ ] **Step 5: Commit** — `"Tambah halaman Renungan (daftar + detail + JSON-LD)"`

---

## Task 10: Galeri — daftar + album dengan lightbox (`/galeri`, `/galeri/:id`)

**Files:**
- Create: `src/routes/galeri.tsx`, `src/routes/galeri.$id.tsx`, `src/components/site/lightbox.tsx`
- Modify: `messages/*.json` (+`galeri_*`)

**Interfaces:** Consumes `listGalleryAlbums`, `getGalleryAlbum`, `pageMeta`. `<Lightbox items open index onClose onNav>` — dialog client (Radix Dialog sudah ada via shadcn, atau `<dialog>` native) dengan prev/next + keyboard (Esc, ←/→), `alt` wajib, fokus trap.

- [ ] **Step 1: Key** — `galeri_title`, `galeri_subtitle`, `galeri_empty`, `galeri_photos_count` ("{n} foto"), `galeri_back`, `galeri_watch_video`.

- [ ] **Step 2: `/galeri`** — grid kartu album (cover, judul locale, tanggal, `galeri_photos_count`). Link `/galeri/$id`.

- [ ] **Step 3: `/galeri/:id`** — loader `getGalleryAlbum`. Grid thumbnail: item `image` → tombol buka `<Lightbox>`; item `youtube` → thumbnail dengan overlay play, klik → embed (dialog atau inline). Semua `<img>` `loading="lazy"` + `alt` (caption locale atau judul album).

- [ ] **Step 4: `<Lightbox>`** — client component, SSR-safe (no `document` di render). Uji keyboard + fokus KEDUA tema.

- [ ] **Step 5:** verifikasi + `pnpm build`.
- [ ] **Step 6: Commit** — `"Tambah halaman Galeri (daftar + album + lightbox)"`

---

## Task 11: Form kontak — server fn + komponen

**Files:**
- Create: `src/features/contact/submit.ts`, `src/components/forms/contact-form.tsx`
- Test: `tests/unit/contact-submit.test.ts` (validasi + honeypot; DB di-mock atau uji hanya validator)
- Modify: `messages/*.json` (+`contact_*`)

**Interfaces:**
- `contactSchema` (Zod): `name` (2–100), `email` (email, ≤200), `phone` (opsional, ≤40), `message` (10–2000), `website` (honeypot — harus kosong).
- `submitContactMessage = createServerFn({ method: 'POST' }).validator(contactSchema).handler(...)` → `{ ok: true } | throw`.
  - Honeypot: bila `website` terisi → `return { ok: true }` diam-diam (jangan simpan, jangan error — bot tak tahu).
  - Rate-limit: `Map<ip, { count, resetAt }>` module-level, mis. 3 / 10 menit per IP (`getRequestHeaders()` → `x-forwarded-for`). Lewat batas → `throw new Error('RATE_LIMITED')`. **Catat di komentar:** in-memory = per-lambda di Vercel; cukup untuk sekarang, pindah ke DB/Upstash bila spam.
  - Insert ke `contactMessages` (`status: 'new'`).
  - Bila `env.RESEND_API_KEY` && `env.CONTACT_NOTIFICATION_EMAIL` → kirim email notifikasi (fetch ke Resend API `https://api.resend.com/emails`). Bila gagal / tak dikonfigurasi → tetap `{ ok: true }` (pesan sudah tersimpan). JANGAN tambah SDK Resend — pakai `fetch`.

- [ ] **Step 1: Test validator + honeypot** (TDD) — parse valid/invalid; honeypot terisi → handler tak throw & (dgn DB di-mock) tak insert.
- [ ] **Step 2–4: implementasi** server fn.
- [ ] **Step 5: `<ContactForm>`** — client: `useState` fields, submit → `submitContactMessage({ data })`, tampilkan state (loading / sukses / error). Field `website` `hidden` + `tabIndex={-1}` + `aria-hidden`. Semua label `m.contact_*`. Aksesibel (`<label htmlFor>`, error `aria-describedby`).
- [ ] **Step 6:** `pnpm test` + `pnpm build`. **Commit** — `"Tambah form kontak (server fn + komponen)"`

---

## Task 12: Halaman Kunjungi (`/kunjungi`)

**Files:**
- Create: `src/routes/kunjungi.tsx`
- Modify: `messages/*.json` (+`visit_*`)

**Interfaces:** Consumes `getSiteSettings` (loader), `<ContactForm>`, `<PageHero>`, `<Container>`, `<Section>`, `pageMeta`, `SITE`.

- [ ] **Step 1: Key** — `visit_title`, `visit_subtitle`, `visit_address_title`, `visit_hours_title`, `visit_expect_title` + `visit_expect_body` (2 paragraf "yang perlu diketahui saat pertama datang" — pakaian bebas sopan, anak dipersilakan, dll.), `visit_contact_title`, `visit_open_maps`.

- [ ] **Step 2: Route** — loader `getSiteSettings()`. Render:
  - `<PageHero>`.
  - Section Alamat: `SITE.address` + Google Maps `<iframe>` embed (src dari `contactInfo.mapsUrl` diubah ke `/maps/embed` atau pakai `https://www.google.com/maps?q=<query>&output=embed`), + tombol "Buka di Google Maps" (`SITE.mapsUrl`).
  - Section Jam: `contactInfo.officeHours*` (locale) + `serviceTimes` (locale) + `contactInfo.phone`/`email` (mailto/tel).
  - Section "Yang perlu diketahui": `<Prose>` atau paragraf dari `visit_expect_body`.
  - Section Kontak: `<ContactForm>`.

- [ ] **Step 3:** verifikasi KEDUA locale/tema; submit form uji nyata (cek row masuk `contact_messages` di `dev`). `pnpm build`.
- [ ] **Step 4: Commit** — `"Tambah halaman Kunjungi + form kontak"`

---

## Task 13: Persembahan (`/persembahan`) + Ibadah Live (`/ibadah-live`)

**Files:**
- Create: `src/routes/persembahan.tsx`, `src/routes/ibadah-live.tsx`
- Modify: `messages/*.json` (+`giving_*`, `live_*`); `src/db/seed/settings.ts` (isi contoh `giving_info.accounts` + `live_stream.archiveUrl` bila kosong) → re-seed `dev`

**Interfaces:** Consumes `getSiteSettings` (loader), `pageMeta`, `<PageHero>`, `<Container>`.

- [ ] **Step 1: Key** — `giving_title`, `giving_subtitle`, `giving_bank`, `giving_account_no`, `giving_holder`, `giving_copy` ; `live_title`, `live_subtitle`, `live_offline` ("Tidak ada siaran langsung saat ini."), `live_watch_archive`, `live_next_note`.

- [ ] **Step 2: Persembahan** — loader `getSiteSettings`. Daftar `givingInfo.accounts` sebagai kartu (bank / no rekening / atas nama + tombol salin). `givingInfo.note*` (locale) sebagai paragraf. `<EmptyState>` bila `accounts` kosong.

- [ ] **Step 3: Ibadah Live** — loader `getSiteSettings`. Bila `liveStream.isLive` && `liveStream.url` → embed responsif (deteksi YouTube/Facebook dari URL → `<iframe>` yang sesuai; aspect-ratio box). Else → `live_offline` + tombol ke `liveStream.archiveUrl` (bila ada) + `live_next_note` (jadwal berikutnya = placeholder teks di 2a; 2b bisa isi dari `worship_services`).

- [ ] **Step 4:** seed contoh data bila perlu, re-seed `dev`, verifikasi. `pnpm build`.
- [ ] **Step 5: Commit** — `"Tambah halaman Persembahan + Ibadah Live"`

---

## Task 14: Beranda (`/` saat `!comingSoon`) + footer sitemap

**Files:**
- Modify: `src/routes/index.tsx`, `src/components/layout/site-footer.tsx`
- Create: `src/components/site/site-map-footer.tsx`
- Modify: `messages/*.json` (+`home_*`)

**Interfaces:** Consumes `getSiteSettings`, `listBulletins`, `pageMeta`. Beranda juga query `worship_services` untuk "Ibadah Minggu Ini" (tabel ada, kosong sampai 2b seed → tampilkan `<EmptyState>` / sembunyikan section bila kosong).

- [ ] **Step 1: Key** — `home_services_this_week`, `home_about_blurb`, `home_about_cta`, `home_latest_bulletins`, `home_visit_cta`, `home_view_all`.

- [ ] **Step 2: `<Beranda>` component** (di `index.tsx` atau file terpisah `src/components/site/beranda.tsx`):
  - Hero: `hero.title*`/`hero.tagline*` (locale) di atas `SITE.hero` video (reuse pola coming-soon) ATAU foto `hero.image` bila di-set; tombol "Jadwal Ibadah" (`/jadwal` — belum ada di 2a, pakai `<a>` + komentar) + "Kunjungi Kami" (`/kunjungi`).
  - Strip jam ibadah: `serviceTimes` (locale).
  - "Ibadah Minggu Ini": query `worship_services` published `service_date >= today` limit 6 → kartu; kosong → section disembunyikan (bukan empty-state mencolok di beranda).
  - "Tentang ringkas": `home_about_blurb` + tombol ke `/tentang`.
  - "Warta Terbaru": `listBulletins()` 3 teratas → kartu + "Lihat semua" → `/warta`.

- [ ] **Step 3: `index.tsx` switch**
```tsx
component: () => (SITE.comingSoon ? <ComingSoon /> : <Beranda />),
head: () => (SITE.comingSoon ? <head coming-soon lama> : pageMeta({ path: '/', ... })),
loader: () => (SITE.comingSoon ? null : Promise.all([getSiteSettings(), listBulletins()])),
```
Pertahankan komponen `ComingSoon` (extract dari `index.tsx` sekarang ke `src/components/site/coming-soon.tsx` kalau perlu). **`SITE.comingSoon` TETAP `true`** — jadi produksi tak berubah; `<Beranda>` diuji dgn mengubah flag sementara secara lokal ATAU e2e yang set flag.
  > Bila menguji `<Beranda>` butuh flag `false`: bikin helper test/env — mis. baca `process.env.FORCE_FULL_SITE === '1'` di `SITE.comingSoon` (`comingSoon: !(process.env.FORCE_FULL_SITE === '1') && true`)? **Jangan** — itu bocor ke bundle. Lebih baik: `<Beranda>` di-render langsung di sebuah route dev sementara `/_dev/beranda` (dihapus di rencana polish) untuk review, dan e2e `public-pages.spec.ts` menargetkan `/_dev/beranda`. 2b yang flip `comingSoon` + arahkan e2e ke `/`.

- [ ] **Step 4: `<SiteMapFooter>` + `SiteFooter`** — `SiteFooter` (loader/context `getSiteSettings` untuk sosial) render `<SiteMapFooter>`: kolom link ke semua halaman publik (Beranda, Tentang, Warta, Renungan, Galeri, Kunjungi, Persembahan, Ibadah Live — dan Pelayanan/Jadwal sebagai `<a>` placeholder). Sosmed dari `socialLinks` (sembunyikan yang kosong).

- [ ] **Step 5:** `pnpm build` + verifikasi footer di semua halaman.
- [ ] **Step 6: Commit** — `"Tambah Beranda + footer sitemap"`

---

## Task 15: sitemap.xml + e2e halaman publik

**Files:**
- Create: `src/routes/sitemap[.]xml.ts`, `tests/e2e/public-pages.spec.ts`

**Interfaces:** `sitemap.xml` server route — kembalikan `Content-Type: application/xml` berisi URL semua halaman statis + `/warta/:id` & `/renungan/:slug` & `/galeri/:id` published (query DB), untuk `id` dan `en` (`<xhtml:link rel="alternate" hreflang>`).

- [ ] **Step 1: sitemap route**
```ts
export const Route = createFileRoute('/sitemap[.]xml')({
  server: { handlers: { GET: async () => {
    const { db } = await import('@/db'); /* ... query slugs/ids ... */
    const xml = buildSitemap([...])
    return new Response(xml, { headers: { 'Content-Type': 'application/xml' } })
  } } },
})
```
Static paths: `/`, `/tentang`, `/warta`, `/renungan`, `/galeri`, `/kunjungi`, `/persembahan`, `/ibadah-live` (+ `/pelayanan`, `/jadwal` untuk 2b — boleh dimasukkan sekarang, akan 404 sampai 2b; ATAU tambahkan di 2b). Tiap URL + versi `/en`.

- [ ] **Step 2: e2e `public-pages.spec.ts`** (kedua project):
  - Untuk tiap route (`/tentang`, `/warta`, `/renungan`, `/galeri`, `/kunjungi`, `/persembahan`, `/ibadah-live`, `/_dev/beranda`): status 200, `<h1>` ada, `<html lang="id">`; versi `/en/...` status 200 & `<html lang="en">`.
  - `/warta` → klik kartu pertama → URL `/warta/...` → body warta tampil.
  - `/kunjungi` → isi form kontak valid → submit → pesan sukses. (honeypot: isi field `website` → tetap "sukses" tapi tak ada row — cek opsional via server.)
  - `/sitemap.xml` → 200, `content-type` xml, mengandung `<loc>https://gmimmusafir.org/tentang</loc>`.
  - `/tokens` → 404 (tetap, dari Rencana 1).

- [ ] **Step 3:** `pnpm test:e2e` (2 project) hijau. `pnpm lint` + `pnpm typecheck` + `pnpm build`.
- [ ] **Step 4: Commit** — `"Tambah sitemap.xml + e2e halaman publik"`

---

## Self-Review (diisi saat plan ditulis)

**Cakupan spec §3 (Situs Publik) — Rencana 2a:**

| Item spec | Task |
|---|---|
| §3.2 Tentang (Sejarah/Visi-Misi/Majelis/Pendeta) | 7 |
| §3.2 Warta Jemaat (list + detail, PDF + isi web) | 3 (seed), 4 (query), 8 |
| §3.2 Renungan (list + detail, JSON-LD Article) | 3, 4, 9 |
| §3.2 Galeri (album + lightbox + YouTube) | 3, 4, 10 |
| §3.2 Kunjungi (alamat, peta, jam, "yang perlu diketahui", form kontak) | 11, 12 |
| §3.2 Persembahan (info rekening dari Site Settings) | 1, 13 |
| §3.2 Ibadah Live (embed / offline + arsip) | 1, 13 |
| §3.2 Beranda (hero, jam, ibadah minggu ini, tentang ringkas, warta terbaru) | 14 |
| §3.2 Form kontak (honeypot + rate-limit + email notif via Resend/fetch) | 11 |
| §3.3 SEO (meta per halaman, hreflang, sitemap.xml, robots.txt, JSON-LD Church/Article) | 6, 9, 15 |
| §4.4 sanitasi rich-text server-side | 2 |
| Site Settings sebagai sumber konten "sering berubah" | 1 |
| Konten placeholder realistis (keputusan user) | 3, 13 |

**Ditunda ke Rencana 2b:** Jadwal Ibadah (list/kalender/filter/detail + JSON-LD Event), Pelayanan (indeks + per-kategori), Kolom, upgrade nav `SiteHeader`, flip `SITE.comingSoon`, JSON-LD `Event`, "Ibadah Minggu Ini" di Beranda terisi data nyata, `live_next_note` terisi jadwal nyata.

**Ditunda ke Rencana admin (3):** semua CRUD; konten placeholder diganti pengurus.

**Placeholder scan:** komentar `<!-- TODO isi sejarah asli -->` di Task 7 adalah placeholder KONTEN (bukan placeholder rencana) — disengaja, keputusan user "placeholder dulu". Semua langkah kode punya kode/pola konkret atau rujukan pola Rencana 1 yang ada.

**Konsistensi tipe:** `SanitizedHtml` (Task 2) dikonsumsi Task 8/9. `SiteSettings` (Task 1) dikonsumsi Task 12/13/14. `pageMeta` signature (Task 6) dipakai Task 7–15. Server fn dipanggil dari loader dgn pola `fn({ data })` — Task 8 Step 3 menandai perlu verifikasi cara passing param `createServerFn` versi terpasang; pola final didokumentasikan di Task 8 dan dipakai konsisten Task 9/10/12.

**Risiko:**
- Cara `createServerFn` menerima input (validator vs `{ data }`) berbeda antar versi TanStack Start — Task 4/8 memverifikasi & mengunci pola.
- `getGalleryAlbum` relational query (`db.query...with`) mungkin butuh `relations` yang benar di `content.ts` — fallback dua `select` disediakan.
- `<Beranda>` tak bisa diuji di `/` selama `comingSoon: true` → route dev sementara `/_dev/beranda` (Task 14) + e2e menargetkannya; 2b memindahkan ke `/`.

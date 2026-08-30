# Rencana 1 — Fondasi (Website GMIM Musafir Columbus Ohio)

> **Untuk pekerja agentik:** SUB-SKILL WAJIB: Gunakan superpowers:subagent-driven-development (disarankan) atau superpowers:executing-plans untuk mengerjakan rencana ini task-per-task. Langkah memakai sintaks checkbox (`- [ ]`).

**Goal:** Menyiapkan aplikasi TanStack Start yang ter-deploy di Vercel, dengan i18n dwibahasa, koneksi Neon + Drizzle, skeleton auth better-auth, seluruh schema database + seed, token desain GMIM, dan pipeline CI.

**Architecture:** Satu aplikasi TanStack Start (React 19, Vite, Nitro untuk Vercel). Halaman publik SSR; nanti `/admin` client-only. Database Neon Postgres diakses lewat Drizzle ORM dengan driver `node-postgres` (`pg`) + `@vercel/functions` `attachDatabasePool` (rekomendasi Neon untuk Vercel Fluid Compute — koneksi TCP di-reuse antar invokasi warm; transaksi didukung penuh). Auth lewat better-auth + Drizzle adapter. i18n lewat Paraglide JS (locale `id` default tanpa prefix URL, `en` di prefix `/en`). Styling Tailwind CSS v4 + registry komponen (TypeUI, fallback shadcn/ui).

**Tech Stack:** TanStack Start · TanStack Router · Vite · Nitro · React 19 · Tailwind CSS v4 · Paraglide JS (@inlang/paraglide-js) · Drizzle ORM · drizzle-kit · pg (node-postgres) · @vercel/functions · better-auth · Vitest · Playwright · pnpm · GitHub Actions · Vercel.

**Spec:** `docs/superpowers/specs/2026-08-29-gmim-musafir-website-design.md`

## Global Constraints

Setiap task otomatis tunduk pada berikut (nilai disalin verbatim dari spec):

- **Package manager:** `pnpm`.
- **Bahasa:** locale default `id` **tanpa prefix URL** (`/jadwal`); `en` di prefix `/en` (`/en/jadwal`). Teks UI & konten statis di `messages/id.json` & `messages/en.json` (Paraglide). Konten dinamis DB pakai kolom ganda `*_id` / `*_en`.
- **Zona waktu jadwal:** seluruh waktu ibadah disimpan & ditampilkan dalam **America/New_York (Eastern)** sebagai wall-clock. Kolom: `service_date` (`date`) + `start_time` / `end_time` (`time`) — **bukan** `timestamptz`. Konversi hanya lewat `src/lib/datetime.ts`.
- **Biaya:** hanya free tier (Vercel, Neon, Vercel Blob).
- **Peran user:** satu peran saja — `admin`. Kolom `users.role` default `'admin'`.
- **Tema:** situs publik light-mode saja untuk rilis; token warna didefinisikan sebagai CSS variables dengan struktur siap dark mode (belum diaktifkan).
- **Kontras:** semua pasangan teks/latar minimal WCAG AA.
- **Rich text:** semua HTML dari editor disanitasi di server sebelum disimpan & sebelum dirender (belum diimplementasi di rencana ini — hanya dicatat).
- **Disiplin:** TDD untuk logika (helper, aturan bisnis). DRY. YAGNI. Commit sering (tiap task minimal 1 commit).
- **Konvensi tabel Drizzle:** tiap tabel domain punya `id` (uuid, default `gen_random_uuid()`), `created_at` (`timestamptz` default `now()`), `updated_at` (`timestamptz` default `now()`). (Tabel auth mengikuti generator better-auth.)

---

## Struktur File (dibuat / dimodifikasi di rencana ini)

```
.
├── package.json                         # scripts + deps
├── pnpm-lock.yaml
├── vite.config.ts                       # tanstackStart + nitro + viteReact + tailwind + paraglide
├── tsconfig.json                        # paths: "@/*" -> "src/*"
├── drizzle.config.ts                    # config drizzle-kit
├── .env.example                         # daftar env var (tanpa nilai rahasia)
├── .env                                 # LOKAL saja, di-gitignore
├── eslint.config.js
├── .prettierrc
├── vitest.config.ts
├── playwright.config.ts
├── project.inlang/settings.json         # config Paraglide (dibuat oleh init)
├── messages/
│   ├── id.json                          # katalog Bahasa Indonesia
│   └── en.json                          # katalog Bahasa Inggris
├── .github/workflows/ci.yml             # lint + typecheck + test
├── public/
│   ├── logo.png                         # (sudah ada) seal GMIM
│   └── favicon.ico                      # dari logo-mark
├── src/
│   ├── router.tsx                       # getRouter() + rewrite deLocalizeUrl/localizeUrl
│   ├── server.ts                        # paraglideMiddleware membungkus handler
│   ├── styles/
│   │   └── app.css                      # @import tailwindcss + :root token + @theme
│   ├── paraglide/                       # OUTPUT Paraglide (di-gitignore, di-generate saat build)
│   ├── routes/
│   │   ├── __root.tsx                   # html shell, font, <HeadContent>, header/footer
│   │   ├── index.tsx                    # placeholder beranda
│   │   └── api/
│   │       └── auth/
│   │           └── $.ts                 # handler better-auth
│   ├── components/
│   │   ├── ui/                          # komponen dari TypeUI/shadcn (Button, Card, ...)
│   │   └── layout/
│   │       ├── site-header.tsx
│   │       ├── site-footer.tsx
│   │       └── language-switcher.tsx
│   ├── lib/
│   │   ├── env.ts                       # validasi env var (zod)
│   │   ├── auth.ts                      # instance better-auth (server)
│   │   ├── auth-client.ts               # createAuthClient (browser)
│   │   ├── auth.functions.ts            # getSession / ensureAdmin (server fn)
│   │   └── datetime.ts                  # helper zona waktu Eastern  [TDD]
│   └── db/
│       ├── index.ts                     # koneksi Neon (Pool) + drizzle
│       ├── schema/
│       │   ├── index.ts                 # re-export semua schema
│       │   ├── auth.ts                  # OUTPUT better-auth CLI: user/session/account/verification
│       │   ├── worship.ts               # worship_categories, kolom, schedule_templates, worship_services
│       │   ├── content.ts               # bulletins, devotionals, gallery_albums, gallery_items
│       │   └── site.ts                  # contact_messages, site_settings
│       └── seed/
│           ├── categories.ts            # seed 6 worship_categories
│           ├── settings.ts              # seed default site_settings
│           ├── kolom.ts                 # seed placeholder Kolom 1–4
│           └── admin.ts                 # script buat/reset user admin (pnpm seed:admin)
├── drizzle/                             # file migrasi hasil drizzle-kit generate
└── tests/
    ├── unit/
    │   └── datetime.test.ts
    └── e2e/
        ├── smoke.spec.ts                # halaman utama render (id & en)
        └── i18n.spec.ts                 # language switcher
```      

**Catatan boundary:**
- `src/lib/datetime.ts` = satu-satunya tempat konversi zona waktu. Tidak ada `new Date(...)` manipulasi TZ di file lain.
- `src/db/schema/*` dipecah per domain (worship / content / site / auth) supaya tiap file fokus dan mudah di-review.
- `src/lib/env.ts` = satu-satunya tempat `process.env` dibaca; file lain impor dari sini.

---

## Prasyarat manual (dilakukan manusia sebelum / selama eksekusi)

Task 1 & 15 butuh aksi manusia. Siapkan:

1. **Akun Neon** (neon.tech) — buat project baru `gmim-musafir`, salin connection string (pooled & unpooled).
2. **Akun Vercel** — akan meng-import repo GitHub.
3. **Repo GitHub** kosong (mis. `gmim-musafir-web`) — untuk `git remote add origin`.
4. Node.js ≥ 20 dan `pnpm` ≥ 9 terpasang lokal.

---

## Task 1: Scaffold TanStack Start + server dev jalan

**Files:**
- Create: `package.json`, `vite.config.ts`, `tsconfig.json`, `src/router.tsx`, `src/routes/__root.tsx`, `src/routes/index.tsx`, `src/styles/app.css`
- Create: `.gitignore` (perluas yang sudah ada), `.nvmrc`

**Interfaces:**
- Produces: `getRouter()` di `src/router.tsx` (dipakai TanStack Start entry). Route `/` merender komponen dengan teks penanda `GMIM Musafir Columbus`.

- [ ] **Step 1: Inisialisasi package + dependencies**

Jalankan di root repo (folder sudah berisi `.git`, `logo.png`, `docs/`):

```bash
pnpm init
pnpm pkg set type=module
pnpm add react@^19 react-dom@^19 @tanstack/react-router @tanstack/react-start
pnpm add -D vite @vitejs/plugin-react typescript @types/react @types/react-dom @types/node
```

- [ ] **Step 2: Tulis `package.json` scripts**

Set lewat `pnpm pkg set` atau edit langsung. Target akhir bagian `scripts`:

```json
{
  "scripts": {
    "dev": "vite dev --port 3000",
    "build": "vite build",
    "start": "node .output/server/index.mjs",
    "typecheck": "tsc --noEmit",
    "lint": "eslint .",
    "format": "prettier --write .",
    "test": "vitest run",
    "test:watch": "vitest",
    "test:e2e": "playwright test",
    "db:generate": "drizzle-kit generate",
    "db:migrate": "drizzle-kit migrate",
    "db:studio": "drizzle-kit studio",
    "db:seed": "tsx src/db/seed/index.ts",
    "seed:admin": "tsx src/db/seed/admin.ts",
    "auth:generate": "pnpm dlx @better-auth/cli@latest generate --output src/db/schema/auth.ts"
  }
}
```

(Scripts db:* / seed:* / auth:generate akan dipakai di task berikutnya; boleh ditulis sekarang.)

- [ ] **Step 3: Tulis `tsconfig.json`**

```json
{
  "compilerOptions": {
    "jsx": "react-jsx",
    "moduleResolution": "Bundler",
    "module": "ESNext",
    "target": "ES2022",
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "types": ["vite/client"],
    "skipLibCheck": true,
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "verbatimModuleSyntax": true,
    "baseUrl": ".",
    "paths": { "@/*": ["src/*"] }
  },
  "include": ["src", "tests", "*.config.ts", "drizzle.config.ts"]
}
```

- [ ] **Step 4: Tulis `vite.config.ts` (minimal dulu — plugin lain ditambah task berikut)**

```ts
import { defineConfig } from 'vite'
import { tanstackStart } from '@tanstack/react-start/plugin/vite'
import viteReact from '@vitejs/plugin-react'

export default defineConfig({
  server: { port: 3000 },
  plugins: [
    tanstackStart(),
    viteReact(),
  ],
})
```

- [ ] **Step 5: Tulis file router & root route**

`src/router.tsx`:

```tsx
import { createRouter } from '@tanstack/react-router'
import { routeTree } from './routeTree.gen'

export function getRouter() {
  return createRouter({
    routeTree,
    scrollRestoration: true,
    defaultPreload: 'intent',
  })
}

declare module '@tanstack/react-router' {
  interface Register {
    router: ReturnType<typeof getRouter>
  }
}
```

`src/routes/__root.tsx`:

```tsx
import type { ReactNode } from 'react'
import { Outlet, createRootRoute, HeadContent, Scripts } from '@tanstack/react-router'
import appCss from '@/styles/app.css?url'

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: 'utf-8' },
      { name: 'viewport', content: 'width=device-width, initial-scale=1' },
      { title: 'GMIM Musafir Columbus Ohio' },
    ],
    links: [{ rel: 'stylesheet', href: appCss }],
  }),
  component: RootComponent,
})

function RootComponent() {
  return (
    <RootDocument>
      <Outlet />
    </RootDocument>
  )
}

function RootDocument({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="id">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  )
}
```

`src/routes/index.tsx`:

```tsx
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/')({
  component: Home,
})

function Home() {
  return (
    <main>
      <h1>GMIM Musafir Columbus Ohio</h1>
      <p>Situs dalam pembangunan.</p>
    </main>
  )
}
```

`src/styles/app.css` (placeholder — diisi Task 3):

```css
/* Tailwind + token ditambahkan di Task 3 */
```

- [ ] **Step 6: Tulis `.nvmrc` dan perluas `.gitignore`**

`.nvmrc`:
```
20
```

Tambahkan ke `.gitignore` (yang sudah ada dari commit spec):
```
# TanStack / build
.output/
.nitro/
.tanstack/
routeTree.gen.ts
# Paraglide output
src/paraglide/
# test
playwright-report/
test-results/
coverage/
```

- [ ] **Step 7: Jalankan dev server, verifikasi**

Run: `pnpm dev`
Expected: server hidup di `http://localhost:3000`, membuka `/` menampilkan "GMIM Musafir Columbus Ohio". `routeTree.gen.ts` ter-generate otomatis. Hentikan server (Ctrl-C).

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "Scaffold aplikasi TanStack Start"
```

---

## Task 2: Tambah Nitro (target deploy Vercel) + build sukses

**Files:**
- Modify: `vite.config.ts`, `package.json`

**Interfaces:**
- Produces: perintah `pnpm build` menghasilkan `.output/` yang kompatibel Vercel (deteksi zero-config).

- [ ] **Step 1: Install nitro**

```bash
pnpm add nitro
```

- [ ] **Step 2: Tambah plugin `nitro()` ke `vite.config.ts`**

```ts
import { defineConfig } from 'vite'
import { tanstackStart } from '@tanstack/react-start/plugin/vite'
import viteReact from '@vitejs/plugin-react'
import { nitro } from 'nitro/vite'

export default defineConfig({
  server: { port: 3000 },
  plugins: [
    tanstackStart(),
    nitro(),
    viteReact(),
  ],
})
```

Referensi: <https://vercel.com/docs/frameworks/full-stack/tanstack-start>

- [ ] **Step 3: Jalankan build**

Run: `pnpm build`
Expected: build selesai tanpa error; folder `.output/` terbentuk (berisi `server/` dan `public/`).

- [ ] **Step 4: Uji jalankan hasil build (opsional smoke)**

Run: `pnpm start` lalu buka `http://localhost:3000` → tampil beranda. Hentikan.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "Tambah Nitro untuk deploy Vercel"
```

---

## Task 3: Tailwind v4 + token desain GMIM + font 

**Files:**
- Modify: `vite.config.ts`, `src/styles/app.css`, `src/routes/__root.tsx`, `package.json`
- Create: `src/routes/_dev.tokens.tsx` (halaman contek token, dihapus di Rencana 4)

**Interfaces:**
- Produces: CSS custom properties token (`--color-primary`, `--color-secondary`, `--color-surface`, `--color-accent`, `--color-ink`, `--color-muted`, ...) tersedia global; utility Tailwind memakai token via `@theme`. Font `Fraunces` (heading) & `Inter` (body) ter-load self-host.

- [ ] **Step 1: Install Tailwind v4 + Fontsource**

```bash
pnpm add -D @tailwindcss/vite
pnpm add @fontsource-variable/fraunces @fontsource-variable/inter
```

- [ ] **Step 2: Tambah plugin Tailwind ke `vite.config.ts`**

Sisipkan `tailwindcss()` sebelum `tanstackStart()`:

```ts
import tailwindcss from '@tailwindcss/vite'
// ...
plugins: [
  tailwindcss(),
  tanstackStart(),
  nitro(),
  viteReact(),
],
```

- [ ] **Step 3: Tulis `src/styles/app.css` dengan token GMIM**

Nilai warna diturunkan dari logo (cokelat Manguni, biru Mawar Luther, krem perkamen, merah mawar). Semua pasangan teks/latar sudah dicek ≥ WCAG AA.

```css
@import 'tailwindcss';
@import '@fontsource-variable/fraunces';
@import '@fontsource-variable/inter';

:root {
  /* Brand */
  --color-primary: #4a2e1e;        /* cokelat kayu (Manguni) */
  --color-primary-hover: #3a2417;
  --color-secondary: #234a8f;      /* biru royal (Mawar Luther) */
  --color-secondary-hover: #1b3a72;
  --color-accent: #a4232b;         /* merah mawar — dipakai hemat */

  /* Netral / permukaan */
  --color-surface: #ffffff;
  --color-surface-2: #f6f0e6;      /* krem perkamen hangat */
  --color-border: #e4d9c8;
  --color-ink: #2a2018;            /* teks utama */
  --color-muted: #6f6455;          /* teks sekunder */

  /* Badge kategori ibadah (harmonis dgn palet) */
  --color-cat-jemaat: #234a8f;
  --color-cat-bapa: #4a2e1e;
  --color-cat-ibu: #8a5a2b;
  --color-cat-pemuda: #2f6f5e;
  --color-cat-sekolah-minggu: #b5842b;
  --color-cat-kolom: #6b4a7a;

  /* Radius & shadow */
  --radius: 0.625rem;
}

/* Struktur siap dark mode — belum diaktifkan untuk situs publik.
   @media (prefers-color-scheme: dark) { :root:not([data-theme="light"]) { ... } }
   :root[data-theme="dark"] { ... } */

@theme inline {
  --color-primary: var(--color-primary);
  --color-primary-hover: var(--color-primary-hover);
  --color-secondary: var(--color-secondary);
  --color-secondary-hover: var(--color-secondary-hover);
  --color-accent: var(--color-accent);
  --color-surface: var(--color-surface);
  --color-surface-2: var(--color-surface-2);
  --color-border: var(--color-border);
  --color-ink: var(--color-ink);
  --color-muted: var(--color-muted);
  --font-serif: 'Fraunces Variable', ui-serif, Georgia, serif;
  --font-sans: 'Inter Variable', ui-sans-serif, system-ui, sans-serif;
  --radius-DEFAULT: var(--radius);
}

body {
  background-color: var(--color-surface);
  color: var(--color-ink);
  font-family: var(--font-sans);
}

h1, h2, h3, h4 {
  font-family: var(--font-serif);
}
```

- [ ] **Step 4: Halaman contek token**

`src/routes/_dev.tokens.tsx`:

```tsx
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/_dev/tokens')({ component: Tokens })

function Tokens() {
  const swatches = ['primary', 'secondary', 'accent', 'surface-2', 'border', 'ink', 'muted']
  return (
    <main className="p-8 space-y-4">
      <h1 className="text-3xl">Token Desain</h1>
      <p className="font-sans">Body — Inter</p>
      <h2 className="text-2xl">Heading — Fraunces</h2>
      <div className="flex flex-wrap gap-3">
        {swatches.map((s) => (
          <div key={s} className="w-32">
            <div className="h-16 rounded" style={{ background: `var(--color-${s})` }} />
            <code className="text-xs">{s}</code>
          </div>
        ))}
      </div>
    </main>
  )
}
```

- [ ] **Step 5: Verifikasi**

Run: `pnpm dev`, buka `/_dev/tokens`
Expected: swatch warna tampil, heading pakai serif, body pakai sans. Tidak ada FOUT mencolok.

- [ ] **Step 6: Build check**

Run: `pnpm build`
Expected: sukses.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "Setup Tailwind v4 + token desain GMIM + font"
```

---

## Task 4: Registry komponen UI (TypeUI, fallback shadcn/ui)

**Files:**
- Create: `components.json` (config registry), `src/components/ui/button.tsx`, `src/components/ui/card.tsx`, `src/lib/utils.ts` (`cn()`)
- Create: `docs/dev/komponen-ui.md` (catat keputusan)
- Modify: `src/routes/_dev.tokens.tsx` (render Button & Card)

**Interfaces:**
- Produces: `cn(...)` di `@/lib/utils`; komponen `Button` (varian `primary` | `secondary` | `ghost` | `outline`, ukuran `sm` | `md` | `lg`) dan `Card` (+ `CardHeader`, `CardTitle`, `CardContent`, `CardFooter`) di `@/components/ui/*`, memakai token Task 3.

- [ ] **Step 1: Konfirmasi cara pakai TypeUI**

Buka <https://typeui.sh> (dan <https://www.typeui.sh>). Catat di `docs/dev/komponen-ui.md`:
- Apakah ada CLI / registry URL kompatibel shadcn (`npx shadcn@latest add @typeui/...`)?
- Stack yang didukung (React + Tailwind v4?), lisensi.
- Daftar komponen yang tersedia.

Jika TypeUI **tidak** menyediakan cara install yang jelas / tidak kompatibel Tailwind v4 → gunakan **fallback shadcn/ui** dan catat alasannya.

- [ ] **Step 2: Inisialisasi registry**

**Jika TypeUI kompatibel shadcn CLI:**
```bash
pnpm dlx shadcn@latest init
# saat ditanya: style = default, base color = neutral, CSS vars = yes
```
lalu tambahkan registry TypeUI ke `components.json` sesuai dokumentasinya.

**Fallback shadcn/ui:**
```bash
pnpm dlx shadcn@latest init
```
Sesuaikan `components.json`: `"aliases": { "components": "@/components", "ui": "@/components/ui", "utils": "@/lib/utils" }`, `"tailwind": { "css": "src/styles/app.css", "cssVariables": true }`, `"rsc": false`.

- [ ] **Step 3: Tambah komponen Button & Card**

```bash
pnpm dlx shadcn@latest add button card
```
(atau `@typeui/button @typeui/card` bila pakai TypeUI)

- [ ] **Step 4: Selaraskan Button dengan token GMIM**

Pastikan `src/components/ui/button.tsx` punya varian `primary` (bg `--color-primary`, teks putih, hover `--color-primary-hover`) dan `secondary` (bg `--color-secondary`). Sesuaikan `cva` variants agar merujuk class token (mis. `bg-[var(--color-primary)]` atau utility `bg-primary` bila `@theme` sudah memetakan).

- [ ] **Step 5: Render di halaman contek**

Tambah ke `_dev.tokens.tsx`:
```tsx
import { Button } from '@/components/ui/button'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
// ...
<div className="flex gap-3">
  <Button variant="primary">Primary</Button>
  <Button variant="secondary">Secondary</Button>
  <Button variant="outline">Outline</Button>
</div>
<Card className="max-w-sm">
  <CardHeader><CardTitle>Contoh Kartu</CardTitle></CardHeader>
  <CardContent>Isi kartu memakai token permukaan & border.</CardContent>
</Card>
```

- [ ] **Step 6: Verifikasi**

Run: `pnpm dev` → `/_dev/tokens`
Expected: Button & Card tampil dengan warna token GMIM. `pnpm build` sukses.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "Setup registry komponen UI + Button & Card"
```

---

## Task 5: i18n Paraglide (id default, /en prefix)

**Files:**
- Create: `project.inlang/settings.json` (via init), `messages/id.json`, `messages/en.json`, `src/server.ts`, `src/components/layout/language-switcher.tsx`
- Modify: `vite.config.ts`, `src/router.tsx`, `src/routes/__root.tsx`, `src/routes/index.tsx`
- Create test: `tests/e2e/i18n.spec.ts`

**Interfaces:**
- Consumes: `getRouter()` (Task 1).
- Produces: modul pesan `import * as m from '@/paraglide/messages'`; runtime `getLocale()`, `locales`, `setLocale()`, `deLocalizeUrl()`, `localizeUrl()` dari `@/paraglide/runtime`. Komponen `<LanguageSwitcher />`.

- [ ] **Step 1: Init Paraglide**

```bash
pnpm dlx @inlang/paraglide-js@latest init
```
Saat ditanya locale: base = `id`, tambahan = `en`.
Pastikan `project.inlang/settings.json` berisi `"baseLocale": "id"` dan `"locales": ["id", "en"]`.

- [ ] **Step 2: Konfigurasi plugin di `vite.config.ts`**

```ts
import { paraglideVitePlugin } from '@inlang/paraglide-js'
// ...
plugins: [
  tailwindcss(),
  paraglideVitePlugin({
    project: './project.inlang',
    outdir: './src/paraglide',
    outputStructure: 'message-modules',
    cookieName: 'PARAGLIDE_LOCALE',
    strategy: ['url', 'cookie', 'preferredLanguage', 'baseLocale'],
    urlPatterns: [
      {
        pattern: '/:path(.*)?',
        localized: [['en', '/en/:path(.*)?']],
      },
    ],
  }),
  tanstackStart(),
  nitro(),
  viteReact(),
],
```

Referensi: <https://paraglidejs.com/tanstack-start>

- [ ] **Step 3: Middleware SSR di `src/server.ts`**

```ts
import { paraglideMiddleware } from '@/paraglide/server'
import handler from '@tanstack/react-start/server-entry'

export default {
  fetch(req: Request): Promise<Response> {
    return paraglideMiddleware(req, () => handler.fetch(req))
  },
}
```

(Jika TanStack Start versi terpasang tidak mengekspor `@tanstack/react-start/server-entry`, ikuti pola "custom server entry" di dokumen contoh `TanStack/router/examples/react/start-i18n-paraglide` — <https://github.com/TanStack/router/tree/main/examples/react/start-i18n-paraglide>.)

- [ ] **Step 4: Router rewrite di `src/router.tsx`**

```tsx
import { deLocalizeUrl, localizeUrl } from '@/paraglide/runtime'
// ...
return createRouter({
  routeTree,
  scrollRestoration: true,
  defaultPreload: 'intent',
  rewrite: {
    input: ({ url }) => deLocalizeUrl(url),
    output: ({ url }) => localizeUrl(url),
  },
})
```

- [ ] **Step 5: Katalog pesan awal**

`messages/id.json`:
```json
{
  "$schema": "https://inlang.com/schema/inlang-message-format",
  "site_name": "GMIM Musafir Columbus Ohio",
  "site_tagline": "Jemaat GMIM di Columbus, Ohio",
  "nav_home": "Beranda",
  "nav_about": "Tentang",
  "nav_ministries": "Pelayanan",
  "nav_schedule": "Jadwal Ibadah",
  "nav_bulletin": "Warta & Renungan",
  "nav_gallery": "Galeri",
  "nav_visit": "Kunjungi",
  "cta_live": "Ibadah Live",
  "cta_give": "Persembahan",
  "footer_rights": "Hak cipta dilindungi.",
  "lang_id": "Indonesia",
  "lang_en": "English",
  "home_building": "Situs dalam pembangunan."
}
```

`messages/en.json`:
```json
{
  "$schema": "https://inlang.com/schema/inlang-message-format",
  "site_name": "GMIM Musafir Columbus Ohio",
  "site_tagline": "A GMIM congregation in Columbus, Ohio",
  "nav_home": "Home",
  "nav_about": "About",
  "nav_ministries": "Ministries",
  "nav_schedule": "Worship Schedule",
  "nav_bulletin": "Bulletin & Devotionals",
  "nav_gallery": "Gallery",
  "nav_visit": "Visit",
  "cta_live": "Watch Live",
  "cta_give": "Give",
  "footer_rights": "All rights reserved.",
  "lang_id": "Indonesia",
  "lang_en": "English",
  "home_building": "Site under construction."
}
```

- [ ] **Step 6: Komponen `LanguageSwitcher`**

`src/components/layout/language-switcher.tsx`:
```tsx
import { getLocale, locales, localizeHref } from '@/paraglide/runtime'
import * as m from '@/paraglide/messages'
import { useLocation } from '@tanstack/react-router'

export function LanguageSwitcher() {
  const current = getLocale()
  const { pathname } = useLocation()
  return (
    <nav aria-label="Bahasa" className="flex gap-2 text-sm">
      {locales.map((loc) => (
        <a
          key={loc}
          href={localizeHref(pathname, { locale: loc })}
          aria-current={loc === current ? 'true' : undefined}
          className={loc === current ? 'font-semibold underline' : 'text-muted'}
        >
          {loc === 'id' ? m.lang_id() : m.lang_en()}
        </a>
      ))}
    </nav>
  )
}
```

(Nama helper — `localizeHref` / `localizeUrl` — sesuaikan dengan yang diekspor runtime Paraglide versi terpasang; cek `src/paraglide/runtime.js` setelah `pnpm dev`.)

- [ ] **Step 7: Pakai pesan di `index.tsx` + `__root.tsx`**

`index.tsx` render `m.site_name()` sebagai `<h1>` dan `m.home_building()` sebagai `<p>`. `__root.tsx` set `<html lang={getLocale()}>`.

- [ ] **Step 8: Test E2E i18n**

`tests/e2e/i18n.spec.ts`:
```ts
import { test, expect } from '@playwright/test'

test('beranda id menampilkan teks Indonesia', async ({ page }) => {
  await page.goto('/')
  await expect(page.locator('h1')).toContainText('GMIM Musafir Columbus Ohio')
  await expect(page.getByText('Situs dalam pembangunan.')).toBeVisible()
})

test('beranda /en menampilkan teks Inggris', async ({ page }) => {
  await page.goto('/en')
  await expect(page.getByText('Site under construction.')).toBeVisible()
})

test('language switcher pindah ke /en', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('link', { name: 'English' }).click()
  await expect(page).toHaveURL(/\/en$/)
  await expect(page.getByText('Site under construction.')).toBeVisible()
})
```

(Test ini butuh Playwright config dari Task 7 — jika mengeksekusi berurutan, jalankan setelah Task 7. Boleh commit test sekarang, jalankan nanti.)

- [ ] **Step 9: Verifikasi manual**

Run: `pnpm dev` → `/` (Indonesia), `/en` (Inggris), klik switcher.
Expected: konten & `<html lang>` berubah; cookie `PARAGLIDE_LOCALE` di-set.
Run: `pnpm build` → sukses.

- [ ] **Step 10: Commit**

```bash
git add -A
git commit -m "Setup i18n Paraglide (id default, prefix /en)"
```

---

## Task 6: Shell situs — root layout, header, footer, 404

**Files:**
- Create: `src/components/layout/site-header.tsx`, `src/components/layout/site-footer.tsx`
- Modify: `src/routes/__root.tsx` (pakai header/footer, notFoundComponent), `src/routes/index.tsx`
- Create: `public/favicon.ico` (dari logo), `src/components/layout/logo.tsx`

**Interfaces:**
- Consumes: `m.*` (Task 5), `Button` (Task 4), `LanguageSwitcher` (Task 5).
- Produces: `<SiteHeader />`, `<SiteFooter />`, `<Logo variant="mark" | "full" />`.

- [ ] **Step 1: Komponen Logo**

`src/components/layout/logo.tsx` — render `<img src="/logo.png">` untuk `variant="full"`; untuk `variant="mark"` render `/logo-mark.svg` bila ada, jika belum ada gunakan `/logo.png` dengan `className` kecil. Sertakan `alt="Lambang GMIM"`.

- [ ] **Step 2: Buat favicon dari logo**

```bash
# jika ImageMagick tersedia:
magick public/logo.png -resize 64x64 public/favicon.ico
```
Jika tidak tersedia, salin sementara: `cp public/logo.png public/favicon.png` dan referensikan `.png` di `<head>`. Catat TODO membuat `logo-mark.svg` (mark sederhana Manguni + Mawar Luther) — dikerjakan manual/desainer, tidak memblokir.

- [ ] **Step 3: `SiteHeader`**

Nav horizontal: Logo + `site_name`, link `nav_home / nav_about / nav_ministries / nav_schedule / nav_bulletin / nav_gallery / nav_visit`, tombol `cta_live` + `cta_give`, `<LanguageSwitcher />`. Gunakan `<Link>` TanStack Router (href non-lokal — biarkan router `rewrite` yang menangani prefix `/en`). Mobile: tombol hamburger membuka panel (pakai `<details>`/state sederhana; komponen `Sheet` ditambah di Rencana 2). Semua target sentuh ≥ 44px. `<header>` semantik, `<nav aria-label>`.

- [ ] **Step 4: `SiteFooter`**

`<footer>`: alamat "895 Old Diley Road, Columbus, Ohio", `footer_rights` + tahun, `<LanguageSwitcher />`, placeholder link sosial (nanti dari Site Settings di Rencana 2).

- [ ] **Step 5: Pasang di `__root.tsx`**

```tsx
function RootDocument({ children }) {
  return (
    <html lang={getLocale()}>
      <head><HeadContent /></head>
      <body>
        <SiteHeader />
        {children}
        <SiteFooter />
        <Scripts />
      </body>
    </html>
  )
}
```
Tambah `notFoundComponent` di `createRootRoute` yang merender halaman 404 sederhana dwibahasa (`m.*`).

- [ ] **Step 6: Test E2E smoke**

`tests/e2e/smoke.spec.ts`:
```ts
import { test, expect } from '@playwright/test'

test('header & footer tampil di beranda', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('banner')).toBeVisible()
  await expect(page.getByRole('contentinfo')).toContainText('895 Old Diley Road')
  await expect(page.getByRole('navigation', { name: /menu|navigasi/i })).toBeVisible()
})

test('halaman tak dikenal menampilkan 404', async ({ page }) => {
  const res = await page.goto('/tidak-ada-halaman-ini')
  expect(res?.status()).toBe(404)
})
```

- [ ] **Step 7: Verifikasi**

Run: `pnpm dev` → cek header/footer di `/` dan `/en`. `pnpm build` sukses.

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "Tambah shell situs: header, footer, logo, 404"
```

---

## Task 7: Tooling — ESLint, Prettier, Vitest, Playwright

**Files:**
- Create: `eslint.config.js`, `.prettierrc`, `.prettierignore`, `vitest.config.ts`, `playwright.config.ts`
- Modify: `package.json` (devDeps), `tsconfig.json` (include tests)

**Interfaces:**
- Produces: `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm test:e2e` semua bisa dijalankan.

- [ ] **Step 1: Install**

```bash
pnpm add -D eslint @eslint/js typescript-eslint eslint-plugin-react-hooks eslint-config-prettier prettier prettier-plugin-tailwindcss
pnpm add -D vitest @vitest/coverage-v8
pnpm add -D @playwright/test
pnpm exec playwright install --with-deps chromium
```

- [ ] **Step 2: `eslint.config.js` (flat config)**

```js
import js from '@eslint/js'
import tseslint from 'typescript-eslint'
import reactHooks from 'eslint-plugin-react-hooks'
import prettier from 'eslint-config-prettier'

export default tseslint.config(
  { ignores: ['.output/', '.nitro/', 'src/paraglide/', 'routeTree.gen.ts', 'drizzle/', 'dist/'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  { plugins: { 'react-hooks': reactHooks }, rules: reactHooks.configs.recommended.rules },
  prettier,
)
```

- [ ] **Step 3: `.prettierrc`**

```json
{
  "semi": false,
  "singleQuote": true,
  "printWidth": 100,
  "plugins": ["prettier-plugin-tailwindcss"]
}
```

`.prettierignore`:
```
.output/
src/paraglide/
routeTree.gen.ts
drizzle/
pnpm-lock.yaml
```

- [ ] **Step 4: `vitest.config.ts`**

```ts
import { defineConfig } from 'vitest/config'
import tsconfigPaths from 'vite-tsconfig-paths'

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    environment: 'node',
    include: ['tests/unit/**/*.test.ts'],
  },
})
```

```bash
pnpm add -D vite-tsconfig-paths
```

- [ ] **Step 5: `playwright.config.ts`**

```ts
import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: './tests/e2e',
  timeout: 30_000,
  use: { baseURL: 'http://localhost:3000' },
  webServer: {
    command: 'pnpm dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
})
```

- [ ] **Step 6: Jalankan semua**

Run: `pnpm lint` → 0 error.
Run: `pnpm typecheck` → 0 error.
Run: `pnpm test` → tidak ada test (atau lolos). Expected: exit 0 (Vitest `passWithNoTests` bila perlu tambah flag).
Run: `pnpm test:e2e` → test dari Task 5 & 6 lolos.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "Setup tooling: ESLint, Prettier, Vitest, Playwright"
```

---

## Task 8: Koneksi Neon + Drizzle + validasi env

> **REVISI (controller, 2026-08-30):** Neon sudah di-setup manual di luar SDD —
> `neon` CLI ter-auth, project `gmim-musafir` (late-night-27741746) di org
> `yunita` ter-link, branch **`dev`** aktif, `.env` sudah berisi `DATABASE_URL`
> (pooled) + `DATABASE_URL_UNPOOLED` (direct) + `BETTER_AUTH_SECRET` +
> `BETTER_AUTH_URL` + placeholder lain + `NEON_AI_GATEWAY_*` (tak dipakai).
> `.env.example` sudah di-commit (`02cc440`). `.env` & `.neon` git-ignored.
> **Driver: pakai `pg` (node-postgres) + `@vercel/functions` `attachDatabasePool`**,
> BUKAN `@neondatabase/serverless` — ini rekomendasi Neon untuk TanStack Start di
> Vercel Fluid Compute (functions tetap warm → reuse koneksi TCP). Ref:
> <https://neon.com/docs/guides/vercel-connection-methods.md>.
> Jadi Step 5 & 6 (bikin `.env.example` / `.env`) **sudah selesai** — skip.

**Files:**
- Create: `src/lib/env.ts`, `src/db/index.ts`, `src/db/schema/index.ts` (stub), `drizzle.config.ts`
- Modify: `package.json` (deps)
- Already done (skip): `.env.example`, `.env`, `.gitignore`

**Interfaces:**
- Produces: `env` (obyek tervalidasi) dari `@/lib/env`; `db` (instance Drizzle `node-postgres`) dari `@/db`.

- [ ] **Step 1: Install**

```bash
pnpm add pg drizzle-orm @vercel/functions zod
pnpm add -D drizzle-kit tsx dotenv @types/pg
```

- [ ] **Step 2: `src/lib/env.ts`**

```ts
import { z } from 'zod'

const schema = z.object({
  DATABASE_URL: z.string().url(),
  DATABASE_URL_UNPOOLED: z.string().url().optional(),
  BETTER_AUTH_SECRET: z.string().min(16),
  BETTER_AUTH_URL: z.string().url(),
  BLOB_READ_WRITE_TOKEN: z.string().optional(),
  RESEND_API_KEY: z.string().optional(),
  CONTACT_NOTIFICATION_EMAIL: z.string().email().optional(),
})

// Zod strips unknown keys by default — extra Neon vars (NEON_AI_GATEWAY_*, NEON_BRANCH) are harmless.
export const env = schema.parse(process.env)
```

- [ ] **Step 3: `src/db/index.ts` (node-postgres + Vercel Fluid Compute pool reuse)**

```ts
import { attachDatabasePool } from '@vercel/functions'
import { drizzle } from 'drizzle-orm/node-postgres'
import { Pool } from 'pg'
import { env } from '@/lib/env'
import * as schema from './schema'

const pool = new Pool({ connectionString: env.DATABASE_URL })
attachDatabasePool(pool) // no-ops outside Vercel; on Vercel it reuses the TCP connection across warm invocations

export const db = drizzle({ client: pool, schema })
```

(`./schema` masih kosong sampai Task 9–10; buat `src/db/schema/index.ts` berisi `export {}` sementara agar impor tidak error.)

- [ ] **Step 4: `drizzle.config.ts`**

```ts
import 'dotenv/config' // loads .env
import { defineConfig } from 'drizzle-kit'

export default defineConfig({
  out: './drizzle',
  schema: './src/db/schema/index.ts',
  dialect: 'postgresql',
  dbCredentials: {
    // migrations MUST use the direct (unpooled) connection
    url: process.env.DATABASE_URL_UNPOOLED ?? process.env.DATABASE_URL!,
  },
})
```

- [ ] **Step 5: Verifikasi koneksi**

Buat file sementara `scripts/check-db.ts`:
```ts
import 'dotenv/config'
import { Pool } from 'pg'
const pool = new Pool({ connectionString: process.env.DATABASE_URL })
const r = await pool.query('select now() as now, current_database() as db, version() as version')
console.log('DB OK:', r.rows[0])
await pool.end()
```
Run: `pnpm tsx scripts/check-db.ts`
Expected: mencetak `DB OK: { now: ..., db: 'neondb', version: 'PostgreSQL 17...' }`. Hapus `scripts/check-db.ts` setelah lolos.
Juga pastikan `pnpm typecheck` + `pnpm lint` + `pnpm build` tetap hijau.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "Tambah koneksi Neon + Drizzle (node-postgres) + validasi env"
```

---

## Task 8b: Dark mode + revisi palet (ungu/putih) + theme toggle

> **DITAMBAHKAN (controller, 2026-08-30) — user directive.** Menggantikan spec
> §6.3 "situs publik light-mode saja saat rilis" dan palet cokelat/biru/krem
> dari Task 3. Sekarang: **light = ungu + putih**, **dark = ungu-hitam**, dengan
> toggle. Nama token TIDAK berubah (Button/Card Task 4 tetap jalan) — hanya
> NILAI token + blok dark ditambahkan.

**Files:**
- Modify: `src/styles/app.css` (tulis ulang seluruh blok token: light + dark)
- Create: `src/components/layout/theme-toggle.tsx`, `src/lib/theme.ts` (konstanta + snippet anti-flash)
- Modify: `src/routes/__root.tsx` (inline anti-flash script di `<head>`, mount `<ThemeToggle>` di header via SiteHeader), `src/components/layout/site-header.tsx` (+ `<ThemeToggle>`), `src/routes/_dev.tokens.tsx` (tampilkan kedua mode)
- Create test: `tests/e2e/theme.spec.ts`
- Modify: `messages/id.json` + `messages/en.json` (+ key `theme_toggle_label`, `theme_light`, `theme_dark`, `theme_system`)

**Interfaces:**
- Produces: `<ThemeToggle />`; `THEME_STORAGE_KEY = 'gmim-theme'`; `THEME_INIT_SCRIPT` (string, inline no-flash). Theme state: `'light' | 'dark' | 'system'` in `localStorage`; resolved theme sets `data-theme="light|dark"` on `<html>` (omit attr = follow `prefers-color-scheme`).

- [ ] **Step 1: Palet token — `src/styles/app.css`**

Ganti isi blok `:root` + isi blok dark yang sebelumnya di-comment. Target: nilai di bawah adalah TITIK AWAL — implementer WAJIB menghitung kontras tiap pasangan teks/latar dan menyesuaikan sampai **semua ≥ WCAG AA** (4.5:1 teks normal, 3:1 teks besar/UI). Catat rasio tiap pasangan kunci di report.

```css
:root {
  /* LIGHT — ungu + putih */
  --color-primary: #6d28d9;          /* tombol utama, link (putih di atasnya ~7.5:1) */
  --color-primary-hover: #5b21b6;
  --color-secondary: #7c3aed;         /* tombol sekunder */
  --color-secondary-hover: #6d28d9;
  --color-accent: #9333ea;            /* badge "live", highlight (hemat) */

  --color-surface: #ffffff;
  --color-surface-2: #f5f3ff;         /* section selang-seling, ungu sangat muda */
  --color-border: #e9e5f7;
  --color-ink: #1c1a26;               /* teks utama (~16:1 di putih) */
  --color-muted: #6a6577;             /* teks sekunder (~5.3:1 di putih) */

  /* Badge 6 kategori ibadah — nilai awal, implementer validasi AA (putih di atasnya) di LIGHT & DARK */
  --color-cat-jemaat: #5b21b6;
  --color-cat-bapa: #1d4ed8;
  --color-cat-ibu: #a21caf;
  --color-cat-pemuda: #0f766e;
  --color-cat-sekolah-minggu: #b45309;
  --color-cat-kolom: #7c3aed;

  --radius: 0.625rem;
}

@media (prefers-color-scheme: dark) {
  :root:not([data-theme='light']) {
    /* DARK — ungu-hitam */
    --color-primary: #7c3aed;         /* tombol; putih di atasnya ~5.9:1 */
    --color-primary-hover: #6d28d9;
    --color-secondary: #8b5cf6;
    --color-secondary-hover: #7c3aed;
    --color-accent: #a78bfa;

    --color-surface: #161221;
    --color-surface-2: #1f1830;
    --color-border: #332b47;
    --color-ink: #f1eef8;             /* ~16:1 di #161221 */
    --color-muted: #a79fb8;           /* ~7.5:1 di #161221 */

    --color-cat-jemaat: #a78bfa;
    --color-cat-bapa: #60a5fa;
    --color-cat-ibu: #e879f9;
    --color-cat-pemuda: #2dd4bf;
    --color-cat-sekolah-minggu: #fbbf24;
    --color-cat-kolom: #c4b5fd;
  }
}

:root[data-theme='dark'] {
  /* sama persis dengan blok DARK di atas — implementer DRY via CSS custom-prop
     indirection atau duplikasi eksplisit; JANGAN sampai drift */
  --color-primary: #7c3aed;
  --color-primary-hover: #6d28d9;
  --color-secondary: #8b5cf6;
  --color-secondary-hover: #7c3aed;
  --color-accent: #a78bfa;
  --color-surface: #161221;
  --color-surface-2: #1f1830;
  --color-border: #332b47;
  --color-ink: #f1eef8;
  --color-muted: #a79fb8;
  --color-cat-jemaat: #a78bfa;
  --color-cat-bapa: #60a5fa;
  --color-cat-ibu: #e879f9;
  --color-cat-pemuda: #2dd4bf;
  --color-cat-sekolah-minggu: #fbbf24;
  --color-cat-kolom: #c4b5fd;
}
```

> **DRY the dark values.** Duplikasi blok `@media` dan `[data-theme='dark']` di
> atas rawan drift. Implementer boleh restrukturisasi: definisikan dark values
> sekali (mis. di `:root` sebagai `--dark-color-*`, lalu `--color-*: var(--dark-color-*)`
> di kedua selector dark), asalkan hasil akhirnya identik. Uji kedua jalur
> (OS dark tanpa `data-theme`, dan `data-theme="dark"` eksplisit).

Blok `@theme inline` yang memetakan `--color-*` → utility Tailwind TIDAK berubah
(nama token sama). Pastikan `bg-primary`, `text-ink`, dll. tetap resolve.

`body` background/color tetap pakai `var(--color-surface)` / `var(--color-ink)` →
otomatis ikut tema.

- [ ] **Step 2: `src/lib/theme.ts`**

```ts
export const THEME_STORAGE_KEY = 'gmim-theme'
export type ThemePref = 'light' | 'dark' | 'system'

// Inline <script> — jalan SEBELUM paint, set data-theme dari localStorage.
// Tanpa ini: flash putih saat load untuk user yang pilih dark.
export const THEME_INIT_SCRIPT = `
(function(){try{
  var p = localStorage.getItem('${THEME_STORAGE_KEY}');
  if (p === 'light' || p === 'dark') document.documentElement.setAttribute('data-theme', p);
}catch(e){}})();
`
```

- [ ] **Step 3: Anti-flash script di `__root.tsx`**

Di `createRootRoute({ head: () => ({ scripts: [{ children: THEME_INIT_SCRIPT }] , ... }) })`
ATAU render `<script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />` sebagai
elemen PERTAMA di `<head>` (sebelum stylesheet). Verifikasi via view-source bahwa
script muncul inline & sebelum CSS. `<html>` TIDAK di-hardcode `data-theme` di SSR
(server tak tahu preferensi) — script yang set sebelum paint.

- [ ] **Step 4: `<ThemeToggle>`**

`src/components/layout/theme-toggle.tsx` — client component:
- Baca `localStorage[THEME_STORAGE_KEY]` (default `'system'`), state React.
- 3 opsi (system / light / dark) — dropdown atau siklus tombol. Ikon: matahari / bulan / monitor (inline SVG, tanpa lib ikon).
- On change: tulis `localStorage`, lalu set/hapus `data-theme` di `document.documentElement` (`'system'` → `removeAttribute`).
- Dengarkan `window.matchMedia('(prefers-color-scheme: dark)')` change saat mode `'system'` (opsional — CSS `@media` sudah handle; JS listener hanya kalau ikon perlu update).
- Aksesibel: `<button>` dengan `aria-label={m.theme_toggle_label()}`, `aria-pressed` atau menu dgn `aria-expanded`. Target sentuh ≥ 44px.
- SSR-safe: jangan baca `localStorage`/`window` saat render server — pakai `useEffect` untuk sinkronisasi state awal, atau `useSyncExternalStore`.

- [ ] **Step 5: Mount di header**

`src/components/layout/site-header.tsx` — tambah `<ThemeToggle />` di sebelah `<LanguageSwitcher />` (desktop cluster + mobile panel).

- [ ] **Step 6: Pesan i18n**

Tambah ke BOTH `messages/id.json` & `messages/en.json`:
`theme_toggle_label` (id "Ganti tema" / en "Toggle theme"), `theme_light` ("Terang"/"Light"),
`theme_dark` ("Gelap"/"Dark"), `theme_system` ("Ikuti sistem"/"System").

- [ ] **Step 7: `_dev.tokens.tsx`**

Update supaya menampilkan swatch + Button/Card. Tambah tombol kecil untuk toggle `data-theme` di halaman itu agar reviewer bisa lihat kedua mode. (Halaman ini dihapus di Rencana 4.)

- [ ] **Step 8: e2e `tests/e2e/theme.spec.ts`**

```ts
import { test, expect } from '@playwright/test'

test('default mengikuti prefers-color-scheme', async ({ browser }) => {
  const dark = await browser.newContext({ colorScheme: 'dark' })
  const p1 = await dark.newPage()
  await p1.goto('/')
  await expect(p1.locator('html')).not.toHaveAttribute('data-theme', 'light')
  const bg = await p1.evaluate(() => getComputedStyle(document.body).backgroundColor)
  expect(bg).toBe('rgb(22, 18, 33)') // #161221
  await dark.close()
})

test('tombol dark disimpan & bertahan reload', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: /tema|theme/i }).click()
  // pilih "Gelap" — sesuaikan selektor dgn implementasi (menu item atau siklus)
  await page.getByRole('menuitem', { name: /gelap|dark/i }).click().catch(() => {})
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')
  await page.reload()
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')
})
```

(Implementer sesuaikan selektor tombol/menu dengan UI final; inti test: default
ikut OS, pilihan manual tersimpan & bertahan reload, tak ada flash.)

- [ ] **Step 9: Verifikasi**

- `pnpm dev` — cek `/`, `/tokens`, `/en`, `/tidak-ada` (404) di light & dark (via OS setting DAN via toggle). Tidak ada flash putih saat reload dalam dark.
- Kontras: jalankan cek AA untuk semua pasangan token di KEDUA mode; catat rasio di report. Sesuaikan hex bila ada yang < AA.
- `pnpm typecheck` + `pnpm lint` + `pnpm test` + `pnpm test:e2e` + `pnpm build` semua hijau.

- [ ] **Step 10: Commit**

```bash
git add -A
git commit -m "Tambah dark mode + revisi palet ungu/putih + theme toggle"
```

---

## Task 8c: Halaman coming-soon (`/`)

> **DITAMBAHKAN (controller, 2026-08-30) — user directive.** Situs di-deploy ke
> `gmimmusafir.org` sebagai coming-soon SEBELUM Rencana 2. `/` jadi halaman
> "segera hadir" yang layak tayang; nav 7-menu disembunyikan (halamannya belum
> ada).

**Files:**
- Modify: `src/routes/index.tsx` (jadi halaman coming-soon)
- Create: `src/config/site.ts` (flag `COMING_SOON` + data statis: alamat, koordinat maps, sosial)
- Modify: `src/components/layout/site-header.tsx` (sembunyikan nav bila `COMING_SOON`), `src/components/layout/site-footer.tsx` (isi link sosial dari `site.ts`)
- Modify: `messages/id.json` + `messages/en.json` (+ key coming-soon)
- Create: `public/hero-poster.jpg` (placeholder/gradient) — video asli menyusul dari user
- Create test: `tests/e2e/coming-soon.spec.ts`

**Interfaces:**
- Produces: `SITE` config obyek dari `@/config/site` — `{ comingSoon: boolean, address, mapsUrl, facebookUrl, ... }`.

- [ ] **Step 1: `src/config/site.ts`**

```ts
export const SITE = {
  comingSoon: true, // Rencana 2 set false
  name: 'GMIM Musafir Columbus Ohio',
  address: '895 Old Diley Road, Columbus, Ohio',
  mapsUrl: 'https://www.google.com/maps/search/?api=1&query=895+Old+Diley+Road+Columbus+Ohio',
  facebookUrl: 'https://www.facebook.com/gmimmusafir.columbus/',
  hero: {
    poster: '/hero/hero-poster.jpg',
    sources: [{ src: '/hero/hero.mp4', type: 'video/mp4' }],
  },
} as const
```

> Video sudah ada & di-commit (`5e7affd`): `public/hero/hero.mp4` (1.9MB, 16s
> loop, no audio) + `public/hero/hero-poster.jpg`. Fallback gradient tetap
> dibuat untuk `prefers-reduced-motion` / gagal load.

- [ ] **Step 2: `index.tsx` — coming-soon**

Layout:
- `<section>` hero full-viewport-height (`min-h-[100svh]`):
  - Background: `<video ref autoPlay loop muted playsInline preload="metadata" poster={SITE.hero.poster}>` dengan `<source src="/hero/hero.mp4" type="video/mp4">`. `object-cover`, `absolute inset-0`, di belakang scrim. Bila `SITE.hero.sources` kosong (tak akan terjadi sekarang) → gradient ungu fallback.
  - Scrim overlay: gradient gelap semi-transparan (`pointer-events-none`) supaya teks kebaca di kedua tema (dark lebih pekat).
  - Konten tengah: `<Logo variant="full" />` (di medali terang bila dark), `<h1>` `SITE.name`, `<p>` tagline (`m.coming_soon_tagline()`), `<p>` `m.coming_soon_body()`, alamat + link Maps, tombol Facebook (bila `SITE.facebookUrl` != '').
- **Kontrol suara — tombol kanan-bawah hero** (`absolute bottom-4 right-4 z-20`, ≥44px):
  - Video punya audio track (sudah di-transcode). Autoplay HARUS `muted` (kebijakan browser) — jadi video jalan sebagai background bisu.
  - Tombol = toggle **suara on/off**: klik → `videoRef.current.muted = !muted` + `setMuted`. Saat unmute, panggil `.play()` (defensif). State `muted` via `useState(true)`.
  - Ikon inline SVG: speaker-with-waves (suara on) / speaker-muted (suara off). `<button aria-label={m.coming_soon_sound_on()/off()}>` + `aria-pressed={!muted}`.
  - `prefers-reduced-motion: reduce` → video TIDAK autoplay (render `poster` saja via tidak set `autoPlay`, atau `.pause()` di effect); tombol jadi **play/pause + sound** — klik pertama `.play()` (unmuted, karena ini gestur user). Label ikut menyesuaikan (play ▶ / pause ⏸).
  - SSR-safe: `videoRef` + `useEffect`; jangan sentuh `window`/`videoRef` saat render server.
- Meta: `<title>` + OG description "segera hadir".
- Semua teks via `m.*` (id/en).

- [ ] **Step 3: Header coming-soon mode**

`site-header.tsx` — bila `SITE.comingSoon`: render hanya `<Logo>` + `<LanguageSwitcher>` + `<ThemeToggle>`. Sembunyikan 7 nav link + CTA. Bila `false` (Rencana 2): perilaku penuh seperti sekarang.

- [ ] **Step 4: Footer**

`site-footer.tsx` — isi link sosial dari `SITE.facebookUrl` (sembunyikan bila kosong). Alamat dari `SITE.address`.

- [ ] **Step 5: Pesan i18n**

`coming_soon_tagline`, `coming_soon_body`, `coming_soon_facebook` (id "Ikuti kami di Facebook" / en "Follow us on Facebook"), `coming_soon_maps` (id "Lihat peta" / en "View map"), `coming_soon_sound_on` (id "Nyalakan suara" / en "Unmute"), `coming_soon_sound_off` (id "Matikan suara" / en "Mute"). Tagline: placeholder (id: "Bertumbuh bersama dalam kasih Kristus di perantauan." / en: "Growing together in the love of Christ.") — user bisa ganti nanti. `coming_soon_body`: id "Website resmi jemaat sedang dalam pembangunan. Segera hadir." / en "The congregation's official website is under construction. Coming soon."

- [ ] **Step 6: e2e `tests/e2e/coming-soon.spec.ts`**

- `/` menampilkan `SITE.name` di `<h1>`, alamat, pesan coming-soon.
- Nav 7-menu TIDAK terlihat (`getByRole('link', { name: /jadwal|pelayanan/i })` → not visible).
- `<video>` ada atau fallback gradient ada.
- `/en` → versi Inggris.
- Update `smoke.spec.ts` bila asersinya bentrok dgn nav yang kini disembunyikan.

- [ ] **Step 7: Verifikasi**

`pnpm dev` cek `/` + `/en` di light & dark, mobile & desktop. `pnpm build` + semua command hijau. Lighthouse cepat (video tidak boleh bikin LCP parah — poster + `preload="none"` bila perlu).

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "Halaman coming-soon + sembunyikan nav (SITE.comingSoon)"
```

---

## Task 9: better-auth + schema auth

**Files:**
- Create: `src/lib/auth.ts`, `src/lib/auth-client.ts`, `src/lib/auth.functions.ts`, `src/routes/api/auth/$.ts`, `src/db/schema/auth.ts` (di-generate)
- Modify: `src/db/schema/index.ts`

**Interfaces:**
- Consumes: `db` (Task 8).
- Produces: `auth` (server) dari `@/lib/auth`; `authClient` dari `@/lib/auth-client`; server fn `getSession()` → `{ user, session } | null` dan `ensureAdmin()` → `{ user }` (throw `redirect` ke `/admin/login` bila tidak ada sesi).

- [ ] **Step 1: Install**

```bash
pnpm add better-auth
```

- [ ] **Step 2: `src/lib/auth.ts`**

```ts
import { betterAuth } from 'better-auth'
import { drizzleAdapter } from 'better-auth/adapters/drizzle'
import { reactStartCookies } from 'better-auth/react-start'
import { db } from '@/db'
import { env } from '@/lib/env'

export const auth = betterAuth({
  baseURL: env.BETTER_AUTH_URL,
  secret: env.BETTER_AUTH_SECRET,
  database: drizzleAdapter(db, { provider: 'pg' }),
  emailAndPassword: {
    enabled: true,
    disableSignUp: true, // admin dibuat lewat seed, bukan pendaftaran publik
  },
  plugins: [reactStartCookies()], // WAJIB plugin terakhir
})
```

> Verifikasi nama impor terhadap dokumen terpasang: <https://www.better-auth.com/docs/integrations/tanstack>. Jika `better-auth/react-start` / `reactStartCookies` berbeda (mis. `tanstackStartCookies` dari `better-auth/tanstack-start`), pakai yang sesuai versi terpasang.

- [ ] **Step 3: Generate schema auth**

```bash
pnpm dlx @better-auth/cli@latest generate --output src/db/schema/auth.ts
```
Expected: file `src/db/schema/auth.ts` berisi tabel `user`, `session`, `account`, `verification` (Drizzle pg). Tambah kolom `role` & `isActive` ke tabel `user`:
```ts
role: text('role').notNull().default('admin'),
isActive: boolean('is_active').notNull().default(true),
```
(Tambahan ini juga dideklarasikan ke better-auth via `user.additionalFields` bila diperlukan untuk tipe — cek dokumen.)

- [ ] **Step 4: `src/db/schema/index.ts` re-export**

```ts
export * from './auth'
// worship / content / site ditambah di Task 10
```

- [ ] **Step 5: API handler `src/routes/api/auth/$.ts`**

```ts
import { auth } from '@/lib/auth'
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/api/auth/$')({
  server: {
    handlers: {
      GET: ({ request }) => auth.handler(request),
      POST: ({ request }) => auth.handler(request),
    },
  },
})
```

- [ ] **Step 6: `src/lib/auth-client.ts`**

```ts
import { createAuthClient } from 'better-auth/react'

export const authClient = createAuthClient()
export const { signIn, signOut, useSession } = authClient
```

- [ ] **Step 7: `src/lib/auth.functions.ts`**

```ts
import { createServerFn } from '@tanstack/react-start'
import { getRequestHeaders } from '@tanstack/react-start/server'
import { redirect } from '@tanstack/react-router'
import { auth } from '@/lib/auth'

export const getSession = createServerFn({ method: 'GET' }).handler(async () => {
  return auth.api.getSession({ headers: getRequestHeaders() })
})

export const ensureAdmin = createServerFn({ method: 'GET' }).handler(async () => {
  const session = await auth.api.getSession({ headers: getRequestHeaders() })
  if (!session?.user || session.user.role !== 'admin' || session.user.isActive === false) {
    throw redirect({ to: '/admin/login' })
  }
  return { user: session.user }
})
```

- [ ] **Step 8: Migrasi & verifikasi (didetailkan di Task 11 — di sini cukup generate)**

Run: `pnpm db:generate`
Expected: file migrasi baru di `drizzle/` memuat tabel auth. Jangan `migrate` dulu (tunggu Task 11 setelah schema domain lengkap, supaya satu migrasi awal rapi). Jika executor lebih suka bertahap, `pnpm db:migrate` di sini juga boleh.

- [ ] **Step 9: Typecheck**

Run: `pnpm typecheck` → 0 error.

- [ ] **Step 10: Commit**

```bash
git add -A
git commit -m "Setup better-auth + schema auth (email+password, disableSignUp)"
```

---

## Task 10: Schema domain (worship, content, site)

**Files:**
- Create: `src/db/schema/worship.ts`, `src/db/schema/content.ts`, `src/db/schema/site.ts`
- Modify: `src/db/schema/index.ts`
- Create: `src/db/schema/_helpers.ts` (kolom umum)

**Interfaces:**
- Produces: tabel & tipe Drizzle: `worshipCategories`, `kolom`, `scheduleTemplates`, `worshipServices`, `bulletins`, `devotionals`, `galleryAlbums`, `galleryItems`, `contactMessages`, `siteSettings`. Enum: `worshipCategoryKey`, `locationType` (`gedung_gereja` | `rumah`), `publishStatus` (`draft` | `published`), `contactStatus` (`new` | `read` | `done`), `galleryItemType` (`image` | `youtube`).

- [ ] **Step 1: `src/db/schema/_helpers.ts`**

```ts
import { sql } from 'drizzle-orm'
import { timestamp, uuid } from 'drizzle-orm/pg-core'

export const idPk = () => uuid('id').primaryKey().default(sql`gen_random_uuid()`)
export const timestamps = {
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}
```

- [ ] **Step 2: `src/db/schema/worship.ts`**

```ts
import { relations } from 'drizzle-orm'
import {
  pgEnum, pgTable, text, uuid, integer, boolean, date, time, index, uniqueIndex,
} from 'drizzle-orm/pg-core'
import { idPk, timestamps } from './_helpers'

export const worshipCategoryKey = pgEnum('worship_category_key', [
  'ibadah_jemaat', 'kaum_bapa', 'kaum_ibu', 'pemuda_remaja', 'sekolah_minggu', 'kolom',
])
export const locationType = pgEnum('location_type', ['gedung_gereja', 'rumah'])
export const publishStatus = pgEnum('publish_status', ['draft', 'published'])

export const worshipCategories = pgTable('worship_categories', {
  id: idPk(),
  key: worshipCategoryKey('key').notNull().unique(),
  nameId: text('name_id').notNull(),
  nameEn: text('name_en').notNull(),
  slug: text('slug').notNull().unique(),
  color: text('color').notNull(),
  sortOrder: integer('sort_order').notNull().default(0),
  ...timestamps,
})

export const kolom = pgTable('kolom', {
  id: idPk(),
  name: text('name').notNull(),
  number: integer('number').notNull(),
  coordinatorName: text('coordinator_name'),
  coordinatorPhone: text('coordinator_phone'),
  isActive: boolean('is_active').notNull().default(true),
  ...timestamps,
})

export const scheduleTemplates = pgTable('schedule_templates', {
  id: idPk(),
  categoryId: uuid('category_id').notNull().references(() => worshipCategories.id),
  kolomId: uuid('kolom_id').references(() => kolom.id),
  dayOfWeek: integer('day_of_week').notNull(), // 0=Minggu..6=Sabtu
  startTime: time('start_time').notNull(),
  endTime: time('end_time'),
  defaultLocationType: locationType('default_location_type').notNull(),
  isActive: boolean('is_active').notNull().default(true),
  ...timestamps,
})

export const worshipServices = pgTable('worship_services', {
  id: idPk(),
  categoryId: uuid('category_id').notNull().references(() => worshipCategories.id),
  kolomId: uuid('kolom_id').references(() => kolom.id),
  templateId: uuid('template_id').references(() => scheduleTemplates.id),
  serviceDate: date('service_date').notNull(),          // Eastern wall-clock
  startTime: time('start_time').notNull(),               // Eastern wall-clock
  endTime: time('end_time'),
  locationType: locationType('location_type').notNull(),
  hostFamilyName: text('host_family_name'),
  hostAddress: text('host_address'),
  locationNote: text('location_note'),
  themeId: text('theme_id'),
  themeEn: text('theme_en'),
  bibleReading: text('bible_reading'),
  preacherName: text('preacher_name'),
  liturgistName: text('liturgist_name'),
  liturgyPdfUrl: text('liturgy_pdf_url'),
  status: publishStatus('status').notNull().default('draft'),
  ...timestamps,
}, (t) => [
  index('ws_service_date_idx').on(t.serviceDate),
  index('ws_category_date_idx').on(t.categoryId, t.serviceDate),
  index('ws_status_date_idx').on(t.status, t.serviceDate),
  uniqueIndex('ws_template_date_uq').on(t.templateId, t.serviceDate),
])

export const worshipCategoriesRelations = relations(worshipCategories, ({ many }) => ({
  services: many(worshipServices),
  templates: many(scheduleTemplates),
}))
export const worshipServicesRelations = relations(worshipServices, ({ one }) => ({
  category: one(worshipCategories, { fields: [worshipServices.categoryId], references: [worshipCategories.id] }),
  kolom: one(kolom, { fields: [worshipServices.kolomId], references: [kolom.id] }),
  template: one(scheduleTemplates, { fields: [worshipServices.templateId], references: [scheduleTemplates.id] }),
}))
```

> Catatan: `uniqueIndex` pada `(templateId, serviceDate)` — karena `templateId` nullable, Postgres memperlakukan NULL sebagai distinct sehingga entri manual (tanpa template) tidak saling bentrok. Ini yang diinginkan (idempotensi hanya untuk hasil generate).

- [ ] **Step 3: `src/db/schema/content.ts`**

```ts
import { relations } from 'drizzle-orm'
import { pgEnum, pgTable, text, uuid, integer, date, check } from 'drizzle-orm/pg-core'
import { sql } from 'drizzle-orm'
import { idPk, timestamps } from './_helpers'
import { publishStatus } from './worship'

export const galleryItemType = pgEnum('gallery_item_type', ['image', 'youtube'])

export const bulletins = pgTable('bulletins', {
  id: idPk(),
  weekDate: date('week_date').notNull(),
  titleId: text('title_id').notNull(),
  titleEn: text('title_en').notNull(),
  summaryId: text('summary_id').notNull(),
  summaryEn: text('summary_en').notNull(),
  bodyId: text('body_id'),   // HTML tersanitasi (Rencana 3)
  bodyEn: text('body_en'),
  pdfUrl: text('pdf_url'),
  status: publishStatus('status').notNull().default('draft'),
  ...timestamps,
}, (t) => [
  check('bulletin_has_content', sql`${t.pdfUrl} is not null or ${t.bodyId} is not null`),
])

export const devotionals = pgTable('devotionals', {
  id: idPk(),
  slug: text('slug').notNull().unique(),
  titleId: text('title_id').notNull(),
  titleEn: text('title_en').notNull(),
  authorName: text('author_name').notNull(),
  publishedDate: date('published_date').notNull(),
  coverImageUrl: text('cover_image_url'),
  excerptId: text('excerpt_id').notNull(),
  excerptEn: text('excerpt_en').notNull(),
  bodyId: text('body_id').notNull(),
  bodyEn: text('body_en').notNull(),
  status: publishStatus('status').notNull().default('draft'),
  ...timestamps,
})

export const galleryAlbums = pgTable('gallery_albums', {
  id: idPk(),
  titleId: text('title_id').notNull(),
  titleEn: text('title_en').notNull(),
  albumDate: date('album_date').notNull(),
  coverImageUrl: text('cover_image_url'),
  sortOrder: integer('sort_order').notNull().default(0),
  status: publishStatus('status').notNull().default('draft'),
  ...timestamps,
})

export const galleryItems = pgTable('gallery_items', {
  id: idPk(),
  albumId: uuid('album_id').notNull().references(() => galleryAlbums.id, { onDelete: 'cascade' }),
  type: galleryItemType('type').notNull(),
  imageUrl: text('image_url'),
  youtubeUrl: text('youtube_url'),
  captionId: text('caption_id'),
  captionEn: text('caption_en'),
  sortOrder: integer('sort_order').notNull().default(0),
  ...timestamps,
})

export const galleryAlbumsRelations = relations(galleryAlbums, ({ many }) => ({
  items: many(galleryItems),
}))
export const galleryItemsRelations = relations(galleryItems, ({ one }) => ({
  album: one(galleryAlbums, { fields: [galleryItems.albumId], references: [galleryAlbums.id] }),
}))
```

- [ ] **Step 4: `src/db/schema/site.ts`**

```ts
import { pgEnum, pgTable, text, jsonb } from 'drizzle-orm/pg-core'
import { idPk, timestamps } from './_helpers'
import { user } from './auth'

export const contactStatus = pgEnum('contact_status', ['new', 'read', 'done'])

export const contactMessages = pgTable('contact_messages', {
  id: idPk(),
  name: text('name').notNull(),
  email: text('email').notNull(),
  phone: text('phone'),
  message: text('message').notNull(),
  status: contactStatus('status').notNull().default('new'),
  ...timestamps,
})

export const siteSettings = pgTable('site_settings', {
  key: text('key').primaryKey(),
  value: jsonb('value').notNull(),
  updatedBy: text('updated_by').references(() => user.id),
  ...timestamps,
})
```

> **Terverifikasi di Task 9:** tabel user diekspor sebagai `user` (singular), kolom `id` = `text('id').primaryKey()` (BUKAN uuid). `import { user } from './auth'` + `updatedBy: text('updated_by').references(() => user.id)` di atas SUDAH BENAR.

- [ ] **Step 5: `src/db/schema/index.ts`**

```ts
export * from './auth'
export * from './worship'
export * from './content'
export * from './site'
```

- [ ] **Step 6: Typecheck**

Run: `pnpm typecheck` → 0 error.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "Tambah schema domain: worship, content, site"
```

---

## Task 11: Migrasi awal + verifikasi di Neon

**Files:**
- Create: `drizzle/0000_*.sql` (generated)

- [ ] **Step 1: Generate migrasi**

Run: `pnpm db:generate`
Expected: satu berkas migrasi baru mencakup semua enum & tabel (auth + domain). Buka file, periksa: 10 tabel domain + 4 tabel auth, enum, index `ws_*`, constraint `bulletin_has_content`.

- [ ] **Step 2: Terapkan ke Neon**

Run: `pnpm db:migrate`
Expected: sukses tanpa error.

- [ ] **Step 3: Verifikasi tabel**

Run: `pnpm db:studio` (buka Drizzle Studio) atau `pnpm tsx` skrip cepat `select table_name from information_schema.tables where table_schema='public'`.
Expected: seluruh tabel ada.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "Migrasi database awal"
```

---

## Task 12: Seed data — kategori, kolom, settings, admin

> **REVISI (Task 9 finding):** `disableSignUp: true` juga memblok
> `auth.api.signUpEmail` server-side (throw di handler yang sama). Jadi
> `src/db/seed/admin.ts` TIDAK bisa pakai `auth.api.signUpEmail`. Ganti:
> pakai `auth.$context` → `const ctx = await auth.$context; const hash = await
> ctx.password.hash(password); await ctx.internalAdapter.createUser({...});
> await ctx.internalAdapter.linkAccount({ providerId: 'credential', accountId:
> <userId>, userId: <userId>, password: hash })`. Set `role: 'admin'`,
> `isActive: true` (via createUser data atau update setelahnya). Verifikasi
> nama method `internalAdapter` terhadap better-auth 1.7.2 terpasang.

**Files:**
- Create: `src/db/seed/categories.ts`, `src/db/seed/kolom.ts`, `src/db/seed/settings.ts`, `src/db/seed/admin.ts`, `src/db/seed/index.ts`
- Create test: `tests/unit/seed-data.test.ts`

**Interfaces:**
- Consumes: `db`, schema (Task 10), `auth` (Task 9).
- Produces: `pnpm db:seed` (idempoten: kategori + kolom + settings) & `pnpm seed:admin` (buat/reset admin dari env).

- [ ] **Step 1: Data kategori (konstanta, diuji)**

`src/db/seed/categories.ts`:
```ts
import { db } from '@/db'
import { worshipCategories } from '@/db/schema'
import { sql } from 'drizzle-orm'

export const WORSHIP_CATEGORIES = [
  { key: 'ibadah_jemaat', nameId: 'Ibadah Jemaat', nameEn: 'Congregational Service', slug: 'ibadah-jemaat', color: 'var(--color-cat-jemaat)', sortOrder: 1 },
  { key: 'kaum_bapa', nameId: 'Pria/Kaum Bapa', nameEn: "Men's Fellowship", slug: 'kaum-bapa', color: 'var(--color-cat-bapa)', sortOrder: 2 },
  { key: 'kaum_ibu', nameId: 'Wanita/Kaum Ibu', nameEn: "Women's Fellowship", slug: 'kaum-ibu', color: 'var(--color-cat-ibu)', sortOrder: 3 },
  { key: 'pemuda_remaja', nameId: 'Pemuda & Remaja', nameEn: 'Youth & Teens', slug: 'pemuda-remaja', color: 'var(--color-cat-pemuda)', sortOrder: 4 },
  { key: 'sekolah_minggu', nameId: 'Anak Sekolah Minggu', nameEn: 'Sunday School', slug: 'sekolah-minggu', color: 'var(--color-cat-sekolah-minggu)', sortOrder: 5 },
  { key: 'kolom', nameId: 'Kolom', nameEn: 'Kolom (Zone)', slug: 'kolom', color: 'var(--color-cat-kolom)', sortOrder: 6 },
] as const

export async function seedCategories() {
  for (const c of WORSHIP_CATEGORIES) {
    await db.insert(worshipCategories).values(c)
      .onConflictDoUpdate({ target: worshipCategories.key, set: { nameId: c.nameId, nameEn: c.nameEn, slug: c.slug, color: c.color, sortOrder: c.sortOrder } })
  }
}
```

- [ ] **Step 2: Kolom placeholder**

`src/db/seed/kolom.ts`:
```ts
import { db } from '@/db'
import { kolom } from '@/db/schema'

export const PLACEHOLDER_KOLOM = [1, 2, 3, 4].map((n) => ({ name: `Kolom ${n}`, number: n }))

export async function seedKolom() {
  const existing = await db.$count(kolom)
  if (existing > 0) return
  await db.insert(kolom).values(PLACEHOLDER_KOLOM)
}
```

- [ ] **Step 3: Default site settings**

`src/db/seed/settings.ts`:
```ts
import { db } from '@/db'
import { siteSettings } from '@/db/schema'

export const DEFAULT_SETTINGS: Record<string, unknown> = {
  hero: {
    titleId: 'Selamat Datang di GMIM Musafir Columbus Ohio',
    titleEn: 'Welcome to GMIM Musafir Columbus Ohio',
    taglineId: 'Bertumbuh bersama dalam kasih Kristus di perantauan.',
    taglineEn: 'Growing together in the love of Christ.',
    image: '',
  },
  service_times: {
    id: 'Ibadah Jemaat: Minggu, 10.00 (Waktu Eastern) di Gedung Gereja.',
    en: 'Congregational Service: Sunday, 10:00 AM (Eastern) at the church building.',
  },
  contact_info: {
    phone: '', email: '', officeHoursId: '', officeHoursEn: '',
    mapsUrl: 'https://maps.google.com/?q=895+Old+Diley+Road+Columbus+Ohio',
    lat: null, lng: null,
  },
  social_links: { facebook: 'https://www.facebook.com/', instagram: '', youtube: '' },
  pastoral_contacts: {},
  live_stream: { isLive: false, url: '', archiveUrl: '' },
  giving_info: { accounts: [], noteId: '', noteEn: '' },
}

export async function seedSettings() {
  for (const [key, value] of Object.entries(DEFAULT_SETTINGS)) {
    await db.insert(siteSettings).values({ key, value })
      .onConflictDoNothing({ target: siteSettings.key })
  }
}
```

- [ ] **Step 4: Runner `src/db/seed/index.ts`**

```ts
import 'dotenv/config'
import { seedCategories } from './categories'
import { seedKolom } from './kolom'
import { seedSettings } from './settings'

async function main() {
  await seedCategories()
  await seedKolom()
  await seedSettings()
  console.log('Seed selesai.')
  process.exit(0)
}
main().catch((e) => { console.error(e); process.exit(1) })
```

- [ ] **Step 5: Script admin `src/db/seed/admin.ts`**

```ts
import 'dotenv/config'
import { auth } from '@/lib/auth'
import { db } from '@/db'
import { user } from '@/db/schema'
import { eq } from 'drizzle-orm'

async function main() {
  const email = process.env.SEED_ADMIN_EMAIL
  const password = process.env.SEED_ADMIN_PASSWORD
  if (!email || !password) throw new Error('SEED_ADMIN_EMAIL & SEED_ADMIN_PASSWORD wajib diisi')

  const existing = await db.select().from(user).where(eq(user.email, email))
  if (existing.length > 0) {
    console.log('Admin sudah ada:', email)
    process.exit(0)
  }
  // buat lewat better-auth agar hash password konsisten
  await auth.api.signUpEmail({ body: { email, password, name: 'Administrator' } })
  await db.update(user).set({ role: 'admin', isActive: true }).where(eq(user.email, email))
  console.log('Admin dibuat:', email)
  process.exit(0)
}
main().catch((e) => { console.error(e); process.exit(1) })
```

> `disableSignUp: true` di Task 9 memblok endpoint publik `/api/auth/sign-up`, tapi `auth.api.signUpEmail` server-side tetap bisa dipakai. Bila versi better-auth memblok juga jalur API internal, buat user langsung: insert ke `user` + `account` dengan hash dari `auth.$context` password hasher. Cek dokumen bila perlu.

- [ ] **Step 6: Test data seed (Vitest, tanpa DB)**

`tests/unit/seed-data.test.ts`:
```ts
import { describe, it, expect } from 'vitest'
import { WORSHIP_CATEGORIES } from '@/db/seed/categories'

describe('WORSHIP_CATEGORIES', () => {
  it('punya tepat 6 kategori dengan key unik', () => {
    expect(WORSHIP_CATEGORIES).toHaveLength(6)
    const keys = new Set(WORSHIP_CATEGORIES.map((c) => c.key))
    expect(keys.size).toBe(6)
  })
  it('slug unik dan url-safe', () => {
    const slugs = WORSHIP_CATEGORIES.map((c) => c.slug)
    expect(new Set(slugs).size).toBe(slugs.length)
    for (const s of slugs) expect(s).toMatch(/^[a-z0-9-]+$/)
  })
  it('setiap kategori punya nama id & en', () => {
    for (const c of WORSHIP_CATEGORIES) {
      expect(c.nameId.length).toBeGreaterThan(0)
      expect(c.nameEn.length).toBeGreaterThan(0)
    }
  })
})
```

- [ ] **Step 7: Jalankan test lalu seed**

Run: `pnpm test` → lolos.
Run: `pnpm db:seed` → "Seed selesai."
Run: `pnpm seed:admin` (pastikan `SEED_ADMIN_*` di `.env`) → "Admin dibuat".
Verifikasi lewat `pnpm db:studio`: 6 kategori, 4 kolom, 7 setting, 1 user.

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "Tambah seed: kategori ibadah, kolom, site settings, admin"
```

---

## Task 13: Helper zona waktu `src/lib/datetime.ts` (TDD)

**Files:**
- Create: `src/lib/datetime.ts`
- Create test: `tests/unit/datetime.test.ts`
- Modify: `package.json` (dep)

**Interfaces:**
- Produces:
  - `EASTERN = 'America/New_York'`
  - `toInstant(serviceDate: string, startTime: string): Date` — gabung `YYYY-MM-DD` + `HH:mm[:ss]` sebagai wall-clock Eastern → `Date` (instant UTC yang benar, memperhitungkan DST).
  - `formatServiceDateTime(serviceDate: string, startTime: string, locale: 'id' | 'en'): string` — mis. `"Minggu, 31 Agustus 2026 · 10.00"` (id) / `"Sunday, 31 August 2026 · 10:00 AM"` (en).
  - `formatDateLong(serviceDate: string, locale: 'id' | 'en'): string`
  - `isoWeekStart(date: string): string` — Senin dari minggu yang memuat `date` (untuk tampilan mingguan).
  - `datesForWeekday(fromISO: string, toISO: string, dayOfWeek: number): string[]` — semua tanggal `YYYY-MM-DD` di rentang inklusif yang jatuh pada `dayOfWeek` (0=Minggu). Dipakai generator template (Rencana 3) — didefinisikan & diuji di sini karena logika tanggal murni.

- [ ] **Step 1: Install date lib**

```bash
pnpm add @date-fns/tz date-fns
```
(`@date-fns/tz` menyediakan `TZDate` untuk konversi zona waktu yang benar tanpa data besar.)

- [ ] **Step 2: Tulis test yang gagal dulu**

`tests/unit/datetime.test.ts`:
```ts
import { describe, it, expect } from 'vitest'
import {
  toInstant, formatServiceDateTime, formatDateLong, isoWeekStart, datesForWeekday,
} from '@/lib/datetime'

describe('toInstant', () => {
  it('menafsirkan waktu sebagai wall-clock Eastern (musim panas, EDT = UTC-4)', () => {
    // 31 Agu 2026 10:00 Eastern = 14:00 UTC
    expect(toInstant('2026-08-31', '10:00').toISOString()).toBe('2026-08-31T14:00:00.000Z')
  })
  it('memperhitungkan musim dingin (EST = UTC-5)', () => {
    // 4 Jan 2026 10:00 Eastern = 15:00 UTC
    expect(toInstant('2026-01-04', '10:00').toISOString()).toBe('2026-01-04T15:00:00.000Z')
  })
  it('menerima HH:mm:ss', () => {
    expect(toInstant('2026-08-31', '18:30:00').toISOString()).toBe('2026-08-31T22:30:00.000Z')
  })
})

describe('formatServiceDateTime', () => {
  it('format Indonesia', () => {
    expect(formatServiceDateTime('2026-08-31', '10:00', 'id')).toBe('Senin, 31 Agustus 2026 · 10.00')
  })
  it('format Inggris', () => {
    expect(formatServiceDateTime('2026-08-31', '10:00', 'en')).toBe('Monday, 31 August 2026 · 10:00 AM')
  })
})

describe('formatDateLong', () => {
  it('id', () => {
    expect(formatDateLong('2026-08-31', 'id')).toBe('Senin, 31 Agustus 2026')
  })
})

describe('isoWeekStart', () => {
  it('mengembalikan Senin untuk tanggal di tengah minggu', () => {
    // 2026-08-31 adalah Senin
    expect(isoWeekStart('2026-09-02')).toBe('2026-08-31')
  })
  it('idempoten untuk hari Senin', () => {
    expect(isoWeekStart('2026-08-31')).toBe('2026-08-31')
  })
})

describe('datesForWeekday', () => {
  it('semua hari Minggu dalam September 2026', () => {
    expect(datesForWeekday('2026-09-01', '2026-09-30', 0)).toEqual([
      '2026-09-06', '2026-09-13', '2026-09-20', '2026-09-27',
    ])
  })
  it('rentang inklusif di kedua ujung', () => {
    expect(datesForWeekday('2026-09-06', '2026-09-13', 0)).toEqual(['2026-09-06', '2026-09-13'])
  })
  it('rentang tanpa kecocokan mengembalikan array kosong', () => {
    expect(datesForWeekday('2026-09-07', '2026-09-12', 0)).toEqual([])
  })
})
```

- [ ] **Step 3: Jalankan test — pastikan gagal**

Run: `pnpm vitest run tests/unit/datetime.test.ts`
Expected: FAIL (module `@/lib/datetime` belum ada).

- [ ] **Step 4: Implementasi minimal**

`src/lib/datetime.ts`:
```ts
import { TZDate } from '@date-fns/tz'

export const EASTERN = 'America/New_York'

function parseTime(t: string): [number, number, number] {
  const [h, m, s] = t.split(':').map(Number)
  return [h ?? 0, m ?? 0, s ?? 0]
}

export function toInstant(serviceDate: string, startTime: string): Date {
  const [y, mo, d] = serviceDate.split('-').map(Number)
  const [h, mi, se] = parseTime(startTime)
  // Buat TZDate pada wall-clock Eastern, lalu ambil instant-nya.
  const zoned = new TZDate(y, mo - 1, d, h, mi, se, EASTERN)
  return new Date(zoned.getTime())
}

const DOW_ID = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu']
const MONTH_ID = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember']

function ymd(serviceDate: string): [number, number, number] {
  const [y, m, d] = serviceDate.split('-').map(Number)
  return [y, m, d]
}
function weekdayIndex(serviceDate: string): number {
  const [y, m, d] = ymd(serviceDate)
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay()
}

export function formatDateLong(serviceDate: string, locale: 'id' | 'en'): string {
  const [y, m, d] = ymd(serviceDate)
  if (locale === 'id') return `${DOW_ID[weekdayIndex(serviceDate)]}, ${d} ${MONTH_ID[m - 1]} ${y}`
  return new Intl.DateTimeFormat('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
    .format(new Date(Date.UTC(y, m - 1, d)))
}

export function formatServiceDateTime(serviceDate: string, startTime: string, locale: 'id' | 'en'): string {
  const [h, mi] = parseTime(startTime)
  if (locale === 'id') {
    const hh = String(h).padStart(2, '0')
    const mm = String(mi).padStart(2, '0')
    return `${formatDateLong(serviceDate, 'id')} · ${hh}.${mm}`
  }
  const t = new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
    .format(new Date(Date.UTC(2000, 0, 1, h, mi)))
  return `${formatDateLong(serviceDate, 'en')} · ${t}`
}

export function isoWeekStart(serviceDate: string): string {
  const [y, m, d] = ymd(serviceDate)
  const dt = new Date(Date.UTC(y, m - 1, d))
  const dow = dt.getUTCDay() // 0=Minggu
  const diff = (dow + 6) % 7 // jarak ke Senin
  dt.setUTCDate(dt.getUTCDate() - diff)
  return dt.toISOString().slice(0, 10)
}

export function datesForWeekday(fromISO: string, toISO: string, dayOfWeek: number): string[] {
  const out: string[] = []
  const [fy, fm, fd] = ymd(fromISO)
  const [ty, tm, td] = ymd(toISO)
  const cur = new Date(Date.UTC(fy, fm - 1, fd))
  const end = new Date(Date.UTC(ty, tm - 1, td))
  while (cur <= end) {
    if (cur.getUTCDay() === dayOfWeek) out.push(cur.toISOString().slice(0, 10))
    cur.setUTCDate(cur.getUTCDate() + 1)
  }
  return out
}
```

- [ ] **Step 5: Jalankan test — pastikan lolos**

Run: `pnpm vitest run tests/unit/datetime.test.ts`
Expected: PASS semua. Jika format `Intl` menghasilkan spasi/urutan berbeda, sesuaikan assertion ATAU implementasi agar konsisten (utamakan output yang deterministik lintas platform — Node ≥ 20 memakai full ICU).

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "Tambah helper zona waktu Eastern (TDD)"
```

---

## Task 14: CI GitHub Actions

**Files:**
- Create: `.github/workflows/ci.yml`

- [ ] **Step 1: Tulis workflow**

```yaml
name: CI
on:
  push:
    branches: [main]
  pull_request:

jobs:
  check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: pnpm
      - run: pnpm install --frozen-lockfile
      - run: pnpm lint
      - run: pnpm typecheck
      - run: pnpm test
      - run: pnpm exec playwright install --with-deps chromium
      - run: pnpm test:e2e
        env:
          DATABASE_URL: ${{ secrets.TEST_DATABASE_URL }}
          BETTER_AUTH_SECRET: ci-secret-ci-secret-ci-secret
          BETTER_AUTH_URL: http://localhost:3000
```

> `pnpm build` (yang men-generate `src/paraglide/` & `routeTree.gen.ts`) dipicu oleh `pnpm dev` di webServer Playwright. Jika `pnpm test` / `pnpm typecheck` butuh file generated lebih dulu, tambah langkah `pnpm exec vite build --mode development` atau `pnpm dlx @inlang/paraglide-js compile` + `pnpm dlx @tanstack/router-cli generate` sebelum lint/typecheck. Sesuaikan saat pertama kali CI merah.

- [ ] **Step 2: Buat Neon branch untuk test**

Di dashboard Neon: buat branch `ci` dari `main`, salin connection string, tambah sebagai secret repo GitHub `TEST_DATABASE_URL`. Jalankan `pnpm db:migrate` sekali terhadap branch itu (lokal, dengan `DATABASE_URL` diarahkan ke branch `ci`).

- [ ] **Step 3: Verifikasi lokal meniru CI**

Run berturut: `pnpm install --frozen-lockfile`, `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm test:e2e`.
Expected: semua hijau.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "Tambah workflow CI (lint, typecheck, unit, e2e)"
```

---

## Task 15: Deploy ke Vercel + README

**Files:**
- Create: `README.md`, `docs/dev/setup.md`

**Interfaces:**
- Produces: URL production yang menayangkan beranda (id) & `/en`.

- [ ] **Step 1: Push ke GitHub**

```bash
git remote add origin git@github.com:<user>/gmim-musafir-web.git
git push -u origin main
```

- [ ] **Step 2: Import di Vercel**

- vercel.com/new → pilih repo.
- Framework preset: biarkan auto (TanStack Start / Nitro terdeteksi zero-config).
- Environment Variables (Production + Preview):
  - `DATABASE_URL` (Neon pooled), `DATABASE_URL_UNPOOLED` (Neon unpooled)
  - `BETTER_AUTH_SECRET` (string acak)
  - `BETTER_AUTH_URL` = URL production (mis. `https://gmim-musafir-web.vercel.app`)
- Deploy.

- [ ] **Step 3: Jalankan migrasi terhadap DB production**

Dari lokal, arahkan `.env` `DATABASE_URL_UNPOOLED` ke Neon **main** (production), lalu:
```bash
pnpm db:migrate
pnpm db:seed
pnpm seed:admin
```
(Atau tambah langkah build Vercel `pnpm db:migrate` — untuk sekarang manual agar terkontrol.)

- [ ] **Step 4: Integrasi Neon–Vercel untuk preview branch**

Pasang integrasi Neon di Vercel (Marketplace) agar tiap Preview Deployment memakai Neon branch otomatis. Verifikasi 1 PR percobaan membuat branch DB.

- [ ] **Step 5: Verifikasi production**

Buka URL production: `/` (Indonesia) & `/en` (Inggris), header/footer tampil, `/_dev/tokens` tampil, `/tidak-ada` → 404.
Cek `/api/auth/ok` atau `/api/auth/session` mengembalikan respons JSON (bukan 500).

- [ ] **Step 6: README + catatan setup**

`README.md`: ringkasan proyek, stack, perintah (`pnpm dev`, `pnpm build`, `pnpm test`, `pnpm db:*`, `pnpm seed:admin`), link ke spec & rencana. `docs/dev/setup.md`: langkah setup Neon + env + seed untuk kontributor baru.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "Tambah README + dokumentasi setup; deploy pertama"
git push
```

---

## Self-Review (diisi saat plan ditulis)

**1. Cakupan spec (Fase 0–1):**

| Item spec | Task |
|---|---|
| Scaffold TanStack Start | 1 |
| Nitro + Vercel | 2, 15 |
| Tailwind v4 + token desain + font | 3 |
| TypeUI / shadcn | 4 |
| Paraglide i18n (id default, /en) | 5 |
| Layout dasar (header/footer/404) | 6 |
| Tooling & CI | 7, 14 |
| Salin logo.png ke public/ | (sudah di repo dari commit spec); favicon di Task 6 |
| Konfirmasi cara install TypeUI | 4 (Step 1) + `docs/dev/komponen-ui.md` |
| Drizzle + koneksi Neon | 8 |
| better-auth + schema auth | 9 |
| Semua schema Drizzle | 10 |
| Migrasi | 11 |
| Seed worship_categories | 12 |
| Script seed:admin | 12 |
| Default site_settings | 12 |
| Placeholder kolom | 12 |
| Helper datetime.ts + unit test | 13 |
| Env vars (§9.1) | 8 (`.env.example`), 15 (Vercel) |
| Deploy flow (§9.2) | 15 |

Catatan: `logo-mark.svg` (mark sederhana) = aset desain manual, dicatat sebagai TODO non-blocking di Task 6 — tidak menghambat rencana.

**2. Placeholder scan:** Tidak ada "TBD/TODO" pada langkah kerja. Beberapa langkah memuat instruksi "verifikasi nama impor terhadap dokumen versi terpasang" — ini disengaja karena API TanStack Start / better-auth / Paraglide bergerak cepat; setiap kasus menyertakan URL dokumen & pola fallback konkret.

**3. Konsistensi tipe:**
- `db` diekspor dari `@/db` (Task 8), dikonsumsi Task 9, 10, 12.
- `worshipServices` kolom `templateId` + `uniqueIndex('ws_template_date_uq')` (Task 10) selaras dengan aturan idempotensi generator (spec §4.3 modul 3, dipakai Rencana 3).
- `datesForWeekday` / `toInstant` (Task 13) = interface yang akan dikonsumsi generator di Rencana 3.
- Enum `publishStatus` didefinisikan di `worship.ts`, diimpor `content.ts` — satu sumber.
- `user` (tabel auth) diimpor `site.ts` untuk FK `siteSettings.updatedBy` — Step 4 Task 10 mengingatkan cek nama (`user` vs `users`).

---

## Handoff

Setelah Rencana 1 selesai & ter-deploy, lanjut ke **Rencana 2 — Situs Publik + Jadwal** (disusun terpisah, menyerap temuan dari Rencana 1: cara pasti TypeUI, ekspor runtime Paraglide, nama API better-auth).

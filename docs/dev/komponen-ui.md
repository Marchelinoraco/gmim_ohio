# Registry Komponen UI

Catatan keputusan Task 4 (Rencana 1 — Fondasi). Menetapkan cara kita menambah
komponen UI ke situs GMIM Musafir Columbus Ohio (TanStack Start + Tailwind v4).

## Temuan tentang TypeUI (typeui.sh)

Dicek pada 2026-08-29 dari environment implementasi:

- **Situs `https://typeui.sh` / `https://www.typeui.sh` tidak bisa diakses.**
  Server (Vercel) membalas `HTTP 429` lalu menyajikan "Vercel Security
  Checkpoint" — challenge anti-bot yang butuh eksekusi JavaScript browser.
  Sudah tidak bisa diakses sejak fase perencanaan (429 persisten).
- **Paket npm `typeui.sh` (v0.7.1, MIT)** memang ada, tetapi **bukan** registry
  komponen. Deskripsinya: _"Generate design system specifications and style
  guides as skill files for AI coding providers"_. Kata kunci: `cli`,
  `design system`, `skills`, `ai`, `claude skills`. Dependensinya hanya
  `zod`, `inquirer`, `commander` (CLI prompt) — tidak ada React, tidak ada
  komponen Tailwind. Ini alat untuk membuat berkas spesifikasi design-system
  bagi agen AI, bukan komponen `.tsx` siap pakai.
- Tidak ditemukan registry URL kompatibel `shadcn` (`npx shadcn add @typeui/...`),
  tidak ada paket komponen React + Tailwind, tidak ada dokumentasi install yang
  bisa dibaca.

## Keputusan: pakai shadcn/ui (fallback)

TypeUI tidak menyediakan jalur install komponen yang jelas maupun kompatibel
Tailwind v4, jadi sesuai brief kita memakai **fallback shadcn/ui**. Ini hasil
yang sudah diantisipasi rencana dan sepenuhnya dapat diterima.

### Cara init registry

`shadcn init` versi 3 kini selalu meminta memilih "preset" (Nova, Vega, dst.) —
tiap preset menimpa palet warna & menulis CSS variable ke file CSS. Kita **tidak**
mau itu: token desain GMIM sudah dirakit di `src/styles/app.css` (Task 3).

Karena itu `components.json` dibuat manual (tanpa menjalankan `init` interaktif),
lalu `shadcn add` dipakai untuk menarik komponen:

```jsonc
// components.json
{
  "$schema": "https://ui.shadcn.com/schema.json",
  "style": "new-york",
  "rsc": false,
  "tsx": true,
  "tailwind": {
    "config": "",
    "css": "src/styles/app.css",
    "baseColor": "neutral",
    "cssVariables": true,
    "prefix": ""
  },
  "aliases": {
    "components": "@/components",
    "utils": "@/lib/utils",
    "ui": "@/components/ui",
    "lib": "@/lib",
    "hooks": "@/hooks"
  },
  "iconLibrary": "lucide"
}
```

```bash
pnpm dlx shadcn@latest add button card    # base = radix (Slot untuk asChild)
```

`shadcn add` hanya membuat `src/components/ui/button.tsx` + `card.tsx` dan
menambah dependency `radix-ui`. Ia **tidak menyentuh `app.css`**. Util `cn()`
dan dependency `class-variance-authority` / `clsx` / `tailwind-merge` (normalnya
ditambah oleh `init`) dipasang manual:

```bash
pnpm add class-variance-authority clsx tailwind-merge
```

### Dependensi yang masuk

| Paket | Versi | Alasan |
| --- | --- | --- |
| `radix-ui` | ^1.6.7 | `Slot` untuk `asChild` pada Button (ditambah `shadcn add`) |
| `class-variance-authority` | ^0.7.1 | varian `cva` pada Button |
| `clsx` | ^2.1.1 | `cn()` |
| `tailwind-merge` | ^3.6.0 | `cn()` (dedup kelas Tailwind) |

Tidak ada `lucide-react`, `tw-animate-css`, atau paket lain — YAGNI.

## Komponen yang ditambahkan

- `cn(...inputs)` — `src/lib/utils.ts` (clsx + tailwind-merge).
- `Button` — `@/components/ui/button` (render `<button>`, dukung `asChild` via
  `radix-ui` `Slot`). `buttonVariants` juga diekspor.
- `Card`, `CardHeader`, `CardTitle`, `CardDescription`, `CardAction`,
  `CardContent`, `CardFooter` — `@/components/ui/card`.

### Penyelarasan Button ke token GMIM

shadcn default memberi varian `default | destructive | outline | secondary |
ghost | link` dan ukuran `xs | sm | default | lg | icon | icon-*`. Dipetakan
ulang ke antarmuka yang diminta rencana:

| Diminta | Isi kelas (semua berbasis token Task 3) |
| --- | --- |
| `variant="primary"` (default) | `bg-primary text-surface hover:bg-primary-hover` |
| `variant="secondary"` | `bg-secondary text-surface hover:bg-secondary-hover` |
| `variant="outline"` | `border border-primary bg-surface text-primary hover:bg-surface-2` |
| `variant="ghost"` | `text-primary hover:bg-surface-2` |
| `size="sm"` | `h-8 px-3` |
| `size="md"` (default) | `h-9 px-4 py-2` (rename dari `default`) |
| `size="lg"` | `h-10 px-6` |

Varian `destructive` & `link` serta ukuran `xs` / `icon*` dihapus (YAGNI —
belum dibutuhkan; bisa ditambah kembali saat perlu). Ring fokus memakai
`ring-secondary/60` (biru royal) menggantikan `ring-ring` bawaan shadcn.
Semua kelas `dark:` dihapus — situs publik light-mode only untuk peluncuran.

### Penyelarasan Card ke token GMIM

`bg-card` → `bg-surface`, `text-card-foreground` → `text-ink`,
`border` → `border border-border`, `rounded-xl` → `rounded`
(`rounded` memetakan ke `var(--radius)` = 0.625rem di proyek ini),
`text-muted-foreground` → `text-muted`. Struktur/behaviour lain dibiarkan
persis bawaan registry.

## Kontras WCAG AA

Pasangan warna baru yang diperkenalkan komponen ini (dihitung dgn rumus WCAG 2.x):

| Pasangan | Rasio | Status |
| --- | --- | --- |
| `text-surface` (putih) di atas `bg-primary` | 12.35:1 | AA/AAA — sudah divetting rencana |
| `text-surface` (putih) di atas `bg-secondary` | 8.58:1 | AA/AAA — sudah divetting rencana |
| `text-primary` (#4a2e1e) di atas `bg-surface` (#fff) — teks ghost/outline | 12.35:1 | AA/AAA ✓ |
| `text-primary` di atas `bg-surface-2` (#f6f0e6) — state hover ghost/outline | 10.89:1 | AA/AAA ✓ |
| `text-muted` (#6f6455) di atas `bg-surface` (#fff) — `CardDescription` | 5.79:1 | AA teks normal ✓ |
| `border-primary` (#4a2e1e) di atas #fff — garis tombol outline | 12.35:1 | ≥ 3:1 (WCAG 1.4.11) ✓ |
| `border-border` (#e4d9c8) di atas #fff — garis `Card` | 1.39:1 | Di bawah 3:1, **tapi dikecualikan**: `Card` wadah non-interaktif, bukan kontrol UI; `shadow-sm` memberi pemisahan tambahan. Sama seperti default shadcn. |

## Menambah komponen TypeUI di masa depan

Bila `typeui.sh` kelak bisa diakses dan ternyata menyediakan registry kompatibel
shadcn: registry tambahan bisa didaftarkan di `components.json` (field
`registries`) lalu `pnpm dlx shadcn@latest add @typeui/<nama>`. Komponen TypeUI
bisa dilapiskan di atas setup shadcn ini tanpa membongkar yang sudah ada —
cukup pastikan tiap komponen baru tetap memakai token GMIM (`app.css`).

# Rencana 1 — selesai. Handoff ke Rencana 2/3

**Tanggal:** 2026-08-30
**Status:** semua task (1–14) selesai, di-review, di-merge ke `master`, `gmimmusafir.org` live sebagai coming-soon.

## Apa yang sudah jadi

| Area | Status |
|---|---|
| Scaffold TanStack Start + Nitro (Vercel), Vite 8, React 19 | ✅ |
| Tailwind v4 + design tokens — **light ungu/putih + dark mode** (toggle: ikut OS + tombol header, anti-flash) | ✅ |
| shadcn/ui (Button, Card) — *TypeUI ternyata bukan component lib* | ✅ |
| i18n Paraglide — `id` default (tanpa prefix), `en` di `/en`. **Strategy `['url','baseLocale']`** — tanpa `cookie`/`preferredLanguage` (URL = satu-satunya sumber locale; cookie sempat menjebak user di English) | ✅ |
| Shell: header (nav digate `SITE.comingSoon`), footer, 404 dwibahasa | ✅ |
| Halaman coming-soon `/` — hero video (`public/hero/hero.mp4`, ada audio) + tombol suara kanan-bawah, reduced-motion → play/pause | ✅ |
| Toolchain: ESLint, Prettier, Vitest, Playwright (2 project: chromium + reduced-motion) | ✅ |
| `src/lib/datetime.ts` — helper zona waktu Eastern (DST-correct), TDD | ✅ |
| Neon Postgres — driver **`pg` (node-postgres) + `@vercel/functions`** (rekomendasi Neon utk Vercel Fluid Compute). Branch `production` + `dev` (lokal) | ✅ |
| better-auth (email+password, `disableSignUp: true`) + Drizzle adapter | ✅ |
| Schema domain: 10 tabel (worship_categories, kolom, schedule_templates, worship_services, bulletins, devotionals, gallery_albums, gallery_items, contact_messages, site_settings) + 4 tabel auth | ✅ |
| Migrasi `0000` + `0001` **diterapkan ke Neon `dev`** (belum ke `production`) | ✅ |
| Seed: 6 kategori ibadah, 4 kolom placeholder, 7 site_settings, akun admin `admin@gmimusafir.org` | ✅ (di `dev`) |
| CI: `.github/workflows/ci.yml` — lint/typecheck/test/e2e tiap PR & push master | ✅ |

## RUNBOOK WAJIB sebelum bangun dashboard admin (Rencana 3)

Jalankan **berurutan**:

1. **Vercel** → Settings → Environment Variables — pastikan untuk scope **Production DAN Preview**:
   - `BETTER_AUTH_URL` = `https://gmimmusafir.org` (persis; BUKAN `*.vercel.app` — dipakai untuk `trustedOrigins` & secure-cookie prefix)
   - `DATABASE_URL`, `DATABASE_URL_UNPOOLED` (Neon `production`), `BETTER_AUTH_SECRET`
2. **Migrasi Neon `production`** (saat ini cuma `dev` yang termigrasi):
   - `.env` `DATABASE_URL_UNPOOLED` → arahkan ke Neon `production` DIRECT url
   - `pnpm db:migrate` → `pnpm db:seed` → `pnpm seed:admin` (pakai `SEED_ADMIN_PASSWORD` yang KUAT & baru di `.env`)
   - `neon checkout dev` untuk balik ke branch dev (dev lokal)
3. **Verifikasi** `POST https://gmimmusafir.org/api/auth/sign-in/email` → 200 dengan kredensial admin, SEBELUM membuat halaman login.
4. `SITE.comingSoon` (`src/config/site.ts`) → set `false` saat halaman publik Rencana 2 siap (mengaktifkan nav 7-menu).

## Utang teknis / catatan untuk Rencana 2–3

| Item | Aksi |
|---|---|
| `ensureAdmin` / `getSession` (`src/lib/auth.functions.ts`) masih top-level `import '@/lib/auth'` | Ubah jadi lazy import saat route `/admin/*` pertama dibuat (kalau tidak, `/admin` 500 saat env salah) |
| `pnpm auth:generate` → menulis `src/db/schema/auth.generated.ts` (bukan `auth.ts`) | Setiap regen: rekonsiliasi manual `user.role`/`user.isActive` + `account.issuer` + unique index `(issuer, account_id)` ke `auth.ts`. `@better-auth/cli` masih 1.4.x, belum emit `issuer` (breaking change 1.7). `tests/unit/auth-schema.test.ts` menjaga invarian ini |
| `worship_categories.color` menyimpan string `var(--color-cat-*)` | Saat kolom ini editable di dashboard Rencana 3 → validasi write cocok `/^var\(--color-cat-[a-z-]+\)$/` atau simpan nama token saja |
| better-auth `rateLimit.storage` default = in-memory (per-lambda di Vercel) | Ganti ke `'database'` saat form login live |
| better-auth endpoint tak terpakai (`/sign-in/social`, `/link-social`, dll.) | Pertimbangkan `disabledPaths` saat dashboard jadi |
| `better-auth` (full) vs `better-auth/minimal` | Full menarik chunk Kysely/sqlite kecil ke server bundle (client bersih). Ganti ke `/minimal` kalau perlu trim |
| Bahasa/tema: hero video 4:3 (`hero.mp4`) — di-crop di desktop lebar | Ganti kalau user kasih video 16:9 |
| `logo.png` 192px PNG 47KB, `logo-mark.svg` belum ada | Minta desainer bikin SVG + mark sederhana |
| `datetime.ts` `parseDate` terima tanggal mustahil (`2026-02-30`) | Layer Zod input form Rencana 2/3 harus reject sebelum sampai helper (kolom Postgres `date`/`time` sudah aman) |

## Referensi

- Spec: `docs/superpowers/specs/2026-08-29-gmim-musafir-website-design.md`
- Plan Rencana 1: `docs/superpowers/plans/2026-08-29-rencana-1-fondasi.md`
- Neon: org `yunita` / project `gmim-musafir` (`late-night-27741746`), region `aws-us-east-2`
- Vercel: project `gmim-ohio` (Hobby), preset Nitro, NS `ns1/ns2.vercel-dns.com`

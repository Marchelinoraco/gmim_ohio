# Rencana 3 — Dashboard Admin

**Tanggal:** 2026-09-07
**Status:** disetujui untuk implementasi
**Konteks:** situs publik live di `gmimmusafir.org` sejak Rencana 2b, dan penyegaran visual sudah menyusul. Semua konten masih masuk lewat `pnpm db:seed` — pengurus tidak punya satu pun cara mengubah isi situs sendiri.

## Masalah

Dari CRUD, yang jalan hari ini baru **R**.

| | Keadaan |
|---|---|
| Route `/admin/*` | Tidak ada satu pun, termasuk `/admin/login` yang sudah dirujuk `ensureAdmin()` |
| Operasi tulis | Satu: `contact_messages` insert dari form kontak publik |
| Server fn konten | Semuanya baca (`list*`, `get*`) |
| `ensureAdmin()` / `getSession()` | Ada di `src/lib/auth.functions.ts`, **tidak dipakai di mana pun** |
| `src/components/ui/` | Hanya `button.tsx` dan `card.tsx` |

Sembilan tabel butuh antarmuka tulis: `worship_services`, `schedule_templates`, `bulletins`, `devotionals`, `gallery_albums`, `gallery_items`, `worship_categories`, `kolom`, `site_settings` — plus `contact_messages` (baca + ubah status).

## Tiga temuan yang membentuk rencana ini

Ketiganya ditemukan saat membaca handoff, bukan diasumsikan.

### 1. Index `ws_template_date_uq` salah bentuk — memblokir generator

`src/db/schema/worship.ts`:

```ts
uniqueIndex('ws_template_date_uq').on(t.templateId, t.serviceDate)
```

Kategori `kolom` butuh **satu ibadah per kolom aktif per tanggal** — 4 baris dengan template dan tanggal yang sama. Bentuk unique sekarang membuat baris ke-2 dan seterusnya bentrok.

Rencana 2b menghindarinya dengan menyetel `templateId: null` di semua baris hasil generate (Postgres menganggap NULL distinct). Harganya: **tak ada satu pun `worship_services` yang merujuk balik ke templatenya**, jadi pertanyaan "ibadah ini lahir dari template mana" tidak bisa dijawab.

Generator yang mengandalkan index ini untuk idempotensi (`onConflictDoNothing` per template+tanggal) akan **diam-diam kehilangan 3 dari 4 ibadah Kolom** kalau bentuknya belum dibetulkan. Karena itu perbaikannya jadi fase 0, sebelum satu baris generator pun ditulis.

Bentuk benar: `(templateId, serviceDate, kolomId)`.

### 2. Jadwal kedaluwarsa 29 Oktober 2026

`src/db/seed/schedule.ts` men-generate 8 minggu **relatif tanggal seed dijalankan**, dan guard idempotennya (`db.$count(worshipServices) > 0 → return`) membuat `pnpm db:seed` berikutnya **tidak** memperpanjangnya. Isi sekarang: `2026-09-05` … `2026-10-29`.

Setelah tanggal itu, tanpa error dan tanpa alarm: `/jadwal` jadi empty state, section "Ibadah Minggu Ini" hilang dari beranda, blok jadwal di `/pelayanan/*` kosong, dan **72 URL `/jadwal/<id>` lenyap sekaligus dari sitemap** — terbaca Google sebagai penghapusan konten massal.

Ini yang menentukan urutan fase: jadwal dikerjakan lebih dulu.

### 3. Produksi membaca Neon branch `dev`

Handoff 2b §6 menandai ini "jangan ditebak". Bukti yang mengonfirmasinya: beranda live menampilkan enam tile dari seed galeri 18 foto yang di-commit dari lokal — jadi produksi membaca database yang di-seed dari mesin pengembang, dan `dev` adalah satu-satunya branch yang tercatat pernah dimigrasi.

**Keputusan pemilik proyek: terima keadaan ini**, dan tulis eksplisit supaya berhenti jadi asumsi tak tertulis. Konsekuensinya harus dijaga kode, bukan kehati-hatian: `pnpm db:seed` yang salah jalan bisa menimpa data jemaat begitu pengurus mulai mengisi lewat dashboard. Karena itu fase 0 memasang pagar.

## Keputusan

Diambil bersama pemilik proyek sebelum implementasi:

| Pertanyaan | Keputusan |
|---|---|
| Cakupan | **Semua** area, satu spec utuh, eksekusi bertahap |
| Database produksi | Tetap Neon `dev`; didokumentasikan eksplisit + dipagari di kode |
| Editor warta/renungan | Rich text sederhana, sanitasi di server |
| Urutan | Fondasi → **jadwal** (menutup tenggat 29 Oktober) → konten → galeri → master data |
| Upload berkas | **Vercel Blob** — keputusan lama Rencana 1; `BLOB_READ_WRITE_TOKEN` sudah ada di `.env`, batasan "hanya free tier" tercatat di plan |
| Bentuk antarmuka | Pola `shadcnuikit.com/dashboard/file-manager` — shell sidebar + topbar, kartu ringkasan, tabel beraksi. Polanya saja, bukan kodenya |
| Pemicu generator | **Tombol + pratinjau**, bukan cron |
| Form library | **Tidak menambah** — `useState` + Zod, pola `contact-form.tsx` |

## Non-goals

- Tidak menambah peran. Satu peran `admin` saja, sesuai `users.role` yang sudah ada.
- Tidak membangun alur pendaftaran. `disableSignUp: true` tetap; akun dibuat lewat `pnpm seed:admin`.
- Tidak mengganti konten placeholder yang masih tayang (handoff 2b §4). Dashboard ini **alat** untuk menggantinya; isinya keputusan BPMJ.
- Tidak menyentuh tampilan halaman publik, kecuali di tempat data baru menuntutnya.
- Tidak memindahkan database ke branch `production`.

## Arsitektur

### Route & gerbang

`/admin/*` di-SSR seperti route publik. Gerbang **satu titik**: `ensureAdmin()` di `beforeLoad` route layout `/admin`, bukan dicek ulang tiap halaman — pengecekan yang tersebar adalah pengecekan yang suatu hari terlewat di satu halaman baru.

`/admin/login` berada di luar gerbang itu.

`ensureAdmin` / `getSession` diubah ke **lazy import** `@/lib/auth`, sesuai utang teknis yang dicatat handoff Rencana 1: dengan import top-level, `/admin` membalas 500 alih-alih pesan yang berguna saat env salah.

### Mutasi

Satu file per domain, `src/features/<domain>/mutations.ts`, sejajar file baca yang sudah ada. Tiap mutasi menjalankan urutan yang sama:

```
ensureAdmin()  →  validasi Zod  →  tulis  →  kembalikan hasil
```

Gerbang ada di **server fn**, bukan hanya di route. Route yang dijaga tidak menghalangi siapa pun memanggil server fn-nya langsung; gerbang di route adalah untuk pengalaman pengguna, gerbang di mutasi adalah untuk keamanan.

Validasi Zod juga menutup satu lubang yang sudah dicatat: `datetime.ts` `parseDate` menerima tanggal mustahil seperti `2026-02-30`. Lapisan Zod menolaknya sebelum sampai helper.

### Bentuk antarmuka

Referensi yang diberikan pemilik proyek: **`shadcnuikit.com/dashboard/file-manager`** — diambil **polanya**, bukan kodenya (itu template pihak ketiga; tak ada satu baris pun disalin).

Yang diadopsi:

- **Shell dua panel** — sidebar kiri persisten berisi navigasi per domain (Jadwal, Warta, Renungan, Galeri, Master Data, Pesan), plus topbar berisi identitas pengguna dan tombol keluar. Sidebar menyusut jadi drawer di layar sempit.
- **Kartu ringkasan** di beranda admin — jumlah per domain, berapa yang masih draft, dan "jadwal terisi sampai <tanggal>".
- **Tabel padat dengan aksi kontekstual** per baris (ubah, terbitkan, hapus) sebagai bentuk utama tiap daftar.
- **Nuansa netral** — cocok dengan palet yang ada, terutama sejak dark mode dilepas dari ungu.

Yang **tidak** diadopsi: bagan/statistik dekoratif dari referensi. Dashboard ini alat kerja pengurus, bukan panel analitik; angka yang tidak menuntun ke tindakan hanya menambah beban baca.

### Sistem komponen

`components.json` sudah menyatakan shadcn/ui (style `new-york`, ikon `lucide`), dan `button.tsx` mengikuti polanya. Tapi dua hal membuat `npx shadcn add <komponen>` **tidak bisa langsung dipakai** hari ini:

**1. Token shadcn tidak ada.** `app.css` mendefinisikan `--color-primary`, `--color-surface`, `--color-ink`, `--color-muted`, `--color-border` — dan tak satu pun dari `--background`, `--foreground`, `--card`, `--popover`, `--destructive`, `--input`, `--ring` yang diasumsikan setiap komponen shadcn. Komponen yang ditarik CLI akan tampil tanpa warna. `button.tsx` menghindarinya dengan adaptasi manual, tapi mengulang itu untuk enam komponen berikutnya melelahkan dan mudah melenceng.

Solusinya **lapisan alias** di `@theme inline`: nama shadcn dipetakan ke token GMIM yang sudah ada.

```
--color-background      → var(--color-surface)
--color-foreground      → var(--color-ink)
--color-card            → var(--color-surface)
--color-muted-foreground→ var(--color-muted)
--color-input           → var(--color-border)
--color-ring            → var(--color-secondary)
```

Sekali dipasang, komponen shadcn berikutnya bisa ditarik CLI dan langsung benar warnanya di kedua tema — tanpa menduplikasi satu nilai warna pun, karena alias menunjuk ke token yang sama.

**2. `destructive` belum ada di palet.** Admin butuh aksi hapus, dan tak ada warna untuk itu. Ditambahkan sebagai token baru di kedua tema, rasio dihitung bukan diperkirakan:

| Token | Nilai | Kontras |
|---|---|---|
| `--color-destructive` (light) | `#b91c1c` | putih di atasnya 6.47:1 |
| `--dark-destructive` | `#f87171` | 6.45:1 di `--dark-surface` |

Versi dark sengaja lebih jenuh daripada `--dark-cat-jemaat` (`#fca5a5`, 9.40:1) supaya tombol hapus tidak terbaca seperti badge kategori. Keduanya masuk `tests/unit/dark-palette.test.ts` seperti token lain.

**3. Ikon.** `components.json` menyebut lucide tapi paketnya tak pernah dipasang; tujuh ikon yang ada ditulis tangan sebagai SVG inline. Dashboard ini butuh puluhan, jadi `lucide-react` ditambahkan sebagai dependency. Ikon yang sudah ada dibiarkan — menggantinya tak memberi apa pun dan menyentuh komponen publik yang sudah stabil.

Komponen yang ditarik: `input`, `textarea`, `label`, `select`, `dialog`, `table`, `dropdown-menu`, `sonner` (toast). Tetap prettier-ignored seperti isi `src/components/ui/**` yang lain.

Form memakai `useState` + Zod seperti `contact-form.tsx` — tidak menambah form library. Bentuk formnya lurus, dan polanya sudah terbukti di repo.

### Editor konten

Rich text sederhana (tebal, miring, heading, daftar, tautan), **lazy-loaded** supaya tidak masuk bundle halaman publik. Sanitasi dengan `sanitize-html` **di server saat simpan**, bukan di klien — klien bisa dilewati.

Yang tersimpan di `bodyId`/`bodyEn` selalu HTML yang sudah bersih, sehingga halaman publik yang membacanya tidak berubah sama sekali.

## Fase

Tiap fase berdiri sendiri: selesai, hijau, bisa di-merge.

### Fase 0 — prasyarat

Memblokir sisanya.

- **Migrasi `0002`**: `ws_template_date_uq` → `(templateId, serviceDate, kolomId)`. Termasuk memulihkan `templateId` pada baris yang ada, yang selama ini di-`NULL`-kan sebagai penghindaran.
- **Pagar seed**: `pnpm db:seed` berhenti dengan pesan jelas bila database tujuan sudah memuat konten hasil editan, kecuali dijalankan dengan env eksplisit `SEED_ALLOW_NON_EMPTY=1`. Deteksinya sederhana dan tidak menebak: ada baris di tabel konten yang `updatedAt` ≠ `createdAt` (pernah disunting setelah dibuat). Handoff memperingatkan jalur "hapus-dan-seed-ulang" akan menghapus editan pengurus; begitu dashboard ada, jalur itu harus mustahil ditempuh tanpa sengaja — dan karena produksi memakai database yang sama dengan pengembangan, pagarnya harus di kode, bukan di kehati-hatian.
- **Dokumentasi**: keputusan "produksi memakai Neon `dev`" ditulis eksplisit di handoff, menutup §6 yang selama ini terbuka.

### Fase 1 — fondasi admin

- **Lapisan alias token** + token `destructive` di kedua tema, masuk `dark-palette.test.ts`. Ini lebih dulu dari komponen mana pun — tanpa alias, tiap komponen shadcn yang ditarik harus diadaptasi tangan.
- `lucide-react` sebagai dependency.
- Komponen UI: `input`, `textarea`, `label`, `select`, `dialog`, `table`, `dropdown-menu`, `sonner`.
- `/admin/login` — form masuk, memakai better-auth yang sudah jalan.
- **Shell admin**: layout sidebar + topbar, gerbang `ensureAdmin()` di `beforeLoad`, dan `ensureAdmin` jadi lazy import.
- `rateLimit.storage: 'database'` — default in-memory tak berarti apa-apa di Vercel, tempat tiap lambda punya memorinya sendiri. Ini baru penting begitu form login sungguhan live.
- Beranda admin: kartu ringkasan per domain + **"jadwal terisi sampai <tanggal>"**, supaya tenggat seperti temuan 2 tidak pernah lagi datang tanpa peringatan.

### Fase 2 — jadwal

Fase yang menutup tenggat 29 Oktober.

- CRUD `worship_services`: tanggal, jam, kategori, kolom, lokasi (gedung/rumah + tuan rumah + alamat), tema id/en, bacaan, pelayan firman, pemimpin ibadah, status draft/published.
- Kelola `schedule_templates`: pola mingguan per kategori.
- **Generator**: pengurus memilih rentang, melihat **pratinjau** apa yang akan dibuat, lalu menyetujui. Inkremental — `onConflictDoNothing` di atas index yang sudah dibetulkan, memakai `datesForWeekday()` yang sudah ada dan sudah diuji. Kategori `kolom` fan-out ke tiap kolom aktif.
- Upload PDF tata ibadah (`liturgyPdfUrl`) ke Vercel Blob.

Generator **tidak pernah** menyentuh baris yang sudah diedit pengurus. Itulah beda inti dari jalur `DELETE FROM worship_services` yang dipakai sampai sekarang.

### Fase 3 — warta & renungan

- CRUD `bulletins`: `weekDate`, judul/ringkasan/isi dwibahasa, PDF opsional, draft/published. Constraint `bulletin_has_content` (wajib ada `pdfUrl` **atau** `bodyId`) divalidasi di form, bukan dibiarkan jadi error database.
- CRUD `devotionals`: slug, judul, penulis, tanggal terbit, sampul, kutipan, isi dwibahasa.
- Editor rich text + sanitasi server.
- Upload PDF warta & gambar sampul renungan.

### Fase 4 — galeri

- CRUD `gallery_albums`: judul dwibahasa, tanggal, sampul, urutan, status.
- Kelola `gallery_items`: unggah gambar, tambah tautan YouTube, caption dwibahasa, urutkan, hapus.
- Upload gambar ke Vercel Blob.

Tipe `youtube` sudah didukung komponen galeri tapi tak pernah terpakai sejak item contohnya dihapus di Rencana 2b — fase ini yang membuatnya bisa diisi.

### Fase 5 — master data & pesan

- `worship_categories`: nama dwibahasa, slug, urutan, warna. Warna **divalidasi** cocok `/^var\(--color-cat-[a-z-]+\)$/` — kolom ini menyimpan nama token CSS, bukan hex, dan menyimpan hex ke sana akan memutus tema.
- `kolom`: nama, nomor, koordinator, aktif/tidak.
- `site_settings`: tujuh kunci (`hero`, `service_times`, `contact_info`, `social_links`, `pastoral_contacts`, `live_stream`, `giving_info`), masing-masing dengan form sesuai bentuknya — bukan editor JSON mentah. `updatedBy` diisi, kolomnya sudah ada dan sudah FK ke `user`.
- `contact_messages`: daftar, baca, ubah status `new` → `read` → `done`. Bukan sekadar hapus; kolom statusnya sudah ada sejak Rencana 1 dan belum pernah dipakai.

## Pengujian

Gerbang sekarang — lint, typecheck, build, 176 unit, 117 e2e — tetap hijau di tiap fase.

Tambahan per fase:

- **Generator** (unit): idempotensi (jalan dua kali = hasil sama), fan-out empat kolom pada satu tanggal, batas rentang, dan **tidak menimpa baris yang sudah diedit**. Tiga yang pertama adalah persis kegagalan yang akan terjadi kalau migrasi fase 0 terlewat.
- **Validasi** (unit): tiap schema Zod mutasi, termasuk penolakan tanggal mustahil dan format warna kategori.
- **Gerbang** (e2e): `/admin/*` menolak akses tanpa sesi. Invarian keamanan yang paling mudah rusak diam-diam — satu route baru yang lupa ditempatkan di bawah layout dan gerbangnya bocor tanpa satu test pun merah.
- **Alur** (e2e): login → buat → terbit → muncul di halaman publik → hapus.
- **Sanitasi** (unit): HTML berbahaya dari editor tidak pernah sampai ke database.
- **Palet**: `--color-destructive` dan `--dark-destructive` masuk `dark-palette.test.ts` — kontras di kedua tema, dan versi dark tetap bukan ungu. Alias token tidak diuji nilainya (ia menunjuk token yang sudah diuji), tapi keberadaan tiap alias yang dipakai komponen shadcn diuji, supaya komponen baru tak pernah tampil tanpa warna.

## Batasan yang diwarisi

Semua tetap berlaku:

- **Token saja** — tanpa `dark:`, tanpa hex literal di komponen.
- **Benar di kedua tema**, semua pasangan teks/latar ≥ WCAG AA. Palet dark dijaga `tests/unit/dark-palette.test.ts`.
- **Dwibahasa** — tiap kunci UI ada di `messages/id.json` DAN `messages/en.json`. Berlaku juga untuk antarmuka admin.
- `src/components/ui/**` tetap prettier-ignored.
- Invarian hero tidak dilonggarkan.

## Risiko

| Risiko | Penanganan |
|---|---|
| Migrasi `0002` dijalankan terhadap database yang melayani situs live | Migrasi hanya mengubah bentuk index, tidak menghapus baris. Diuji lebih dulu di **branch Neon sekali pakai** hasil percabangan dari `dev`, yang dibuang setelah verifikasi — ini menguji migrasi, bukan memindahkan produksi (lihat non-goals). |
| Pengurus menghapus konten tanpa sengaja | Konfirmasi eksplisit untuk hapus; status `draft` sebagai jalan "sembunyikan tanpa hapus". |
| Bundle admin membebani halaman publik | Editor lazy-loaded; route admin terpisah dari graf route publik. |
| Tenggat 29 Oktober terlewat | Fase 2 diprioritaskan. Kalau fase 0–2 tampak tidak selesai tepat waktu, prosedur perpanjangan manual (handoff 2b §3) dijalankan sebagai jaring pengaman. |

## Referensi

- Handoff Rencana 2b: `docs/dev/rencana-2b-handoff.md` — §3 kedaluwarsa jadwal, §5 bug index, §6 jalur data produksi
- Handoff Rencana 1: `docs/dev/rencana-1-handoff.md` — RUNBOOK admin, tabel utang teknis
- Spec induk: `docs/superpowers/specs/2026-08-29-gmim-musafir-website-design.md`

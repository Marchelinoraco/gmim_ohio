# Desain: Website GMIM Musafir Columbus Ohio

- **Tanggal:** 2026-08-29
- **Status:** Disetujui untuk masuk tahap rencana implementasi
- **Bahasa dokumen:** Indonesia

---

## 1. Ringkasan

Website resmi jemaat **GMIM Musafir Columbus Ohio** — sebuah jemaat Gereja Masehi
Injili di Minahasa (GMIM) di Columbus, Ohio, USA. Beralamat di 895 Old Diley
Road; Pendeta: Pdt. Allan Robot, S.Th.

Website terdiri dari dua bagian dalam satu aplikasi:

1. **Situs publik** — profil gereja, jadwal seluruh ibadah, penjelasan pelayanan
   kategorial, warta jemaat, renungan, galeri, info kunjungi/kontak, ibadah live,
   dan info persembahan. Dwibahasa (Indonesia + Inggris).
2. **Admin dashboard** (`/admin`) — pengurus gereja mengelola jadwal ibadah,
   template jadwal berulang, warta, renungan, galeri, pesan kontak masuk, dan
   pengaturan situs.

Referensi struktur menu: <https://our.whc.life/>. Referensi gaya UI:
<https://orenty.id> (bersih, minimal, whitespace lega, berbasis card).
Komponen UI: TypeUI (<https://typeui.sh>, registry komponen gaya shadcn).

### Tujuan

- Jemaat (mayoritas via ponsel) dapat dengan cepat melihat **kapan, di mana, dan
  ibadah apa** yang berlangsung minggu ini dan mendatang.
- Pengurus dapat memperbarui jadwal mingguan tanpa menyentuh kode.
- Website terasa rapi, hangat, dan mencerminkan identitas GMIM.
- Nol biaya operasional pada tahap awal (Vercel free tier + Neon free tier +
  Vercel Blob free tier).

### Non-tujuan (di luar cakupan rilis pertama)

- Payment gateway / persembahan online (hanya tampilkan info rekening bank).
- Notifikasi push / WhatsApp otomatis.
- Multi-role & permission per kategori pelayanan (hanya satu peran: Admin).
- Komentar pada renungan.
- Pendaftaran acara / RSVP.
- Dark mode untuk situs publik.
- Aplikasi mobile.

---

## 2. Keputusan Arsitektur

### 2.1 Pendekatan yang dipertimbangkan

| Pendekatan | Kelebihan | Kekurangan |
|---|---|---|
| **A. Satu app TanStack Start** (publik SSR + dashboard client + backend via server functions) — **DIPILIH** | Satu codebase, satu deploy, model data & tipe dipakai bersama, SEO baik | Semua CRUD dashboard ditulis sendiri |
| B. TanStack Start publik + headless CMS (Payload) | CRUD admin nyaris gratis | Admin CMS sulit disesuaikan gaya orenty.id, dua sistem, vendor tambahan |
| C. Astro (publik) + app React terpisah (admin) | Halaman publik paling ringan | Codebase & deploy terpecah, model ganda, keluar dari TanStack |

**Alasan memilih A:** sesuai keinginan pemilik proyek (dashboard custom dengan
tampilan sendiri), dan pola ini sudah matang (tanstack.com berjalan di TanStack
Start + Neon + Drizzle + better-auth).

### 2.2 Teknologi

| Area | Pilihan | Catatan |
|---|---|---|
| Framework | **TanStack Start** (React 19) | File-based routing, `createServerFn` untuk backend, SSR untuk halaman publik, client-only untuk `/admin` |
| Database | **Neon Postgres** | Free tier; branching: 1 branch DB per PR/preview |
| ORM | **Drizzle ORM** + `drizzle-kit` | Paling cocok untuk serverless + TanStack; migrasi via drizzle-kit |
| Auth | **better-auth** | Email + password, session cookie; tabel user di Neon |
| i18n | **Paraglide JS (inlang)** | Compile-time, type-safe, ringan, SSR-friendly. Fallback: i18next bila ada kendala integrasi |
| Styling | **Tailwind CSS v4** | Token desain via CSS variables |
| Komponen UI | **TypeUI** (registry gaya shadcn) + Radix primitives | Cara install dikonfirmasi di Fase 0. Fallback: shadcn/ui langsung dengan tema yang sama |
| Rich text editor | **TipTap** | Output HTML, disanitasi di server |
| File storage | **Vercel Blob** | Foto galeri, warta PDF, tata ibadah PDF |
| Deploy | **Vercel + GitHub integration** | `main` → production; PR → preview + Neon branch |
| Testing unit | **Vitest** | |
| Testing E2E | **Playwright** | |
| CI | **GitHub Actions** | lint + typecheck + vitest + playwright per PR |
| Package manager | **pnpm** | |

### 2.3 Struktur proyek

```
src/
  routes/                 # file-based routing (publik + /admin)
    ($lang)/              # segmen bahasa: "" (id, default, tanpa prefix) & "en"
      index.tsx           # Beranda
      tentang/
      pelayanan/
      jadwal/
      warta/
      renungan/
      galeri/
      kunjungi.tsx
      persembahan.tsx
      ibadah-live.tsx
    admin/
      login.tsx
      index.tsx           # Ringkasan
      jadwal/
      template-jadwal/
      warta/
      renungan/
      galeri/
      kotak-masuk/
      pengaturan/
      pengguna/
  db/
    schema/               # schema Drizzle per domain
    index.ts              # koneksi Neon
    seed/                 # seed kategori ibadah, admin, default settings
  lib/
    auth.ts               # better-auth
    blob.ts               # helper Vercel Blob (upload + cleanup)
    datetime.ts           # helper zona waktu America/New_York
    schedule/             # generator jadwal berulang (logika inti, TDD)
    sanitize.ts           # sanitasi HTML rich text
  features/               # komponen + server fn per domain
    jadwal/
    warta/
    renungan/
    galeri/
    kontak/
    pengaturan/
  components/
    ui/                   # komponen dari TypeUI
    layout/               # header, footer, nav, language switcher
    admin/                # layout & komponen khusus dashboard
messages/
  id.json                # katalog teks UI + konten statis (Paraglide)
  en.json
public/
  logo.png               # seal GMIM penuh
  logo-mark.svg          # mark sederhana (Manguni + Mawar Luther) untuk favicon/ikon kecil
drizzle/                 # file migrasi
tests/
  unit/
  e2e/
```

### 2.4 Model bahasa (i18n)

- Locale default **`id`** tanpa prefix URL (`/jadwal`).
- Bahasa Inggris di prefix **`/en`** (`/en/jadwal`).
- `/` melayani konten `id`; middleware menambahkan `<link rel="alternate" hreflang>`.
- Language switcher di header & footer; preferensi disimpan di cookie
  (`NEXT_LOCALE`-style), tidak memaksa redirect saat kunjungan berikutnya.
- **Teks UI & konten statis** (menu, label, Sejarah, Visi-Misi, profil Pendeta,
  deskripsi tiap kategori pelayanan, teks "yang perlu diketahui saat pertama
  datang"): di katalog `messages/id.json` & `messages/en.json`. Diubah lewat edit
  kode + deploy.
- **Konten dinamis di DB** (tema ibadah, warta, renungan, caption galeri, hero,
  dsb.): kolom ganda `*_id` / `*_en` pada tabel terkait.

### 2.5 Zona waktu

Seluruh jadwal ibadah **disimpan dan ditampilkan** dalam zona waktu
**America/New_York (Eastern)**. Helper tanggal terpusat di `src/lib/datetime.ts`,
diuji unit. Waktu ibadah disimpan sebagai kolom terpisah `service_date` (`date`)
+ `start_time` / `end_time` (`time`), keduanya dalam wall-clock Eastern — bukan
`timestamptz` — sehingga tidak terpengaruh pergeseran DST. Konversi dan format
untuk tampilan & JSON-LD dilakukan lewat helper (`datetime.ts` menggabungkan
`service_date` + `start_time` + zona `America/New_York` menjadi instant), tidak
langsung dengan `Date` bawaan.

---

## 3. Situs Publik

### 3.1 Peta menu

| Referensi (whc.life) | GMIM Musafir | Isi |
|---|---|---|
| — | **Beranda** | Hero, jam ibadah rutin, ibadah mendatang, sekilas tentang, warta terbaru, CTA kunjungi |
| About | **Tentang** | Sejarah · Visi & Misi · Majelis Jemaat (BPMJ) · Pendeta |
| Ministries | **Pelayanan** | Ibadah Jemaat · Pria/Kaum Bapa · Wanita/Kaum Ibu · Pemuda & Remaja · Anak Sekolah Minggu · Kolom |
| (service info) | **Jadwal Ibadah** | Daftar "Ibadah Mendatang" (default) + tab Kalender bulanan; filter per kategori/kolom |
| Sermons | **Warta & Renungan** | Warta Jemaat · Renungan/artikel rohani |
| Bible Groups | *(menjadi bagian Pelayanan → Kolom)* | — |
| — | **Galeri** | Album foto/video kegiatan |
| Visit / Plan Your Visit | **Kunjungi** | Alamat, peta, jam kantor, "yang perlu diketahui saat pertama datang", form kontak |
| Watch Live | **Ibadah Live** (tombol header) | Embed YouTube/Facebook live + arsip rekaman |
| Give | **Persembahan** (tombol header) | Cara memberi + info rekening bank |
| Serve | *(tidak dipakai)* | — |

### 3.2 Halaman

#### Beranda (`/`)

- **Hero:** nama gereja, tagline (dari Site Settings, id/en), foto latar, tombol
  "Jadwal Ibadah" + "Kunjungi Kami".
- **Strip jam ibadah rutin** — teks dari Site Settings `service_times`.
- **"Ibadah Minggu Ini"** — 3–6 kartu ibadah terdekat berstatus `published`,
  diambil dari DB (server function, di-render SSR).
- **"Tentang Kami" ringkas** — kutipan singkat + tombol ke halaman Tentang.
- **"Warta Terbaru"** — 3 entri warta `published` terakhir.
- **CTA "Ibadah Live"** — tampil menonjol bila Site Settings `live_stream.is_live`
  bernilai true (badge merah "SEDANG LIVE").
- **Footer:** alamat, peta mini, sosial media, link cepat, language switcher.

#### Tentang (`/tentang`)

Halaman tunggal dengan anchor section, atau sub-halaman:
`/tentang/sejarah`, `/tentang/visi-misi`, `/tentang/majelis`, `/tentang/pendeta`.
Konten dari katalog i18n. Foto pendukung di `public/` (placeholder saat rilis).

#### Pelayanan (`/pelayanan`)

- Halaman indeks: kartu untuk tiap kategori (Ibadah Jemaat, Kaum Bapa, Kaum Ibu,
  Pemuda & Remaja, Anak Sekolah Minggu, Kolom) dengan deskripsi singkat.
- Halaman kategori (`/pelayanan/[slug]`), contoh `/pelayanan/pemuda-remaja`:
  - Deskripsi kategori (katalog i18n).
  - Jadwal ibadah kategori tersebut — otomatis difilter dari DB, tampilan daftar.
  - Kontak koordinator (Site Settings `pastoral_contacts[slug]`).
- Halaman **Kolom** (`/pelayanan/kolom`):
  - Penjelasan sistem kolom.
  - Daftar kolom (jumlah & nama dari tabel `kolom`).
  - Jadwal ibadah kolom, dikelompokkan per kolom.

#### Jadwal Ibadah (`/jadwal`) — fitur inti

- Toggle tampilan: **Daftar** ↔ **Kalender**.
- **Daftar** ("Ibadah Mendatang"):
  - Dikelompokkan per tanggal (mulai hari ini ke depan; opsi "lihat yang lalu").
  - Tiap kartu: badge kategori (warna), jam mulai (–selesai), lokasi
    (`Gedung Gereja` atau `Kel. <nama>` + alamat), tema & bacaan Alkitab,
    pelayan firman & pemimpin, keluarga tuan rumah, tombol unduh tata ibadah PDF
    (bila ada).
  - Paginasi / infinite scroll.
- **Kalender:**
  - Grid bulanan, navigasi bulan.
  - Tiap tanggal menampilkan titik/among kategori; klik tanggal → panel daftar
    ibadah hari itu.
- **Filter:** semua / Ibadah Jemaat / Kaum Bapa / Kaum Ibu / Pemuda-Remaja /
  Sekolah Minggu / Kolom (+ dropdown pilih kolom tertentu). Filter tercermin di
  query string agar bisa dibagikan.
- **Halaman detail** (`/jadwal/[id]`): semua field satu ibadah, tombol bagikan
  (WhatsApp), JSON-LD `Event`. Hanya menampilkan ibadah `published`.

#### Warta & Renungan

- **Warta Jemaat** (`/warta`): daftar per minggu (tanggal + judul + ringkasan).
  Detail (`/warta/[id]`): ringkasan, isi web (bila ada), tombol lihat/unduh PDF
  (bila ada).
- **Renungan** (`/renungan`): daftar artikel (judul, tanggal, penulis, cuplikan,
  gambar sampul). Detail (`/renungan/[slug]`): isi lengkap (HTML tersanitasi),
  JSON-LD `Article`.

#### Galeri (`/galeri`)

- Daftar album (cover, judul, tanggal).
- Halaman album (`/galeri/[id]`): grid foto dengan lightbox; item video YouTube
  di-embed. Setiap foto punya `alt`.

#### Kunjungi (`/kunjungi`)

- Alamat 895 Old Diley Road + Google Maps embed (link dari Site Settings).
- Jam kantor & jam ibadah.
- Teks "yang perlu diketahui saat pertama datang" (katalog i18n).
- **Form kontak:** nama, email, telepon (opsional), pesan. Proteksi honeypot +
  rate-limit per IP di server. Sukses → simpan ke `contact_messages` + kirim
  email notifikasi ke alamat admin (via provider email, mis. Resend free tier;
  bila tidak dikonfigurasi, cukup simpan ke DB).

#### Persembahan (`/persembahan`)

- Penjelasan singkat + daftar rekening bank dari Site Settings `giving_info`
  (bank, nomor rekening, atas nama) + catatan.

#### Ibadah Live (`/ibadah-live`)

- Bila `live_stream.is_live` true: embed player (YouTube/Facebook) dari
  `live_stream.url`.
- Bila tidak: pesan "Tidak ada siaran langsung saat ini" + jadwal ibadah
  berikutnya + tautan arsip rekaman (`live_stream.archive_url`, mis. playlist
  YouTube).

### 3.3 SEO

- Meta title/description per halaman (id/en).
- `hreflang` alternate untuk tiap halaman.
- `sitemap.xml` dinamis (mencakup halaman statis + jadwal/warta/renungan/galeri
  yang published).
- `robots.txt`.
- Open Graph: gambar OG default (logo di atas latar krem) + OG per artikel
  renungan, per warta, per ibadah.
- JSON-LD: `Church` (nama, alamat, koordinat, jam) di seluruh situs; `Event`
  untuk tiap ibadah; `Article` untuk renungan.

---

## 4. Admin Dashboard (`/admin`)

### 4.1 Autentikasi & akses

- Login email + password (better-auth), session cookie httpOnly.
- Seluruh route `/admin/*` diproteksi (redirect ke `/admin/login` bila tidak
  ada sesi valid).
- **Satu peran: Admin** — semua admin punya akses penuh.
- `/admin/login`, alur lupa/reset password via email, logout.
- Akun admin pertama dibuat lewat script seed (`pnpm seed:admin`) yang membaca
  email + password dari env / prompt.
- Modul **Pengguna:** daftar admin, tambah admin baru, nonaktifkan
  (`is_active = false`), ubah password.

### 4.2 Layout

Gaya orenty.id: sidebar kiri tetap, area konten berbasis card, whitespace lega.

- **Sidebar:** Ringkasan · Jadwal Ibadah · Template Jadwal · Warta Jemaat ·
  Renungan · Galeri · Kotak Masuk · Pengaturan Situs · Pengguna.
- **Topbar:** nama admin, toggle bahasa konten yang sedang diisi (id/en), logout.
- Responsif: sidebar menjadi drawer di layar kecil.

### 4.3 Modul

#### 1. Ringkasan (`/admin`)

- Kartu statistik: jumlah ibadah 7 hari ke depan, warta bulan ini, pesan kontak
  status `new`, renungan `published`.
- Daftar "Ibadah 7 hari ke depan" + tombol cepat "Tambah Ibadah".
- Highlight **draft jadwal dari template yang belum dilengkapi** (tema/pelayan
  masih kosong).

#### 2. Jadwal Ibadah (`/admin/jadwal`)

- Tabel: tanggal, jenis, jam, lokasi, status (draft/publish), aksi.
- Filter per jenis / kolom / bulan. Aksi massal: publish terpilih.
- **Form entri** (`/admin/jadwal/baru`, `/admin/jadwal/[id]`):
  - Jenis ibadah: Ibadah Jemaat · Kaum Bapa · Kaum Ibu · Pemuda-Remaja ·
    Sekolah Minggu · Kolom.
  - Bila **Kolom** → pilih kolom (dari tabel `kolom`).
  - Tanggal + jam mulai + jam selesai (opsional).
  - Lokasi:
    - **Gedung Gereja** (alamat gereja otomatis), atau
    - **Rumah keluarga** → nama keluarga tuan rumah + alamat + catatan arah
      (opsional).
  - Tema (id/en) + bacaan Alkitab.
  - Pelayan Firman + Pemimpin Ibadah.
  - Upload tata ibadah PDF (Vercel Blob; validasi tipe & ukuran ≤ 10 MB).
  - Status: draft / publish.
- Tombol **"Duplikat dari minggu lalu"**: menyalin entri kategori yang sama dari
  7 hari sebelumnya sebagai draft baru dengan tanggal +7 hari.

#### 3. Template Jadwal (`/admin/template-jadwal`)

- CRUD pola berulang. Field: jenis ibadah, kolom (opsional), hari
  (`day_of_week` 0–6), jam mulai, jam selesai (opsional), tipe lokasi default
  (`gedung_gereja` / `rumah`), aktif/nonaktif.
- Tombol **"Generate draft"**: pilih rentang tanggal (mis. 1 bulan ke depan) →
  sistem membuat entri `worship_services` berstatus `draft` untuk setiap
  kemunculan pola dalam rentang tersebut, mengisi jenis/kolom/tanggal/jam/tipe
  lokasi; tema, pelayan, tuan rumah dibiarkan kosong untuk dilengkapi admin.
- **Aturan idempotensi:** generate tidak membuat duplikat bila sudah ada entri
  dengan (`template_id`, `service_date`) yang sama.
- Logika generator berada di `src/lib/schedule/` dan **dikembangkan dengan TDD**
  (lihat §6).

#### 4. Warta Jemaat (`/admin/warta`)

- CRUD. Field: tanggal minggu, judul (id/en), ringkasan (id/en), isi web
  (TipTap, id/en, opsional), upload PDF (opsional), status draft/publish.
- **Aturan:** minimal salah satu dari (isi web) atau (PDF) harus terisi.

#### 5. Renungan (`/admin/renungan`)

- CRUD artikel. Field: judul (id/en), penulis, tanggal terbit, gambar sampul
  (Vercel Blob), cuplikan (id/en), isi (TipTap, id/en), status draft/publish.
- Slug dibuat otomatis dari judul id, dapat diedit, dijamin unik.

#### 6. Galeri (`/admin/galeri`)

- CRUD album: judul (id/en), tanggal, cover, urutan, status.
- Di dalam album: multi-upload foto (Vercel Blob) + caption opsional (id/en);
  tambah item video via URL YouTube. Drag-reorder item.

#### 7. Kotak Masuk (`/admin/kotak-masuk`)

- Daftar pesan dari form kontak: nama, email, telepon, pesan, tanggal, status
  (`new` / `read` / `done`).
- Aksi: tandai dibaca, tandai selesai, hapus. Tidak ada fitur balas (balasan
  lewat email biasa).

#### 8. Pengaturan Situs (`/admin/pengaturan`)

Form yang menulis ke tabel `site_settings` (key–value, value `jsonb`):

| Key | Isi |
|---|---|
| `hero` | Judul & tagline beranda (id/en), nama file gambar hero |
| `service_times` | Teks jam ibadah rutin (id/en) untuk beranda & Kunjungi |
| `contact_info` | Telepon, email, jam kantor (id/en), link Google Maps, koordinat |
| `social_links` | Facebook, Instagram, YouTube |
| `pastoral_contacts` | Kontak koordinator per kategori pelayanan (nama, telепon) |
| `live_stream` | `is_live` (bool), `url`, `archive_url` |
| `giving_info` | Daftar rekening bank (bank, no. rekening, atas nama) + catatan (id/en) |

- **Kolom** dikelola di sub-tab Pengaturan (`/admin/pengaturan/kolom`) namun
  disimpan di tabel `kolom` tersendiri: nama, nomor, nama koordinator, telepon
  koordinator, aktif.

### 4.4 Keamanan konten

- Semua input divalidasi dengan skema **Zod** di server function sebelum ditulis
  ke DB.
- Output TipTap disanitasi di server (`src/lib/sanitize.ts`, allowlist tag &
  atribut) sebelum disimpan **dan** sebelum dirender.
- Upload: validasi MIME & ukuran; nama file diacak; hanya admin terautentikasi.
- Form kontak publik: honeypot + rate-limit per IP + panjang maksimum.

---

## 5. Model Data (Postgres / Drizzle)

Konvensi: setiap tabel punya `id` (uuid, default `gen_random_uuid()`),
`created_at` (timestamptz, default now), `updated_at` (timestamptz). Konten
dwibahasa memakai kolom `*_id` / `*_en`.

### 5.1 Auth (better-auth)

- **`users`** — `id`, `name`, `email` (unik), `email_verified` (bool),
  `image` (nullable), `role` (`'admin'`, default `'admin'`), `is_active` (bool,
  default true).
- **`accounts`** — kredensial (password hash), `provider`, relasi ke `users`.
- **`sessions`** — `token`, `expires_at`, `ip_address`, `user_agent`, relasi ke
  `users`.
- **`verifications`** — token reset password / verifikasi email, `expires_at`.

*(Struktur final mengikuti skema resmi better-auth + Drizzle adapter.)*

### 5.2 Jadwal

#### `worship_categories` (di-seed, tidak dibuat via UI)

| Kolom | Tipe | Catatan |
|---|---|---|
| `key` | text unik | `ibadah_jemaat` \| `kaum_bapa` \| `kaum_ibu` \| `pemuda_remaja` \| `sekolah_minggu` \| `kolom` |
| `name_id` | text | mis. "Ibadah Jemaat" |
| `name_en` | text | mis. "Congregational Service" |
| `slug` | text unik | untuk URL `/pelayanan/[slug]` |
| `color` | text | token warna badge |
| `sort_order` | int | |

#### `kolom`

| Kolom | Tipe | Catatan |
|---|---|---|
| `name` | text | mis. "Kolom 1" |
| `number` | int | untuk pengurutan |
| `coordinator_name` | text nullable | |
| `coordinator_phone` | text nullable | |
| `is_active` | bool | default true |

#### `schedule_templates`

| Kolom | Tipe | Catatan |
|---|---|---|
| `category_id` | fk → `worship_categories` | |
| `kolom_id` | fk → `kolom`, nullable | hanya untuk kategori `kolom` |
| `day_of_week` | int (0–6) | 0 = Minggu |
| `start_time` | time | Eastern |
| `end_time` | time nullable | |
| `default_location_type` | text | `gedung_gereja` \| `rumah` |
| `is_active` | bool | default true |

#### `worship_services` (entri jadwal — tabel inti)

| Kolom | Tipe | Catatan |
|---|---|---|
| `category_id` | fk → `worship_categories` | |
| `kolom_id` | fk → `kolom`, nullable | |
| `template_id` | fk → `schedule_templates`, nullable | asal generate |
| `service_date` | date | untuk pengelompokan (Eastern) |
| `start_time` | time | Eastern |
| `end_time` | time nullable | |
| `location_type` | text | `gedung_gereja` \| `rumah` |
| `host_family_name` | text nullable | |
| `host_address` | text nullable | |
| `location_note` | text nullable | catatan arah |
| `theme_id` | text nullable | |
| `theme_en` | text nullable | |
| `bible_reading` | text nullable | mis. "Mazmur 23:1-6" |
| `preacher_name` | text nullable | pelayan firman |
| `liturgist_name` | text nullable | pemimpin ibadah |
| `liturgy_pdf_url` | text nullable | Vercel Blob |
| `status` | text | `draft` \| `published` (default `draft`) |

Index: `(service_date)`, `(category_id, service_date)`, `(status, service_date)`,
`(template_id, service_date)` unik (idempotensi generate).

### 5.3 Konten

#### `bulletins` (Warta Jemaat)

`week_date` (date), `title_id`, `title_en`, `summary_id`, `summary_en`,
`body_id` (html nullable), `body_en` (html nullable), `pdf_url` (nullable),
`status` (`draft` | `published`).
CHECK: `pdf_url IS NOT NULL OR body_id IS NOT NULL`.

#### `devotionals` (Renungan)

`slug` (unik), `title_id`, `title_en`, `author_name`, `published_date` (date),
`cover_image_url` (nullable), `excerpt_id`, `excerpt_en`, `body_id` (html),
`body_en` (html), `status` (`draft` | `published`).

#### `gallery_albums`

`title_id`, `title_en`, `album_date` (date), `cover_image_url`, `sort_order`,
`status` (`draft` | `published`).

#### `gallery_items`

`album_id` (fk → `gallery_albums`, cascade delete), `type` (`image` | `youtube`),
`image_url` (nullable), `youtube_url` (nullable), `caption_id` (nullable),
`caption_en` (nullable), `sort_order`.

#### `contact_messages`

`name`, `email`, `phone` (nullable), `message`, `status` (`new` | `read` |
`done`, default `new`).

#### `site_settings`

`key` (text unik), `value` (jsonb), `updated_by` (fk → `users`, nullable).
Key & bentuk value: lihat §4.3 modul 8.

### 5.4 File (Vercel Blob)

- Prefix path: `bulletins/`, `liturgy/`, `devotionals/`, `gallery/`.
- URL blob disimpan pada kolom terkait di DB.
- Saat record dihapus atau file diganti, blob lama dihapus
  (`src/lib/blob.ts` — `deleteBlob`).

### 5.5 Konten statis (di kode, bukan DB)

Teks Sejarah, Visi-Misi, profil Pendeta, deskripsi tiap kategori Pelayanan, dan
teks "yang perlu diketahui saat pertama datang" berada di `messages/id.json` &
`messages/en.json`. Perubahan lewat edit kode + deploy.

---

## 6. Arah Visual & Design System

### 6.1 Karakter

Ambil kebersihan orenty.id (latar terang, whitespace lega, layout berbasis card,
heading tegas), dihangatkan untuk konteks gereja. Tenang, rapi, mobile-first
(mayoritas jemaat membuka dari ponsel).

### 6.2 Identitas dari logo GMIM

Logo: burung **Manguni** (owl khas Minahasa) cokelat tua, sayap terbentang;
**Mawar Luther** di dada (lingkaran biru, mawar putih, hati merah, salib hitam);
anak panah menyilang; bintang bersudut delapan; dilingkari tulisan "GEREJA
MASEHI INJILI di MINAHASA".

### 6.3 Palet warna (token, light-mode)

| Peran | Warna | Sumber |
|---|---|---|
| Primary | Cokelat tua / cokelat kayu | Manguni |
| Secondary | Biru royal | Lingkaran Mawar Luther |
| Surface | Krem / perkamen hangat + putih | Bidang seal |
| Accent (hemat) | Merah mawar | Badge "sedang live", notifikasi penting |
| Neutral | Taupe / cokelat abu | Border & teks sekunder |

- Badge 6 kategori ibadah: enam warna harmonis dengan palet cokelat–krem–biru
  (nilai final ditetapkan saat implementasi, disimpan di `worship_categories.color`).
- Seluruh pasangan teks/latar minimal kontras **WCAG AA**.
- Token didefinisikan sebagai CSS variables; struktur disiapkan untuk dark mode
  (belum diaktifkan untuk situs publik).

### 6.4 Tipografi

- **Heading:** serif humanis hangat (mis. **Fraunces** / Source Serif).
- **Body & UI:** sans bersih (mis. **Inter** / Geist).
- Font di-self-host (tanpa FOUT).

### 6.5 Pemakaian logo

- Header (logo + wordmark "GMIM Musafir Columbus"), footer, favicon, gambar OG
  default, halaman login admin.
- Detail seal terlalu ramai di ukuran kecil → siapkan **mark sederhana**
  (`public/logo-mark.svg`: siluet Manguni + Mawar Luther) untuk favicon & ikon
  kecil; seal penuh (`public/logo.png`) untuk ukuran sedang–besar.
- Diperlukan versi PNG latar transparan (diproses dari `logo.png` yang ada).

### 6.6 Komponen

Dari TypeUI / shadcn, tema disesuaikan token di atas: Button, Card, Badge, Tabs,
Dialog, Sheet (nav mobile & drawer admin), Calendar, Table, Form + Input / Select
/ Textarea, DropdownMenu, Toast, Pagination, Skeleton.

### 6.7 Aksesibilitas & mobile

Mobile-first; semantic HTML; focus ring jelas; `alt` wajib untuk foto galeri;
target sentuh ≥ 44px; nav mobile pakai Sheet; kalender jadwal punya fallback
daftar yang mudah diakses.

---

## 7. Fase Pembangunan

| Fase | Isi |
|---|---|
| **0. Scaffold** | TanStack Start + Tailwind v4 + TypeUI/shadcn; Drizzle + koneksi Neon; better-auth; Paraglide i18n; pipeline Vercel + GitHub; layout dasar + token desain + font; salin `logo.png` ke `public/`, buat `logo-mark.svg` + versi transparan; konfirmasi cara install TypeUI |
| **1. Data layer** | Semua schema Drizzle + migrasi; seed `worship_categories`; script `seed:admin`; default `site_settings`; helper `datetime.ts` (+ unit test) |
| **2. Shell publik** | Header/nav/footer; language switcher; Beranda (statis + settings + query DB); halaman Tentang; Kunjungi + form kontak (server fn + rate-limit + honeypot); Persembahan; Ibadah Live |
| **3. Fitur Jadwal (publik)** | Server fn list/detail/filter; halaman Jadwal (daftar + kalender + filter + query string + halaman detail); halaman Pelayanan indeks + per kategori; halaman Kolom; JSON-LD `Event` |
| **4. Admin inti** | `/admin/login` + reset password; layout dashboard; Ringkasan; Pengguna (CRUD + seed); Pengaturan Situs; Kolom |
| **5. Admin Jadwal** | CRUD `worship_services`; CRUD `schedule_templates`; **generator draft (TDD)**; "duplikat dari minggu lalu"; aksi massal publish |
| **6. Modul konten** | Warta (publik + admin); Renungan (publik + admin); Galeri (publik + admin); Kotak Masuk; upload Vercel Blob (`blob.ts` + cleanup); editor TipTap + `sanitize.ts` |
| **7. Polish** | SEO/`sitemap.xml`/`robots.txt`/OG/JSON-LD `Church`; halaman 404 & 500; loading & empty state; audit aksesibilitas; Lighthouse; E2E Playwright; README + panduan singkat pengurus (cara update jadwal) |

---

## 8. Strategi Testing

### 8.1 Unit (Vitest)

- **Generator jadwal berulang** (`src/lib/schedule/`) — prioritas utama, TDD:
  - Membuat entri untuk setiap kemunculan `day_of_week` dalam rentang.
  - Idempoten: tidak menduplikasi (`template_id`, `service_date`) yang sudah ada.
  - Menghormati `is_active`.
  - Mengisi `kolom_id` hanya untuk kategori `kolom`.
  - Menangani batas rentang (inklusif/eksklusif) & pergantian bulan.
- **Helper zona waktu/tanggal** (`src/lib/datetime.ts`) — format & konversi
  Eastern, termasuk transisi DST.
- **Skema validasi Zod** server function (jadwal, warta, renungan, kontak).
- **Sanitasi HTML** (`src/lib/sanitize.ts`) — tag berbahaya dibuang, tag valid
  dipertahankan.
- **Aturan bisnis** — warta wajib punya PDF atau isi web; slug renungan unik.

### 8.2 E2E (Playwright)

- **Publik:** lihat daftar jadwal; ganti ke tampilan kalender; terapkan filter
  kategori & kolom; buka halaman detail ibadah; kirim form kontak (sukses +
  ditolak honeypot); ganti bahasa id↔en dan verifikasi URL + konten.
- **Admin:** login; buat entri jadwal (Gedung Gereja & Rumah keluarga); buat
  template lalu generate draft; lengkapi draft & publish; buat warta dengan
  upload PDF; buat renungan dengan gambar sampul; tandai pesan kontak selesai.

### 8.3 CI (GitHub Actions)

Per Pull Request: `lint` + `typecheck` + `vitest` + `playwright`. Satu Neon
branch per PR sebagai DB E2E. Migrasi dijalankan sebelum test.

---

## 9. Konfigurasi & Deployment

### 9.1 Environment variables

| Var | Untuk |
|---|---|
| `DATABASE_URL` | Neon (pooled) |
| `DATABASE_URL_UNPOOLED` | Neon (untuk migrasi) |
| `BETTER_AUTH_SECRET` | better-auth |
| `BETTER_AUTH_URL` | URL kanonik situs |
| `BLOB_READ_WRITE_TOKEN` | Vercel Blob |
| `RESEND_API_KEY` (opsional) | email notifikasi form kontak |
| `CONTACT_NOTIFICATION_EMAIL` | tujuan notifikasi kontak |
| `SEED_ADMIN_EMAIL`, `SEED_ADMIN_PASSWORD` | script `seed:admin` |

### 9.2 Deployment

- Repo GitHub → Vercel project. `main` → production.
- PR → preview deployment + Neon branch otomatis (via integrasi Neon–Vercel atau
  GitHub Action).
- Migrasi dijalankan pada langkah build / release (`drizzle-kit migrate`).
- Domain: subdomain Vercel dulu; domain kustom ditambahkan belakangan bila ada.

---

## 10. Risiko & Asumsi

| Item | Catatan |
|---|---|
| **TypeUI** | Situs sedang rate-limited saat desain ditulis. Fase 0 mengonfirmasi cara install & cakupan komponen. Fallback: shadcn/ui langsung dengan tema token yang sama. |
| **TanStack Start + Vercel** | Didukung; jika ada kendala adapter, Nitro preset Vercel dipakai. Perlu verifikasi versi di Fase 0. |
| **i18n (Paraglide) + SSR TanStack Start** | Integrasi perlu diverifikasi di Fase 0; fallback i18next. |
| **Neon free tier** | Cukup untuk skala jemaat; auto-suspend saat idle bisa menambah latensi cold start pertama — dapat diterima. |
| **Konten** | Semua konten memakai placeholder realistis saat rilis; pengurus mengganti lewat dashboard / edit katalog i18n. |
| **Email form kontak** | Bila provider email tidak dikonfigurasi, pesan tetap tersimpan di DB dan terlihat di Kotak Masuk. |
| **Zona waktu** | Diasumsikan seluruh ibadah di zona Eastern (Columbus, OH). |
| **Jumlah & nama kolom** | Belum diketahui; dikelola pengurus lewat Pengaturan → Kolom. Seed awal: Kolom 1–4 (placeholder). |

---

## 11. Pertanyaan Terbuka (untuk dijawab sebelum / saat implementasi)

1. Cara install & daftar komponen TypeUI (Fase 0).
2. Provider email untuk notifikasi form kontak — pakai Resend atau lewati dulu?
3. Jumlah kolom sebenarnya di jemaat GMIM Musafir.
4. Apakah perlu halaman "Majelis Jemaat / BPMJ" menampilkan daftar nama, atau
   cukup narasi? (default: narasi + placeholder daftar).

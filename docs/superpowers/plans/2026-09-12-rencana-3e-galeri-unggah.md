# Rencana 3e — Galeri & Lapisan Unggah Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Pengurus bisa membuat album, mengunggah foto langsung dari ponsel, menambah tautan YouTube, menulis caption dwibahasa, mengurutkan, dan menerbitkan — tanpa menyentuh berkas di repo.

**Architecture:** Lapisan unggah ditulis sekali dan dipakai galeri lebih dulu; PDF warta, PDF tata ibadah, dan sampul renungan menyusul memakai lapisan yang sama. Unggahnya **langsung dari browser ke Vercel Blob**, dengan server hanya menerbitkan token berumur pendek.

**Tech Stack:** TanStack Start (React 19), Drizzle ORM + Postgres (Neon), Vercel Blob, Zod v4, Tailwind CSS v4, shadcn/ui, Vitest, Playwright.

**Spec:** `docs/superpowers/specs/2026-09-07-rencana-3-admin-dashboard.md` (§Fase 4)

## Global Constraints

- **Token saja** — tanpa class `dark:`, tanpa hex literal di komponen.
- **Benar di kedua tema** — semua pasangan teks/latar ≥ WCAG AA.
- **Dwibahasa** — tiap kunci UI ada di `messages/id.json` DAN `messages/en.json`, nama kunci identik.
- `src/components/ui/**` prettier-ignored.
- **Bahasa komentar & commit: Indonesia.**
- **Gerbang hijau tiap task**: `pnpm lint`, `pnpm typecheck`, `pnpm build`, `pnpm test` (baseline **263** unit), `pnpm test:e2e` (baseline **158** lulus + 10 skipped).
- **Jangan pernah menjalankan dua `pnpm test:e2e` bersamaan**, dan **jangan menjalankan `pnpm build` selagi e2e berjalan** — build menulis ulang `routeTree.gen.ts` dan me-restart dev server di tengah navigasi, menghasilkan `net::ERR_ABORTED`. Keduanya terjadi nyata di Rencana 3d.
- **Tiap route admin baru**: di bawah `admin._app`, panggil `ensureAdmin()` di server fn-nya, DAN tambahkan path-nya ke daftar gerbang di `tests/e2e/admin.spec.ts`.
- **Halaman daftar dinamai `.index.tsx`** — sebagai `<nama>.tsx` ia jadi PARENT bagi anaknya, dan tanpa `<Outlet/>` halaman anak tidak muncul sama sekali sementara typecheck, lint, dan build tetap hijau.
- **Database lokal BUKAN database produksi.** `.env` menunjuk branch Neon `ep-quiet-truth-ay3l5473`; produksi memakai `ep-curly-cloud-ay2ryd8w`. Semua verifikasi di plan ini berlaku untuk database lokal saja.

---

## Keputusan yang menentukan bentuk plan ini

### 1. Unggah dari BROWSER, bukan lewat server fn

Fungsi Vercel membatasi body permintaan pada **4,5 MB**. Foto ponsel modern rutin 3–6 MB, jadi jalur "kirim berkas ke server fn lalu server yang `put()` ke Blob" akan gagal pada sebagian besar foto sungguhan — dan gagalnya di tengah unggah, setelah pengurus menunggu.

`@vercel/blob/client` `upload()` mengirim berkas **langsung** dari browser ke Blob. Server hanya menerbitkan token berumur pendek lewat `handleUpload`. Batas 4,5 MB tidak berlaku, dan berkasnya tidak melewati fungsi sama sekali.

Konsekuensinya untuk keamanan: **gerbang ada di penerbitan token**, bukan di jalur berkas. `onBeforeGenerateToken` WAJIB memanggil `ensureAdmin()` dan membatasi tipe konten serta ukuran di sana. Membatasi di klien saja tidak menahan apa pun — siapa pun bisa memanggil endpointnya langsung.

### 2. Ada DUA jenis URL gambar, dan hanya satu yang boleh dihapus dari Blob

18 foto seed tersimpan sebagai berkas statis di `public/gallery/*.jpg` dan dirujuk sebagai `/gallery/<nama>.jpg`. Foto baru akan berupa URL Blob (`https://<id>.public.blob.vercel-storage.com/...`).

Menghapus item lama tidak boleh mencoba menghapusnya dari Blob — berkasnya tidak ada di sana, dan panggilannya akan gagal atau (lebih buruk) menghapus sesuatu yang tak diduga. Sebaliknya, menghapus item baru TANPA menghapus blob-nya meninggalkan berkas yatim yang terus dibayar selamanya.

### 3. `BLOB_READ_WRITE_TOKEN` tetap opsional di `env.ts`

Ia sudah `.optional()` di sana. Jangan dijadikan wajib: itu akan membuat seluruh aplikasi — termasuk halaman publik — menolak menyala di lingkungan yang tidak butuh unggah. Yang benar: route unggah yang menolak dengan pesan jelas saat tokennya tidak ada.

---

## File Structure

| File | Tanggung jawab |
|---|---|
| `src/lib/unggah.ts` (create) | Tipe & ukuran yang diizinkan, deteksi URL Blob |
| `tests/unit/unggah.test.ts` (create) | Uji validasi & deteksi |
| `src/routes/api/blob/upload.ts` (create) | `handleUpload` + gerbang admin |
| `src/features/gallery/admin-queries.ts` (create) | Baca album & item untuk dashboard |
| `src/features/gallery/mutations.ts` (create) | CRUD album & item, urutkan, hapus blob |
| `src/components/admin/unggah-gambar.tsx` (create) | Tombol unggah + pratinjau + progres |
| `src/routes/admin._app.galeri.index.tsx` (create) | Daftar album |
| `src/routes/admin._app.galeri.baru.tsx` (create) | Buat album |
| `src/routes/admin._app.galeri.$id.tsx` (create) | Ubah album + kelola item |
| `tests/e2e/admin-galeri.spec.ts` (create) | Alur end-to-end |
| `messages/{id,en}.json` (modify) | Kunci UI |
| `tests/e2e/admin.spec.ts` (modify) | Daftar gerbang |

---

## Task 1: Aturan unggah sebagai satu sumber

Tipe dan ukuran yang diizinkan dipakai di DUA tempat — klien (untuk menolak lebih awal dan memberi pesan) dan server (untuk benar-benar menahan). Didefinisikan sekali, seperti `ALLOWED_TAGS` di 3c dan `SETTING_SCHEMAS` di 3d.

**Files:**
- Create: `src/lib/unggah.ts`
- Test: `tests/unit/unggah.test.ts`

**Interfaces:**
- Produces: `TIPE_GAMBAR`, `MAKS_GAMBAR_BYTE`, `adalahUrlBlob(url)`, `pesanTolakan(file)`.

- [ ] **Step 1: Tulis test yang gagal**

`tests/unit/unggah.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { TIPE_GAMBAR, MAKS_GAMBAR_BYTE, adalahUrlBlob, pesanTolakan } from '@/lib/unggah'

describe('TIPE_GAMBAR', () => {
  it('hanya format yang benar-benar bisa dirender browser', () => {
    expect([...TIPE_GAMBAR].sort()).toEqual(
      ['image/avif', 'image/jpeg', 'image/png', 'image/webp'].sort(),
    )
  })

  // SVG sengaja TIDAK diizinkan: ia dokumen aktif yang bisa memuat <script>,
  // dan disajikan dari domain blob ia berjalan di origin itu.
  it('menolak SVG', () => {
    expect(TIPE_GAMBAR).not.toContain('image/svg+xml')
  })
})

describe('pesanTolakan', () => {
  const berkas = (type: string, size: number) => ({ type, size, name: 'f' }) as File

  it('menerima JPEG berukuran wajar', () => {
    expect(pesanTolakan(berkas('image/jpeg', 2_000_000))).toBeNull()
  })

  it('menolak tipe di luar daftar', () => {
    expect(pesanTolakan(berkas('application/pdf', 1000))).toBe('TIPE_TIDAK_DIDUKUNG')
  })

  it('menolak berkas melebihi batas', () => {
    expect(pesanTolakan(berkas('image/jpeg', MAKS_GAMBAR_BYTE + 1))).toBe('TERLALU_BESAR')
  })

  it('menerima tepat di batas', () => {
    expect(pesanTolakan(berkas('image/jpeg', MAKS_GAMBAR_BYTE))).toBeNull()
  })
})

describe('adalahUrlBlob', () => {
  // Menghapus item yang menunjuk berkas statis tidak boleh memanggil Blob:
  // berkasnya tidak ada di sana. Sebaliknya, melewatkan URL Blob saat menghapus
  // meninggalkan berkas yatim yang terus dibayar.
  it('mengenali URL Vercel Blob', () => {
    expect(adalahUrlBlob('https://abc123.public.blob.vercel-storage.com/foto-x.jpg')).toBe(true)
  })

  it('menolak berkas statis di public/', () => {
    expect(adalahUrlBlob('/gallery/761546284_1774904490204016.jpg')).toBe(false)
  })

  it('menolak domain lain yang menyerupai', () => {
    expect(adalahUrlBlob('https://blob.vercel-storage.com.jahat.test/x.jpg')).toBe(false)
  })

  it('menolak nilai kosong', () => {
    expect(adalahUrlBlob('')).toBe(false)
    expect(adalahUrlBlob(null)).toBe(false)
  })
})
```

- [ ] **Step 2: Jalankan test — pastikan GAGAL**

Run: `pnpm test tests/unit/unggah.test.ts`
Expected: FAIL — modul `@/lib/unggah` belum ada.

- [ ] **Step 3: Tulis modulnya**

`src/lib/unggah.ts`:

```ts
/**
 * Aturan unggah — SATU sumber untuk klien dan server.
 *
 * Klien memakainya untuk menolak lebih awal dengan pesan yang bisa dibaca;
 * server memakainya untuk benar-benar menahan. Kalau keduanya disalin terpisah,
 * yang menyimpang adalah batas keamanan, dan menyimpangnya tidak terlihat
 * sampai ada yang memanfaatkannya.
 */

/**
 * SVG sengaja tidak ada di daftar. Ia dokumen aktif yang bisa memuat `<script>`,
 * dan disajikan dari domain blob ia berjalan di origin domain itu.
 */
export const TIPE_GAMBAR = ['image/jpeg', 'image/png', 'image/webp', 'image/avif'] as const

/** 10 MB — di atas foto ponsel pada umumnya, di bawah ukuran yang bikin galeri berat. */
export const MAKS_GAMBAR_BYTE = 10 * 1024 * 1024

export type KodeTolakan = 'TIPE_TIDAK_DIDUKUNG' | 'TERLALU_BESAR'

/** `null` bila berkasnya boleh; selain itu KODE, bukan kalimat siap-tampil. */
export function pesanTolakan(file: File): KodeTolakan | null {
  if (!(TIPE_GAMBAR as readonly string[]).includes(file.type)) return 'TIPE_TIDAK_DIDUKUNG'
  if (file.size > MAKS_GAMBAR_BYTE) return 'TERLALU_BESAR'
  return null
}

/**
 * `true` hanya untuk URL yang benar-benar milik Vercel Blob.
 *
 * Dicek lewat `URL.hostname` yang sudah di-parse, bukan `includes()`:
 * `includes('blob.vercel-storage.com')` juga cocok dengan
 * `https://blob.vercel-storage.com.jahat.test/x` — host milik penyerang.
 */
export function adalahUrlBlob(url: string | null | undefined): boolean {
  if (!url) return false
  try {
    return new URL(url).hostname.endsWith('.blob.vercel-storage.com')
  } catch {
    return false
  }
}
```

- [ ] **Step 4: Jalankan test — pastikan LULUS**

Run: `pnpm test tests/unit/unggah.test.ts`
Expected: PASS (10 test).

- [ ] **Step 5: Gerbang + commit**

```bash
pnpm lint && pnpm typecheck && pnpm test && pnpm build
git add src/lib/unggah.ts tests/unit/unggah.test.ts
git commit -m "Tambah aturan unggah sebagai satu sumber

Tipe dan ukuran dipakai klien untuk menolak lebih awal dan server untuk
benar-benar menahan. Kalau keduanya disalin terpisah, yang menyimpang adalah
batas keamanan — dan menyimpangnya tidak terlihat sampai ada yang
memanfaatkannya.

SVG tidak diizinkan: ia dokumen aktif yang bisa memuat <script>, dan disajikan
dari domain blob ia berjalan di origin domain itu.

adalahUrlBlob memeriksa hostname yang sudah di-parse, bukan includes():
includes('blob.vercel-storage.com') juga cocok dengan
blob.vercel-storage.com.jahat.test — host milik penyerang."
```

---

## Task 2: Route penerbit token unggah

**Files:**
- Create: `src/routes/api/blob/upload.ts`
- Modify: `package.json` (tambah `@vercel/blob`)

**Interfaces:**
- Consumes: `ensureAdmin`, `TIPE_GAMBAR`, `MAKS_GAMBAR_BYTE`.
- Produces: `POST /api/blob/upload`.

- [ ] **Step 1: Pasang paket**

```bash
pnpm add @vercel/blob
```

- [ ] **Step 2: Tulis route**

`src/routes/api/blob/upload.ts`:

```ts
import { createFileRoute } from '@tanstack/react-router'

/**
 * Penerbit token unggah Vercel Blob.
 *
 * Berkasnya TIDAK pernah melewati route ini — browser mengirimnya langsung ke
 * Blob. Route ini hanya menerbitkan token berumur pendek. Itu disengaja: fungsi
 * Vercel membatasi body permintaan pada 4,5 MB, sementara foto ponsel modern
 * rutin 3–6 MB, jadi jalur "kirim ke server dulu" akan gagal pada sebagian
 * besar foto sungguhan — dan gagalnya setelah pengurus menunggu unggahan.
 *
 * Karena berkasnya tidak lewat sini, GERBANGNYA ADA DI PENERBITAN TOKEN.
 * `onBeforeGenerateToken` memanggil `ensureAdmin()` dan mengunci tipe serta
 * ukuran di sana. Membatasi di klien saja tidak menahan apa pun: siapa pun bisa
 * memanggil endpoint ini langsung.
 *
 * `@/lib/auth` & `@/lib/env` di-import LAZY dengan alasan yang sama seperti di
 * `api/auth/$.ts` — lihat docblock di sana.
 */
async function tangani(request: Request): Promise<Response> {
  const { handleUpload } = await import('@vercel/blob/client')
  const { TIPE_GAMBAR, MAKS_GAMBAR_BYTE } = await import('@/lib/unggah')

  const body = await request.json()

  try {
    const hasil = await handleUpload({
      request,
      body,
      onBeforeGenerateToken: async () => {
        // Gerbang sesungguhnya. Tanpa ini endpoint jadi penyimpanan berkas
        // gratis untuk siapa pun yang menemukannya.
        const { ensureAdmin } = await import('@/lib/auth.functions')
        await ensureAdmin()
        return {
          allowedContentTypes: [...TIPE_GAMBAR],
          maximumSizeInBytes: MAKS_GAMBAR_BYTE,
          addRandomSuffix: true,
        }
      },
      onUploadCompleted: async () => {
        // Tidak ada yang perlu dilakukan: baris `gallery_items` ditulis oleh
        // mutasi terpisah setelah klien menerima URL-nya. Callback ini hanya
        // dipanggil Vercel di produksi (butuh URL publik), jadi menaruh
        // penulisan database di sini akan membuat alur ini mustahil diuji lokal.
      },
    })
    return Response.json(hasil)
  } catch (err) {
    // Jangan telan jadi 500 tanpa jejak — pelajaran dari insiden auth 3d.
    const pesan = err instanceof Error ? err.message : String(err)
    console.error('[api/blob/upload] gagal:', pesan, err)
    return Response.json({ error: pesan }, { status: 400 })
  }
}

export const Route = createFileRoute('/api/blob/upload')({
  server: { handlers: { POST: ({ request }: { request: Request }) => tangani(request) } },
})
```

- [ ] **Step 3: Buktikan gerbangnya menahan**

Tambahkan ke `tests/e2e/admin.spec.ts`:

```ts
test('/api/blob/upload tanpa sesi → tidak menerbitkan token', async ({ request }) => {
  const res = await request.post('/api/blob/upload', {
    data: { type: 'blob.generate-client-token', payload: { pathname: 'x.jpg', callbackUrl: '' } },
  })
  expect(res.status()).not.toBe(200)
  expect(await res.text()).not.toContain('clientToken')
})
```

Run: `pnpm test:e2e tests/e2e/admin.spec.ts --project=chromium`
Expected: PASS — tanpa sesi, token tidak pernah terbit.

- [ ] **Step 4: Gerbang + commit**

```bash
pnpm lint && pnpm typecheck && pnpm test && pnpm build
git add package.json pnpm-lock.yaml src/routes/api/blob/ tests/e2e/admin.spec.ts
git commit -m "Tambah penerbit token unggah Vercel Blob

Berkasnya tidak pernah melewati route ini — browser mengirimnya langsung ke
Blob, dan route ini hanya menerbitkan token berumur pendek. Fungsi Vercel
membatasi body permintaan pada 4,5 MB sementara foto ponsel rutin 3-6 MB, jadi
jalur 'kirim ke server dulu' akan gagal pada sebagian besar foto sungguhan.

Karena berkasnya tidak lewat sini, gerbangnya ada di penerbitan token:
onBeforeGenerateToken memanggil ensureAdmin dan mengunci tipe serta ukuran di
sana. Membatasi di klien saja tidak menahan apa pun — siapa pun bisa memanggil
endpoint ini langsung. Dikunci e2e: tanpa sesi, token tidak pernah terbit."
```

---

## Task 3: Query admin galeri

**Files:**
- Create: `src/features/gallery/admin-queries.ts`

**Interfaces:**
- Produces: `listAlbumsForAdmin()`, `getAlbumForAdmin(id)` (album + item terurut).

- [ ] **Step 1: Tulis modulnya**

Ikuti pola `src/features/master/admin-queries.ts`: `createServerFn` + `ensureAdmin()` di dalam tiap handler (route yang dijaga tidak menghalangi panggilan langsung lewat HTTP), import `@/db` lazy, `Date` diubah jadi ISO string sebelum menyeberang.

- `listAlbumsForAdmin` — semua album termasuk draf, terurut `sortOrder`, dengan `itemCount`.
- `getAlbumForAdmin(id)` — satu album plus seluruh itemnya terurut `sortOrder`.

- [ ] **Step 2: Gerbang + commit**

---

## Task 4: Mutasi album & item

**Files:**
- Create: `src/features/gallery/mutations.ts`
- Modify: `tests/unit/unggah.test.ts` (atau berkas uji baru untuk skema)

**Interfaces:**
- Produces: `albumInputSchema`, `createAlbum`, `updateAlbum`, `setAlbumStatus`, `deleteAlbum`, `itemInputSchema`, `addItem`, `updateItem`, `deleteItem`, `reorderItems`.

- [ ] **Step 1: Tulis test yang gagal**

Uji yang penting:

- `itemInputSchema` menolak `type: 'image'` tanpa `imageUrl`.
- menolak `type: 'youtube'` tanpa `youtubeUrl`.
- menolak `youtubeUrl` yang `youtubeId()` tak bisa baca — komponen galeri merender embed dari id itu, jadi URL yang tak terbaca menghasilkan bingkai kosong tanpa error.
- `albumInputSchema` menolak judul kosong dan tanggal tak sah.
- `reorderItems` menolak daftar id yang memuat duplikat.

- [ ] **Step 2–4: Jalankan merah, tulis, jalankan hijau**

Catatan penting untuk `deleteItem` dan `deleteAlbum`:

```ts
/**
 * Hapus baris DAN berkasnya di Blob — tapi hanya kalau berkasnya memang di sana.
 *
 * Ada dua jenis URL gambar di tabel ini. 18 foto seed menunjuk berkas statis
 * `/gallery/*.jpg` yang di-commit ke repo; foto baru menunjuk Vercel Blob.
 * Memanggil `del()` untuk yang pertama akan gagal, dan melewatkannya untuk yang
 * kedua meninggalkan berkas yatim yang terus dibayar selamanya.
 *
 * `del()` dibungkus try/catch sendiri: berkas yang sudah lenyap tidak boleh
 * menggagalkan penghapusan barisnya — baris yang tertinggal justru menampilkan
 * gambar rusak di situs publik.
 */
```

`deleteAlbum` menghapus seluruh item lewat `onDelete: 'cascade'` di FK, jadi blob tiap item harus dikumpulkan dan dihapus SEBELUM barisnya hilang.

- [ ] **Step 5: Gerbang + commit**

---

## Task 5: Komponen unggah gambar

**Files:**
- Create: `src/components/admin/unggah-gambar.tsx`
- Modify: `messages/{id,en}.json`

**Interfaces:**
- Consumes: `@vercel/blob/client` `upload()`, `pesanTolakan`.
- Produces: `<UnggahGambar value onChange label />`.

- [ ] **Step 1: Kunci pesan**

```json
"admin_upload_choose": "Pilih gambar",
"admin_upload_replace": "Ganti gambar",
"admin_upload_uploading": "Mengunggah… {persen}%",
"admin_upload_remove": "Hapus gambar",
"admin_upload_too_large": "Gambar melebihi 10 MB. Perkecil dulu, lalu coba lagi.",
"admin_upload_bad_type": "Format tidak didukung. Pakai JPEG, PNG, WebP, atau AVIF.",
"admin_upload_failed": "Unggah gagal. Coba lagi.",
"admin_upload_no_token": "Penyimpanan berkas belum dikonfigurasi di server."
```

Inggris: padanan langsung.

- [ ] **Step 2: Bangun komponennya**

- `<input type="file" accept>` disembunyikan, dipicu tombol berlabel — `accept` hanya memandu pemilih berkas, bukan jaminan; `pesanTolakan()` yang benar-benar menolak sebelum unggah dimulai.
- `upload(namaBerkas, file, { access: 'public', handleUploadUrl: '/api/blob/upload', onUploadProgress })`.
- Progres ditampilkan di wilayah `role="status"` `aria-live="polite"` — foto besar di jaringan lambat butuh puluhan detik, dan tanpa umpan balik pengurus akan menekan tombolnya berkali-kali.
- Setelah berhasil, panggil `onChange(url)`. Komponen ini TIDAK menyentuh database; halaman yang memanggilnya yang menyimpan.
- Pratinjau memakai `<img>` biasa dengan `alt` dari caption bila ada.

**Kesalahan yang harus dihindari:** jangan menonaktifkan tombol Simpan halaman selagi mengunggah tanpa memberi tahu alasannya. Tombol mati tanpa penjelasan terbaca sebagai aplikasi rusak.

- [ ] **Step 3: Gerbang + commit**

---

## Task 6: Halaman daftar album & buat album

**Files:**
- Create: `src/routes/admin._app.galeri.index.tsx`, `src/routes/admin._app.galeri.baru.tsx`
- Modify: `src/components/admin/admin-shell.tsx`, `tests/e2e/admin.spec.ts`, `messages/{id,en}.json`

- [ ] **Step 1: Kunci pesan** — judul, kolom tabel, tombol, konfirmasi hapus.

- [ ] **Step 2: Daftar album** — `<Table>`: sampul kecil, judul (ID), tanggal, jumlah item, status, aksi (Ubah, Terbitkan/Tarik, Hapus lewat `<Dialog>`).

- [ ] **Step 3: Buat album** — judul ID & EN, tanggal, urutan, status; sampul lewat `<UnggahGambar>`.

- [ ] **Step 4: Naikkan `/admin/galeri` ke `<Link>`** di `admin-shell.tsx`.

**Perbandingan eksplisit, bukan `daftar.includes(...)`**: `includes` mengembalikan boolean biasa dan tidak menyempitkan tipe `item.href`, sehingga `<Link to>` menolaknya. Dicoba dan ditolak typecheck di 3c.

- [ ] **Step 5: Tambahkan `/admin/galeri` dan `/admin/galeri/baru` ke daftar gerbang.**

- [ ] **Step 6: Gerbang + commit**

---

## Task 7: Editor album — kelola item

**Files:**
- Create: `src/routes/admin._app.galeri.$id.tsx`

- [ ] **Step 1: Bangun halaman**

Dua bagian:

**Detail album** — form yang sama dengan halaman buat, plus tombol Simpan.

**Item** — daftar terurut. Tiap baris: pratinjau (gambar atau thumbnail YouTube), caption ID & EN, tombol Naik/Turun, tombol Hapus. Di bawahnya dua cara menambah: **Unggah gambar** dan **Tambah tautan YouTube**.

Urutan memakai tombol Naik/Turun, **bukan drag-and-drop**: drag tidak bisa dioperasikan lewat papan ketik tanpa kerja tambahan yang besar, dan tombol arah langsung benar untuk pembaca layar. Tiap penekanan menyimpan urutan baru lewat `reorderItems`.

Tipe `youtube` sudah didukung komponen galeri sejak Rencana 2b tapi tak pernah terpakai sejak item contohnya dihapus — halaman ini yang akhirnya membuatnya bisa diisi.

- [ ] **Step 2: Tambahkan `/admin/galeri/$id`-nya ke daftar gerbang** (pakai id apa pun; gerbang diuji lewat redirect, bukan isi).

- [ ] **Step 3: Verifikasi lewat probe Playwright sementara**

Probe yang masuk sebagai admin, membuat album, **mengunggah berkas sungguhan** (pakai `public/gallery/*.jpg` yang sudah ada sebagai sumber), memastikan URL-nya berasal dari Blob, lalu menghapus albumnya. **Hapus probe sebelum commit**, dan periksa langsung ke database bahwa tidak ada album uji tertinggal.

- [ ] **Step 4: Gerbang + commit**

---

## Task 8: E2E alur galeri

**Files:**
- Create: `tests/e2e/admin-galeri.spec.ts`

- [ ] **Step 1: Tulis alurnya**

Baca `tests/e2e/admin-master.spec.ts` lebih dulu dan tiru strukturnya — ia memuat pola yang mahal dipelajari:

- `test.describe.configure({ mode: 'serial' })`, `test.setTimeout(180_000)`, dibatasi `chromium`
- helper `warm()`
- **penanda unik per run** dari `Date.now()`
- **tunggu konfirmasi sebelum berpindah halaman** — tanpa itu `goto` berangkat selagi mutasinya masih di jalan, loader membaca nilai lama, dan asersi gagal walau tulisnya berhasil
- **muat ulang daftar dari server** sebelum memeriksa halaman publik
- **filter pembersihan TANPA anchor `^`** — teks baris tabel dimulai dengan kolom pertama

Alur:

1. **Album draf tidak bocor ke publik.** Buat album draf → `/galeri` tidak memuatnya → terbitkan → muncul → hapus → hilang dari keduanya. Ini alur paling berharga; draf adalah satu-satunya hal yang memisahkan "pengurus sedang menyusun" dari "jemaat melihat album yang belum siap".
2. **Unggah sungguhan sampai ke halaman publik.** Unggah satu foto, terbitkan albumnya, lalu buktikan `<img>` dengan URL Blob itu benar-benar muncul di `/galeri/<id>`.
3. **Tautan YouTube bisa ditambahkan dan dirender.**

- [ ] **Step 2: Buktikan test benar-benar menangkap**

Untuk alur 1, sementara buat `setAlbumStatus` mengabaikan statusnya.
Expected: **GAGAL** — album draf muncul di `/galeri`.
Kembalikan, jalankan ulang, pastikan hijau. Salin kedua output ke laporan.

- [ ] **Step 3: Pastikan tidak ada sisa**

Periksa langsung ke database: album uji 0, item uji 0. Dan periksa daftar blob: berkas uji sudah terhapus, bukan sekadar barisnya.

- [ ] **Step 4: Gerbang penuh + commit**

Jalankan `pnpm test:e2e` sendirian, DUA KALI berturut-turut.

---

## Setelah plan ini

Lapisan unggah kini ada dan terbukti. Yang menyusul memakainya, masing-masing kecil:

- **PDF warta** (`bulletins.pdfUrl`) — ganti isian URL dengan `<UnggahBerkas>`; butuh `application/pdf` ditambahkan ke daftar tipe.
- **Sampul renungan** (`devotionals.coverImageUrl`) — langsung pakai `<UnggahGambar>` apa adanya.
- **PDF tata ibadah** (`worship_services.liturgyPdfUrl`) — sama seperti PDF warta.

Utang yang masih berlaku:

- **Alias `muted`/`accent` di bawah AA** (2.95:1 terang, 2.03:1 gelap). Plan ini menambah satu tabel lagi. **Utang paling mendesak yang tersisa.**
- **E2E menulis ke database yang melayani lokal**, dan kini juga ke penyimpanan Blob sungguhan. Database test terpisah tetap jawaban yang sebenarnya.
- **`<Toaster>` belum terpasang**; halaman-halaman memakai `role="status"`.
- **Terbitkan-massal untuk 72 draf generator.**
- **`?diag=1` di `api/auth/$.ts`** masih menyingkap pesan galat internal ke siapa pun yang tahu flag-nya. Insidennya sudah selesai — pencatatan log layak dipertahankan, penyingkapannya sebaiknya dicabut.

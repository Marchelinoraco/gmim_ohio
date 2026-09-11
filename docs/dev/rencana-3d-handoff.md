# Rencana 3d — master data & pesan selesai. Handoff ke rencana berikutnya

Pengurus sekarang bisa mengisi sendiri seluruh data yang selama ini kosong atau
placeholder, dan membaca pesan yang masuk. Dokumen ini mencatat apa yang terbukti
bekerja, apa yang sengaja tidak dikerjakan, dan utang yang ditemukan sepanjang
jalan.

## 1. Apa yang sudah ada dan terbukti bekerja

| Hal | Bukti |
|---|---|
| `SETTING_SCHEMAS` dipakai jalur baca DAN tulis | 20 unit test di `tests/unit/master-validation.test.ts` |
| Warna kategori tak bisa diisi hex | e2e memeriksa keenam opsi cocok `^var\(--color-cat-[a-z-]+\)$` dan tak ada `input[type=color]` |
| Pengaturan sampai ke halaman publik | e2e mengubah `contact_info.email` → muncul di `/kunjungi` → dikembalikan; **diverifikasi merah lebih dulu** dengan membuat `updateSetting` mengabaikan nilainya |
| Alur pesan `new → read → done` | e2e mengirim form kontak sungguhan dari `/kunjungi`, menandai, membaca penuh, menghapus |
| `updatedBy` terisi | diperiksa langsung di database setelah probe — kolom itu ada sejak Rencana 1 tapi baru sekarang dipakai |
| Tak ada sisa data uji | probe database setelah suite penuh: pesan 0, `contact_info` dan `social_links` persis seperti semula, kolom 4, kategori 6 |

Suite: **262 unit**, **151 e2e lulus + 9 skipped**.

## 2. Yang sengaja TIDAK dikerjakan

- **Kategori tidak bisa ditambah atau dihapus.** `worship_categories.key` adalah
  pgEnum enam nilai; menambah kategori menuntut migrasi. Halamannya tidak punya
  tombol Tambah, dan alasannya ditulis di halaman supaya pengurus tahu sebelum
  mencarinya.
- **`schedule_templates` masih belum punya UI** (ditunda sejak 3b).
- **Lapisan unggah** — PDF tata ibadah, PDF warta, sampul renungan, foto galeri.
  Ditunda bersama supaya ditulis sekali.

## 3. Utang yang masih berlaku

### 3.1 Alias `muted`/`accent` di bawah AA — kini terlihat di enam halaman

Kontras baris terpilih 2.95:1 terang dan 2.03:1 gelap. Rencana ini menambah tiga
tabel lagi (`/admin/master` dua, `/admin/pesan` satu), jadi masalahnya sekarang
tampil di enam halaman. **Ini utang paling mendesak yang tersisa** dan sebaiknya
dibereskan sebelum tabel berikutnya ditambahkan.

### 3.2 E2E menulis ke database yang melayani situs live

Rencana ini menambah tiga alur, salah satunya mengubah pengaturan yang dibaca
jemaat lalu mengembalikannya. Pemulihannya diasersi, dan database diperiksa
bersih setelah suite penuh — tapi database test terpisah tetap jawaban yang
sebenarnya.

### 3.3 Flake dev server: `Body is unusable: Body has already been read`

Terlihat **sekali dari dua** run suite penuh, di `admin-jadwal.spec.ts` (spec
lama yang tidak disentuh rencana ini). Spec itu **lulus saat dijalankan
sendirian**, dan galatnya berasal dari `serverFnFetcher` TanStack Start, bukan
dari asersi aplikasi — artefak dev server di bawah beban paralel, bukan cacat
aplikasi. Build produksi tidak punya transform on-demand.

Rencana ini menambah tiga test admin, jadi beban paralelnya memang naik.

Catatan yang belum ditindaklanjuti: `playwright.config.ts` menetapkan
`trace: 'on-first-retry'` **tanpa** `retries`, yang default-nya 0 — jadi baris
trace itu tidak pernah bisa aktif. Entah retries yang perlu ditambahkan, entah
baris trace itu yang menyesatkan. Sengaja tidak diubah di rencana ini: menambah
retries akan menyembunyikan sinyal sebelum penyebabnya dipahami.

### 3.4 Situs publik ikut terender di halaman admin

Terlihat di snapshot Playwright: `/admin/pengaturan` merender header publik
lengkap (navigasi Beranda/Tentang/Pelayanan, tombol tema, pemilih bahasa) DI ATAS
shell dashboard. Pemilih bahasanya menunjuk `/en/admin/pengaturan`. Ini berlaku
untuk seluruh halaman admin, bukan hanya yang baru, jadi bukan bawaan rencana ini
— tapi belum pernah dicatat di mana pun.

### 3.5 `<Toaster>` masih belum terpasang

Halaman-halaman rencana ini memakai wilayah `role="status"` `aria-live="polite"`,
bukan `toast()`, karena `toast()` tidak akan terlihat sama sekali.

### 3.6 Terbitkan-massal untuk 72 draf generator

Masih harus diterbitkan satu per satu.

## 4. Referensi

- Rencana: `docs/superpowers/plans/2026-09-12-rencana-3d-master-data.md`
- Spec: `docs/superpowers/specs/2026-09-07-rencana-3-admin-dashboard.md` (§Fase 5)
- Handoff sebelumnya: `docs/dev/rencana-3a-handoff.md`

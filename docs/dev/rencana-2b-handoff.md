# Rencana 2b — selesai. Handoff ke Rencana 3

**Tanggal:** 2026-09-06
**Status:** semua task (1–15) selesai, di-review, fix round konsolidasi diterapkan. Cabang `feat/rencana-2b` siap merge — **cabang inilah yang meluncurkan situs publik**.

Dokumen ini melanjutkan `docs/dev/rencana-1-handoff.md` (yang masih menggambarkan situs sebagai coming-soon; bagian itu sudah basi — baca yang di sini).

## 1. Status peluncuran

`SITE.comingSoon` (`src/config/site.ts`) = **`false`**. Yang ikut aktif karenanya:

| Aktif | Di mana |
|---|---|
| Nav header 7 menu + CTA Ibadah Live/Persembahan + hamburger mobile | `src/components/layout/site-header.tsx` |
| Peta situs di footer (`<SiteMapFooter>`) | `src/components/layout/site-footer.tsx` |
| `sitemap.xml` penuh — 10 path statis + entri dinamis warta/renungan/galeri/jadwal/pelayanan | `src/routes/sitemap[.]xml.ts` |
| `noindex` MATI — `pageMeta` tak lagi memancarkan tag `robots` | `src/lib/seo.ts` |

Halaman publik yang kini live: `/`, `/tentang`, `/pelayanan`, `/pelayanan/<slug>`, `/pelayanan/kolom`, `/jadwal`, `/jadwal/<id>`, `/warta`, `/warta/<id>`, `/renungan`, `/renungan/<slug>`, `/galeri`, `/galeri/<id>`, `/kunjungi`, `/persembahan`, `/ibadah-live`.

**Situs publik `gmimmusafir.org` baru benar-benar berubah setelah cabang ini di-merge ke `master` dan Vercel men-deploy-nya.** Sampai saat itu, produksi masih menyajikan build lama.

## 2. Semantik `SITE.comingSoon` yang sebenarnya sekarang

Flag ini **bukan lagi kill-switch situs.** Saat `true` ia hanya melakukan tiga hal di tabel §1 (sembunyikan nav, sembunyikan peta situs footer, pancarkan `robots: noindex, follow`).

Yang **TIDAK** lagi dilakukannya: mengembalikan halaman "segera hadir". `src/components/site/coming-soon.tsx` dihapus di Rencana 2b dan `src/routes/index.tsx` tidak bercabang lagi. Membalik flag ke `true` hari ini menghasilkan:

- `/` **tetap** merender `<Beranda>` penuh;
- `/sitemap.xml` **tetap** memancarkan sepuluh path statis;
- tapi navigasi hilang.

Hasilnya situs **rusak**, bukan situs coming-soon: semua halaman masih ada dan masih tertaut dari beranda + sitemap, hanya tanpa cara menavigasinya. **Jangan pakai flag ini untuk "menutup" situs.**

Kalau situs benar-benar perlu ditutup: hentikan/pause deployment di Vercel, atau pasang gerbang di lapisan server (redirect/`503` untuk semua route) plus `robots.txt` yang melarang crawl. Kalau yang diinginkan memang halaman "segera hadir", komponennya harus dibangun ulang lebih dulu (lihat riwayat git sebelum Rencana 2b) dan `/` + `sitemap.xml` di-gate ulang ke flag ini.

## 3. ⚠️ Jendela kedaluwarsa data jadwal

`src/db/seed/schedule.ts` men-generate **8 minggu (56 hari)** ibadah, **relatif tanggal `pnpm db:seed` dijalankan** (`todayEastern()` s/d `+55`), bukan tanggal hardcode. Isi `dev` per hari ini: 72 baris, `2026-09-05` … `2026-10-29`.

Guard idempotennya adalah `db.$count(worshipServices) > 0 → return`. Artinya **menjalankan `pnpm db:seed` lagi TIDAK memperpanjang jendela itu** — ia langsung melewati `seedSchedule` karena tabel sudah tidak kosong.

Kira-kira dua bulan setelah tanggal seed, tanpa error dan tanpa alarm apa pun:

- `/jadwal` diam-diam jadi "Belum ada ibadah terjadwal" (`<EmptyState>`);
- section "Ibadah Minggu Ini" di beranda **menghilang** (guard `services.length > 0`);
- `/pelayanan/<slug>` dan `/pelayanan/kolom` kehilangan blok jadwalnya;
- `/ibadah-live` kembali hanya menampilkan catatan statis "siaran dimulai menjelang ibadah Minggu";
- semua entri `/jadwal/<id>` **lenyap dari `sitemap.xml`** (72 URL sekaligus) — Google akan melihatnya sebagai penghapusan konten massal.

**Cara memperpanjang** (sampai generator jadwal Rencana 3 ada):

1. Pastikan `.neon` + `.env` menunjuk branch yang benar (lihat §6 — `pnpm db:seed` menulis ke `DATABASE_URL` apa pun yang aktif).
2. Hapus baris jadwal lama supaya guard lolos:
   ```sql
   DELETE FROM worship_services;
   DELETE FROM schedule_templates;   -- lihat catatan di bawah
   ```
3. `pnpm db:seed` → jendela baru 8 minggu dari hari itu.
4. Verifikasi: `SELECT count(*) FROM worship_services;` = 72 dan
   `SELECT count(*) FROM worship_services WHERE host_family_name IS NOT NULL;` = 0.

> **Catatan `schedule_templates`:** guard idempoten `seedSchedule()` hanya melihat `worship_services`. Kalau hanya `worship_services` yang dihapus, run berikutnya akan meng-insert **set kedua** 6 baris `schedule_templates` (12 total) — duplikat yatim yang tak kelihatan dari count `worship_services` mana pun. Hapus keduanya. Aman: `worship_services.template_id` selalu `NULL` (lihat §5), jadi tak ada FK yang putus.
>
> **Peringatan:** langkah 2 juga menghapus jadwal yang sudah diedit pengurus lewat dashboard Rencana 3. Begitu dashboard ada, jalur ini harus diganti generator inkremental, bukan hapus-dan-seed-ulang.

## 4. Konten placeholder yang masih tayang & terindeks

Semua di bawah ini **live, ada di nav dan/atau sitemap, dan terindeks** sejak `noindex` mati. Inventaris jujur — bukan daftar bug, tapi daftar hal yang harus diganti data riil oleh BPMJ.

### 4.1 Halaman `/tentang` — seluruhnya placeholder

`src/routes/tentang.tsx:31` masih membawa:

```
{/* TODO: konten placeholder — ganti dengan sejarah/visi/misi/data majelis resmi dari BPMJ */}
```

Kelima section (`about_history_body`, `about_vision_body`, `about_mission_body`, `about_council_body`, `about_pastor_body` di `messages/{id,en}.json`) adalah prosa karangan yang **plausibel**. Teksnya sudah jujur di dua tempat ("Bagian ini akan dilengkapi dengan catatan sejarah resmi jemaat", "Susunan BPMJ periode berjalan akan segera ditampilkan"), tapi selebihnya dibaca sebagai sejarah resmi jemaat. Halaman ini kini live, ada di nav, ada di sitemap, dan terindeks. **Prioritas tertinggi untuk diganti.**

### 4.2 ⚠️ Renungan & warta yang diatribusikan ke orang nyata

- `src/db/seed/devotionals.ts` — 3 renungan karangan; **dua di antaranya (`renungan-1`, `renungan-3`) diatribusikan by name ke `Pdt. Allan Robot, S.Th.`**, seorang pendeta nyata yang tidak menulisnya. Terbit di `/renungan`, punya halaman detail sendiri, dan ada di `sitemap.xml`.
- `src/db/seed/bulletins.ts` — 3 warta karangan (`2026-08-30`, dst.) yang menyebut nama pendeta yang sama beserta tanggal ibadah spesifik ("Minggu depan, 6 September 2026, ibadah dipimpin oleh Pdt. Allan Robot, S.Th.") dan pengumuman yang tidak pernah ada (latihan paduan suara Jumat 19.30, ibadah pemuda daring).

Ini kelas masalah yang **sama persis** dengan nama tuan rumah dan nama pelayan yang sudah dihapus dari seed jadwal (§4.5): fabrikasi yang tampak masuk akal tentang orang nyata. Bedanya, yang ini belum ditangani. **Rekomendasi: kosongkan atau tandai jelas-jelas contoh sebelum situs dipromosikan ke jemaat.**

### 4.3 Galeri

`src/db/seed/gallery.ts` — 1 album terbit "Ibadah Jemaat & Kegiatan" (2026-08-16). Ketiga fotonya menunjuk ke `/hero/hero-poster.jpg` yang sama, dan item ke-4 adalah video YouTube `https://www.youtube.com/watch?v=dQw4w9WgXcQ` — **itu Rick Astley, "Never Gonna Give You Up"**, bercaption "Cuplikan ibadah Minggu (video contoh)". Live di `/galeri` dan bisa diputar di lightbox. Ganti atau hapus.

### 4.4 Data keuangan & kontak

- `src/db/seed/settings.ts` `giving_info` — satu rekening yang **sengaja** jelas placeholder: bank `"Bank (contoh — akan diisi pengurus)"`, nomor `XXXX-XXXX-XXXX`. Ini pola yang BENAR (tak bisa dipakai transaksi) dan sudah punya `noteId`/`noteEn` yang menjelaskannya. Biarkan begitu sampai pengurus mengisi data riil.
- `contact_info` — `phone`, `email`, `officeHoursId/En` semuanya string kosong; `/kunjungi` menyembunyikan barisnya. Jujur, tak perlu diubah.
- `social_links.facebook` di seed generik (`https://www.facebook.com/`) dan **tidak dipakai** — footer menarik dari `SITE.facebookUrl` yang benar. Instagram/YouTube kosong.
- `kolom` 1–4 (`src/db/seed/kolom.ts`) bernama "Kolom 1".."Kolom 4" tanpa koordinator. Jujur-umum; `/pelayanan/kolom` merender "(bila sudah ditunjuk)".

### 4.5 Jadwal ibadah — setelah fix round ini

- **Tuan rumah & alamat rumah: `NULL` di semua 72 baris.** Enam marga Minahasa karangan (`Kel. Mamahit`, `Kel. Rorimpandey`, `Kel. Tumbelaka`, `Kel. Wowor`, `Kel. Sondakh`, `Kel. Lumintang`) yang sebelumnya diberikan ke 56 ibadah berlokasi `rumah` **sudah dihapus dari seed dan dari `dev`**. Alasannya: jemaat diaspora Minahasa ini kecil, marga-marga itu besar kemungkinan menabrak keluarga sungguhan, dan situs live mengumumkan ibadah diadakan di rumah mereka — termasuk sebagai `Place.name` di JSON-LD `Event` yang di-crawl Google lewat sitemap.
  **Konsekuensi yang harus diketahui pengurus:** semua ibadah rumah (Kaum Ibu, Kaum Bapa, Pemuda & Remaja, Kolom) kini menampilkan **"Lokasi menyusul" / "Location to be announced"** sampai data riil diisi lewat dashboard Rencana 3. Ini disengaja dan lebih baik daripada nama karangan.
  Efek samping yang belum ditangani: pada beranda, empat ibadah Kolom di tanggal yang sama kini terlihat nyaris identik (badge "Kolom", jam sama, "Lokasi menyusul") — `<ServiceCard>` tidak merender `kolom.name` maupun `locationNote`. Pertimbangkan menampilkan nama kolom di kartu saat Rencana 3 menyentuh komponen itu.
- **Pelayan Firman & Pemimpin Ibadah: `NULL` di semua baris** (sudah sejak Task 3) → dirender "Akan diumumkan".
- **Tema & bacaan Alkitab: karangan.** Empat pasang tema id/en (`Hidup dalam Syukur`, `Dipanggil untuk Melayani`, `Damai Sejahtera di Tengah Perubahan`, `Kasih yang Menyembuhkan`) dan empat bacaan (`Mazmur 23:1-6`, `2 Korintus 12:9-10`, `1 Tesalonika 5:16-18`, `Yohanes 15:9-12`) diputar berurutan lintas 72 ibadah. Tampil di kartu, di halaman detail, DAN sebagai `<title>`/`og:title`/`description` halaman `/jadwal/<id>` yang terindeks. Bukan fabrikasi tentang orang, tapi tetap mengumumkan tema ibadah yang belum diputuskan siapa pun.
- **`liturgyPdfUrl`: `NULL` di semua baris** — tombol unduh tata ibadah tak pernah muncul. Ini yang selama ini menyembunyikan bug `<a>` bersarang di `<ServiceCard>` (sudah diperbaiki di fix round ini).

## 5. ⚠️ Untuk Rencana 3 — index `ws_template_date_uq` salah bentuk

`src/db/schema/worship.ts:92`:

```ts
uniqueIndex('ws_template_date_uq').on(t.templateId, t.serviceDate)
```

Unique pada `(templateId, serviceDate)` **tidak kompatibel dengan fan-out kolom**: kategori `kolom` butuh SATU ibadah per kolom aktif per tanggal — 4 baris, tanggal sama, template sama. Baris ke-2 dan seterusnya akan bentrok index ini.

Cabang ini menghindarinya dengan menyetel **`templateId: null` di SEMUA baris yang di-generate** (Postgres menganggap NULL distinct, jadi tak pernah bentrok). Harganya: **hilangnya keterhubungan template → ibadah.** `schedule_templates` tetap dibuat dan disimpan sebagai catatan pola jadwal mingguan, tapi tak ada satu pun `worship_services` yang merujuk balik ke sana — jadi tak ada cara query "ibadah mana yang lahir dari template mana".

Bentuk yang benar adalah **`(templateId, serviceDate, kolomId)`**.

**Perbaiki lewat migrasi SEBELUM Rencana 3 menulis generator jadwal di atas asumsi yang salah.** Generator yang mengandalkan index ini untuk idempotensi (upsert `onConflictDoNothing` per template+tanggal) akan diam-diam kehilangan 3 dari 4 ibadah kolom kalau bentuknya belum dibetulkan.

## 6. Pertanyaan terbuka untuk pemilik proyek — jalur data produksi

`.neon` ter-pin ke branch **`dev`** (`{"projectId":"late-night-27741746","branch":"dev"}`), `.env` `NEON_BRANCH=dev`, dan `pnpm db:seed` menulis ke `DATABASE_URL` **apa pun yang sedang aktif** — tanpa konfirmasi, tanpa gerbang environment. Semua verifikasi di rencana ini dilakukan terhadap `dev`.

Belum terjawab, dan **jangan ditebak**:

1. **Database mana yang dilayani produksi?** `docs/dev/rencana-1-handoff.md` §RUNBOOK mengasumsikan Neon branch `production` + `DATABASE_URL` produksi di Vercel, tapi tak ada catatan bahwa langkah itu pernah dijalankan.
2. **Siapa yang menjalankan migrasi ke sana, dan kapan?** Per Rencana 1, migrasi `0000`+`0001` diterapkan ke `dev` saja. Migrasi Rencana 2a/2b belum tercatat pernah diterapkan ke branch mana pun selain `dev`.
3. **Apakah `pnpm db:seed` dijalankan di produksi?** Kalau ya — **konten placeholder mana yang boleh ikut?** Kategori ibadah, kolom, dan `site_settings` jelas harus ada. Warta/renungan/galeri/jadwal placeholder (§4) hampir pasti TIDAK boleh, dengan alasan yang sama seperti §4.2.
4. **Kalau seed produksi dilewati sama sekali, siapa mengisi 6 kategori + 4 kolom + 7 setting?** Tanpa itu `/pelayanan`, `/jadwal`, dan `/persembahan` akan kosong atau error saat pertama live.

Sampai keempatnya dijawab, **jangan jalankan `pnpm db:seed` terhadap database produksi.**

## 7. Referensi

- Plan Rencana 2b: `docs/superpowers/plans/2026-09-04-rencana-2b-jadwal-pelayanan.md`
- Handoff Rencana 1: `docs/dev/rencana-1-handoff.md` (bagian status peluncuran sudah basi — lihat §1–2 di sini)
- Laporan fix round ini: `.superpowers/sdd/2026-09-04-rencana-2b-jadwal-pelayanan/final-fix-report.md`

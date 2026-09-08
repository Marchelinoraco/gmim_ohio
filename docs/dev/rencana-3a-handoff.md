# Rencana 3a — fondasi admin selesai. Handoff ke Rencana 3b

**Tanggal:** 2026-09-07
**Status:** 9 task selesai, review akhir whole-branch dijalankan, fix round penutup diterapkan. Cabang `feat/rencana-3-admin` — belum di-merge.

Dokumen ini melanjutkan `docs/dev/rencana-2b-handoff.md` §5, yang sudah menandai index `ws_template_date_uq` salah bentuk. Rencana 3a memperbaiki bentuk index-nya (migrasi 0002) tapi — ini intinya dokumen ini — **tidak memulihkan `templateId` di baris lama**, jadi soal yang sama belum selesai. Baca §1 sebelum menulis satu baris generator jadwal pun di Rencana 3b.

## 1. ⚠️ WAJIB dibereskan sebelum generator jadwal Rencana 3b ditulis

Dua temuan ini bukan kerapian. Kalau generator jadwal ditulis di atas keadaan sekarang, ia akan memproduksi ibadah kembar di produksi — situs yang sudah live dan dipakai jemaat.

### 1.1 `templateId` tidak pernah dipulihkan di baris lama

Spec Rencana 3 (`docs/superpowers/specs/2026-09-07-rencana-3-admin-dashboard.md` baris 161) mewajibkan migrasi 0002 memulihkan `templateId` pada baris `worship_services` yang sudah ada. Rencana implementasi Task 1 (`docs/superpowers/plans/2026-09-07-rencana-3a-fondasi-admin.md`) justru melarang isi migrasi selain drop+create index — syarat itu hilang tanpa jejak di antara spec dan plan, bukan sesuatu yang implementer lewatkan.

**Terverifikasi di database live** (dicatat di `progress.md` ledger task ini, direview independen oleh reviewer whole-branch): **0 dari 72 baris** `worship_services` punya `template_id` terisi. Semuanya `NULL`, termasuk baris yang templatenya jelas identik (mis. 8 baris `ibadah_jemaat` hari Minggu 09:00 semuanya berasal dari template mingguan yang sama).

**Akibatnya, kalau generator Rencana 3b ditulis dengan asumsi umum "cari-atau-buat per template+tanggal, andalkan `onConflictDoNothing` pada `ws_template_date_uq` untuk idempotensi"**: `onConflictDoNothing` tidak akan pernah cocok dengan 72 baris lama itu, karena `template_id` di baris lama NULL sementara baris yang baru di-generate akan punya `template_id` terisi (atau juga NULL — lihat §1.2, keduanya buruk dengan cara berbeda). Setiap tanggal sampai `2026-10-29` (jendela seed Rencana 2b, lihat `docs/dev/rencana-2b-handoff.md` §3) akan mendapat ibadah kembar: `/jadwal` menampilkan tiap Minggu dua kali, dan `sitemap.xml` bertambah hingga 72 URL duplikat — pola persis yang sudah pernah terjadi dan didokumentasikan di §4.3 handoff 2b untuk galeri, kali ini untuk jadwal.

### 1.2 Index baru masih nol idempotensi untuk lima kategori non-kolom

`ws_template_date_uq` kini `(template_id, service_date, kolom_id)` (migrasi `drizzle/0002_lumpy_sphinx.sql`, skema di `src/db/schema/worship.ts`) — sudah benar bentuknya dibanding versi 2-kolom yang ditandai `rencana-2b-handoff.md` §5. Tapi `kolom_id` hanya terisi untuk kategori `kolom`; ia **NULL** untuk `ibadah_jemaat`, `sekolah_minggu`, `kaum_bapa`, `kaum_ibu`, dan `pemuda_remaja`. Postgres menganggap NULL *distinct* pada index unik biasa — dua baris dengan `template_id` + `service_date` sama tapi `kolom_id` sama-sama NULL **tidak** dianggap bentrok.

Jadi:
- Fan-out kategori `kolom` (4 baris per tanggal, `kolom_id` berbeda) **sudah tertutup** — ini yang index 3-kolom benar-benar perbaiki.
- Idempotensi untuk lima kategori lain **masih nol**. Menjalankan generator Rencana 3b dua kali, atau dengan rentang tanggal yang tumpang tindih, akan menduplikasi kelima kategori itu **diam-diam** — tidak ada error, tidak ada constraint violation, hanya baris kembar.

`tests/unit/schema-index.test.ts` mengunci nama & urutan kolom index (`['template_id', 'service_date', 'kolom_id']`) tapi **diam soal semantik NULL** — ia akan tetap hijau menembus kedua masalah di atas, karena tidak pernah menyentuh pertanyaan "apakah dua baris dengan kolom_id NULL yang sama dianggap bentrok". Test barunya untuk Rencana 3b perlu mengunci semantik NULLS NOT DISTINCT, bukan cuma nama kolom — kalau tidak, regresi ke bentuk lama (atau kegagalan menambahkannya) akan lolos test lagi persis seperti sebelumnya.

### 1.3 Urutan perbaikan tidak bisa dibalik

Perbaikan yang benar: **backfill `templateId` pada 72 baris lama dulu, baru perkuat unique index jadi NULLS NOT DISTINCT.** Membalik urutan ini merusak:

- Kalau index diperkuat lebih dulu (tetap NULL di baris lama): pembuatan index NULLS NOT DISTINCT akan **gagal langsung** — ada **16 grup baris** yang saat ini berbagi `(template_id, service_date, kolom_id) = (NULL, tanggal-sama, NULL)` untuk lima kategori non-kolom (bukan karena kelima kategori berbagi satu tanggal, melainkan karena dua PASANG di antaranya berbagi hari-dalam-minggu: `ibadah_jemaat`+`sekolah_minggu` sama-sama `dayOfWeek` 0, dan `kaum_bapa`+`pemuda_remaja` sama-sama `dayOfWeek` 6. Delapan minggu × dua pasang = 16 grup. `kaum_ibu` sendirian di `dayOfWeek` 4, jadi ia tidak pernah bertabrakan). Migrasi akan ditolak Postgres sampai backfill dilakukan.
- Kalau backfill dilakukan lebih dulu: setiap baris mendapat `template_id` yang benar-benar menunjuk `schedule_templates`-nya, lalu index NULLS NOT DISTINCT baru dibuat di atas data yang sudah bersih — tidak ada baris NULL yang tersisa untuk lima kategori itu (kategori `kolom` tetap boleh NULL di `kolom_id`-nya sendiri kalau memang tidak ada kolom aktif, tapi itu kasus lain).

**Catatan implementasi untuk 3b:** di `drizzle-orm@0.45.2`, `.nullsNotDistinct()` hanya tersedia di `UniqueConstraintBuilder` (hasil `unique(name).on(...)`), **bukan** di `IndexBuilder` (`uniqueIndex(name).on(...)` yang dipakai sekarang) — diverifikasi langsung di `node_modules/drizzle-orm/pg-core/{indexes,unique-constraint}.d.ts`. `ws_template_date_uq` perlu diganti dari `uniqueIndex(...)` jadi `unique(...).on(...).nullsNotDistinct()`, atau tetap `uniqueIndex` tapi dengan expression index manual yang men-substitusi NULL dengan nilai sentinel (mis. `coalesce(kolom_id, '00000000-...')`) — pilih salah satu secara sadar, jangan asumsikan `uniqueIndex` punya opsi yang sama.

## 2. Utang lain yang perlu diketahui penerus

Tidak ada yang seketat §1, tapi masing-masing akan menggigit begitu bagian yang relevan mulai dipakai.

**Alias `muted`/`accent` — makna bentrok antara shadcn dan token GMIM.** shadcn mengharapkan `--muted` sebagai *latar* lembut dan `--accent` sebagai *latar hover* halus. Token GMIM memakai `--color-muted` sebagai **warna teks** sekunder (`#6b6157` terang / `#b3a99c` gelap — teks di atas surface, bukan latar) dan `--color-accent` sebagai **ungu jenuh** (`#9333ea` terang — dipakai badge "live"), bukan warna hover netral. Alias di `app.css` (`@theme inline`) memetakan nama shadcn langsung ke token GMIM ini tanpa menyesuaikan makna.

Akibatnya sudah bisa dihitung sebelum komponennya sekalipun dirender: `table.tsx` memakai `data-[state=selected]:bg-muted` (baris terpilih), `select.tsx` dan `dropdown-menu.tsx` memakai `focus:bg-accent` — semuanya memasang teks default (`--color-ink`/`--color-foreground`) di atas warna yang didesain sebagai teks atau aksen jenuh, bukan latar netral. Dihitung langsung dengan fungsi `contrast()` yang sama dipakai `tests/unit/dark-palette.test.ts`: teks `--color-ink` di atas `--color-muted` sebagai latar = **2.83:1 di tema terang**, **2.02:1 di tema gelap** — jauh di bawah AA (4.5:1 teks, 3:1 UI). Rapikan sebelum `Table`, `Select`, atau `DropdownMenu` benar-benar dipakai di halaman admin pertama kali; kemungkinan besar butuh nama token baru (mis. `--color-muted-surface` untuk latar baris terpilih, terpisah dari `--color-muted` yang tetap dipakai sebagai warna teks), bukan sekadar remap alias yang ada.

**`<Toaster>` belum dipasang di layout mana pun.** Komponennya ada di `src/components/ui/sonner.tsx` (sudah benar — memakai token `--color-popover`/`--color-border`, ikut tema lewat `readThemePref`), tapi tidak ada `<Toaster />` di `__root.tsx` atau layout admin manapun. `toast()` dari sonner akan berjalan tanpa error dan tanpa efek terlihat sampai komponennya benar-benar dirender di root.

**`src/components/ui/dialog.tsx` melanggar dua aturan proyek sekaligus, belum dipakai siapa pun.** Teks Inggris hardcoded ("Close" — `sr-only` di tombol X baris 74, dan `<Button>` footer baris 112) melanggar aturan dwibahasa (semua string user-facing lain lewat `messages/{id,en}.json` + Paraglide). `bg-black/50` di overlay (baris 40) adalah warna literal, bukan token — akan tetap gelap 50% terlepas dari tema, yang kebetulan cocok untuk overlay tapi tidak lewat mekanisme token seperti komponen lain. Tidak ada import `Dialog` di manapun di `src/routes` atau `src/features` saat ini, jadi ini laten, bukan bug yang sudah kelihatan — tapi akan langsung kelihatan begitu form admin pertama (hapus jadwal? konfirmasi publish?) memakainya.

**Test e2e mengautentikasi ke database live, dan CI tidak pernah menguji alur login sungguhan.** `tests/e2e/admin.spec.ts` memakai `SEED_ADMIN_EMAIL`/`SEED_ADMIN_PASSWORD` dari `.env` lokal — database yang sama dipakai situs live (lihat `docs/dev/rencana-2b-handoff.md` §6, "produksi memakai Neon branch `dev`"). Setiap login sungguhan menambah baris ke tabel `session`; ~29 baris sudah tercatat dari sesi pengembangan sejauh ini. `.github/workflows/ci.yml` **tidak menyetel `SEED_ADMIN_*`** dan **tidak menjalankan `pnpm seed:admin`** — jadi di CI, test yang butuh sesi (isi form, submit, sampai ke dashboard) sengaja di-skip; yang tetap teruji di CI hanyalah gerbang redirect (`/admin` tanpa sesi → `/admin/login`). Alur login penuh **hanya pernah teruji di mesin pengembang**, terhadap database produksi. Rencana 3b yang akan menulis konten sungguhan lewat e2e (bikin jadwal, publish warta, dst. lewat form admin) butuh database test terpisah dari produksi dan akun admin khusus CI — menjalankan test tulis-data terhadap DB live bukan sesuatu yang aman untuk diperluas begitu saja.

**Pola untuk route admin baru** (sudah dipraktikkan konsisten di 3a, didokumentasikan di docblock `tests/e2e/admin.spec.ts`): setiap route baru di `/admin/*` harus (1) dideklarasikan sebagai `admin._app.<nama>.tsx` — anak pathless layout `admin/_app.tsx` yang menjaganya lewat `ensureAdmin()` di `beforeLoad`; (2) server fn yang menulis/membaca data admin memanggil `ensureAdmin()` sendiri (dari `@/lib/auth.functions`) — ini lapisan kedua yang independen dari layout, karena route yang dijaga tidak menghalangi siapa pun memanggil server fn-nya langsung; (3) path-nya ditambahkan ke daftar `for (const path of ['/admin']) { ... }` di `tests/e2e/admin.spec.ts` supaya gerbangnya ikut teruji. Catatan kerapian, bukan blocker: area admin saat ini mencampur route folder (`admin/login.tsx`, `admin/_app.tsx`) dan flat (`admin._app.index.tsx`) — disengaja (lihat Ruling 12/13 di `progress.md` task ini), keduanya menghasilkan route tree yang sama, aman untuk dibiarkan.

## 3. Apa yang sudah ada dan terbukti bekerja

Supaya Rencana 3b tidak membangun ulang fondasi yang sudah ada:

- **Gerbang `/admin` diverifikasi di build produksi**, bukan cuma dev server: `GET /admin` tanpa cookie sesi → `307` ke `/admin/login`; server fn `getAdminSummary()` dipanggil tanpa cookie → `307` dengan body kosong (nol angka ringkasan bocor ke klien tak terautentikasi); permintaan tanpa header `Origin` → `403`. Dua lapisan gerbang (layout `admin/_app.tsx` untuk UX, `ensureAdmin()` di tiap server fn untuk keamanan) memang didesain independen — menghapus salah satu tidak membuat yang lain berhenti melindungi.
- **Halaman masuk** (`/admin/login`, `src/routes/admin/login.tsx` + `src/components/admin/login-form.tsx`) — di luar layout ber-gerbang secara sengaja (menghindari redirect loop), memakai kredensial `SEED_ADMIN_*`/`pnpm seed:admin`.
- **Shell dashboard** (`AdminShell`, `src/components/admin/admin-shell.tsx`) — nav + topbar dengan email pengguna dari `context.user` hasil `beforeLoad` server (bukan sumber yang bisa dipalsukan klien).
- **Beranda ringkasan** (`/admin`, `src/routes/admin._app.index.tsx` + `src/features/admin/summary.ts`) — kartu total/draft untuk jadwal, warta, renungan, galeri, dan jumlah pesan kontak baru; kartu jadwal menampilkan sisa hari sampai jadwal terakhir (`hariTersisa()`, murni dan diuji unit — sengaja tidak dijepit ke nol supaya "sudah habis" tidak disamarkan jadi nol).
- **Rate limit login, produksi-saja, berbasis database** (`src/lib/auth.ts` — `rateLimit: { enabled: process.env.NODE_ENV === 'production', storage: 'database' }`). Diverifikasi manual: 8 percobaan gagal berturut-turut → `401, 401, 401` lalu `429` seterusnya, nol error server. Sengaja nonaktif di dev/test (default better-auth) supaya suite e2e paralel tidak flaky karena saling membatasi satu endpoint.
- **Lapisan alias token shadcn** (`@theme inline` di `src/styles/app.css`) — nama seperti `--color-background`, `--color-card`, `--color-input`, `--color-ring` dst. dipetakan ke token GMIM yang sudah ada, dideklarasikan **di dua tempat** (`:root` untuk keterbacaan runtime, `@theme inline` untuk validitas class Tailwind — keduanya perlu, lihat Ruling 6 di `progress.md`). Terbukti bekerja lewat komponen shadcn yang sudah ditarik (`Input`, `Textarea`, `Select`, `Card`, `Button`, dst.) — tapi lihat §2 untuk `muted`/`accent`, yang **tidak** ikut terbukti aman.

## 4. Referensi

- Spec: `docs/superpowers/specs/2026-09-07-rencana-3-admin-dashboard.md`
- Plan: `docs/superpowers/plans/2026-09-07-rencana-3a-fondasi-admin.md`
- Ledger implementasi (9 task, rulings, review akhir): `.superpowers/sdd/2026-09-07-rencana-3a-fondasi-admin/progress.md`
- Laporan fix round penutup: `.superpowers/sdd/2026-09-07-rencana-3a-fondasi-admin/final-fix-report.md`
- Handoff sebelumnya (masih berlaku untuk §3 "jendela kedaluwarsa jadwal" dan §6 "jalur data produksi"): `docs/dev/rencana-2b-handoff.md`

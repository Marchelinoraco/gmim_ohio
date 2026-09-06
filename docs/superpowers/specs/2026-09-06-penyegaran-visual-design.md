# Penyegaran Visual — Desain

**Tanggal:** 2026-09-06
**Status:** disetujui untuk implementasi (pendekatan C — fondasi dulu, lalu poles per halaman)
**Konteks:** situs sudah live di `gmimmusafir.org` sejak merge Rencana 2b. Pekerjaan ini murni presentasi — tidak menyentuh skema, query, atau konten.

## Masalah

Pemilik proyek menilai tampilan "belum rapi" dan meminta animasi lebih halus, plus hero seperti halaman coming-soon dulu (video latar dengan kontrol suara). Tiga temuan konkret dari inspeksi kode dan tampilan live:

1. **Header berdesakan.** Dalam `max-w-6xl` header memuat brand (menumpuk jadi empat baris), 7 link nav, 2 tombol CTA, toggle tema, dan pemilih bahasa. Pada 1280px label dua-kata ("Jadwal Ibadah", "Warta & Renungan") membungkus dan header jadi tinggi tak wajar.
2. **Lapisan motion praktis tidak ada.** Hanya 6 file memakai `transition-`; tak ada keyframes, tak ada token durasi/easing, tak ada guard `prefers-reduced-motion` di CSS.
3. **Kontrol suara hero hilang.** Logikanya dulu milik `coming-soon.tsx` yang dihapus saat peluncuran. `<HeroMedia>` yang tersisa merender video bisu tanpa cara membunyikannya.

## Keputusan

Diambil bersama pemilik proyek sebelum implementasi:

| Pertanyaan | Keputusan |
|---|---|
| Cakupan | Penyegaran visual menyeluruh — seluruh halaman, bukan hanya beranda |
| Arah warna | **Pertahankan identitas ungu, pakai jauh lebih hemat.** Netral dihangatkan, kontras dijaga |
| Intensitas motion | Micro-interaction **+ section muncul saat scroll** (sekali, tidak berulang) + transisi halaman |
| Penyusunan kerja | Hibrida: fase 1 fondasi (token, primitif, motion, header, hero), fase 2 poles per halaman |

## Non-goals

- Tidak mengganti font. Fraunces + Inter sudah pasangan yang baik.
- Tidak mengganti warna ungu aksi (`--color-primary/secondary/accent`) maupun keenam warna kategori — semuanya sudah tervalidasi WCAG dan mengganti hanya menambah risiko tanpa menjawab keluhan.
  - **Direvisi 2026-09-06 (lihat "Dark mode tanpa ungu" di bawah).** Non-goal ini masih berlaku penuh untuk LIGHT; untuk DARK ia dicabut atas permintaan pemilik proyek.
- Tidak menyentuh konten, seed, query, atau skema.
- Tidak membongkar arsitektur token. Perubahan bekerja **di dalam** pola `--dark-*` yang sudah ada.

## Token

### Netral dihangatkan

Netral sekarang berpigmen ungu (`#f5f3ff`, `#d9cff1`, `#5b5670`), yang membuat ungu terasa ada di mana-mana. Menghangatkannya membebaskan ungu untuk dipakai hanya pada aksi.

Rasio dihitung, bukan diperkirakan (skrip WCAG dijalankan saat desain ini ditulis):

| Token | Lama | Baru | Kontras baru |
|---|---|---|---|
| `--color-surface-2` | `#f5f3ff` | `#faf7f2` | ink 16.02:1 · muted 5.66:1 |
| `--color-border` | `#d9cff1` | `#e6dfd5` | dekoratif |
| `--color-ink` | `#1c1a26` | `#1f1b16` | 17.12:1 di surface |
| `--color-muted` | `#5b5670` | `#6b6157` | 6.05:1 di surface |
| `--dark-surface` | `#161221` | `#1a1714` | — |
| `--dark-surface-2` | `#1f1830` | `#241f1a` | — |
| `--dark-border` | `#403659` | `#3b352e` | dekoratif |
| `--dark-ink` | `#f1eef8` | `#f4efe8` | 15.60:1 di dark-surface |
| `--dark-muted` | `#a79fb8` | `#b3a99c` | 7.71:1 di dark-surface |

`--dark-primary` (`#a78bfa`) terhadap `--dark-surface` baru = 6.56:1 — tetap lolos.

### Token baru

```css
/* Motion — satu sumber durasi & easing, dipakai semua komponen */
--ease-out: cubic-bezier(0.22, 1, 0.36, 1);
--dur-fast: 150ms;   /* hover, fokus */
--dur-base: 240ms;   /* buka-tutup, transisi tema */
--dur-slow: 420ms;   /* section reveal */

/* Elevasi — kartu tidak lagi mengandalkan border ungu */
--shadow-sm / --shadow-md / --shadow-lg
```

Skala spasi memakai skala Tailwind bawaan; yang distandarkan adalah **ritme section** (jarak vertikal antar-section dan lebar maksimum konten), lewat komponen `<Section>` dan `<Container>` yang sudah ada — bukan token baru.

## Sistem motion

Satu utilitas, dipakai ulang, bukan animasi ad-hoc per komponen.

- **Micro-interaction** — hover/fokus pada `Button`, `Card`, link nav; transisi tema. Memakai `--dur-fast` + `--ease-out`.
- **Section reveal** — komponen `<Reveal>` membungkus section: fade + geser naik ~12px saat pertama masuk viewport, memakai `IntersectionObserver`, **sekali saja** (unobserve setelah terpicu). Tanpa JS atau sebelum hidrasi, isinya tetap terlihat penuh — reveal hanya menambah, tidak pernah menyembunyikan konten dari mesin pencari atau pengguna tanpa JS.
- **Transisi halaman** — fade singkat pada perpindahan route.

**Reduced-motion adalah syarat, bukan tambahan.** Satu blok global:

```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
}
```

`<Reveal>` juga mengecek preferensi itu di JS dan langsung merender keadaan akhir — tanpa animasi sama sekali, bukan animasi yang dipercepat.

## Header

Akar masalahnya: terlalu banyak elemen bersaing di satu baris.

- Brand jadi **satu baris** ("GMIM Musafir Columbus Ohio" pada logo + wordmark ringkas), tidak lagi menumpuk empat baris.
- Nav memakai label satu kata di desktop ("Jadwal", "Warta") dengan label penuh tetap sebagai `aria-label` — teks nav tidak boleh membungkus.
- CTA "Ibadah Live" + "Persembahan" dipadatkan; "Persembahan" tetap solid sebagai aksi utama, "Ibadah Live" jadi sekunder.
- Breakpoint hamburger dinaikkan dari `lg` ke `xl` supaya tidak pernah ada keadaan berdesakan di antara keduanya.
- Header dapat perilaku scroll: latar transparan di puncak beranda, memadat jadi solid + shadow tipis setelah scroll.

## Hero

Mengembalikan perlakuan coming-soon di atas `<HeroMedia>` yang sudah ada.

- Video latar autoplay bisu setelah hidrasi (markup SSR **tidak pernah** membawa `autoplay` — invarian ini sudah dijaga e2e dan tetap dijaga).
- **Tombol kontrol suara** dipulihkan dari `git show 9903d7e:src/components/site/coming-soon.tsx`. Logikanya dipakai ulang apa adanya: `useSyncExternalStore` untuk `prefers-reduced-motion`, listener `play`/`pause`/`volumechange`, dan cabang ganda — motion normal = toggle bisu/bunyi; reduced-motion = tombol Putar/Jeda yang klik pertamanya memutar **dengan** suara.
- Kunci pesan `coming_soon_sound_on/off/play/pause` yang dihapus di Rencana 2b dipulihkan dengan nama netral (`hero_sound_*`), di kedua katalog.
- Hero lebih tinggi dan lebih sinematik; teks masuk bertahap; scroll-cue di bawah.

## Fase

**Fase 1 (satu PR):** token, primitif (`Button`, `Card`, `Section`, `PageHero`, `CategoryBadge`), sistem motion + `<Reveal>`, header, hero. Seluruh halaman ikut berubah lewat pewarisan.

**Fase 2 (PR terpisah, per halaman):** ritme beranda, kalender `/jadwal`, kartu `/pelayanan`, daftar `/warta` & `/renungan`, grid `/galeri`.

## Batasan yang diwarisi

Semua constraint Rencana 2b tetap berlaku dan tidak boleh dilanggar:

- **Token saja** — tanpa `dark:`, tanpa hex literal di komponen. Satu pengecualian terdokumentasi tetap: `style={{ backgroundColor: category.color }}` di `<CategoryBadge>`.
- **Benar di kedua tema**, semua pasangan teks/latar ≥ WCAG AA.
- **Dwibahasa** — tiap kunci UI ada di `messages/id.json` DAN `messages/en.json`.
- `src/components/ui/**` tetap prettier-ignored.

## Pengujian

- Gerbang yang ada harus tetap hijau: lint, typecheck, build, 148 unit test, 97 e2e.
- E2E yang menjaga invarian hero (`autoplay` tak ada di SSR; tidak autoplay saat reduced-motion) **tidak boleh dilonggarkan** — hero berubah tampilan, bukan perilakunya.
- Tambahan: test untuk kontrol suara yang dipulihkan (label bercabang menurut reduced-motion), sejajar test yang dulu ada di `coming-soon.spec.ts`.
- Verifikasi manual di kedua tema dan kedua locale, plus lebar 1280px dan mobile — header tidak boleh membungkus di lebar mana pun.

---

## Dark mode tanpa ungu (addendum, 2026-09-06)

**Status:** disetujui & diimplementasikan. Mencabut sebagian non-goal "tidak mengganti warna ungu aksi" — **hanya untuk dark**.

Permintaan pemilik proyek: hilangkan ungu dari dark mode. Light tetap ungu + putih; itu identitas GMIM dan tidak disentuh.

**Alasan teknisnya sejalan.** Di atas permukaan gelap, ungu harus dicerahkan sampai nyaris pastel (`#a78bfa`) untuk lolos kontras — dan pada titik itu ia berhenti terbaca sebagai warna brand, hanya menyisakan rona keunguan di seluruh halaman. Persis keluhan "ungu terasa ada di mana-mana" yang sudah dijawab di sisi netral pada fase 1.

### Keputusan

| Pertanyaan | Keputusan |
|---|---|
| Ungu aksi diganti apa | Netral krem hangat — bukan warna lain. Emas bentrok dengan kategori Sekolah Minggu, biru dengan kategori Bapa |
| Badge kategori | Tiga yang keunguan (Jemaat, Kaum Ibu, Kolom) ikut diganti |
| Cakupan | Dark saja; light tidak disentuh |

### Nilai

Aksi — rasio terhadap `--dark-surface`; teks di atas tombol solid memakai warna yang sama:

| Token | Lama | Baru | Kontras |
|---|---|---|---|
| `--dark-primary` | `#a78bfa` | `#f0e9df` | 14.81:1 |
| `--dark-primary-hover` | `#c4b5fd` | `#ffffff` | 17.4:1 |
| `--dark-secondary` | `#9575f4` | `#cbb99a` | 9.30:1 |
| `--dark-secondary-hover` | `#b39dfb` | `#e0d7c9` | 12.52:1 |
| `--dark-accent` | `#c4b5fd` | `#e0d7c9` | 12.52:1 |

Kategori — tiga diganti, tiga tetap:

| Kategori | Lama | Baru | Kontras | Hue |
|---|---|---|---|---|
| Jemaat | `#c4b5fd` | `#fca5a5` | 9.40:1 | 0° |
| Kaum Ibu | `#f0abfc` | `#86efac` | 12.71:1 | 142° |
| Kolom | `#d8b4fe` | `#bef264` | 13.66:1 | 82° |
| Bapa | — | `#93c5fd` (tetap) | 9.90:1 | 212° |
| Pemuda | — | `#5eead4` (tetap) | 12.07:1 | 171° |
| Sekolah Minggu | — | `#fcd34d` (tetap) | 12.38:1 | 46° |

Penggantian ini sekalian menutup cacat lama: Jemaat `#c4b5fd` dan Kolom `#d8b4fe` hanya berjarak **16.7° hue** — dua ungu yang praktis sewarna pada badge sekecil itu. Enam warna sekarang tersebar dengan jarak terdekat 29°.

### Link mendapat underline permanen

Konsekuensi yang tidak terduga dari warna aksi netral, dan ia membuka masalah yang sudah ada:

```
LIGHT  link #6d28d9 vs teks #1f1b16  → 2.41:1
DARK   link #a78bfa vs teks #f4efe8  → 2.38:1
DARK   link krem    vs teks #f4efe8  → 1.05:1
```

WCAG 1.4.1 menuntut ≥3:1 bila link dibedakan **hanya** oleh warna. Situs ini tidak pernah memenuhinya di tema mana pun; krem mengubah dark dari "kurang" jadi "tidak ada sama sekali". Sepuluh link prosa karena itu berpindah dari `hover:underline` ke `underline` permanen — berlaku di kedua tema, dan mengikuti preseden yang sudah ada di `service-card.tsx`.

### Pengujian

`tests/unit/dark-palette.test.ts` (27 test) membaca palet **langsung dari `app.css`**, bukan dari salinan — nilai yang disalin akan drift diam-diam. Yang dijaga:

- kontras tiap token aksi & kategori terhadap kedua permukaan gelap
- tak ada token dark yang berhue ungu (260°–330°), dengan warna aksi dinilai lewat **chroma**, bukan saturasi HSL (HSL melebih-lebihkan warna sangat terang: krem terbaca 0.36 padahal channel-nya hanya berjarak 0.07)
- jarak hue antar keenam kategori ≥25°
- palet **light** tetap ungu — menahan perubahan dark agar tidak merembet

Plus satu e2e yang memastikan link prosa ter-underline tanpa hover.

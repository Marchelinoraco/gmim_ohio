import { eq } from 'drizzle-orm'
import { addDays, datesForWeekday, todayEastern } from '@/lib/datetime'

// `@/db` di-import lazy di dalam `seedSchedule()` — lihat catatan di `categories.ts`.

/**
 * 6 template mingguan, konsisten dengan isi warta placeholder Rencana 2a
 * (tema "Hidup dalam Syukur", pelantikan Kolom, dst). `categoryKey` dicocokkan
 * ke `worship_categories.key` (harus sudah di-seed lewat `seedCategories`).
 */
export const SCHEDULE_TEMPLATES = [
  {
    categoryKey: 'ibadah_jemaat',
    dayOfWeek: 0,
    startTime: '10:00:00',
    endTime: '12:00:00',
    defaultLocationType: 'gedung_gereja',
  },
  {
    categoryKey: 'sekolah_minggu',
    dayOfWeek: 0,
    startTime: '10:00:00',
    endTime: '11:00:00',
    defaultLocationType: 'gedung_gereja',
  },
  {
    categoryKey: 'kaum_ibu',
    dayOfWeek: 4,
    startTime: '10:00:00',
    endTime: '12:00:00',
    defaultLocationType: 'rumah',
  },
  {
    categoryKey: 'pemuda_remaja',
    dayOfWeek: 6,
    startTime: '17:00:00',
    endTime: '19:00:00',
    defaultLocationType: 'rumah',
  },
  {
    categoryKey: 'kaum_bapa',
    dayOfWeek: 6,
    startTime: '19:00:00',
    endTime: '21:00:00',
    defaultLocationType: 'rumah',
  },
  {
    categoryKey: 'kolom',
    dayOfWeek: 3,
    startTime: '19:00:00',
    endTime: '21:00:00',
    defaultLocationType: 'rumah',
  },
] as const

/** Tema ibadah placeholder (id/en berpasangan) — berputar per ibadah yang dibuat. */
const THEMES = [
  { id: 'Hidup dalam Syukur', en: 'Living in Gratitude' },
  { id: 'Dipanggil untuk Melayani', en: 'Called to Serve' },
  { id: 'Damai Sejahtera di Tengah Perubahan', en: 'Peace Amid Change' },
  { id: 'Kasih yang Menyembuhkan', en: 'Love That Heals' },
] as const

/** Bacaan Alkitab placeholder — berputar berpasangan dengan `THEMES` (indeks sama). */
const BIBLE_READINGS = [
  'Mazmur 23:1-6',
  '2 Korintus 12:9-10',
  '1 Tesalonika 5:16-18',
  'Yohanes 15:9-12',
] as const

interface CategoryRow {
  id: string
  key: string
}

interface KolomRow {
  id: string
  name: string
}

interface TemplateRow {
  id: string
  categoryId: string
  dayOfWeek: number
  startTime: string
  endTime: string | null
  defaultLocationType: 'gedung_gereja' | 'rumah'
}

/**
 * Susun satu baris `worship_services` untuk template+tanggal (+kolom bila
 * kategori `kolom`). `seq` = penghitung global lintas semua ibadah yang
 * dibuat pada run ini, dipakai untuk memutar tema/bacaan secara deterministik
 * (`seq % daftar.length`) — bukan acak, supaya hasil seed bisa diverifikasi
 * ulang.
 *
 * `preacherName`/`liturgistName` SENGAJA selalu NULL — siapa yang berkhotbah
 * atau melayani liturgi adalah data riil, bukan sesuatu yang boleh dikarang
 * seed placeholder (aturan yang sama dengan "tidak ada nama pengurus karangan
 * di `/tentang`" dan rekening `XXXX-XXXX-XXXX`: placeholder yang realistis
 * justru lebih berbahaya daripada yang jelas-jelas kosong). Halaman jadwal
 * (Task 4) merender "Akan diumumkan"/"To be announced" untuk field NULL ini.
 *
 * INVARIAN: baris `rumah` hasil seed SELALU tanpa `hostFamilyName` DAN tanpa
 * `hostAddress` (keduanya NULL) — kebalikan dari invarian lama, yang memutar
 * enam marga Minahasa "realistis" sebagai tuan rumah. Alasannya paralel dengan
 * pelayan/pemimpin ibadah di atas, dan bahkan lebih kuat: jemaat ini kecil dan
 * marga Minahasa tidak banyak, jadi nama karangan besar kemungkinan menabrak
 * keluarga sungguhan — dan situs live lalu mengumumkan ibadah diadakan di rumah
 * mereka, termasuk sebagai `Place.name` pada JSON-LD `Event` yang di-crawl lewat
 * `sitemap.xml`. Alamat rumah anggota apalagi: itu data pribadi.
 *
 * Konsekuensi tampilan sudah ditangani dan TIDAK butuh cabang baru:
 * `resolveServiceLocation` (`@/components/schedule/service-location`) memetakan
 * `rumah` tanpa tuan rumah → `{ kind: 'unknown' }` → `m.home_location_tba()`
 * ("Lokasi menyusul"), dan JSON-LD `Event` melewatkan `location` sama sekali.
 * Pengurus mengisi tuan rumah sungguhan lewat dashboard (Rencana 3).
 *
 * `templateId` SENGAJA tidak diisi (selalu NULL) — lihat catatan di
 * `seedSchedule()` soal index unik `ws_template_date_uq`.
 */
export function buildService({
  tpl,
  cat,
  kolomRow,
  date,
  seq,
}: {
  tpl: TemplateRow
  cat: CategoryRow
  kolomRow: KolomRow | null
  date: string
  seq: number
}) {
  const theme = THEMES[seq % THEMES.length]
  const reading = BIBLE_READINGS[seq % BIBLE_READINGS.length]
  const locationType = tpl.defaultLocationType

  return {
    categoryId: cat.id,
    kolomId: kolomRow?.id ?? null,
    templateId: null,
    serviceDate: date,
    startTime: tpl.startTime,
    endTime: tpl.endTime,
    locationType,
    // Lihat INVARIAN di docblock: tuan rumah & alamatnya tak pernah dikarang.
    hostFamilyName: null,
    hostAddress: null,
    locationNote: kolomRow ? `Digilir di ${kolomRow.name}` : null,
    themeId: theme?.id ?? null,
    themeEn: theme?.en ?? null,
    bibleReading: reading ?? null,
    preacherName: null,
    liturgistName: null,
    liturgyPdfUrl: null,
    status: 'published' as const,
  }
}

/**
 * Idempoten via guard "tabel `worship_services` kosong": hanya generate saat
 * belum ada ibadah sama sekali, supaya jadwal yang sudah diedit pengurus
 * lewat dashboard (Rencana 3) tidak tertimpa saat seed di-run ulang.
 *
 * Rentang generate DINAMIS relatif tanggal seed dijalankan (`todayEastern()`
 * s/d +55 hari), bukan tanggal hardcode — supaya situs selalu menampilkan
 * ibadah mendatang dan tidak basi seminggu setelah seed dijalankan sekali di
 * awal proyek. `+55`, BUKAN `+56`: `datesForWeekday` inklusif di kedua ujung,
 * jadi `[from, from+55]` adalah rentang 56 hari (8 minggu) genap — setiap
 * hari-dalam-minggu muncul tepat 8 kali di rentang itu, apa pun hari
 * `pnpm db:seed` dijalankan. `+56` akan membuat rentang 57 hari, memberi hari
 * yang sama dengan `from` sendiri kemunculan ke-9 sementara hari lain tetap 8.
 *
 * Soal index unik `ws_template_date_uq` pada `(templateId, serviceDate)`:
 * kategori `kolom` butuh SATU ibadah per kolom aktif per tanggal (4 baris,
 * tanggal sama, template sama) — kalau `templateId` diisi, baris ke-2 dst.
 * akan bentrok index unik itu. Karena idempotensi seed ini sudah dijamin
 * penuh oleh guard "tabel kosong" di atas (bukan oleh index), `templateId`
 * pada SEMUA baris yang di-generate sengaja dibiarkan NULL — konsisten di
 * lintas kategori, dan cocok dengan desain index-nya sendiri (NULL dianggap
 * distinct oleh Postgres, jadi baris manual/generator tidak pernah bentrok).
 * `scheduleTemplates` tetap dibuat dan disimpan sebagai catatan pola jadwal
 * mingguan untuk dashboard (Rencana 3), hanya saja tidak dirujuk balik dari
 * `worship_services` yang dihasilkan generator ini.
 *
 * Insert `scheduleTemplates` + `worshipServices` dibungkus SATU transaksi:
 * tanpa itu, proses yang mati persis di antara kedua insert (mis. koneksi
 * putus, compute Neon suspend) membuat retry berikutnya melihat
 * `worshipServices` masih kosong (guard lolos) lalu meng-insert set kedua 6
 * baris `scheduleTemplates` — duplikat yatim yang tidak kelihatan dari count
 * `worshipServices` mana pun. Transaksi membuat kedua insert commit atau
 * rollback bersama.
 */
export async function seedSchedule() {
  const { db } = await import('@/db')
  const { worshipCategories, kolom, scheduleTemplates, worshipServices } =
    await import('@/db/schema')

  if ((await db.$count(worshipServices)) > 0) return 0

  const cats = await db.select().from(worshipCategories)
  const catByKey = new Map(cats.map((c) => [c.key, c]))
  const kolomRows = await db.select().from(kolom).where(eq(kolom.isActive, true))

  const from = todayEastern()
  const to = addDays(from, 55)

  const services = await db.transaction(async (tx) => {
    const templateRows = await tx
      .insert(scheduleTemplates)
      .values(
        SCHEDULE_TEMPLATES.map((t) => {
          const cat = catByKey.get(t.categoryKey)
          if (!cat) throw new Error(`Kategori ${t.categoryKey} belum di-seed`)
          return {
            categoryId: cat.id,
            dayOfWeek: t.dayOfWeek,
            startTime: t.startTime,
            endTime: t.endTime,
            defaultLocationType: t.defaultLocationType,
          }
        }),
      )
      .returning()

    const services: ReturnType<typeof buildService>[] = []
    for (const tpl of templateRows) {
      const cat = cats.find((c) => c.id === tpl.categoryId)
      if (!cat) continue
      for (const date of datesForWeekday(from, to, tpl.dayOfWeek)) {
        // Kategori `kolom` → satu ibadah PER kolom aktif; lainnya satu per tanggal.
        const targets: (KolomRow | null)[] = cat.key === 'kolom' ? kolomRows : [null]
        for (const k of targets) {
          services.push(buildService({ tpl, cat, kolomRow: k, date, seq: services.length }))
        }
      }
    }

    await tx.insert(worshipServices).values(services)
    return services
  })

  return services.length
}

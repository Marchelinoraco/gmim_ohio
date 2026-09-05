import { bulletins } from '@/db/schema'

// `@/db` di-import lazy di dalam `seedBulletins()` — lihat catatan di `categories.ts`.

/**
 * Warta Jemaat placeholder — 3 Minggu terakhir (per 2026-08-30). Data riil
 * diisi pengurus lewat dashboard (Rencana 3); di sini cukup untuk merender
 * daftar & halaman detail warta (Rencana 2a Task 4). Semua `status: 'published'`
 * dan tanpa PDF — konten ada di `bodyId`/`bodyEn` (HTML dalam allowlist
 * sanitizer: h2/h3/h4, p, ul/ol/li, strong, em, a, br, blockquote).
 */
export const PLACEHOLDER_BULLETINS = [
  {
    weekDate: '2026-08-30',
    titleId: 'Warta Jemaat — Minggu, 30 Agustus 2026',
    titleEn: 'Church Bulletin — Sunday, August 30, 2026',
    summaryId:
      'Ibadah Minggu dengan tema "Hidup dalam Syukur". Persiapan Ibadah Syukur HUT Kemerdekaan RI dan sambutan bagi keluarga yang baru tiba di Columbus.',
    summaryEn:
      'Sunday service on the theme "Living in Gratitude." Preparation for the Independence Day thanksgiving service and a warm welcome for families newly arrived in Columbus.',
    bodyId:
      '<h2>Tema Ibadah: Hidup dalam Syukur</h2>' +
      '<p>Firman Tuhan mengajak kita mensyukuri pemeliharaan Allah selama menetap jauh dari tanah air. Rasa syukur itu nyata ketika kita bersedia berbagi waktu, tenaga, dan berkat bagi sesama warga jemaat.</p>' +
      '<ul>' +
      '<li>Ibadah Kolom bergilir setiap Rabu pukul 19.00 di rumah anggota jemaat.</li>' +
      '<li>Ibadah Kategorial Pemuda dan Remaja Sabtu pukul 17.00, bergilir di rumah anggota jemaat.</li>' +
      '</ul>',
    bodyEn:
      '<h2>Service Theme: Living in Gratitude</h2>' +
      '<p>God’s Word calls us to give thanks for his provision while we live far from our homeland. That gratitude becomes real when we are willing to share our time, energy, and blessings with fellow members of the congregation.</p>' +
      '<ul>' +
      '<li>Rotating Kolom (zone) service every Wednesday at 7:00 PM in members’ homes.</li>' +
      '<li>Youth and Teens fellowship service Saturday at 5:00 PM, rotating between members’ homes.</li>' +
      '</ul>',
    pdfUrl: null,
    status: 'published',
  },
  {
    weekDate: '2026-08-23',
    titleId: 'Warta Jemaat — Minggu, 23 Agustus 2026',
    titleEn: 'Church Bulletin — Sunday, August 23, 2026',
    summaryId:
      'Ibadah Minggu bertema "Dipanggil untuk Melayani". Pelantikan pelayan Kolom periode baru dan pengumpulan kasih diakonia bagi mahasiswa perantauan.',
    summaryEn:
      'Sunday service on the theme "Called to Serve." Installation of new-term Kolom servants and a diaconal offering for students living away from home.',
    bodyId:
      '<h2>Tema Ibadah: Dipanggil untuk Melayani</h2>' +
      '<p>Setiap warga jemaat dipanggil menjadi berkat, bukan sekadar penonton. Pelayanan sederhana yang dikerjakan dengan setia menjadi kesaksian bagi keluarga dan tetangga di perantauan.</p>' +
      '<p>Minggu depan, 30 Agustus 2026, kita bersama menyiapkan Ibadah Syukur HUT Kemerdekaan RI. Warga jemaat yang ingin membantu konsumsi dapat menghubungi seksi peralatan.</p>' +
      '<ul>' +
      '<li>Pelantikan pelayan Kolom 1 sampai 4 dalam ibadah hari ini.</li>' +
      '<li>Persembahan diakonia khusus untuk mahasiswa dan perantau baru.</li>' +
      '<li>Ibadah Kategorial Kaum Ibu Kamis pukul 10.00 di gedung gereja.</li>' +
      '</ul>',
    bodyEn:
      '<h2>Service Theme: Called to Serve</h2>' +
      '<p>Every member of the congregation is called to be a blessing, not merely a spectator. Simple service carried out faithfully becomes a witness to our families and neighbors here.</p>' +
      '<p>Next Sunday, August 30, 2026, we will together prepare the Independence Day thanksgiving service. Members who wish to help with catering may contact the logistics team.</p>' +
      '<ul>' +
      '<li>Installation of Kolom 1 through 4 servants during today’s service.</li>' +
      '<li>Special diaconal offering for students and newcomers.</li>' +
      '<li>Women’s Fellowship service Thursday at 10:00 AM at the church building.</li>' +
      '</ul>',
    pdfUrl: null,
    status: 'published',
  },
  {
    weekDate: '2026-08-16',
    titleId: 'Warta Jemaat — Minggu, 16 Agustus 2026',
    titleEn: 'Church Bulletin — Sunday, August 16, 2026',
    summaryId:
      'Ibadah Minggu bertema "Damai Sejahtera di Tengah Perubahan". Ibadah Syukur HUT ke-81 Kemerdekaan RI dan jadwal pembinaan katekisasi angkatan baru.',
    summaryEn:
      'Sunday service on the theme "Peace Amid Change." The 81st Independence Day thanksgiving service and the schedule for the new catechism class.',
    bodyId:
      '<h2>Tema Ibadah: Damai Sejahtera di Tengah Perubahan</h2>' +
      '<p>Pindah negara, pekerjaan baru, dan musim yang berganti sering membuat hati gelisah. Tuhan menjanjikan damai sejahtera yang tidak bergantung pada keadaan, melainkan pada kesetiaan-Nya.</p>' +
      '<p>Minggu depan, 23 Agustus 2026, ibadah mengangkat tema pelayanan disertai pelantikan pelayan Kolom. Katekisasi angkatan baru dimulai dua minggu setelahnya.</p>' +
      '<ul>' +
      '<li>Ibadah Syukur HUT ke-81 Kemerdekaan RI, Senin pukul 18.00, disertai makan bersama.</li>' +
      '<li>Pendaftaran katekisasi dibuka hari ini sampai 6 September 2026.</li>' +
      '<li>Ibadah Kategorial Kaum Bapa Sabtu pukul 19.00 secara bergilir.</li>' +
      '</ul>',
    bodyEn:
      '<h2>Service Theme: Peace Amid Change</h2>' +
      '<p>Moving to a new country, starting a new job, and shifting seasons often unsettle the heart. God promises a peace that does not depend on circumstances but on his faithfulness.</p>' +
      '<p>Next Sunday, August 23, 2026, the service will focus on the theme of service, together with the installation of Kolom servants. The new catechism class begins two weeks after that.</p>' +
      '<ul>' +
      '<li>81st Independence Day thanksgiving service, Monday at 6:00 PM, followed by a shared meal.</li>' +
      '<li>Catechism registration opens today through September 6, 2026.</li>' +
      '<li>Men’s Fellowship service Saturday at 7:00 PM, rotating between homes.</li>' +
      '</ul>',
    pdfUrl: null,
    status: 'published',
  },
] as const

/**
 * Idempoten via guard "tabel kosong": hanya insert saat `bulletins` masih
 * kosong, supaya edit pengurus tidak tertimpa saat seed di-run ulang.
 */
export async function seedBulletins() {
  const { db } = await import('@/db')
  if ((await db.$count(bulletins)) > 0) return 0
  await db.insert(bulletins).values([...PLACEHOLDER_BULLETINS])
  return PLACEHOLDER_BULLETINS.length
}

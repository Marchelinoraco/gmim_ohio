import { devotionals } from '@/db/schema'

// `@/db` di-import lazy di dalam `seedDevotionals()` — lihat catatan di `categories.ts`.

/**
 * Renungan placeholder — 3 entri. Data riil diisi pengurus lewat dashboard
 * (Rencana 3); di sini cukup untuk merender daftar & halaman detail renungan
 * (Rencana 2a Task 4). `bodyId`/`bodyEn` HTML dalam allowlist sanitizer
 * (p, blockquote, strong, em, a, br, h2/h3/h4, ul/ol/li).
 */
export const PLACEHOLDER_DEVOTIONALS = [
  {
    slug: 'renungan-1',
    titleId: 'Gembala yang Menuntun di Perantauan',
    titleEn: 'The Shepherd Who Leads Us Far from Home',
    authorName: 'Tim Renungan',
    publishedDate: '2026-08-28',
    coverImageUrl: null,
    excerptId:
      'Hidup jauh dari kampung halaman sering terasa seperti berjalan di padang yang asing. Namun kita tidak pernah benar-benar sendirian.',
    excerptEn:
      'Living far from home can feel like walking through unfamiliar country. Yet we are never truly alone.',
    bodyId:
      '<p>Banyak dari kita datang ke Columbus membawa koper dan sekantong harapan. Beberapa bulan pertama biasanya berat: cuaca berbeda, bahasa berbeda, dan tidak ada keluarga besar yang bisa ditelepon saat larut malam.</p>' +
      '<p>Di titik itu Mazmur 23 terasa sangat dekat. Daud tidak berkata bahwa ia tidak pernah melewati lembah, melainkan bahwa ia tidak berjalan sendirian melewatinya. Gembala yang baik berjalan di depan, mengenali jalan, dan menuntun domba-domba-Nya sampai ke air yang tenang.</p>' +
      '<blockquote>TUHAN adalah gembalaku, takkan kekurangan aku. (Mazmur 23:1)</blockquote>' +
      '<p>Menjadi jemaat perantauan berarti belajar saling menggembalakan: menanyakan kabar, menawarkan tumpangan ke gereja, menyediakan makan bagi yang baru datang. Lewat tangan sesama warga jemaat, kita sering mengalami tuntunan Sang Gembala.</p>' +
      '<p>Pekan ini, cobalah menghubungi satu orang yang mungkin sedang melewati lembahnya sendiri. Kehadiran yang sederhana bisa menjadi pengingat bahwa Tuhan tidak pernah meninggalkan umat-Nya.</p>',
    bodyEn:
      '<p>Many of us arrived in Columbus with a suitcase and a bag full of hope. The first months are usually hard: different weather, a different language, and no extended family to call late at night.</p>' +
      '<p>That is where Psalm 23 feels very near. David does not say he never walked through the valley; he says he did not walk through it alone. The good shepherd goes ahead, knows the path, and leads his sheep all the way to still waters.</p>' +
      '<blockquote>The Lord is my shepherd, I lack nothing. (Psalm 23:1)</blockquote>' +
      '<p>Being a diaspora congregation means learning to shepherd one another: checking in, offering a ride to church, cooking a meal for someone who just landed. Through the hands of fellow members we often experience the Shepherd’s leading.</p>' +
      '<p>This week, try reaching out to one person who may be walking through a valley of their own. A simple presence can be a reminder that God never abandons his people.</p>',
    status: 'published',
  },
  {
    slug: 'renungan-2',
    titleId: 'Kekuatan yang Justru Lahir dari Kelemahan',
    titleEn: 'Strength That Is Born Out of Weakness',
    authorName: 'Tim Renungan',
    publishedDate: '2026-08-21',
    coverImageUrl: null,
    excerptId:
      'Kita cenderung menyembunyikan keterbatasan. Paulus justru menjadikannya tempat kasih karunia Allah bekerja paling nyata.',
    excerptEn:
      'We tend to hide our limitations. Paul made them the very place where the grace of God works most visibly.',
    bodyId:
      '<p>Di lingkungan kerja dan kampus di Amerika, kita sering merasa harus tampil kuat dan serba bisa. Mengaku lelah atau bingung terasa seperti kekalahan.</p>' +
      '<p>Paulus punya sesuatu yang ia sebut duri dalam daging. Tiga kali ia meminta Tuhan mengangkatnya, dan tiga kali jawaban yang ia terima bukan kesembuhan, melainkan janji ditemani.</p>' +
      '<blockquote>Cukuplah kasih karunia-Ku bagimu, sebab justru dalam kelemahanlah kuasa-Ku menjadi sempurna. (2 Korintus 12:9)</blockquote>' +
      '<p>Artinya, gereja tidak dibangun oleh orang-orang yang tidak pernah rapuh, melainkan oleh orang-orang yang membawa kerapuhannya kepada Tuhan dan kepada satu sama lain. Kelompok Kolom, paduan suara, dan pelayanan anak semuanya bertumbuh dari kesediaan mengakui, "Aku butuh bantuan."</p>' +
      '<p>Hari ini, izinkan satu orang melihat bagian hidupmu yang belum selesai. Di sanalah kasih karunia biasanya mulai bekerja.</p>',
    bodyEn:
      '<p>In workplaces and on campuses here, we often feel we must look strong and capable at all times. Admitting that we are tired or confused can feel like losing.</p>' +
      '<p>Paul had something he called a thorn in the flesh. Three times he asked the Lord to take it away, and three times the answer he received was not healing but the promise of company.</p>' +
      '<blockquote>My grace is sufficient for you, for my power is made perfect in weakness. (2 Corinthians 12:9)</blockquote>' +
      '<p>This means the church is not built by people who are never fragile, but by people who bring their fragility to God and to one another. Kolom groups, the choir, and the children’s ministry all grow out of a willingness to say, “I need help.”</p>' +
      '<p>Today, let one person see the unfinished part of your life. That is usually where grace begins to work.</p>',
    status: 'published',
  },
  {
    slug: 'renungan-3',
    titleId: 'Bersyukur dalam Segala Keadaan',
    titleEn: 'Give Thanks in All Circumstances',
    authorName: 'Tim Renungan',
    publishedDate: '2026-08-14',
    coverImageUrl: null,
    excerptId:
      'Bersyukur bukan berarti berpura-pura semuanya baik, melainkan memilih melihat kesetiaan Tuhan di tengah keadaan yang sesungguhnya.',
    excerptEn:
      'Gratitude is not pretending everything is fine; it is choosing to see the faithfulness of God within our actual circumstances.',
    bodyId:
      '<p>Menjelang perayaan HUT Kemerdekaan RI di perantauan, ingatan tentang kampung halaman terasa lebih tajam. Ada rindu, ada syukur, kadang keduanya sekaligus.</p>' +
      '<p>Paulus menulis nasihat ini dari penjara, bukan dari tempat yang nyaman. Ia tahu bahwa syukur bukan hasil dari keadaan yang sempurna, melainkan buah dari kepercayaan bahwa Tuhan sedang mengerjakan kebaikan.</p>' +
      '<blockquote>Mengucap syukurlah dalam segala hal, sebab itulah yang dikehendaki Allah di dalam Kristus Yesus bagi kamu. (1 Tesalonika 5:18)</blockquote>' +
      '<p>Cobalah menyebut tiga hal konkret yang patut disyukuri pekan ini: satu tentang keluarga, satu tentang pekerjaan atau studi, satu tentang jemaat. Menuliskannya membuat syukur berpindah dari perasaan sesaat menjadi kebiasaan.</p>' +
      '<p>Ketika jemaat berkumpul Minggu ini, bawalah daftar itu sebagai persembahan. Ibadah yang dipenuhi ucapan syukur adalah kesaksian yang kuat bagi anak-anak kita.</p>',
    bodyEn:
      '<p>As Independence Day approaches for us far from home, memories of our hometowns feel sharper. There is longing, there is gratitude, and sometimes both at once.</p>' +
      '<p>Paul wrote this counsel from prison, not from a comfortable place. He knew that gratitude is not the result of perfect circumstances but the fruit of trusting that God is at work for good.</p>' +
      '<blockquote>Give thanks in all circumstances, for this is God’s will for you in Christ Jesus. (1 Thessalonians 5:18)</blockquote>' +
      '<p>Try naming three concrete things worth thanking God for this week: one about family, one about work or study, one about the congregation. Writing them down moves gratitude from a passing feeling to a habit.</p>' +
      '<p>When the congregation gathers this Sunday, bring that list as an offering. Worship filled with thanksgiving is a strong witness to our children.</p>',
    status: 'published',
  },
] as const

/**
 * Idempoten via guard "tabel kosong": hanya insert saat `devotionals` masih
 * kosong, supaya edit pengurus tidak tertimpa saat seed di-run ulang.
 */
export async function seedDevotionals() {
  const { db } = await import('@/db')
  if ((await db.$count(devotionals)) > 0) return 0
  await db.insert(devotionals).values([...PLACEHOLDER_DEVOTIONALS])
  return PLACEHOLDER_DEVOTIONALS.length
}

import { siteSettings } from '@/db/schema'

// `@/db` di-import lazy di dalam `seedSettings()` — lihat catatan di `categories.ts`.

/**
 * Nilai awal `site_settings` (key text PK, value jsonb). Bentuk tiap value =
 * kontrak yang dibaca halaman publik (Rencana 2) & diedit dashboard (Rencana 3).
 * Field kosong = placeholder yang diisi pengurus nanti.
 */
export const DEFAULT_SETTINGS: Record<string, unknown> = {
  hero: {
    titleId: 'Selamat Datang di GMIM Musafir Columbus Ohio',
    titleEn: 'Welcome to GMIM Musafir Columbus Ohio',
    taglineId: 'Bertumbuh bersama dalam kasih Kristus di perantauan.',
    taglineEn: 'Growing together in the love of Christ.',
    image: '',
  },
  service_times: {
    id: 'Ibadah Jemaat: Minggu, 10.00 (Waktu Eastern) di Gedung Gereja.',
    en: 'Congregational Service: Sunday, 10:00 AM (Eastern) at the church building.',
  },
  contact_info: {
    phone: '',
    email: '',
    officeHoursId: '',
    officeHoursEn: '',
    mapsUrl: 'https://maps.google.com/?q=895+Old+Diley+Road+Columbus+Ohio',
    lat: null,
    lng: null,
  },
  social_links: { facebook: 'https://www.facebook.com/', instagram: '', youtube: '' },
  pastoral_contacts: {},
  // Belum ada siaran langsung: `isLive:false` + `url:''` adalah default jujur yang
  // sekaligus menguji jalur fallback "offline" di `/ibadah-live`. `archiveUrl` =
  // Facebook jemaat (nilai `SITE.facebookUrl`) — jemaat memang menyiarkan / mem-
  // posting di sana, jadi ini tujuan arsip yang benar. String di-hardcode di sini
  // karena file seed sengaja tak meng-import `@/config/site`.
  live_stream: {
    isLive: false,
    url: '',
    archiveUrl: 'https://www.facebook.com/gmimmusafir.columbus/',
  },
  // TEPAT SATU rekening, dan sengaja dibuat JELAS placeholder — halaman
  // `/persembahan` merender detail bank di situs gereja. `XXXX-XXXX-XXXX` bukan
  // kelalaian: ia menguji layout kartu + tombol salin sambil TIDAK bisa dipakai
  // transaksi. JANGAN mengarang nomor rekening yang terlihat masuk akal — nilai
  // asli diisi pengurus lewat dashboard (Rencana 3).
  giving_info: {
    accounts: [
      {
        bank: 'Bank (contoh — akan diisi pengurus)',
        number: 'XXXX-XXXX-XXXX',
        holder: 'GMIM Musafir Columbus Ohio',
      },
    ],
    noteId:
      'Rincian rekening masih dilengkapi pengurus. Untuk sementara, silakan hubungi Majelis Jemaat untuk informasi persembahan.',
    noteEn:
      'Account details are still being finalised. In the meantime, please contact the Congregational Council for giving information.',
  },
}

/**
 * Idempoten: `onConflictDoNothing` pada `site_settings.key` (PK). Re-run tidak
 * menimpa nilai yang sudah diedit pengurus; hanya menambah key yang belum ada.
 *
 * KONSEKUENSI: menyunting `DEFAULT_SETTINGS` di atas TIDAK merambat ke baris yang
 * sudah ada di DB — `pnpm db:seed` ulang akan melewati baris itu. Mengubah nilai
 * sebuah key yang sudah ada butuh update eksplisit: lewat dashboard (Rencana 3)
 * atau skrip sekali-jalan (`UPDATE site_settings SET value = ... WHERE key = ...`).
 */
export async function seedSettings() {
  const { db } = await import('@/db')
  for (const [key, value] of Object.entries(DEFAULT_SETTINGS)) {
    await db
      .insert(siteSettings)
      .values({ key, value })
      .onConflictDoNothing({ target: siteSettings.key })
  }
  return Object.keys(DEFAULT_SETTINGS).length
}

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
  live_stream: { isLive: false, url: '', archiveUrl: '' },
  giving_info: { accounts: [], noteId: '', noteEn: '' },
}

/**
 * Idempoten: `onConflictDoNothing` pada `site_settings.key` (PK). Re-run tidak
 * menimpa nilai yang sudah diedit pengurus; hanya menambah key yang belum ada.
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

import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import { DEFAULT_SETTINGS } from '@/db/seed/settings'

/**
 * Lapisan tipe + query untuk `site_settings` (key text PK, value jsonb).
 *
 * Bentuk tiap value = kontrak yang dibaca halaman publik (Rencana 2a) & diedit
 * dashboard (Rencana 3). Schema Zod di sini HARUS cocok dengan `DEFAULT_SETTINGS`
 * di `@/db/seed/settings` — seed adalah sumber kebenaran, dan default diambil
 * dari sana biar hanya ada satu sumber.
 *
 * `@/db` di-import lazy di dalam handler `getSiteSettings` supaya modul route
 * yang memuat server fn ini tidak ikut meng-evaluasi `@/lib/env`.
 */

const heroSchema = z.object({
  titleId: z.string(),
  titleEn: z.string(),
  taglineId: z.string(),
  taglineEn: z.string(),
  image: z.string(),
})

const serviceTimesSchema = z.object({
  id: z.string(),
  en: z.string(),
})

const contactInfoSchema = z.object({
  phone: z.string(),
  email: z.string(),
  officeHoursId: z.string(),
  officeHoursEn: z.string(),
  mapsUrl: z.string(),
  lat: z.number().nullable(),
  lng: z.number().nullable(),
})

const socialLinksSchema = z.object({
  facebook: z.string(),
  instagram: z.string(),
  youtube: z.string(),
})

const pastoralContactsSchema = z.record(
  z.string(),
  z.object({ name: z.string(), phone: z.string() }),
)

const liveStreamSchema = z.object({
  isLive: z.boolean(),
  url: z.string(),
  archiveUrl: z.string(),
})

const givingInfoSchema = z.object({
  accounts: z.array(z.object({ bank: z.string(), number: z.string(), holder: z.string() })),
  noteId: z.string(),
  noteEn: z.string(),
})

/** Key DB (snake_case) untuk ketujuh baris `site_settings`. */
export const SITE_SETTINGS_KEYS = [
  'hero',
  'service_times',
  'contact_info',
  'social_links',
  'pastoral_contacts',
  'live_stream',
  'giving_info',
] as const

export type SiteSettingsKey = (typeof SITE_SETTINGS_KEYS)[number]

/** Bentuk terstruktur (camelCase) yang dikonsumsi halaman publik. */
export type SiteSettings = {
  hero: z.infer<typeof heroSchema>
  serviceTimes: z.infer<typeof serviceTimesSchema>
  contactInfo: z.infer<typeof contactInfoSchema>
  socialLinks: z.infer<typeof socialLinksSchema>
  pastoralContacts: z.infer<typeof pastoralContactsSchema>
  liveStream: z.infer<typeof liveStreamSchema>
  givingInfo: z.infer<typeof givingInfoSchema>
}

/**
 * Ubah baris `site_settings` mentah menjadi `SiteSettings`. Untuk tiap key:
 * baris ada → `schema.parse(value)` (dibiarkan throw bila bentuknya salah);
 * baris tidak ada → default dari `DEFAULT_SETTINGS` (di-parse lewat schema yang
 * sama sehingga tetap tervalidasi & bertipe).
 */
export function parseSiteSettings(rows: { key: string; value: unknown }[]): SiteSettings {
  const byKey = new Map(rows.map((row) => [row.key, row.value]))
  const pick = (dbKey: SiteSettingsKey): unknown =>
    byKey.has(dbKey) ? byKey.get(dbKey) : DEFAULT_SETTINGS[dbKey]

  return {
    hero: heroSchema.parse(pick('hero')),
    serviceTimes: serviceTimesSchema.parse(pick('service_times')),
    contactInfo: contactInfoSchema.parse(pick('contact_info')),
    socialLinks: socialLinksSchema.parse(pick('social_links')),
    pastoralContacts: pastoralContactsSchema.parse(pick('pastoral_contacts')),
    liveStream: liveStreamSchema.parse(pick('live_stream')),
    givingInfo: givingInfoSchema.parse(pick('giving_info')),
  }
}

/** Server fn: baca seluruh baris `site_settings` dan kembalikan `SiteSettings`. */
export const getSiteSettings = createServerFn({ method: 'GET' }).handler(async () => {
  const { db } = await import('@/db')
  const { siteSettings } = await import('@/db/schema')
  const rows = await db.select().from(siteSettings)
  return parseSiteSettings(rows)
})

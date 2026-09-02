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
 * Peta key DB (snake_case) → schema Zod-nya. Satu-satunya tempat pasangan
 * key→schema didefinisikan; `parseSiteSettings` (ketat) dan `parseSiteSettingsSafe`
 * (tahan-banting) sama-sama membacanya lewat `buildSiteSettings` — jadi tak ada
 * dua salinan literal objek yang bisa lepas sinkron.
 */
const SCHEMAS = {
  hero: heroSchema,
  service_times: serviceTimesSchema,
  contact_info: contactInfoSchema,
  social_links: socialLinksSchema,
  pastoral_contacts: pastoralContactsSchema,
  live_stream: liveStreamSchema,
  giving_info: givingInfoSchema,
} satisfies Record<SiteSettingsKey, z.ZodType>

/** `SiteSettings` di-key ulang memakai key DB (snake_case) — untuk builder internal. */
type SiteSettingsByDbKey = { [K in SiteSettingsKey]: z.infer<(typeof SCHEMAS)[K]> }

/**
 * Builder bersama kedua varian parser. Untuk tiap key: ambil value baris (atau
 * `DEFAULT_SETTINGS` bila baris tak ada), lalu validasi lewat `SCHEMAS[key]`.
 * - `strict` → `schema.parse` (throw bila bentuk salah).
 * - non-strict → `schema.safeParse`; bila gagal → `console.error` (nama key saja,
 *   tanpa dump value) dan key itu jatuh ke `DEFAULT_SETTINGS`.
 */
function buildSiteSettings(rows: { key: string; value: unknown }[], strict: boolean): SiteSettings {
  const byKey = new Map(rows.map((row) => [row.key, row.value]))

  const resolve = <K extends SiteSettingsKey>(dbKey: K): SiteSettingsByDbKey[K] => {
    // `SiteSettingsByDbKey[K]` untuk `K` generik dilihat TS sebagai irisan semua
    // varian value — `.parse` per-schema tak comparable ke sana tanpa lewat
    // `unknown`. Cast di sini aman: `SCHEMAS[dbKey]` memang schema untuk `dbKey`.
    const schema = SCHEMAS[dbKey] as unknown as z.ZodType<SiteSettingsByDbKey[K]>
    const raw = byKey.has(dbKey) ? byKey.get(dbKey) : DEFAULT_SETTINGS[dbKey]
    if (strict) return schema.parse(raw)

    const parsed = schema.safeParse(raw)
    if (parsed.success) return parsed.data
    console.error(
      `parseSiteSettingsSafe: nilai site_settings "${dbKey}" tidak valid — jatuh ke DEFAULT_SETTINGS`,
    )
    return schema.parse(DEFAULT_SETTINGS[dbKey])
  }

  return {
    hero: resolve('hero'),
    serviceTimes: resolve('service_times'),
    contactInfo: resolve('contact_info'),
    socialLinks: resolve('social_links'),
    pastoralContacts: resolve('pastoral_contacts'),
    liveStream: resolve('live_stream'),
    givingInfo: resolve('giving_info'),
  }
}

/**
 * Ubah baris `site_settings` mentah menjadi `SiteSettings`. Untuk tiap key:
 * baris ada → `schema.parse(value)` (dibiarkan throw bila bentuknya salah);
 * baris tidak ada → default dari `DEFAULT_SETTINGS` (di-parse lewat schema yang
 * sama sehingga tetap tervalidasi & bertipe). Varian KETAT: dipakai di tempat
 * yang MEMANG perlu tahu nilainya rusak (dashboard, Rencana 3). Halaman publik
 * memakai `parseSiteSettingsSafe`.
 */
export function parseSiteSettings(rows: { key: string; value: unknown }[]): SiteSettings {
  return buildSiteSettings(rows, true)
}

/**
 * Varian tahan-banting `parseSiteSettings` untuk HALAMAN PUBLIK: bila value satu
 * key bentuknya salah (mis. baris jsonb yang diedit keliru lewat dashboard), key
 * itu jatuh ke `DEFAULT_SETTINGS` dan sisanya tetap terbaca — satu baris rusak
 * tak boleh menjatuhkan seluruh halaman. `parseSiteSettings` yang ketat tetap
 * dipakai di tempat yang MEMANG perlu tahu nilainya rusak (dashboard, Rencana 3).
 */
export function parseSiteSettingsSafe(rows: { key: string; value: unknown }[]): SiteSettings {
  return buildSiteSettings(rows, false)
}

/**
 * Server fn: baca seluruh baris `site_settings` dan kembalikan `SiteSettings`.
 * Memakai `parseSiteSettingsSafe` — satu baris jsonb rusak (mis. hasil edit
 * dashboard yang keliru) tak boleh men-500-kan `/kunjungi`, `/persembahan`,
 * `/ibadah-live`, atau Beranda; key yang rusak diganti default, sisanya tampil.
 */
export const getSiteSettings = createServerFn({ method: 'GET' }).handler(async () => {
  const { db } = await import('@/db')
  const { siteSettings } = await import('@/db/schema')
  const rows = await db.select().from(siteSettings)
  return parseSiteSettingsSafe(rows)
})

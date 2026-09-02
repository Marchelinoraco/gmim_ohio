import { afterEach, describe, it, expect, vi } from 'vitest'
import { parseSiteSettings, parseSiteSettingsSafe } from '@/features/content/site-settings'
import { DEFAULT_SETTINGS } from '@/db/seed/settings'

describe('parseSiteSettings', () => {
  it('mem-parse baris dari seed default ke bentuk terstruktur', () => {
    const rows = Object.entries(DEFAULT_SETTINGS).map(([key, value]) => ({ key, value }))
    const s = parseSiteSettings(rows)
    expect(s.hero.titleId.length).toBeGreaterThan(0)
    expect(s.liveStream.isLive).toBe(false)
    expect(Array.isArray(s.givingInfo.accounts)).toBe(true)
  })

  it('mengisi default bila sebuah key hilang', () => {
    const s = parseSiteSettings([]) // tak ada baris
    // Fallback = `DEFAULT_SETTINGS` apa adanya (dibaca lewat schema yang sama).
    expect(s.liveStream).toEqual(DEFAULT_SETTINGS.live_stream)
    expect(s.givingInfo).toEqual(DEFAULT_SETTINGS.giving_info)
  })

  it('melempar bila value sebuah key bentuknya salah', () => {
    expect(() => parseSiteSettings([{ key: 'live_stream', value: { isLive: 'yes' } }])).toThrow()
  })
})

describe('parseSiteSettingsSafe', () => {
  const seededRows = () => Object.entries(DEFAULT_SETTINGS).map(([key, value]) => ({ key, value }))

  // `console.error` di-stub agar output test tetap bersih; dipulihkan tiap test.
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('baris valid → hasil identik dengan parseSiteSettings', () => {
    const rows = seededRows()
    expect(parseSiteSettingsSafe(rows)).toEqual(parseSiteSettings(rows))
  })

  it('satu key rusak → tidak throw, key itu = default seed, enam key lain tetap terbaca', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const rows = seededRows().map((row) =>
      row.key === 'live_stream' ? { key: 'live_stream', value: { isLive: 'yes' } } : row,
    )

    let s!: ReturnType<typeof parseSiteSettingsSafe>
    expect(() => {
      s = parseSiteSettingsSafe(rows)
    }).not.toThrow()

    const strict = parseSiteSettings(seededRows())
    expect(s.liveStream).toEqual(DEFAULT_SETTINGS.live_stream)
    expect(s.hero).toEqual(strict.hero)
    expect(s.serviceTimes).toEqual(strict.serviceTimes)
    expect(s.contactInfo).toEqual(strict.contactInfo)
    expect(s.socialLinks).toEqual(strict.socialLinks)
    expect(s.pastoralContacts).toEqual(strict.pastoralContacts)
    expect(s.givingInfo).toEqual(strict.givingInfo)

    expect(spy).toHaveBeenCalledTimes(1)
    expect(spy).toHaveBeenCalledWith(expect.stringContaining('live_stream'))
  })

  it('semua key rusak → setiap key jatuh ke default', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const rows = Object.keys(DEFAULT_SETTINGS).map((key) => ({ key, value: { ngawur: true } }))

    const s = parseSiteSettingsSafe(rows)

    expect(s).toEqual(parseSiteSettings([]))
    expect(spy).toHaveBeenCalledTimes(Object.keys(DEFAULT_SETTINGS).length)
  })
})

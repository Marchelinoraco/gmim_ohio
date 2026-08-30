import { describe, it, expect } from 'vitest'
import { parseSiteSettings } from '@/features/content/site-settings'
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
    expect(s.liveStream).toEqual({ isLive: false, url: '', archiveUrl: '' })
    expect(s.givingInfo.accounts).toEqual([])
  })

  it('melempar bila value sebuah key bentuknya salah', () => {
    expect(() => parseSiteSettings([{ key: 'live_stream', value: { isLive: 'yes' } }])).toThrow()
  })
})

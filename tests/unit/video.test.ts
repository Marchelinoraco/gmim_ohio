import { describe, it, expect } from 'vitest'
import { youtubeId, liveEmbedSrc } from '@/lib/video'

describe('youtubeId', () => {
  it('watch?v=ID → id', () => {
    expect(youtubeId('https://www.youtube.com/watch?v=dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ')
  })

  it('watch dengan parameter tambahan → id', () => {
    expect(
      youtubeId('https://www.youtube.com/watch?v=dQw4w9WgXcQ&list=PLabc&t=90s&feature=share'),
    ).toBe('dQw4w9WgXcQ')
  })

  it('youtu.be/ID → id', () => {
    expect(youtubeId('https://youtu.be/dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ')
  })

  it('/embed/ID → id', () => {
    expect(youtubeId('https://www.youtube.com/embed/dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ')
  })

  it('/v/ID → id', () => {
    expect(youtubeId('https://youtube.com/v/dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ')
  })

  it('/shorts/ID → id', () => {
    expect(youtubeId('https://www.youtube.com/shorts/abc123XYZ_-')).toBe('abc123XYZ_-')
  })

  it('m.youtube.com → id', () => {
    expect(youtubeId('https://m.youtube.com/watch?v=dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ')
  })

  it('youtube-nocookie.com/embed → id', () => {
    expect(youtubeId('https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ')
  })

  it('string sampah → null', () => {
    expect(youtubeId('not a url at all')).toBeNull()
  })

  it('URL non-video → null', () => {
    expect(youtubeId('https://example.com/watch?v=dQw4w9WgXcQ')).toBeNull()
  })

  it('youtu.be tanpa path → null', () => {
    expect(youtubeId('https://youtu.be/')).toBeNull()
  })
})

describe('liveEmbedSrc', () => {
  it('URL YouTube → src embed YouTube', () => {
    expect(liveEmbedSrc('https://www.youtube.com/watch?v=dQw4w9WgXcQ')).toBe(
      'https://www.youtube.com/embed/dQw4w9WgXcQ',
    )
  })

  it('URL video Facebook → src plugin video Facebook (href ter-encode)', () => {
    const url = 'https://www.facebook.com/gmimmusafir.columbus/videos/1234567890123456/'
    expect(liveEmbedSrc(url)).toBe(
      `https://www.facebook.com/plugins/video.php?href=${encodeURIComponent(url)}&show_text=false`,
    )
  })

  it('URL fb.watch → src plugin video Facebook (href ter-encode)', () => {
    const url = 'https://fb.watch/aB3xYz9_-/'
    expect(liveEmbedSrc(url)).toBe(
      `https://www.facebook.com/plugins/video.php?href=${encodeURIComponent(url)}&show_text=false`,
    )
  })

  it('URL video web.facebook.com → src plugin video Facebook (href ter-encode)', () => {
    const url = 'https://web.facebook.com/gmimmusafir.columbus/videos/9876543210987654/'
    expect(liveEmbedSrc(url)).toBe(
      `https://www.facebook.com/plugins/video.php?href=${encodeURIComponent(url)}&show_text=false`,
    )
  })

  it('host tak dikenal → null', () => {
    expect(liveEmbedSrc('https://vimeo.com/123456789')).toBeNull()
  })

  it('string sampah → null', () => {
    expect(liveEmbedSrc('nope')).toBeNull()
  })

  // Nilai keamanan `liveEmbedSrc` = pemeriksaan host EXACT-equality. Kunci dari
  // regresi: host mirip-Facebook / mirip-YouTube tak boleh lolos jadi embed.
  it('host mirip-Facebook (subdomain palsu) → null', () => {
    expect(liveEmbedSrc('https://facebook.com.evil.tld/gmimmusafir/videos/1/')).toBeNull()
  })

  it('host mirip-Facebook (prefiks palsu) → null', () => {
    expect(liveEmbedSrc('https://notfacebook.com/gmimmusafir/videos/1/')).toBeNull()
  })

  it('host mirip-YouTube → null', () => {
    expect(liveEmbedSrc('https://evil-youtube.com/watch?v=abc123')).toBeNull()
  })
})

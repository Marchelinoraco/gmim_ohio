import { describe, it, expect } from 'vitest'
import { sanitizeRichText } from '@/lib/sanitize'

describe('sanitizeRichText', () => {
  it('mempertahankan tag konten yang diizinkan', () => {
    const html =
      '<h2>Judul</h2><p>Isi <strong>tebal</strong> dan <em>miring</em>.</p><ul><li>a</li></ul>'
    expect(sanitizeRichText(html)).toBe(html)
  })

  it('membuang <script> dan handler event', () => {
    expect(sanitizeRichText('<p onclick="x()">hai</p><script>alert(1)</script>')).toBe('<p>hai</p>')
  })

  it('mengizinkan <a href> tapi memaksa rel & membuang javascript:', () => {
    const out = sanitizeRichText('<a href="https://x.com">x</a><a href="javascript:evil()">y</a>')
    expect(out).toContain('href="https://x.com"')
    expect(out).toContain('rel="noopener noreferrer"')
    expect(out).toContain('target="_blank"')
    expect(out).not.toContain('javascript:')
  })

  it('memaksa rel/target aman & membuang atribut hostile pada <a>', () => {
    const out = sanitizeRichText(
      '<a href="http://x.com" rel="attacker" target="_self" onclick="evil()" id="y" class="z" style="color:red">t</a>',
    )
    expect(out).toContain('href="http://x.com"')
    expect(out).toContain('rel="noopener noreferrer"')
    expect(out).toContain('target="_blank"')
    expect(out).not.toContain('onclick')
    expect(out).not.toContain('_self')
    expect(out).not.toContain('attacker')
    expect(out).not.toContain('id=')
    expect(out).not.toContain('class=')
    expect(out).not.toContain('style=')
  })

  it('membuang style, class, id, dan tag tak dikenal', () => {
    expect(sanitizeRichText('<p class="x" style="color:red">a</p><marquee>b</marquee>')).toBe(
      '<p>a</p>b',
    )
  })

  it('string kosong → string kosong', () => {
    expect(sanitizeRichText('')).toBe('')
  })
})

import { describe, it, expect } from 'vitest'
import { sanitizeRichText, ALLOWED_TAGS } from '@/lib/sanitize'

/**
 * Sanitasi di titik SIMPAN. Yang diuji di sini bukan "sanitizer bekerja"
 * (`sanitize-html` sudah punya testnya sendiri), melainkan bahwa allowlist
 * proyek ini benar-benar menutup jalur yang penting, dan bahwa daftar tag yang
 * dipakai editor sama persis dengan yang diterima sanitizer.
 */
describe('sanitizeRichText di titik simpan', () => {
  it('membuang <script> beserta isinya', () => {
    const out = sanitizeRichText('<p>halo</p><script>alert(1)</script>')
    expect(out).not.toContain('script')
    expect(out).not.toContain('alert')
    expect(out).toContain('<p>halo</p>')
  })

  it('membuang handler inline seperti onclick', () => {
    const out = sanitizeRichText('<p onclick="steal()">halo</p>')
    expect(out).not.toContain('onclick')
    expect(out).toContain('halo')
  })

  it('membuang href berskema javascript:', () => {
    const out = sanitizeRichText('<a href="javascript:alert(1)">klik</a>')
    expect(out).not.toContain('javascript:')
  })

  it('mempertahankan href http/https/mailto', () => {
    expect(sanitizeRichText('<a href="https://a.test">x</a>')).toContain('https://a.test')
    expect(sanitizeRichText('<a href="mailto:a@b.test">x</a>')).toContain('mailto:a@b.test')
  })

  it('memaksa rel aman pada tautan keluar', () => {
    const out = sanitizeRichText('<a href="https://a.test">x</a>')
    expect(out).toContain('rel="noopener noreferrer"')
  })

  it('membuang tag di luar allowlist tapi menyimpan teksnya', () => {
    const out = sanitizeRichText('<marquee>penting</marquee>')
    expect(out).not.toContain('marquee')
    expect(out).toContain('penting')
  })

  it('mempertahankan seluruh tag di allowlist', () => {
    const html =
      '<h2>a</h2><p><strong>b</strong> <em>c</em></p><ul><li>d</li></ul><blockquote>e</blockquote>'
    const out = sanitizeRichText(html)
    for (const tag of ['h2', 'p', 'strong', 'em', 'ul', 'li', 'blockquote']) {
      expect(out).toContain(`<${tag}>`)
    }
  })

  it('string kosong dan nilai bukan-string tidak melempar', () => {
    expect(sanitizeRichText('')).toBe('')
    expect(() => sanitizeRichText(undefined as unknown as string)).not.toThrow()
  })

  // Editor dan sanitizer WAJIB memakai daftar yang sama. Kalau editor bisa
  // menghasilkan tag yang sanitizer buang, pengurus akan melihat formatnya hilang
  // setelah menyimpan — tanpa pesan galat apa pun.
  it('ALLOWED_TAGS diekspor dan memuat tag yang dipakai toolbar editor', () => {
    for (const tag of ['h2', 'h3', 'p', 'ul', 'ol', 'li', 'strong', 'em', 'a', 'blockquote']) {
      expect(ALLOWED_TAGS).toContain(tag)
    }
  })
})

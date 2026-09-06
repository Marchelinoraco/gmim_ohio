import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, it, expect } from 'vitest'

/**
 * Palet DARK dibaca langsung dari `app.css`, bukan disalin ke sini.
 *
 * Nilai yang disalin akan drift diam-diam: seseorang menyetel ulang satu hex di
 * CSS, test tetap hijau karena menguji salinannya. Membaca sumber aslinya
 * membuat test ini gagal tepat saat palet sungguhan berubah.
 *
 * Yang dijaga ada dua, dan keduanya sempat dilanggar tanpa satu test pun merah:
 * rasio kontras (dulu hanya dicatat di komentar) dan janji "dark mode tanpa
 * ungu" (yang tak punya definisi bisa-diuji sama sekali sebelum ini).
 */
const CSS = readFileSync(
  fileURLToPath(new URL('../../src/styles/app.css', import.meta.url)),
  'utf8',
)

function token(name: string): string {
  const hex = CSS.match(new RegExp(`--${name}:\\s*(#[0-9a-fA-F]{6})`))?.[1]
  if (!hex) throw new Error(`token --${name} tidak ditemukan di app.css`)
  return hex.toLowerCase()
}

/** Tuple, bukan `number[]`: destructuring array biasa memberi `number | undefined`. */
function channels(hex: string): [number, number, number] {
  const c = hex.replace('#', '')
  const at = (i: number) => parseInt(c.slice(i, i + 2), 16) / 255
  return [at(0), at(2), at(4)]
}

function luminance(hex: string): number {
  const gamma = (v: number) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4)
  const [r, g, b] = channels(hex)
  return 0.2126 * gamma(r) + 0.7152 * gamma(g) + 0.0722 * gamma(b)
}

function contrast(a: string, b: string): number {
  const [la, lb] = [luminance(a), luminance(b)]
  const [hi, lo] = la >= lb ? [la, lb] : [lb, la]
  return (hi + 0.05) / (lo + 0.05)
}

/** Hue HSL dalam derajat; 0 untuk abu murni (tak punya hue). */
function hue(hex: string): number {
  const [r, g, b] = channels(hex)
  const max = Math.max(r, g, b)
  const delta = max - Math.min(r, g, b)
  if (delta === 0) return 0
  const h =
    max === r ? ((g - b) / delta) % 6 : max === g ? (b - r) / delta + 2 : (r - g) / delta + 4
  return (h * 60 + 360) % 360
}

/**
 * Chroma = jarak antar channel terjauh. Abu murni 0, warna jenuh mendekati 1.
 *
 * SENGAJA bukan saturasi HSL: HSL membagi dengan lightness, sehingga warna yang
 * sangat terang terbaca jenuh padahal selisih channel-nya kecil. Krem #f0e9df
 * keluar 0.36 di HSL — praktis sama dengan warna sungguhan — padahal channel-nya
 * hanya berjarak 0.07 dan mata membacanya sebagai putih hangat. Chroma memberi
 * angka yang sesuai dengan yang terlihat: krem 0.07, ungu lama #a78bfa 0.44.
 */
function chroma(hex: string): number {
  const [r, g, b] = channels(hex)
  return Math.max(r, g, b) - Math.min(r, g, b)
}

const SURFACE = () => token('dark-surface')
const SURFACE_2 = () => token('dark-surface-2')

describe('palet dark — kontras', () => {
  // Teks di atas tombol solid memakai `--color-surface` (lihat varian `primary`
  // dan `secondary` di `button.tsx`), yang di dark = `--dark-surface`. Jadi rasio
  // yang sama menjaga dua hal sekaligus: teks tombol, dan warna itu sebagai teks
  // di atas halaman.
  it.each([
    ['dark-primary', 4.5],
    ['dark-primary-hover', 4.5],
    ['dark-secondary', 4.5],
    ['dark-secondary-hover', 4.5],
    ['dark-accent', 4.5],
    ['dark-ink', 4.5],
    ['dark-muted', 4.5],
  ])('%s lolos AA di kedua permukaan gelap', (name, min) => {
    expect(contrast(token(name), SURFACE())).toBeGreaterThanOrEqual(min)
    expect(contrast(token(name), SURFACE_2())).toBeGreaterThanOrEqual(min)
  })

  it.each([
    'dark-cat-jemaat',
    'dark-cat-bapa',
    'dark-cat-ibu',
    'dark-cat-pemuda',
    'dark-cat-sekolah-minggu',
    'dark-cat-kolom',
  ])('%s tetap ≥ 8:1 — badge kategori dipakai sebagai teks maupun latar', (name) => {
    expect(contrast(token(name), SURFACE())).toBeGreaterThanOrEqual(8)
    expect(contrast(token(name), SURFACE_2())).toBeGreaterThanOrEqual(8)
  })
})

describe('palet dark — bebas ungu', () => {
  // Ungu/magenta ≈ 260°–330°. Ambangnya sengaja lebar: yang diminta adalah dark
  // mode yang tidak TERBACA keunguan, bukan sekadar menghindari satu hex.
  const UNGU = (h: number) => h >= 260 && h <= 330

  it.each([
    'dark-primary',
    'dark-primary-hover',
    'dark-secondary',
    'dark-secondary-hover',
    'dark-accent',
    'dark-cat-jemaat',
    'dark-cat-bapa',
    'dark-cat-ibu',
    'dark-cat-pemuda',
    'dark-cat-sekolah-minggu',
    'dark-cat-kolom',
  ])('%s bukan ungu', (name) => {
    const hex = token(name)
    // Netral nyaris tanpa chroma tak punya hue bermakna — krem hangat lolos di
    // sini lewat chroma rendahnya, bukan lewat kebetulan sudut hue-nya.
    if (chroma(hex) < 0.12) return
    expect(UNGU(hue(hex)), `${name} (${hex}) hue ${hue(hex).toFixed(0)}°`).toBe(false)
  })

  it('warna aksi netral hangat — bukan sekadar bukan-ungu, tapi memang tak berwarna', () => {
    // 0.12 memisahkan dengan lapang: krem #f0e9df ada di 0.07, sedangkan ungu
    // yang digantikannya (#a78bfa) di 0.44 — enam kali lipatnya.
    for (const name of ['dark-primary', 'dark-primary-hover', 'dark-accent']) {
      expect(chroma(token(name)), `${name} terlalu berwarna untuk sebuah netral`).toBeLessThan(0.12)
    }
  })
})

describe('palet dark — enam kategori tetap bisa dibedakan', () => {
  const CATS = [
    'dark-cat-jemaat',
    'dark-cat-bapa',
    'dark-cat-ibu',
    'dark-cat-pemuda',
    'dark-cat-sekolah-minggu',
    'dark-cat-kolom',
  ]

  // Kategori dibedakan HANYA oleh warna (badge kecil, teksnya sudah nama
  // kategori — tapi warnanya yang dipakai memindai jadwal). Membuang tiga warna
  // ungu mengecilkan ruang hue yang tersisa, jadi jarak antar warna perlu dijaga
  // eksplisit; tanpa ini dua kategori bisa berakhir nyaris sewarna.
  it('jarak hue antar kategori ≥ 25°', () => {
    for (const [i, a] of CATS.entries()) {
      for (const b of CATS.slice(i + 1)) {
        const raw = Math.abs(hue(token(a)) - hue(token(b)))
        const jarak = Math.min(raw, 360 - raw)
        expect(jarak, `${a} vs ${b}`).toBeGreaterThanOrEqual(25)
      }
    }
  })
})

describe('palet light tidak ikut berubah', () => {
  // Identitas ungu GMIM adalah keputusan brand dan hanya berlaku di light. Test
  // ini menahan perubahan dark agar tidak merembet ke sana.
  it('warna aksi light tetap ungu', () => {
    for (const name of ['color-primary', 'color-secondary', 'color-accent']) {
      expect(UNGU_LIGHT(hue(token(name))), `${name} (${token(name)})`).toBe(true)
    }
  })
  function UNGU_LIGHT(h: number) {
    return h >= 260 && h <= 330
  }
})

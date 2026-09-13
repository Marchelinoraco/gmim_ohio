import { describe, it, expect } from 'vitest'
import { TIPE_GAMBAR, MAKS_GAMBAR_BYTE, adalahUrlBlob, pesanTolakan } from '@/lib/unggah'

describe('TIPE_GAMBAR', () => {
  it('hanya format yang benar-benar bisa dirender browser', () => {
    expect([...TIPE_GAMBAR].sort()).toEqual(
      ['image/avif', 'image/jpeg', 'image/png', 'image/webp'].sort(),
    )
  })

  // SVG sengaja TIDAK diizinkan: ia dokumen aktif yang bisa memuat <script>,
  // dan disajikan dari domain blob ia berjalan di origin domain itu.
  it('menolak SVG', () => {
    expect(TIPE_GAMBAR as readonly string[]).not.toContain('image/svg+xml')
  })
})

describe('pesanTolakan', () => {
  const berkas = (type: string, size: number) => ({ type, size, name: 'f' }) as File

  it('menerima JPEG berukuran wajar', () => {
    expect(pesanTolakan(berkas('image/jpeg', 2_000_000))).toBeNull()
  })

  it('menolak tipe di luar daftar', () => {
    expect(pesanTolakan(berkas('application/pdf', 1000))).toBe('TIPE_TIDAK_DIDUKUNG')
  })

  it('menolak berkas melebihi batas', () => {
    expect(pesanTolakan(berkas('image/jpeg', MAKS_GAMBAR_BYTE + 1))).toBe('TERLALU_BESAR')
  })

  it('menerima tepat di batas', () => {
    expect(pesanTolakan(berkas('image/jpeg', MAKS_GAMBAR_BYTE))).toBeNull()
  })
})

describe('adalahUrlBlob', () => {
  // Menghapus item yang menunjuk berkas statis tidak boleh memanggil Blob:
  // berkasnya tidak ada di sana. Sebaliknya, melewatkan URL Blob saat menghapus
  // meninggalkan berkas yatim yang terus dibayar selamanya.
  it('mengenali URL Vercel Blob', () => {
    expect(adalahUrlBlob('https://abc123.public.blob.vercel-storage.com/foto-x.jpg')).toBe(true)
  })

  it('menolak berkas statis di public/', () => {
    expect(adalahUrlBlob('/gallery/761546284_1774904490204016.jpg')).toBe(false)
  })

  // `includes('blob.vercel-storage.com')` juga cocok dengan host milik penyerang.
  it('menolak domain lain yang menyerupai', () => {
    expect(adalahUrlBlob('https://blob.vercel-storage.com.jahat.test/x.jpg')).toBe(false)
  })

  it('menolak nilai kosong', () => {
    expect(adalahUrlBlob('')).toBe(false)
    expect(adalahUrlBlob(null)).toBe(false)
  })
})

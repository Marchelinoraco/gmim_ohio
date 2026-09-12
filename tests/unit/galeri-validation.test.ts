import { describe, it, expect } from 'vitest'
import { albumInputSchema, itemInputSchema, urutanSchema } from '@/features/gallery/mutations'

const album = {
  titleId: 'Ibadah Natal 2026',
  titleEn: 'Christmas Service 2026',
  albumDate: '2026-12-25',
  coverImageUrl: '',
  sortOrder: 0,
  status: 'draft' as const,
}

describe('albumInputSchema', () => {
  it('menerima album yang sah', () => {
    const r = albumInputSchema.safeParse(album)
    expect(r.success, JSON.stringify(r.error?.issues)).toBe(true)
  })

  it('mengubah sampul kosong jadi null', () => {
    const r = albumInputSchema.safeParse(album)
    if (r.success) expect(r.data.coverImageUrl).toBeNull()
  })

  it('menolak judul kosong', () => {
    expect(albumInputSchema.safeParse({ ...album, titleId: '  ' }).success).toBe(false)
    expect(albumInputSchema.safeParse({ ...album, titleEn: '' }).success).toBe(false)
  })

  it('menolak tanggal yang bukan YYYY-MM-DD', () => {
    expect(albumInputSchema.safeParse({ ...album, albumDate: '25-12-2026' }).success).toBe(false)
    expect(albumInputSchema.safeParse({ ...album, albumDate: '' }).success).toBe(false)
  })
})

const gambar = {
  albumId: '11111111-1111-4111-8111-111111111111',
  type: 'image' as const,
  imageUrl: 'https://abc.public.blob.vercel-storage.com/foto.jpg',
  youtubeUrl: '',
  captionId: 'Ibadah pagi',
  captionEn: 'Morning service',
}

describe('itemInputSchema', () => {
  it('menerima item gambar', () => {
    const r = itemInputSchema.safeParse(gambar)
    expect(r.success, JSON.stringify(r.error?.issues)).toBe(true)
  })

  // Item gambar tanpa imageUrl merender kotak kosong di galeri — tanpa error.
  it('menolak item gambar tanpa alamat gambar', () => {
    expect(itemInputSchema.safeParse({ ...gambar, imageUrl: '' }).success).toBe(false)
  })

  it('menerima item YouTube dengan URL yang bisa dibaca', () => {
    const r = itemInputSchema.safeParse({
      ...gambar,
      type: 'youtube',
      imageUrl: '',
      youtubeUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    })
    expect(r.success, JSON.stringify(r.error?.issues)).toBe(true)
  })

  it('menolak item YouTube tanpa URL', () => {
    expect(
      itemInputSchema.safeParse({ ...gambar, type: 'youtube', imageUrl: '', youtubeUrl: '' })
        .success,
    ).toBe(false)
  })

  // Komponen galeri merender embed dari id hasil `youtubeId()`. URL yang tak
  // terbaca menghasilkan bingkai kosong tanpa error apa pun.
  it('menolak URL yang youtubeId() tak bisa baca', () => {
    expect(
      itemInputSchema.safeParse({
        ...gambar,
        type: 'youtube',
        imageUrl: '',
        youtubeUrl: 'https://vimeo.com/12345',
      }).success,
    ).toBe(false)
  })
})

describe('urutanSchema', () => {
  it('menerima daftar id unik', () => {
    expect(
      urutanSchema.safeParse({
        albumId: gambar.albumId,
        ids: ['11111111-1111-4111-8111-111111111111', '22222222-2222-4222-8222-222222222222'],
      }).success,
    ).toBe(true)
  })

  // Id kembar berarti dua baris berebut satu posisi; hasilnya urutan yang
  // berubah sendiri setiap kali halaman dimuat ulang.
  it('menolak daftar yang memuat id kembar', () => {
    expect(
      urutanSchema.safeParse({
        albumId: gambar.albumId,
        ids: ['11111111-1111-4111-8111-111111111111', '11111111-1111-4111-8111-111111111111'],
      }).success,
    ).toBe(false)
  })

  it('menolak daftar kosong', () => {
    expect(urutanSchema.safeParse({ albumId: gambar.albumId, ids: [] }).success).toBe(false)
  })
})

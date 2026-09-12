/**
 * Aturan unggah — SATU sumber untuk klien dan server.
 *
 * Klien memakainya untuk menolak lebih awal dengan pesan yang bisa dibaca;
 * server memakainya untuk benar-benar menahan. Kalau keduanya disalin terpisah,
 * yang menyimpang adalah batas keamanan — dan menyimpangnya tidak terlihat
 * sampai ada yang memanfaatkannya.
 */

/**
 * Format gambar yang diizinkan.
 *
 * SVG sengaja tidak ada di daftar. Ia dokumen aktif yang bisa memuat `<script>`,
 * dan disajikan dari domain blob ia berjalan di origin domain itu.
 */
export const TIPE_GAMBAR = ['image/jpeg', 'image/png', 'image/webp', 'image/avif'] as const

/** 10 MB — di atas foto ponsel pada umumnya, di bawah ukuran yang bikin galeri berat. */
export const MAKS_GAMBAR_BYTE = 10 * 1024 * 1024

export type KodeTolakan = 'TIPE_TIDAK_DIDUKUNG' | 'TERLALU_BESAR'

/**
 * `null` bila berkasnya boleh; selain itu KODE, bukan kalimat siap-tampil —
 * pemanggilnya yang tahu bahasa yang sedang dipakai.
 */
export function pesanTolakan(file: File): KodeTolakan | null {
  if (!(TIPE_GAMBAR as readonly string[]).includes(file.type)) return 'TIPE_TIDAK_DIDUKUNG'
  if (file.size > MAKS_GAMBAR_BYTE) return 'TERLALU_BESAR'
  return null
}

/**
 * `true` hanya untuk URL yang benar-benar milik Vercel Blob.
 *
 * Ada DUA jenis URL gambar di `gallery_items`: 18 foto seed menunjuk berkas
 * statis `/gallery/*.jpg` yang di-commit ke repo, foto baru menunjuk Blob.
 * Memanggil `del()` untuk yang pertama akan gagal; melewatkan yang kedua
 * meninggalkan berkas yatim yang terus dibayar selamanya.
 *
 * Dicek lewat `URL.hostname` yang sudah di-parse, bukan `includes()`:
 * `includes('blob.vercel-storage.com')` juga cocok dengan
 * `https://blob.vercel-storage.com.jahat.test/x` — host milik penyerang.
 */
export function adalahUrlBlob(url: string | null | undefined): boolean {
  if (!url) return false
  try {
    return new URL(url).hostname.endsWith('.blob.vercel-storage.com')
  } catch {
    return false
  }
}

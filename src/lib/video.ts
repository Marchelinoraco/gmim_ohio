/**
 * Pemetaan URL video → bentuk yang bisa di-embed. SATU-SATUNYA tempat logika
 * "URL ini asalnya dari mana → `src` iframe apa" tinggal. Dipakai `/galeri/$id`
 * (thumbnail + dialog YouTube) dan `/ibadah-live` (siaran langsung YouTube /
 * Facebook). Sebelumnya `youtubeId` tinggal di route `galeri_.$id.tsx`; mengimpor
 * helper antar-file route itu keliru, jadi dipindah ke sini.
 *
 * `liveEmbedSrc` mengembalikan `null` untuk host yang tak dikenal SECARA SENGAJA:
 * pemanggil jatuh ke keadaan "tidak ada siaran" alih-alih meng-`<iframe>` origin
 * sembarangan. Meng-embed domain arbitrer di situs gereja = risiko (clickjacking,
 * konten tak terkontrol) — daftar host di sini adalah allowlist, bukan sekadar
 * deteksi.
 */

/**
 * Ekstrak id video dari URL YouTube. Menangani `watch?v=ID`, `youtu.be/ID`,
 * `/embed/ID`, `/v/ID`, `/shorts/ID` pada host `youtube.com` / `m.youtube.com` /
 * `youtube-nocookie.com`. `null` bila URL tak bisa di-parse atau bukan YouTube.
 * Kasus tepi: `watch?v=` dengan `v` KOSONG mengembalikan `''` (bukan `null`) —
 * pemanggil memakai `if (!id)` jadi keduanya sama-sama ditolak.
 */
export function youtubeId(url: string): string | null {
  let parsed: URL
  try {
    parsed = new URL(url)
  } catch {
    return null
  }
  const host = parsed.hostname.replace(/^www\./, '')
  if (host === 'youtu.be') {
    const id = parsed.pathname.split('/').filter(Boolean)[0]
    return id ?? null
  }
  if (host === 'youtube.com' || host === 'm.youtube.com' || host === 'youtube-nocookie.com') {
    if (parsed.pathname === '/watch') return parsed.searchParams.get('v')
    const parts = parsed.pathname.split('/').filter(Boolean)
    if (parts[0] === 'embed' || parts[0] === 'v' || parts[0] === 'shorts') return parts[1] ?? null
  }
  return null
}

/**
 * Ubah URL siaran langsung menjadi `src` iframe yang aman di-embed:
 * - YouTube (lewat `youtubeId`) → `https://www.youtube.com/embed/${id}`
 * - Facebook (`facebook.com` / `web.facebook.com` / `fb.watch`) → plugin
 *   `video.php` dengan `href` URL asli ter-encode
 * - selain itu / tak bisa di-parse → `null` (pemanggil jatuh ke keadaan offline).
 */
export function liveEmbedSrc(url: string): string | null {
  const id = youtubeId(url)
  if (id) return `https://www.youtube.com/embed/${id}`

  let parsed: URL
  try {
    parsed = new URL(url)
  } catch {
    return null
  }
  const host = parsed.hostname.replace(/^www\./, '')
  if (host === 'facebook.com' || host === 'web.facebook.com' || host === 'fb.watch') {
    // `plugins/video.php` mengharap permalink kanonis (`/…/videos/<id>` atau
    // `/watch/?v=<id>`); short link `fb.watch/<slug>` kadang tak resolve di dalam
    // iframe. Yang menyambungkan stream asli (Rencana 2b / Rencana 3) sebaiknya
    // menyimpan permalink lengkap, bukan short link.
    return `https://www.facebook.com/plugins/video.php?href=${encodeURIComponent(url)}&show_text=false`
  }
  return null
}

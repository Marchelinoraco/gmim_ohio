/**
 * Kontrak tema situs.
 *
 * Preferensi user (`'light' | 'dark' | 'system'`) disimpan di `localStorage`.
 * Tema yang di-resolve dipasang sebagai `data-theme="light|dark"` di `<html>`;
 * `'system'` = atribut dihapus, sehingga CSS `@media (prefers-color-scheme)`
 * yang menentukan (lihat `src/styles/app.css`).
 *
 * SSR-safe: modul ini TIDAK menyentuh `window`/`document`/`localStorage` saat
 * di-import. Fungsi di bawah hanya boleh dipanggil dari event handler / effect.
 */

export const THEME_STORAGE_KEY = 'gmim-theme'

export type ThemePref = 'light' | 'dark' | 'system'

/** Urutan opsi untuk menu toggle. */
export const THEME_PREFS = ['system', 'light', 'dark'] as const

/**
 * Skrip inline `<head>` — dijalankan SEBELUM paint dan SEBELUM `<link>`
 * stylesheet. Membaca preferensi tersimpan lalu memasang `data-theme` lebih
 * awal supaya user yang memilih "Gelap" tidak melihat kilatan (flash) putih
 * saat memuat halaman. Nilai `'system'` / kosong sengaja dibiarkan tanpa
 * atribut agar `@media (prefers-color-scheme: dark)` yang bekerja.
 *
 * Dibungkus IIFE + try/catch: Safari private mode melempar pada akses
 * `localStorage`, dan kita tidak mau itu menghentikan render.
 */
export const THEME_INIT_SCRIPT = `(function(){try{var p=localStorage.getItem('${THEME_STORAGE_KEY}');if(p==='light'||p==='dark'){document.documentElement.setAttribute('data-theme',p)}}catch(e){}})()`

/** Event same-tab yang dipancarkan `writeThemePref` supaya `useSyncExternalStore` ikut update. */
const THEME_PREF_EVENT = 'gmim-theme-change'

/**
 * Snapshot klien untuk `useSyncExternalStore`. Mengembalikan primitive string,
 * jadi stabil-by-value (React tak akan re-render kalau nilainya sama).
 */
export function readThemePref(): ThemePref {
  try {
    const p = localStorage.getItem(THEME_STORAGE_KEY)
    if (p === 'light' || p === 'dark' || p === 'system') return p
  } catch {
    // localStorage tak tersedia — anggap 'system'.
  }
  return 'system'
}

/** Snapshot server/hydrasi — server tak tahu preferensi, selalu `'system'`. */
export function serverThemePref(): ThemePref {
  return 'system'
}

/** Langganan perubahan preferensi: tab lain (`storage`) + tab ini (`THEME_PREF_EVENT`). */
export function subscribeThemePref(onChange: () => void): () => void {
  window.addEventListener('storage', onChange)
  window.addEventListener(THEME_PREF_EVENT, onChange)
  return () => {
    window.removeEventListener('storage', onChange)
    window.removeEventListener(THEME_PREF_EVENT, onChange)
  }
}

/** Simpan preferensi + beri tahu store di tab ini. Panggil dari handler. */
export function writeThemePref(pref: ThemePref): void {
  try {
    localStorage.setItem(THEME_STORAGE_KEY, pref)
  } catch {
    // localStorage tak tersedia — abaikan; store tetap dinotifikasi untuk sesi ini.
  }
  window.dispatchEvent(new Event(THEME_PREF_EVENT))
}

/** Terapkan preferensi ke `<html>`. Panggil dari handler. */
export function applyThemePref(pref: ThemePref): void {
  const root = document.documentElement
  if (pref === 'system') {
    root.removeAttribute('data-theme')
  } else {
    root.setAttribute('data-theme', pref)
  }
}

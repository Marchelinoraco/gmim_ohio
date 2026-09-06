import { useEffect, useLayoutEffect, useRef, type ReactNode } from 'react'

/**
 * `<Reveal>` — konten memudar & naik lembut saat pertama masuk viewport.
 *
 * Tiga hal yang membuat ini aman dipakai membungkus konten sungguhan:
 *
 * 1. **Tidak pernah menyembunyikan konten dari yang tak menjalankan JS.**
 *    Render server TIDAK membawa `data-reveal` sama sekali, dan CSS tidak
 *    punya aturan yang menyembunyikan secara default (lihat `app.css`). Tanpa
 *    JS, tanpa hidrasi, atau bila `IntersectionObserver` tak ada — konten
 *    tampil penuh. Crawler juga melihatnya utuh.
 * 2. **Tanpa kedipan.** Keadaan tersembunyi dipasang di `useLayoutEffect`,
 *    yang jalan setelah DOM ter-mount tapi SEBELUM browser melukis — jadi
 *    konten tak pernah sempat terlihat lalu menghilang. `useEffect` biasa
 *    akan menghasilkan kedipan yang justru lebih buruk daripada tanpa animasi.
 * 3. **Reduced-motion dihormati sungguhan**, bukan dipercepat: bila pengguna
 *    memintanya, elemen tak pernah disembunyikan sejak awal sehingga tidak ada
 *    yang perlu dianimasikan.
 *
 * Memicu sekali lalu berhenti mengamati — section tidak berkedip-kedip saat
 * pengguna menggulir naik-turun.
 */

// `useLayoutEffect` memperingatkan saat SSR (tak ada layout untuk diukur di
// server). Efek memang tak pernah jalan di server, jadi jatuhkan ke
// `useEffect` di sana untuk membungkam peringatan tanpa mengubah perilaku klien.
const useIsomorphicLayoutEffect = typeof window === 'undefined' ? useEffect : useLayoutEffect

export function Reveal({
  children,
  className,
  /** Jeda opsional supaya beberapa elemen bisa masuk bertahap, dalam milidetik. */
  delayMs = 0,
}: {
  children: ReactNode
  className?: string
  delayMs?: number
}) {
  const ref = useRef<HTMLDivElement>(null)

  useIsomorphicLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    if (typeof IntersectionObserver === 'undefined') return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

    // Sudah terlihat saat mount (mis. hero di puncak halaman) → jangan
    // sembunyikan hanya untuk memunculkannya kembali sepersekian detik
    // kemudian; itu terbaca sebagai kedipan, bukan animasi.
    const rect = el.getBoundingClientRect()
    const alreadyVisible = rect.top < window.innerHeight && rect.bottom > 0
    if (alreadyVisible) return

    el.dataset.reveal = 'hidden'
    if (delayMs) el.style.transitionDelay = `${delayMs}ms`

    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue
          el.dataset.reveal = 'shown'
          io.disconnect()
        }
      },
      // Picu sedikit sebelum benar-benar masuk layar supaya animasinya sudah
      // selesai saat elemen berada di tengah pandangan pengguna.
      { rootMargin: '0px 0px -10% 0px' },
    )
    io.observe(el)
    return () => io.disconnect()
  }, [delayMs])

  return (
    <div ref={ref} className={className}>
      {children}
    </div>
  )
}

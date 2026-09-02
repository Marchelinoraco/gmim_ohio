import { useEffect } from 'react'
import { Dialog, VisuallyHidden } from 'radix-ui'
import * as m from '@/paraglide/messages'

/**
 * `<Lightbox>` — komponen KLIEN untuk menampilkan foto album galeri ukuran penuh
 * di atas overlay gelap. Dibangun di atas Radix `Dialog` (API namespaced:
 * `Dialog.Root/Portal/Overlay/Content/Title/Close`), jadi fokus-trap,
 * scroll-lock, `aria-modal`, dan Esc-untuk-tutup sudah tersedia gratis.
 *
 * SSR-safe: tidak ada akses `window`/`document` di scope modul maupun saat
 * render. Listener keyboard ←/→ hanya dipasang di dalam `useEffect` (klien
 * saja) dan dibersihkan saat lightbox tertutup / unmount. `Dialog.Portal` Radix
 * juga baru merender ke `document.body` setelah mount di klien.
 *
 * Catatan token: isi lightbox tampil di atas `bg-black/80` yang dipaksa gelap —
 * bukan permukaan tema — jadi `text-white` untuk caption/counter di sini
 * disengaja. Tombol navigasi/tutup tetap memakai token (`bg-surface`,
 * `text-ink`, `border-border`) supaya kontras enak di kedua tema.
 */

export interface LightboxItem {
  src: string
  caption: string
}

interface LightboxProps {
  items: LightboxItem[]
  index: number
  open: boolean
  onClose: () => void
  onNav: (nextIndex: number) => void
}

function ChevronLeftIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
    >
      <path d="m15 18-6-6 6-6" />
    </svg>
  )
}

function ChevronRightIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
    >
      <path d="m9 18 6-6-6-6" />
    </svg>
  )
}

function CloseIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
    >
      <path d="M18 6 6 18M6 6l12 12" />
    </svg>
  )
}

export function Lightbox({ items, index, open, onClose, onNav }: LightboxProps) {
  const count = items.length

  // Keyboard ←/→ — hanya aktif selagi lightbox terbuka. Esc ditangani Radix.
  useEffect(() => {
    if (!open || count === 0) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') onNav((index - 1 + count) % count)
      if (e.key === 'ArrowRight') onNav((index + 1) % count)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, index, count, onNav])

  // `noUncheckedIndexedAccess`: `current` bertipe `LightboxItem | undefined`.
  const current = items[index]
  const hasNav = count > 1
  const chromeButton =
    'border-border bg-surface text-ink hover:bg-surface-2 focus-visible:ring-secondary inline-flex h-11 w-11 items-center justify-center rounded-full border shadow outline-none focus-visible:ring-2'

  return (
    <Dialog.Root
      open={open}
      onOpenChange={(o) => {
        if (!o) onClose()
      }}
    >
      <Dialog.Portal>
        {/* Klik overlay = tutup (Radix). Content di-center & dibatasi 90vw/90vh
            supaya area di luar gambar tetap overlay yang bisa diklik. */}
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/80" />
        <Dialog.Content
          aria-describedby={undefined}
          className="fixed top-1/2 left-1/2 z-50 flex max-h-[90vh] max-w-[90vw] -translate-x-1/2 -translate-y-1/2 flex-col items-center gap-3 outline-none"
        >
          {/* Radix WAJIB punya Dialog.Title untuk a11y — disembunyikan visual
              karena caption sudah tampil di bawah gambar. */}
          <VisuallyHidden.Root asChild>
            <Dialog.Title>{current?.caption ?? m.galeri_title()}</Dialog.Title>
          </VisuallyHidden.Root>

          <Dialog.Close
            aria-label={m.lightbox_close()}
            className={`absolute top-2 right-2 z-10 ${chromeButton}`}
          >
            <CloseIcon className="h-5 w-5" />
          </Dialog.Close>

          {current ? (
            <>
              <div className="relative flex min-h-0 items-center justify-center">
                <img
                  src={current.src}
                  alt={current.caption}
                  className="max-h-[78vh] max-w-full rounded object-contain"
                />
                {hasNav ? (
                  <>
                    <button
                      type="button"
                      aria-label={m.lightbox_prev()}
                      onClick={() => onNav((index - 1 + count) % count)}
                      className={`absolute top-1/2 left-2 -translate-y-1/2 ${chromeButton}`}
                    >
                      <ChevronLeftIcon className="h-5 w-5" />
                    </button>
                    <button
                      type="button"
                      aria-label={m.lightbox_next()}
                      onClick={() => onNav((index + 1) % count)}
                      className={`absolute top-1/2 right-2 -translate-y-1/2 ${chromeButton}`}
                    >
                      <ChevronRightIcon className="h-5 w-5" />
                    </button>
                  </>
                ) : null}
              </div>
              <div className="flex flex-col items-center gap-1 text-center">
                <p className="max-w-2xl text-sm text-white">{current.caption}</p>
                {hasNav ? (
                  <p className="text-xs text-white/70 tabular-nums">
                    {index + 1} / {count}
                  </p>
                ) : null}
              </div>
            </>
          ) : null}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}

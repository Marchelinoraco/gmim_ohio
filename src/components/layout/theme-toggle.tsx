import { useEffect, useRef, useState, useSyncExternalStore } from 'react'
import * as m from '@/paraglide/messages'
import {
  THEME_PREFS,
  type ThemePref,
  applyThemePref,
  readThemePref,
  serverThemePref,
  subscribeThemePref,
  writeThemePref,
} from '@/lib/theme'

function ThemeIcon({ pref, className }: { pref: ThemePref; className?: string }) {
  const common = {
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 2,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    'aria-hidden': true,
    className,
  }
  if (pref === 'light') {
    return (
      <svg {...common}>
        <circle cx="12" cy="12" r="4" />
        <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
      </svg>
    )
  }
  if (pref === 'dark') {
    return (
      <svg {...common}>
        <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" />
      </svg>
    )
  }
  return (
    <svg {...common}>
      <rect x="2" y="4" width="20" height="14" rx="2" />
      <path d="M8 22h8M12 18v4" />
    </svg>
  )
}

function CheckIcon({ className }: { className?: string }) {
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
      <path d="M20 6 9 17l-5-5" />
    </svg>
  )
}

/**
 * `placement` menentukan ke arah mana panel pilihan tema memekar. Dua nilai,
 * masing-masing untuk satu tempat pemakaian — bukan opsi bebas:
 *
 * - `bottom-end` (default) — header desktop. Tombolnya duduk di ujung KANAN
 *   header, jadi panel `min-w-44` (176px, tombolnya cuma 44px) harus memekar ke
 *   kiri-bawah agar tetap di dalam layar.
 * - `top-start` — panel menu mobile. Di sana tombolnya di ujung KIRI baris
 *   TERBAWAH panel, jadi arahnya berkebalikan pada kedua sumbu. Ke kanan, karena
 *   `end` melempar panel keluar tepi kiri viewport (terukur -116px). Ke atas,
 *   karena panel nav-nya `overflow-y-auto` — apa pun yang meluber melewati tepi
 *   bawahnya terpotong, bukan sekadar tergulir keluar pandangan.
 */
type ThemeTogglePlacement = 'bottom-end' | 'top-start'

const PLACEMENT_CLASS: Record<ThemeTogglePlacement, string> = {
  'bottom-end': 'top-full right-0 mt-1',
  'top-start': 'bottom-full left-0 mb-1',
}

type ThemeToggleProps = { placement?: ThemeTogglePlacement }

export function ThemeToggle({ placement = 'bottom-end' }: ThemeToggleProps) {
  // SSR-safe: `useSyncExternalStore` memakai `serverThemePref` ('system') saat
  // render server + hydrasi, lalu beralih ke `readThemePref` (localStorage) di
  // klien tanpa mismatch. Tak ada akses window/localStorage saat render server.
  const pref = useSyncExternalStore(subscribeThemePref, readThemePref, serverThemePref)
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const prefHydrated = useRef(false)

  // `storage` event dari tab lain meng-update `pref` (ikon) — terapkan juga ke
  // `<html data-theme>` supaya tema benar-benar ganti lintas-tab, bukan cuma
  // ikonnya. Lewati invokasi pertama: saat mount `data-theme` sudah dipasang
  // skrip anti-flash `<head>`, dan menyentuhnya di sini bisa memicu kedip
  // singkat saat `useSyncExternalStore` mengoreksi snapshot server→klien.
  useEffect(() => {
    if (!prefHydrated.current) {
      prefHydrated.current = true
      return
    }
    applyThemePref(pref)
  }, [pref])

  useEffect(() => {
    if (!open) return
    function onPointerDown(event: MouseEvent) {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false)
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('mousedown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open])

  function choose(next: ThemePref) {
    applyThemePref(next)
    writeThemePref(next) // memancarkan event → useSyncExternalStore re-render
    setOpen(false)
  }

  const labels: Record<ThemePref, string> = {
    system: m.theme_system(),
    light: m.theme_light(),
    dark: m.theme_dark(),
  }

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        className="text-ink hover:bg-surface-2 inline-flex h-11 min-w-11 items-center justify-center rounded-md px-2"
        aria-label={m.theme_toggle_label()}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        <ThemeIcon pref={pref} className="size-5" />
      </button>

      {open && (
        <div
          role="menu"
          aria-label={m.theme_toggle_label()}
          className={[
            'border-border bg-surface absolute z-50 min-w-44 rounded-md border p-1 shadow-lg',
            PLACEMENT_CLASS[placement],
          ].join(' ')}
        >
          {THEME_PREFS.map((opt) => (
            <button
              key={opt}
              type="button"
              role="menuitemradio"
              aria-checked={pref === opt}
              className="text-ink hover:bg-surface-2 flex min-h-11 w-full items-center gap-2.5 rounded px-3 text-sm font-medium"
              onClick={() => choose(opt)}
            >
              <ThemeIcon pref={opt} className="size-4 shrink-0" />
              <span>{labels[opt]}</span>
              {pref === opt && <CheckIcon className="text-primary ml-auto size-4 shrink-0" />}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

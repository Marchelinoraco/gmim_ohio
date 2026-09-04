import type * as React from 'react'

import { cn } from '@/lib/utils'

/**
 * Pembungkus lebar-konten standar untuk seluruh halaman situs publik.
 * Menjaga lebar baca maksimum + padding tepi yang konsisten supaya tiap
 * halaman tidak perlu mengulang kelas `max-w`/`px`. Sisa prop `div`
 * diteruskan apa adanya.
 */
export function Container({ children, className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div className={cn('mx-auto w-full max-w-5xl px-4 sm:px-6', className)} {...props}>
      {children}
    </div>
  )
}

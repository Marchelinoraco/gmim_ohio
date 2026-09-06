import type * as React from 'react'

import { cn } from '@/lib/utils'

/**
 * Blok isi halaman dengan ritme vertikal seragam. `id` diteruskan supaya
 * halaman bisa di-deep-link (mis. `/tentang#sejarah`); `scroll-mt-24` memberi
 * ruang di atas target anchor untuk `SiteHeader` yang kini benar-benar sticky
 * (tingginya ~68px) — tanpa itu, judul section tertutup header saat di-anchor.
 */
export function Section({ children, className, id, ...props }: React.ComponentProps<'section'>) {
  return (
    <section id={id} className={cn('scroll-mt-24 py-10 sm:py-14', className)} {...props}>
      {children}
    </section>
  )
}

/**
 * Judul sebuah `<Section>`. Default `<h2>`; pakai `as="h3"` untuk sub-bagian.
 * Ukuran Fraunces mengikuti tag yang dipilih.
 */
export function SectionTitle({
  children,
  className,
  as = 'h2',
}: {
  children: React.ReactNode
  className?: string
  as?: 'h2' | 'h3'
}) {
  const Tag = as
  return (
    <Tag
      className={cn(
        'text-ink mb-6',
        as === 'h2' ? 'text-2xl sm:text-3xl' : 'text-xl sm:text-2xl',
        className,
      )}
    >
      {children}
    </Tag>
  )
}

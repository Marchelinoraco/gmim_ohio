import type { ReactNode } from 'react'

import { Container } from '@/components/site/container'

/**
 * Band pembuka tiap halaman situs publik: judul besar (Fraunces) + subjudul
 * opsional, di atas latar `bg-surface-2`. `title` selalu jadi `<h1>` — jadi
 * inilah satu-satunya `<h1>` di halaman; komponen halaman tidak menambah
 * `<h1>` lagi. `children` (mis. tombol CTA) tampil di bawah subjudul.
 */
export function PageHero({
  title,
  subtitle,
  children,
}: {
  title: string
  subtitle?: string
  children?: ReactNode
}) {
  return (
    <section className="border-border bg-surface-2 border-b py-10 sm:py-14">
      <Container className="text-center">
        <h1 className="text-ink text-4xl text-balance sm:text-5xl">{title}</h1>
        {subtitle ? (
          <p className="text-muted mx-auto mt-3 max-w-2xl text-lg text-pretty">{subtitle}</p>
        ) : null}
        {children ? (
          <div className="mt-6 flex flex-wrap justify-center gap-3">{children}</div>
        ) : null}
      </Container>
    </section>
  )
}

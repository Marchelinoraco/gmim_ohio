import type { ReactNode } from 'react'

/**
 * Kartu terpusat untuk kondisi "belum ada data" di dalam bagian halaman
 * (daftar warta/renungan/galeri kosong, hasil filter nihil, dsb.). Judul
 * memakai `<p>` — bukan heading — karena komponen ini bersarang di dalam
 * section yang sudah punya `<SectionTitle>`.
 */
export function EmptyState({
  title,
  message,
  icon,
}: {
  title: string
  message: string
  icon?: ReactNode
}) {
  return (
    <div className="border-border bg-surface rounded border p-8 text-center sm:p-12">
      {icon ? (
        <div className="text-muted mx-auto mb-3 flex h-10 w-10 items-center justify-center">
          {icon}
        </div>
      ) : null}
      <p className="text-ink font-medium">{title}</p>
      <p className="text-muted mx-auto mt-2 max-w-md">{message}</p>
    </div>
  )
}

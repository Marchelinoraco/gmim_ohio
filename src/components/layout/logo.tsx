import { cn } from '@/lib/utils'

type LogoProps = {
  /** `full` = seal GMIM lengkap; `mark` = ikon kecil (header mobile, footer). */
  variant?: 'full' | 'mark'
  /** Sisi render dalam px. Dipakai untuk `width`/`height` intrinsik + ukuran
   *  tampilan supaya tak ada CLS. Header 40, hero 64, footer 32. */
  size?: number
  className?: string
}

// TODO(desainer / Rencana 2+): sediakan `public/logo-mark.svg` — mark sederhana
// (siluet Manguni + Mawar Luther) untuk favicon & ikon kecil. Sampai tersedia,
// `variant="mark"` memakai `/logo.png` yang di-scale kecil. Lihat docs spec §6.5.
const MARK_SRC = '/logo.png'
const FULL_SRC = '/logo.png'

export function Logo({ variant = 'full', size = 40, className }: LogoProps) {
  const isMark = variant === 'mark'
  return (
    <img
      src={isMark ? MARK_SRC : FULL_SRC}
      // Selalu berdampingan dengan nama gereja (teks link header, <h1> hero,
      // brand footer) → dekoratif dalam konteks. `alt=""` menghindari
      // double-announce sekaligus string tak-diterjemahkan.
      alt=""
      role="presentation"
      width={size}
      height={size}
      style={{ width: size, height: size }}
      className={cn('shrink-0', className)}
    />
  )
}

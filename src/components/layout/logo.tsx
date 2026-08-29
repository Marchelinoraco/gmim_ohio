import { cn } from '@/lib/utils'

type LogoProps = {
  /** `full` = seal GMIM lengkap; `mark` = ikon kecil (header mobile, footer). */
  variant?: 'full' | 'mark'
  className?: string
}

// TODO(desainer / Rencana 2+): sediakan `public/logo-mark.svg` — mark sederhana
// (siluet Manguni + Mawar Luther) untuk favicon & ikon kecil. Sampai tersedia,
// `variant="mark"` memakai `/logo.png` yang di-scale kecil. Lihat docs spec §6.5.
const MARK_SRC = '/logo.png'
const FULL_SRC = '/logo.png'

export function Logo({ variant = 'full', className }: LogoProps) {
  const isMark = variant === 'mark'
  return (
    <img
      src={isMark ? MARK_SRC : FULL_SRC}
      alt="Lambang GMIM"
      width={isMark ? 32 : 40}
      height={isMark ? 32 : 40}
      className={cn(isMark ? 'h-8 w-8' : 'h-10 w-10', 'shrink-0', className)}
    />
  )
}

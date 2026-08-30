import type { SanitizedHtml } from '@/lib/sanitize'
import { cn } from '@/lib/utils'

/**
 * Merender HTML rich-text (body warta & renungan) yang SUDAH lewat
 * `sanitizeRichText`. Prop `html` bertipe branded `SanitizedHtml`, jadi string
 * mentah tak bisa dioper tanpa lebih dulu disanitasi. Tipografi tema diatur
 * kelas `.prose-gmim` di `src/styles/app.css`.
 */
export function Prose({ html, className }: { html: SanitizedHtml; className?: string }) {
  return (
    <div
      className={cn('prose-gmim max-w-none', className)}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  )
}

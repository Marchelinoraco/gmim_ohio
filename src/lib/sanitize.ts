import sanitizeHtml from 'sanitize-html'

/**
 * HTML yang sudah melewati `sanitizeRichText`. Tipe branded: `<Prose>` hanya
 * menerima nilai bertipe ini, sehingga string mentah dari DB tak bisa
 * dirender tanpa lebih dulu lewat sanitizer di modul ini.
 */
export type SanitizedHtml = string & { readonly __brand: 'SanitizedHtml' }

/**
 * Allowlist ketat untuk body warta & renungan (HTML dari DB).
 * Semua yang tak terdaftar dibuang: script, style, class, id, on*, serta tag
 * tak dikenal seperti <marquee>. Atribut `<a>` dibatasi ke `href` dengan skema
 * http/https/mailto saja; `transformTags` memaksa rel + target aman.
 */
const OPTIONS: sanitizeHtml.IOptions = {
  allowedTags: ['h2', 'h3', 'h4', 'p', 'ul', 'ol', 'li', 'strong', 'em', 'a', 'br', 'blockquote'],
  allowedAttributes: { a: ['href', 'rel', 'target'] },
  allowedSchemes: ['http', 'https', 'mailto'],
  transformTags: {
    a: (tagName, attribs) => ({
      tagName,
      attribs: { ...attribs, rel: 'noopener noreferrer', target: '_blank' },
    }),
  },
}

export function sanitizeRichText(dirty: string): SanitizedHtml {
  return sanitizeHtml(dirty ?? '', OPTIONS) as SanitizedHtml
}

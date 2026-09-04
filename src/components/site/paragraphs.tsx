/**
 * Memecah string pesan teks-polos (paragraf dipisah `\n\n`) menjadi beberapa
 * `<p>`. Dipakai bersama oleh route konten statis (`/tentang`, `/kunjungi`, dst.)
 * yang teksnya datang dari katalog pesan Paraglide.
 *
 * BUKAN `<Prose>`: `<Prose>` khusus HTML DB tersanitasi (tipe branded
 * `SanitizedHtml`, dirender via dangerouslySetInnerHTML). Konten di sini murni
 * string pesan tanpa HTML, jadi `<p>` polos yang benar.
 */
export function Paragraphs({ text }: { text: string }) {
  return (
    <>
      {text.split('\n\n').map((p, i) => (
        <p key={i} className="text-ink mb-4 leading-relaxed last:mb-0">
          {p}
        </p>
      ))}
    </>
  )
}

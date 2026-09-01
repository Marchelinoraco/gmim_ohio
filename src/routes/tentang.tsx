import { createFileRoute } from '@tanstack/react-router'
import * as m from '@/paraglide/messages'
import { getLocale } from '@/paraglide/runtime'
import { pageMeta } from '@/lib/seo'
import { Container } from '@/components/site/container'
import { PageHero } from '@/components/site/page-hero'
import { Section, SectionTitle } from '@/components/site/section'

export const Route = createFileRoute('/tentang')({
  head: () =>
    pageMeta({
      path: '/tentang',
      titleId: 'Tentang Kami',
      titleEn: 'About Us',
      descId:
        'Mengenal GMIM Musafir Columbus Ohio — jemaat perantauan GMIM: sejarah singkat, visi dan misi, peran Majelis Jemaat, dan pendeta.',
      descEn:
        'Get to know GMIM Musafir Columbus Ohio — a GMIM diaspora congregation: a brief history, our vision and mission, the role of the council, and our pastor.',
      // `getLocale()` di sini resolve ke locale request (Paraglide
      // AsyncLocalStorage) — pola sama dengan src/routes/index.tsx.
      locale: getLocale(),
    }),
  component: About,
})

/**
 * Memecah string pesan teks-polos (paragraf dipisah `\n\n`) menjadi beberapa
 * `<p>`. BUKAN `<Prose>`: `<Prose>` khusus HTML DB tersanitasi (tipe branded
 * `SanitizedHtml`, dirender via dangerouslySetInnerHTML). Konten halaman ini
 * murni string pesan tanpa HTML, jadi `<p>` polos yang benar.
 */
function Paragraphs({ text }: { text: string }) {
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

function About() {
  return (
    <main>
      <PageHero title={m.about_title()} subtitle={m.about_subtitle()} />
      {/* TODO: konten placeholder — ganti dengan sejarah/visi/misi/data majelis resmi dari BPMJ */}
      <Container>
        <Section id="sejarah">
          <SectionTitle>{m.about_history_title()}</SectionTitle>
          <Paragraphs text={m.about_history_body()} />
        </Section>

        <Section id="visi">
          <SectionTitle>{m.about_vision_title()}</SectionTitle>
          <Paragraphs text={m.about_vision_body()} />
        </Section>

        <Section id="misi">
          <SectionTitle>{m.about_mission_title()}</SectionTitle>
          <Paragraphs text={m.about_mission_body()} />
        </Section>

        <Section id="majelis">
          <SectionTitle>{m.about_council_title()}</SectionTitle>
          <Paragraphs text={m.about_council_body()} />
        </Section>

        <Section id="pendeta">
          <SectionTitle>{m.about_pastor_title()}</SectionTitle>
          <p className="text-ink mb-2 font-medium">{m.about_pastor_name()}</p>
          <Paragraphs text={m.about_pastor_body()} />
        </Section>
      </Container>
    </main>
  )
}

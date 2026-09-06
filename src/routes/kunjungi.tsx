import { createFileRoute } from '@tanstack/react-router'
import * as m from '@/paraglide/messages'
import { getLocale } from '@/paraglide/runtime'
import { getSiteSettings } from '@/features/content/site-settings'
import { pageMeta } from '@/lib/seo'
import { SITE } from '@/config/site'
import { Button } from '@/components/ui/button'
import { ContactForm } from '@/components/forms/contact-form'
import { Container } from '@/components/site/container'
import { PageHero } from '@/components/site/page-hero'
import { Paragraphs } from '@/components/site/paragraphs'
import { Section, SectionTitle } from '@/components/site/section'

/**
 * Halaman `/kunjungi` — alamat + peta, jam ibadah & kantor, apa yang perlu
 * diketahui saat pertama datang, dan form kontak. Data non-teks (jam, kontak
 * kantor) datang dari `site_settings` lewat loader `getSiteSettings`; nilai yang
 * masih kosong di seed (telepon, email, jam kantor) TIDAK dirender sama sekali —
 * tanpa link `tel:`/`mailto:` kosong, tanpa label yatim.
 *
 * `<PageHero>` menyuplai satu-satunya `<h1>`. Section kontak sengaja tanpa
 * `<SectionTitle>`: `<ContactForm>` sudah merender `<h2>`-nya sendiri.
 */

export const Route = createFileRoute('/kunjungi')({
  loader: () => getSiteSettings(),
  head: () =>
    pageMeta({
      path: '/kunjungi',
      titleId: 'Kunjungi Kami',
      titleEn: 'Visit Us',
      descId:
        'Alamat, peta, jam ibadah, dan hal yang perlu diketahui sebelum berkunjung ke GMIM Musafir Columbus Ohio — beserta formulir kontak.',
      descEn:
        'The address, map, service times, and what to know before visiting GMIM Musafir Columbus Ohio — plus a contact form.',
      // `getLocale()` resolve ke locale request (Paraglide AsyncLocalStorage) —
      // pola sama dengan src/routes/tentang.tsx.
      locale: getLocale(),
    }),
  component: Kunjungi,
})

/**
 * Peta di-embed dari `SITE.address`, BUKAN `contactInfo.mapsUrl`. `mapsUrl` adalah
 * URL bebas yang diedit pengurus lewat dashboard (Rencana 3); mengubah URL bebas
 * apa pun menjadi bentuk `/maps/embed` yang valid itu rapuh. `SITE.address` stabil
 * dan sudah cukup sebagai query `q=`. Tombol "Buka di Google Maps" tetap memakai
 * `SITE.mapsUrl` supaya membuka lokasi yang sama di aplikasi Maps.
 */
const MAPS_EMBED_SRC = `https://www.google.com/maps?q=${encodeURIComponent(SITE.address)}&output=embed`

function Kunjungi() {
  const { contactInfo, serviceTimes } = Route.useLoaderData()
  const locale = getLocale()

  const serviceTime = locale === 'id' ? serviceTimes.id : serviceTimes.en
  const officeHours = (
    locale === 'id' ? contactInfo.officeHoursId : contactInfo.officeHoursEn
  ).trim()
  const phone = contactInfo.phone.trim()
  const email = contactInfo.email.trim()

  return (
    <main>
      <PageHero title={m.visit_title()} subtitle={m.visit_subtitle()} />
      <Container>
        <Section id="alamat">
          <SectionTitle>{m.visit_address_title()}</SectionTitle>
          <address className="text-ink mb-4 not-italic">{SITE.address}</address>
          <iframe
            src={MAPS_EMBED_SRC}
            title={m.visit_map_label()}
            loading="lazy"
            allowFullScreen
            className="border-border aspect-video w-full rounded border"
          />
          <div className="mt-4">
            <Button asChild variant="primary">
              <a href={SITE.mapsUrl} target="_blank" rel="noopener noreferrer">
                {m.visit_open_maps()}
              </a>
            </Button>
          </div>
        </Section>

        <Section id="jam">
          <SectionTitle>{m.visit_hours_title()}</SectionTitle>
          <dl className="space-y-4">
            <div>
              <dt className="text-ink font-medium">{m.visit_service_times_label()}</dt>
              <dd className="text-ink">{serviceTime}</dd>
            </div>
            {officeHours ? (
              <div>
                <dt className="text-ink font-medium">{m.visit_office_hours_label()}</dt>
                <dd className="text-ink">{officeHours}</dd>
              </div>
            ) : null}
          </dl>

          {phone || email ? (
            <>
              <SectionTitle as="h3" className="mt-8">
                {m.visit_contact_title()}
              </SectionTitle>
              <ul className="text-ink space-y-1">
                {phone ? (
                  <li>
                    {/* href hanya digit & `+`; teks tetap string rapi dari settings. */}
                    <a
                      href={`tel:${phone.replace(/[^\d+]/g, '')}`}
                      className="text-primary underline underline-offset-2"
                    >
                      {phone}
                    </a>
                  </li>
                ) : null}
                {email ? (
                  <li>
                    <a
                      href={`mailto:${email}`}
                      className="text-primary underline underline-offset-2"
                    >
                      {email}
                    </a>
                  </li>
                ) : null}
              </ul>
            </>
          ) : null}
        </Section>

        <Section id="persiapan">
          <SectionTitle>{m.visit_expect_title()}</SectionTitle>
          <Paragraphs text={m.visit_expect_body()} />
        </Section>

        <Section id="kontak">
          <ContactForm />
        </Section>
      </Container>
    </main>
  )
}

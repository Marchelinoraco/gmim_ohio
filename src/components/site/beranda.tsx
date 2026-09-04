import { useEffect, useRef } from 'react'
import { Link } from '@tanstack/react-router'
import * as m from '@/paraglide/messages'
import { getLocale, localizeHref } from '@/paraglide/runtime'
import type { BulletinSummary } from '@/features/content/bulletins'
import type { SiteSettings } from '@/features/content/site-settings'
import type { UpcomingService } from '@/features/schedule/services'
import { formatServiceDateTime } from '@/lib/datetime'
import { SITE } from '@/config/site'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { BulletinCard } from '@/components/site/bulletin-card'
import { Container } from '@/components/site/container'
import { Paragraphs } from '@/components/site/paragraphs'
import { Section, SectionTitle } from '@/components/site/section'

/**
 * `<Beranda>` — komponen halaman depan penuh. Props-driven: `src/routes/index.tsx`
 * (saat `!SITE.comingSoon`) DAN `src/routes/_dev.beranda.tsx` sama-sama memberinya
 * data dari `getSiteSettings()` + `listBulletins()` + `listUpcomingServices()`.
 *
 * Section: Hero (video/scrim, teks dari `hero.*` settings) → strip jam ibadah →
 * "Ibadah Minggu Ini" (disembunyikan bila `services` kosong — TANPA <EmptyState>,
 * dan memang kosong di Rencana 2a) → "Tentang ringkas" → "Warta Terbaru" (3
 * terbaru; disembunyikan bila kosong).
 *
 * Teks & tombol hero berada di atas scrim gelap paksa — pengecualian warna yang
 * sama & terdokumentasi seperti halaman coming-soon.
 */

type BerandaProps = {
  settings: SiteSettings
  bulletins: BulletinSummary[]
  services: UpcomingService[]
}

export function Beranda({ settings, bulletins, services }: BerandaProps) {
  const locale = getLocale()
  const { hero, serviceTimes } = settings

  const heroTitle = locale === 'id' ? hero.titleId : hero.titleEn
  const heroTagline = locale === 'id' ? hero.taglineId : hero.taglineEn
  const serviceTimesText = locale === 'id' ? serviceTimes.id : serviceTimes.en
  const latestBulletins = bulletins.slice(0, 3)

  return (
    <main>
      <BerandaHero title={heroTitle} tagline={heroTagline} image={hero.image} locale={locale} />

      {/* Strip jam ibadah — pita ringkas tepat di bawah hero. */}
      <div className="bg-primary text-surface">
        <Container className="py-4 text-center text-sm sm:text-base">{serviceTimesText}</Container>
      </div>

      <Container>
        {services.length > 0 && (
          <Section id="ibadah-minggu-ini">
            <SectionTitle>{m.home_services_this_week()}</SectionTitle>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {services.map((s) => {
                // Beranda sengaja hanya pakai nama kategori; `category.color`/`key`
                // dan `kolom` ikut di-fetch untuk halaman `/jadwal` (Rencana 2b).
                const categoryName = locale === 'id' ? s.category.nameId : s.category.nameEn
                // Ibadah rumah: "Di rumah <keluarga>", atau "Lokasi menyusul" bila
                // nama tuan rumah belum diisi (JANGAN jatuh ke alamat gereja — itu
                // menyesatkan). Ibadah gedung: nama gereja, supaya kedua kasus jelas
                // beda bagi pembaca.
                const where =
                  s.locationType === 'rumah'
                    ? s.hostFamilyName
                      ? m.home_location_home({ host: s.hostFamilyName })
                      : m.home_location_tba()
                    : SITE.name
                return (
                  <Card key={s.id} className="h-full">
                    <CardHeader>
                      <CardDescription>
                        {formatServiceDateTime(s.serviceDate, s.startTime, locale)}
                      </CardDescription>
                      <CardTitle className="font-serif text-xl">{categoryName}</CardTitle>
                    </CardHeader>
                    <CardContent className="text-muted text-sm">{where}</CardContent>
                  </Card>
                )
              })}
            </div>
          </Section>
        )}

        <Section id="tentang-ringkas">
          <SectionTitle>{m.about_title()}</SectionTitle>
          <div className="max-w-2xl">
            <Paragraphs text={m.home_about_blurb()} />
            <div className="mt-6">
              <Button asChild variant="outline" className="h-11">
                <Link to="/tentang">{m.home_about_cta()}</Link>
              </Button>
            </div>
          </div>
        </Section>

        {latestBulletins.length > 0 && (
          <Section id="warta-terbaru">
            <SectionTitle>{m.home_latest_bulletins()}</SectionTitle>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {latestBulletins.map((b) => (
                <BulletinCard key={b.id} bulletin={b} locale={locale} />
              ))}
            </div>
            <div className="mt-8">
              <Button asChild variant="outline" className="h-11">
                <Link to="/warta">{m.home_view_all()}</Link>
              </Button>
            </div>
          </Section>
        )}
      </Container>
    </main>
  )
}

/**
 * Hero Beranda — perlakuan yang sama dengan coming-soon (poster, scrim,
 * `object-cover`). Video latar diputar dari effect (klien saja → SSR aman, tanpa
 * atribut `autoplay` di markup) dan menghormati `prefers-reduced-motion`. Bila
 * `hero.image` diisi (seed = `''`), gambar itu dipakai menggantikan video.
 */
function BerandaHero({
  title,
  tagline,
  image,
  locale,
}: {
  title: string
  tagline: string
  image: string
  locale: 'id' | 'en'
}) {
  const videoRef = useRef<HTMLVideoElement>(null)
  // `hero.image` kosong (seed) → video; diisi → gambar. `SITE.hero.sources` selalu
  // ≥ 1 (`as const`), jadi tak ada cabang fallback ketiga.
  const hasVideo = image.length === 0

  useEffect(() => {
    const v = videoRef.current
    if (!v) return
    // Reduced-motion: tahan di poster. Selain itu: putar setelah hidrasi.
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    v.play().catch(() => {})
  }, [])

  return (
    <section className="bg-primary relative flex min-h-[70svh] flex-col overflow-hidden">
      {/* TODO(2b): ekstrak <HeroMedia> bersama (poster + sources + scrim) —
          src/components/site/coming-soon.tsx menduplikasi blok ini. 2b menghapus
          coming-soon.tsx, jadi itu momen alaminya. */}
      {hasVideo ? (
        <video
          ref={videoRef}
          className="absolute inset-0 h-full w-full object-cover"
          loop
          muted
          playsInline
          preload="metadata"
          poster={SITE.hero.poster}
          aria-hidden="true"
        >
          {SITE.hero.sources.map((s) => (
            <source key={s.src} src={s.src} type={s.type} />
          ))}
        </video>
      ) : (
        <img
          src={image}
          alt=""
          className="absolute inset-0 h-full w-full object-cover"
          aria-hidden="true"
        />
      )}

      {/* Scrim — sama dengan coming-soon: teks putih ≥ 4.5:1 di atas frame video
          paling terang, di light MAUPUN dark. */}
      <div
        className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/70 via-black/65 to-black/85"
        aria-hidden="true"
      />

      <div className="relative z-10 mx-auto flex w-full max-w-3xl flex-1 flex-col items-center justify-center gap-6 px-4 py-24 text-center text-white [text-shadow:0_2px_12px_rgb(0_0_0_/_0.55)]">
        <h1 className="font-serif text-4xl font-semibold text-balance sm:text-5xl">{title}</h1>
        <p className="max-w-xl text-lg font-medium text-white sm:text-xl">{tagline}</p>
        <div className="mt-2 flex flex-wrap items-center justify-center gap-3">
          {/* Dua fill solid (primary/secondary) supaya terbaca di atas scrim di
              kedua tema — tak bergantung pada warna permukaan. */}
          <Button asChild variant="primary" size="lg" className="h-11">
            {/* TODO(2b): ganti jadi <Link to="/jadwal"> setelah route-nya ada */}
            <a href={localizeHref('/jadwal', { locale })}>{m.nav_schedule()}</a>
          </Button>
          <Button asChild variant="secondary" size="lg" className="h-11">
            <Link to="/kunjungi">{m.home_visit_cta()}</Link>
          </Button>
        </div>
      </div>
    </section>
  )
}

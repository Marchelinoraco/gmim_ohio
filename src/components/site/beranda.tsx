import { Link } from '@tanstack/react-router'
import * as m from '@/paraglide/messages'
import { getLocale } from '@/paraglide/runtime'
import type { BulletinSummary } from '@/features/content/bulletins'
import type { SiteSettings } from '@/features/content/site-settings'
import type { UpcomingService } from '@/features/schedule/services'
import { Button } from '@/components/ui/button'
import { BulletinCard } from '@/components/site/bulletin-card'
import { BerandaHero } from '@/components/site/hero'
import { Container } from '@/components/site/container'
import { Paragraphs } from '@/components/site/paragraphs'
import { Reveal } from '@/components/site/reveal'
import { Section, SectionTitle } from '@/components/site/section'
import { ServiceCard } from '@/components/schedule/service-card'

/**
 * `<Beranda>` — komponen halaman depan penuh. Props-driven: `src/routes/index.tsx`
 * memberinya data dari `getSiteSettings()` + `listBulletins()` +
 * `listServices({ from: hari ini, to: +6 hari })`.
 *
 * `services` = JENDELA 7 HARI Eastern, bukan "N ibadah berikutnya": dengan limit
 * buta, empat ibadah Kolom pada satu tanggal bisa mendorong Ibadah Jemaat hari
 * Minggu keluar dari daftar (alasan lengkap di docblock `src/routes/index.tsx`).
 * Jumlah kartu karena itu BERVARIASI menurut hari — dari Senin bisa 9, dari Sabtu
 * bisa 3 — dan section ini merender semuanya apa adanya tanpa memotong.
 *
 * Section: Hero (video/scrim, teks dari `hero.*` settings) → strip jam ibadah →
 * "Ibadah Minggu Ini" (kartu `<ServiceCard>` bersama, data nyata sejak Rencana 2b;
 * disembunyikan bila `services` kosong — TANPA <EmptyState>) → "Tentang ringkas" →
 * "Warta Terbaru" (3 terbaru; disembunyikan bila kosong).
 *
 * Teks & tombol hero berada di atas scrim gelap paksa — pengecualian warna yang
 * disengaja untuk keterbacaan di atas video/gambar hero.
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
      <BerandaHero title={heroTitle} tagline={heroTagline} image={hero.image} />

      {/* Strip jam ibadah — pita ringkas tepat di bawah hero. */}
      <div className="bg-primary text-surface">
        <Container className="py-4 text-center text-sm sm:text-base">{serviceTimesText}</Container>
      </div>

      <Container>
        {services.length > 0 && (
          <Reveal>
            <Section id="ibadah-minggu-ini">
              <SectionTitle>{m.home_services_this_week()}</SectionTitle>
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {services.map((s) => (
                  <ServiceCard key={s.id} service={s} locale={locale} linkToDetail />
                ))}
              </div>
            </Section>
          </Reveal>
        )}

        <Reveal>
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
        </Reveal>

        {latestBulletins.length > 0 && (
          <Reveal>
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
          </Reveal>
        )}
      </Container>
    </main>
  )
}

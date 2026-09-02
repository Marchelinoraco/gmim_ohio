import { useEffect, useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import * as m from '@/paraglide/messages'
import { getLocale } from '@/paraglide/runtime'
import { getSiteSettings } from '@/features/content/site-settings'
import type { SiteSettings } from '@/features/content/site-settings'
import { pageMeta } from '@/lib/seo'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Container } from '@/components/site/container'
import { EmptyState } from '@/components/site/empty-state'
import { PageHero } from '@/components/site/page-hero'
import { Paragraphs } from '@/components/site/paragraphs'
import { Section } from '@/components/site/section'

type GivingAccount = SiteSettings['givingInfo']['accounts'][number]

/**
 * Halaman `/persembahan` — daftar rekening persembahan sebagai kartu (bank /
 * nomor rekening / atas nama + tombol salin) plus catatan pengurus (locale).
 * Data dari `site_settings` lewat loader `getSiteSettings`. `accounts` kosong →
 * `<EmptyState>`; catatan kosong (setelah `.trim()`) tidak dirender sama sekali
 * — disiplin yang sama dengan `kunjungi.tsx`.
 *
 * Nomor rekening di seed sengaja placeholder (`XXXX-XXXX-XXXX`) — lihat komentar
 * di `src/db/seed/settings.ts`. `<PageHero>` menyuplai satu-satunya `<h1>`.
 */

export const Route = createFileRoute('/persembahan')({
  loader: () => getSiteSettings(),
  head: () =>
    pageMeta({
      path: '/persembahan',
      titleId: 'Persembahan',
      titleEn: 'Give',
      descId:
        'Informasi rekening persembahan Jemaat GMIM Musafir Columbus Ohio — dukungan Anda menopang ibadah dan pelayanan jemaat perantauan.',
      descEn:
        'Giving information for GMIM Musafir Columbus Ohio — your support sustains the worship and ministry of our diaspora congregation.',
      // `getLocale()` resolve ke locale request (Paraglide AsyncLocalStorage) —
      // pola sama dengan src/routes/kunjungi.tsx.
      locale: getLocale(),
    }),
  component: Persembahan,
})

/**
 * Satu kartu rekening. Komponen lokal karena butuh state "tersalin" PER-kartu:
 * `copied` di-set di handler klik, direset ~2 dtk kemudian lewat `setTimeout`
 * yang di-`clearTimeout` di cleanup `useEffect` (cegah set-state setelah unmount
 * / klik beruntun). `navigator.clipboard.writeText` HANYA dipanggil di dalam
 * handler dan dibungkus try/catch — clipboard bisa ditolak (konteks non-secure,
 * izin) dan tak boleh melempar ke render tree; gagal salin = tombol tak berubah.
 */
function AccountCard({ account }: { account: GivingAccount }) {
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (!copied) return
    const timer = setTimeout(() => setCopied(false), 2000)
    return () => clearTimeout(timer)
  }, [copied])

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(account.number)
      setCopied(true)
    } catch {
      // Clipboard tak tersedia (konteks non-secure, izin ditolak, dll.) — diam.
    }
  }

  return (
    <Card>
      <CardContent>
        <dl className="space-y-3">
          <div>
            <dt className="text-muted text-sm">{m.giving_bank()}</dt>
            <dd className="text-ink">{account.bank}</dd>
          </div>
          <div>
            <dt className="text-muted text-sm">{m.giving_account_no()}</dt>
            <dd className="text-ink font-mono tracking-wide">{account.number}</dd>
          </div>
          <div>
            <dt className="text-muted text-sm">{m.giving_holder()}</dt>
            <dd className="text-ink">{account.holder}</dd>
          </div>
        </dl>
        <div className="mt-5">
          <Button type="button" variant="outline" size="sm" onClick={handleCopy} aria-live="polite">
            {copied ? m.giving_copied() : m.giving_copy()}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

function Persembahan() {
  const { givingInfo } = Route.useLoaderData()
  const locale = getLocale()

  const note = (locale === 'id' ? givingInfo.noteId : givingInfo.noteEn).trim()

  return (
    <main>
      <PageHero title={m.giving_title()} subtitle={m.giving_subtitle()} />
      <Container>
        <Section>
          {givingInfo.accounts.length === 0 ? (
            <EmptyState title={m.giving_empty()} />
          ) : (
            <div className="grid gap-6 sm:grid-cols-2">
              {givingInfo.accounts.map((account, i) => (
                <AccountCard key={`${account.bank}-${account.number}-${i}`} account={account} />
              ))}
            </div>
          )}

          {note ? (
            <div className="mt-10 max-w-2xl">
              <Paragraphs text={note} />
            </div>
          ) : null}
        </Section>
      </Container>
    </main>
  )
}

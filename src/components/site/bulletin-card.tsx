import { Link } from '@tanstack/react-router'
import type { BulletinSummary } from '@/features/content/bulletins'
import { formatDateLong } from '@/lib/datetime'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

/**
 * Kartu satu warta di daftar — `<Link to="/warta/$id">` membungkus `<Card>`
 * (tanggal, judul, ringkasan). Dipakai bersama oleh `/warta` (`src/routes/warta.tsx`)
 * dan blok "Warta Terbaru" di `<Beranda>` — sebelumnya blok byte-identik yang
 * disalin di kedua tempat.
 *
 * `key` tetap di titik panggil (`<BulletinCard key={b.id} …>`), bukan di sini.
 */
export function BulletinCard({
  bulletin,
  locale,
}: {
  bulletin: BulletinSummary
  locale: 'id' | 'en'
}) {
  return (
    <Link
      to="/warta/$id"
      params={{ id: bulletin.id }}
      className="focus-visible:ring-secondary/60 focus-visible:ring-offset-surface rounded outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
    >
      <Card className="h-full transition-shadow hover:shadow-md">
        <CardHeader>
          <CardDescription>{formatDateLong(bulletin.weekDate, locale)}</CardDescription>
          <CardTitle className="font-serif text-xl">
            {locale === 'id' ? bulletin.titleId : bulletin.titleEn}
          </CardTitle>
        </CardHeader>
        <CardContent className="text-muted">
          {locale === 'id' ? bulletin.summaryId : bulletin.summaryEn}
        </CardContent>
      </Card>
    </Link>
  )
}

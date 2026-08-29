import { createFileRoute } from '@tanstack/react-router'
import { Button } from '@/components/ui/button'
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card'

export const Route = createFileRoute('/_dev/tokens')({ component: Tokens })

// Halaman dev throwaway (dihapus di Rencana 4). Tombol di bawah menyetel
// data-theme di <html> supaya reviewer bisa melihat palet light & dark tanpa
// mengubah setting OS. Handler hanya jalan di klik → aman untuk SSR.
function setTheme(next: 'light' | 'dark' | 'system') {
  const root = document.documentElement
  if (next === 'system') root.removeAttribute('data-theme')
  else root.setAttribute('data-theme', next)
}

function Tokens() {
  const swatches = ['primary', 'secondary', 'accent', 'surface-2', 'border', 'ink', 'muted']
  const categories = ['jemaat', 'bapa', 'ibu', 'pemuda', 'sekolah-minggu', 'kolom']
  return (
    <main className="bg-surface text-ink space-y-4 p-8">
      <h1 className="text-3xl">Token Desain</h1>
      <p className="font-sans">Body — Inter</p>
      <h2 className="text-2xl">Heading — Fraunces</h2>

      <div className="border-border flex flex-wrap items-center gap-2 rounded border p-3">
        <span className="text-muted text-sm">Pratinjau tema:</span>
        <Button size="sm" variant="outline" onClick={() => setTheme('light')}>
          Terang
        </Button>
        <Button size="sm" variant="outline" onClick={() => setTheme('dark')}>
          Gelap
        </Button>
        <Button size="sm" variant="ghost" onClick={() => setTheme('system')}>
          Ikuti sistem
        </Button>
      </div>

      <div className="flex flex-wrap gap-3">
        {swatches.map((s) => (
          <div key={s} className="w-32">
            <div
              className="border-border h-16 rounded border"
              style={{ background: `var(--color-${s})` }}
            />
            <code className="text-xs">{s}</code>
          </div>
        ))}
      </div>

      <h2 className="text-2xl">Badge kategori ibadah</h2>
      <div className="flex flex-wrap gap-3">
        {categories.map((c) => (
          <div key={c} className="w-32">
            <div
              className="flex h-16 items-center justify-center rounded text-sm font-semibold text-white"
              style={{ background: `var(--color-cat-${c})` }}
            >
              {c}
            </div>
            <code className="text-xs">cat-{c}</code>
          </div>
        ))}
      </div>

      <div className="bg-primary text-surface rounded p-8">
        Utility berbasis token: <code>bg-primary</code> + <code>text-surface</code>
      </div>

      <div className="bg-surface-2 text-ink rounded p-8">
        <p>
          <code>bg-surface-2</code> + <code>text-ink</code>
        </p>
        <p className="text-muted">
          <code>text-muted</code> di atas <code>surface-2</code>
        </p>
      </div>

      <h2 className="text-2xl">Button</h2>
      <div className="flex flex-wrap items-center gap-3">
        <Button variant="primary">Primary</Button>
        <Button variant="secondary">Secondary</Button>
        <Button variant="outline">Outline</Button>
        <Button variant="ghost">Ghost</Button>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <Button size="sm">Small</Button>
        <Button size="md">Medium</Button>
        <Button size="lg">Large</Button>
      </div>

      <h2 className="text-2xl">Card</h2>
      <Card className="max-w-sm">
        <CardHeader>
          <CardTitle>Contoh Kartu</CardTitle>
        </CardHeader>
        <CardContent>Isi kartu memakai token permukaan &amp; border.</CardContent>
        <CardFooter>
          <Button size="sm">Aksi</Button>
        </CardFooter>
      </Card>
    </main>
  )
}

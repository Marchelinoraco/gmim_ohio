import { createFileRoute } from '@tanstack/react-router'
import { Button } from '@/components/ui/button'
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card'

export const Route = createFileRoute('/_dev/tokens')({ component: Tokens })

function Tokens() {
  const swatches = ['primary', 'secondary', 'accent', 'surface-2', 'border', 'ink', 'muted']
  const categories = ['jemaat', 'bapa', 'ibu', 'pemuda', 'sekolah-minggu', 'kolom']
  return (
    <main className="space-y-4 p-8">
      <h1 className="text-3xl">Token Desain</h1>
      <p className="font-sans">Body — Inter</p>
      <h2 className="text-2xl">Heading — Fraunces</h2>

      <div className="flex flex-wrap gap-3">
        {swatches.map((s) => (
          <div key={s} className="w-32">
            <div className="h-16 rounded" style={{ background: `var(--color-${s})` }} />
            <code className="text-xs">{s}</code>
          </div>
        ))}
      </div>

      <h2 className="text-2xl">Badge kategori ibadah</h2>
      <div className="flex flex-wrap gap-3">
        {categories.map((c) => (
          <div key={c} className="w-32">
            <div className="h-16 rounded" style={{ background: `var(--color-cat-${c})` }} />
            <code className="text-xs">cat-{c}</code>
          </div>
        ))}
      </div>

      <div className="bg-primary text-surface rounded p-8">
        Utility berbasis token: <code>bg-primary</code> + <code>text-surface</code>
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

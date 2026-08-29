import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/_dev/tokens')({ component: Tokens })

function Tokens() {
  const swatches = ['primary', 'secondary', 'accent', 'surface-2', 'border', 'ink', 'muted']
  const categories = ['jemaat', 'bapa', 'ibu', 'pemuda', 'sekolah-minggu', 'kolom']
  return (
    <main className="p-8 space-y-4">
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

      <div className="rounded bg-primary p-8 text-surface">
        Utility berbasis token: <code>bg-primary</code> + <code>text-surface</code>
      </div>
    </main>
  )
}

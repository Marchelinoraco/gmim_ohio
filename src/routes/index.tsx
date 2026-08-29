import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/')({
  component: Home,
})

function Home() {
  return (
    <main>
      <h1>GMIM Musafir Columbus Ohio</h1>
      <p>Situs dalam pembangunan.</p>
    </main>
  )
}

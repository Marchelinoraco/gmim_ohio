import { createFileRoute } from '@tanstack/react-router'
import * as m from '@/paraglide/messages'

export const Route = createFileRoute('/')({
  component: Home,
})

function Home() {
  return (
    <main>
      <h1>{m.site_name()}</h1>
      <p>{m.home_building()}</p>
    </main>
  )
}

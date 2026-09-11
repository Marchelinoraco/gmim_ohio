import { createFileRoute, useRouter } from '@tanstack/react-router'
import * as m from '@/paraglide/messages'
import { createDevotional } from '@/features/content/devotional-mutations'
import { DevotionalForm } from '@/components/admin/devotional-form'

export const Route = createFileRoute('/admin/_app/renungan/baru')({
  component: RenunganBaru,
})

function RenunganBaru() {
  const router = useRouter()
  return (
    <div className="flex flex-col gap-6">
      <h1 className="font-serif text-2xl font-semibold">{m.admin_devotional_new_title()}</h1>
      <DevotionalForm
        onSubmit={async (data) => {
          await createDevotional({ data })
          await router.navigate({ to: '/admin/renungan' })
        }}
        onCancel={() => router.navigate({ to: '/admin/renungan' })}
      />
    </div>
  )
}

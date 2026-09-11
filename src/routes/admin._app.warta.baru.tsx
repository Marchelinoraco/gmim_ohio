import { createFileRoute, useRouter } from '@tanstack/react-router'
import * as m from '@/paraglide/messages'
import { createBulletin } from '@/features/content/bulletin-mutations'
import { BulletinForm } from '@/components/admin/bulletin-form'

export const Route = createFileRoute('/admin/_app/warta/baru')({
  component: WartaBaru,
})

function WartaBaru() {
  const router = useRouter()
  return (
    <div className="flex flex-col gap-6">
      <h1 className="font-serif text-2xl font-semibold">{m.admin_bulletin_new_title()}</h1>
      <BulletinForm
        onSubmit={async (data) => {
          await createBulletin({ data })
          await router.navigate({ to: '/admin/warta' })
        }}
        onCancel={() => router.navigate({ to: '/admin/warta' })}
      />
    </div>
  )
}

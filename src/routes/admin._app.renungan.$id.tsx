import { createFileRoute, notFound, useRouter } from '@tanstack/react-router'
import * as m from '@/paraglide/messages'
import { getDevotionalForAdmin } from '@/features/content/admin-queries'
import { updateDevotional } from '@/features/content/devotional-mutations'
import { DevotionalForm } from '@/components/admin/devotional-form'

export const Route = createFileRoute('/admin/_app/renungan/$id')({
  loader: async ({ params }) => {
    const awal = await getDevotionalForAdmin({ data: params.id })
    // 404 jujur, bukan form kosong yang diam-diam membuat baris baru saat disimpan.
    if (!awal) throw notFound()
    return awal
  },
  component: RenunganUbah,
})

function RenunganUbah() {
  const awal = Route.useLoaderData()
  const router = useRouter()
  return (
    <div className="flex flex-col gap-6">
      <h1 className="font-serif text-2xl font-semibold">{m.admin_devotional_edit_title()}</h1>
      <DevotionalForm
        awal={awal}
        onSubmit={async (data) => {
          await updateDevotional({ data: { id: awal.id, ...data } })
          await router.navigate({ to: '/admin/renungan' })
        }}
        onCancel={() => router.navigate({ to: '/admin/renungan' })}
      />
    </div>
  )
}

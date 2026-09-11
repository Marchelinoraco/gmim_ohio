import { createFileRoute, notFound, useRouter } from '@tanstack/react-router'
import * as m from '@/paraglide/messages'
import { getBulletinForAdmin } from '@/features/content/admin-queries'
import { updateBulletin } from '@/features/content/bulletin-mutations'
import { BulletinForm } from '@/components/admin/bulletin-form'

export const Route = createFileRoute('/admin/_app/warta/$id')({
  loader: async ({ params }) => {
    const awal = await getBulletinForAdmin({ data: params.id })
    // 404 jujur, bukan form kosong yang diam-diam membuat baris baru saat disimpan.
    if (!awal) throw notFound()
    return awal
  },
  component: WartaUbah,
})

function WartaUbah() {
  const awal = Route.useLoaderData()
  const router = useRouter()
  return (
    <div className="flex flex-col gap-6">
      <h1 className="font-serif text-2xl font-semibold">{m.admin_bulletin_edit_title()}</h1>
      <BulletinForm
        awal={awal}
        onSubmit={async (data) => {
          await updateBulletin({ data: { id: awal.id, ...data } })
          await router.navigate({ to: '/admin/warta' })
        }}
        onCancel={() => router.navigate({ to: '/admin/warta' })}
      />
    </div>
  )
}

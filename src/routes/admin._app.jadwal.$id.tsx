import { createFileRoute, notFound, useRouter } from '@tanstack/react-router'
import * as m from '@/paraglide/messages'
import { listCategories, listKolom } from '@/features/schedule/taxonomy'
import { getServiceForAdmin } from '@/features/schedule/admin-queries'
import { updateService } from '@/features/schedule/mutations'
import { ServiceForm } from '@/components/admin/service-form'

export const Route = createFileRoute('/admin/_app/jadwal/$id')({
  loader: async ({ params }) => {
    const awal = await getServiceForAdmin({ data: params.id })
    // 404 jujur, bukan form kosong yang diam-diam membuat baris baru saat disimpan.
    if (!awal) throw notFound()
    return { awal, kategori: await listCategories(), kolom: await listKolom() }
  },
  component: JadwalUbah,
})

function JadwalUbah() {
  const { awal, kategori, kolom } = Route.useLoaderData()
  const router = useRouter()

  return (
    <div className="flex flex-col gap-6">
      <h1 className="font-serif text-2xl font-semibold">{m.admin_service_edit_title()}</h1>
      <ServiceForm
        kategori={kategori}
        kolom={kolom}
        awal={awal}
        onSubmit={async (data) => {
          await updateService({ data: { id: awal.id, ...data } })
          await router.navigate({ to: '/admin/jadwal' })
        }}
        onCancel={() => router.navigate({ to: '/admin/jadwal' })}
      />
    </div>
  )
}

import { createFileRoute } from '@tanstack/react-router'
import * as m from '@/paraglide/messages'
import { listCategories, listKolom } from '@/features/schedule/taxonomy'
import { createService } from '@/features/schedule/mutations'
import { ServiceForm } from '@/components/admin/service-form'

export const Route = createFileRoute('/admin/_app/jadwal/baru')({
  loader: async () => ({
    kategori: await listCategories(),
    kolom: await listKolom(),
  }),
  component: JadwalBaru,
})

function JadwalBaru() {
  const { kategori, kolom } = Route.useLoaderData()

  return (
    <div className="flex flex-col gap-6">
      <h1 className="font-serif text-2xl font-semibold">{m.admin_service_new_title()}</h1>
      <ServiceForm
        kategori={kategori}
        kolom={kolom}
        onSubmit={async (data) => {
          await createService({ data })
          // TODO Task 8: naikkan ke router.navigate setelah route /admin/jadwal ada.
          window.location.href = '/admin/jadwal'
        }}
        onCancel={() => {
          window.location.href = '/admin/jadwal'
        }}
      />
    </div>
  )
}

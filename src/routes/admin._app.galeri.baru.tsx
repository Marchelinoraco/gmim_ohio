import { createFileRoute, useRouter } from '@tanstack/react-router'
import * as m from '@/paraglide/messages'
import { AlbumForm } from '@/components/admin/album-form'
import { createAlbum } from '@/features/gallery/mutations'

export const Route = createFileRoute('/admin/_app/galeri/baru')({
  component: AlbumBaru,
})

function AlbumBaru() {
  const router = useRouter()

  return (
    <div className="flex flex-col gap-6">
      <h1 className="font-serif text-2xl font-semibold">{m.admin_gallery_new()}</h1>
      <AlbumForm
        onSubmit={async (input) => {
          // Langsung ke halaman kelola album barunya: album kosong tak ada
          // gunanya, dan langkah berikutnya selalu mengisi isinya.
          const { id } = await createAlbum({ data: input })
          await router.navigate({ to: '/admin/galeri/$id', params: { id } })
        }}
        onCancel={() => router.navigate({ to: '/admin/galeri' })}
      />
    </div>
  )
}

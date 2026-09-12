import { createFileRoute } from '@tanstack/react-router'

/**
 * Penerbit token unggah Vercel Blob.
 *
 * Berkasnya TIDAK pernah melewati route ini — browser mengirimnya langsung ke
 * Blob, dan route ini hanya menerbitkan token berumur pendek. Itu disengaja:
 * fungsi Vercel membatasi body permintaan pada 4,5 MB, sementara foto ponsel
 * modern rutin 3–6 MB, jadi jalur "kirim ke server dulu" akan gagal pada
 * sebagian besar foto sungguhan — dan gagalnya setelah pengurus menunggu.
 *
 * Karena berkasnya tidak lewat sini, GERBANGNYA ADA DI PENERBITAN TOKEN.
 * `onBeforeGenerateToken` memanggil `ensureAdmin()` dan mengunci tipe serta
 * ukuran di sana. Membatasi di klien saja tidak menahan apa pun: siapa pun bisa
 * memanggil endpoint ini langsung.
 *
 * Import di-LAZY-kan dengan alasan yang sama seperti `api/auth/$.ts`: route ini
 * bagian statis dari route tree, jadi import top-level `@/lib/auth` → `@/lib/env`
 * akan membuat SETIAP halaman ikut 500 kalau env-nya salah di suatu lingkungan.
 */
async function tangani(request: Request): Promise<Response> {
  try {
    const { handleUpload } = await import('@vercel/blob/client')
    const { TIPE_GAMBAR, MAKS_GAMBAR_BYTE } = await import('@/lib/unggah')

    const body = await request.json()

    const hasil = await handleUpload({
      request,
      body,
      onBeforeGenerateToken: async () => {
        // Gerbang sesungguhnya. Tanpa ini endpoint jadi penyimpanan berkas
        // gratis untuk siapa pun yang menemukannya.
        const { ensureAdmin } = await import('@/lib/auth.functions')
        await ensureAdmin()
        return {
          allowedContentTypes: [...TIPE_GAMBAR],
          maximumSizeInBytes: MAKS_GAMBAR_BYTE,
          addRandomSuffix: true,
        }
      },
      onUploadCompleted: async () => {
        // Sengaja kosong. Baris `gallery_items` ditulis mutasi terpisah setelah
        // klien menerima URL-nya. Callback ini hanya dipanggil Vercel lewat URL
        // publik, jadi menaruh penulisan database di sini akan membuat seluruh
        // alur mustahil diuji di lokal.
      },
    })

    return Response.json(hasil)
  } catch (err) {
    // Jangan telan jadi 500 tanpa jejak — pelajaran dari insiden auth Rencana 3d,
    // di mana badan galat generik membuat penyebabnya tak bisa didiagnosis sama
    // sekali dan tak ada apa pun yang tercatat di log.
    const pesan = err instanceof Error ? err.message : String(err)
    console.error('[api/blob/upload] gagal:', pesan, err)
    return Response.json({ error: pesan }, { status: 400 })
  }
}

export const Route = createFileRoute('/api/blob/upload')({
  server: { handlers: { POST: ({ request }: { request: Request }) => tangani(request) } },
})

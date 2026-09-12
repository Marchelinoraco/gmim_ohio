import { z } from 'zod'
import { createServerFn } from '@tanstack/react-start'
import { getRequestHeaders } from '@tanstack/react-start/server'
import { ensureAdmin } from '@/lib/auth.functions'

/**
 * Kode galat, bukan kalimat siap-tampil: server fn tidak tahu bahasa yang
 * sedang dipakai pengurus. Form yang memetakannya ke pesan berbahasa Indonesia
 * atau Inggris. Pola sama dengan `DUPLICATE_SLUG` di Rencana 3c.
 */
export const WRONG_PASSWORD = 'WRONG_PASSWORD'
export const SAME_PASSWORD = 'SAME_PASSWORD'

/**
 * Minimal 8 karakter — angka yang SAMA dengan default `minPasswordLength`
 * better-auth (`context/create-context.mjs`). Disamakan supaya penolakan datang
 * dari sini dengan pesan yang bisa dibaca, bukan dari API dengan galat mentah.
 *
 * `confirmPassword` sengaja TIDAK ada di sini. Mengulang kata sandi adalah
 * penjaga salah-ketik di layar, bukan batas keamanan — server tidak punya
 * kepentingan apa pun atasnya, dan mengirimnya hanya menyalin rahasia yang sama
 * dua kali lewat jaringan.
 */
export const passwordInputSchema = z
  .object({
    currentPassword: z.string().min(1),
    newPassword: z.string().min(8),
  })
  .refine((v) => v.newPassword !== v.currentPassword, { message: SAME_PASSWORD })

export type PasswordInput = z.infer<typeof passwordInputSchema>

/**
 * Ganti kata sandi akun yang sedang masuk.
 *
 * Memakai `auth.api.changePassword` milik better-auth, bukan menulis sendiri ke
 * tabel `account`: verifikasi kata sandi lama, algoritma hash, dan pencabutan
 * sesi semuanya sudah ada di sana. Menyalinnya berarti dua implementasi yang
 * bisa menyimpang — dan yang menyimpang diam-diam di sini adalah keamanan.
 *
 * `revokeOtherSessions: true` karena mengganti kata sandi hampir selalu berarti
 * "putuskan akses yang lain". Tanpa itu cookie sesi yang sudah ada tetap sah
 * sampai kedaluwarsa, jadi mengganti kata sandi TIDAK mengusir siapa pun — sifat
 * yang mengejutkan justru saat ia paling penting.
 */
export const changeAdminPassword = createServerFn({ method: 'POST' })
  .validator((d: unknown) => passwordInputSchema.parse(d))
  .handler(async ({ data }): Promise<{ ok: true }> => {
    await ensureAdmin()
    const { auth } = await import('@/lib/auth')
    const { APIError } = await import('better-auth/api')

    try {
      await auth.api.changePassword({
        body: {
          currentPassword: data.currentPassword,
          newPassword: data.newPassword,
          revokeOtherSessions: true,
        },
        headers: getRequestHeaders(),
      })
    } catch (err) {
      // better-auth menjawab 400 untuk kata sandi lama yang salah. Dipetakan ke
      // kode kita supaya form bisa menunjuk field yang benar; galat lain
      // dibiarkan naik apa adanya agar tidak tersamar jadi "sandi salah".
      if (err instanceof APIError && err.status === 'BAD_REQUEST') {
        // `cause` disertakan supaya jejak galat asli better-auth tidak hilang
        // saat ditukar jadi kode kita.
        throw new Error(WRONG_PASSWORD, { cause: err })
      }
      throw err
    }

    return { ok: true }
  })

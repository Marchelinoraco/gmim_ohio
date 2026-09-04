import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'

/**
 * Server fn + logika murni untuk form kontak halaman `/kunjungi` (Rencana 2a).
 *
 * `contactSchema` dan `checkRateLimit` di-export supaya bisa diuji unit tanpa DB.
 * `@/db`, skema, `@/lib/env`, dan `@tanstack/react-start/server` di-import LAZY di
 * dalam handler — batas server keras `createServerFn` — supaya modul route yang
 * memuat server fn ini (Task 12) tidak ikut meng-evaluasi `@/lib/env` atau
 * menyeret kode server-only ke bundle klien.
 *
 * Zod v4: format string lewat fungsi top-level (`z.email()`), bukan
 * `z.string().email()` — samakan dengan pola di `@/lib/env`.
 */

export const contactSchema = z.object({
  name: z.string().trim().min(2).max(100),
  email: z.email().max(200),
  phone: z.string().trim().max(40).optional(),
  message: z.string().trim().min(10).max(2000),
  // Honeypot. BUKAN batasan schema: kalau schema menolak `website` yang terisi,
  // bot menerima error validasi dan jadi tahu ia terdeteksi. Maka schema
  // menerima `website` sebagai string opsional apa adanya; handler yang diam-diam
  // short-circuit dengan `{ ok: true }` (lihat langkah 1 di handler). `.max(200)`
  // supaya field tak terlihat ini tetap punya batas panjang seperti yang lain.
  website: z.string().max(200).optional(),
})

export type ContactInput = z.infer<typeof contactSchema>

const RATE_LIMIT_MAX = 3
const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000

/**
 * State rate-limit in-memory. CATATAN: di Vercel ini per-lambda-instance, jadi
 * bukan batas global — cukup untuk meredam spam kasual sekarang. Pindahkan ke
 * DB / Upstash bila spam jadi masalah nyata.
 */
const hits = new Map<string, { count: number; resetAt: number }>()

/** `true` bila permintaan dari `ip` melewati batas. Murni + bisa diuji. */
export function checkRateLimit(
  ip: string,
  now: number = Date.now(),
  store: Map<string, { count: number; resetAt: number }> = hits,
): boolean {
  // Pangkas entri kedaluwarsa secara oportunistik supaya Map tak tumbuh tanpa batas.
  for (const [key, entry] of store) {
    if (entry.resetAt <= now) store.delete(key)
  }

  const entry = store.get(ip)
  // `entry.resetAt <= now` di sini tak akan pernah true — loop prune di atas
  // sudah menghapus semua entri kedaluwarsa. Dibiarkan sebagai redundansi
  // defensif; bukan cabang yang menanggung beban.
  if (!entry || entry.resetAt <= now) {
    store.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS })
    return false
  }

  entry.count += 1
  return entry.count > RATE_LIMIT_MAX
}

/**
 * Terima satu pesan kontak: honeypot → rate-limit → simpan → notifikasi.
 *
 * Balikan discriminated union — rate-limit adalah alur kontrol yang diharapkan,
 * bukan exception:
 * - `{ ok: true }`  — sukses (termasuk honeypot yang di-short-circuit: bot harus
 *   tetap melihat sukses biasa).
 * - `{ ok: false, reason: 'RATE_LIMITED' }` — IP melewati batas.
 * Kegagalan transport / DB asli tetap naik sebagai throw (ditangkap klien).
 */
export const submitContactMessage = createServerFn({ method: 'POST' })
  .validator(contactSchema)
  .handler(async ({ data }) => {
    // 1. Honeypot dulu: field tak terlihat manusia. Kalau terisi → hampir pasti
    //    bot. Balikan sukses palsu — tanpa tulis DB, tanpa konsumsi rate-limit,
    //    tanpa error — supaya bot tak bisa membedakan.
    if (data.website && data.website.trim() !== '') {
      return { ok: true } as const
    }

    // 2. Rate-limit per IP. `x-real-ip` di-set Vercel di edge dan TIDAK bisa
    //    dipalsukan klien. `x-forwarded-for` bisa — klien boleh mengirimnya dan
    //    Vercel hanya MENAMBAHKAN entri, sedangkan `getRequestIP({ xForwardedFor:
    //    true })` mengambil entri PERTAMA (bisa milik penyerang). Jadi x-real-ip
    //    dulu, baru fallback (dev lokal / platform lain).
    const { getRequestHeader, getRequestIP } = await import('@tanstack/react-start/server')
    const ip = getRequestHeader('x-real-ip') ?? getRequestIP({ xForwardedFor: true }) ?? 'unknown'
    // CATATAN: state rate-limit in-memory = per-lambda-instance di Vercel, jadi
    // bukan batas global. Dan bila `ip` jatuh ke `'unknown'`, semua pengunjung
    // lambda itu berbagi satu bucket. Dua-duanya bisa diterima untuk sekarang —
    // alasan tambahan kenapa migrasi ke DB / Upstash adalah perbaikan sebenarnya.
    if (checkRateLimit(ip)) {
      return { ok: false, reason: 'RATE_LIMITED' } as const
    }

    // 3. Simpan pesan. `phone` kosong → `null` (bukan `''` / `undefined`).
    const { db } = await import('@/db')
    const { contactMessages } = await import('@/db/schema')
    await db.insert(contactMessages).values({
      name: data.name,
      email: data.email,
      phone: data.phone?.trim() || null,
      message: data.message,
      status: 'new',
    })

    // 4. Notifikasi email — best-effort lewat `fetch` polos (tanpa SDK Resend).
    //    Pesan sudah tersimpan; kegagalan APA PUN di sini ditelan supaya
    //    pengunjung tetap melihat sukses. JANGAN log isi pesan / email pengirim
    //    — cukup catat bahwa notifikasi gagal.
    const { env } = await import('@/lib/env')
    if (env.RESEND_API_KEY && env.CONTACT_NOTIFICATION_EMAIL) {
      // `data.name` sudah `.trim()` di schema, tapi CR/LF (atau kontrol lain) di
      // TENGAH string masih lolos — dan header `Subject` tak boleh punya baris
      // baru (injeksi header). Buang semua karakter kontrol sebelum interpolasi.
      // (Filter char-code, bukan regex: `no-control-regex` melarang karakter
      // kontrol di literal regex.)
      const subjectName = [...data.name]
        .filter((ch) => {
          const code = ch.charCodeAt(0)
          return code > 0x1f && code !== 0x7f
        })
        .join('')
        .trim()
      try {
        const res = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${env.RESEND_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            // Domain pengirim terverifikasi asli di-set di Rencana 3.
            from: 'GMIM Musafir <onboarding@resend.dev>',
            to: [env.CONTACT_NOTIFICATION_EMAIL],
            subject: `Pesan kontak baru dari ${subjectName}`,
            text: [
              `Nama: ${data.name}`,
              `Email: ${data.email}`,
              `Telepon: ${data.phone?.trim() || '-'}`,
              '',
              data.message,
            ].join('\n'),
          }),
        })
        if (!res.ok) {
          console.error(`Notifikasi kontak gagal: Resend membalas ${res.status}`)
        }
      } catch (err) {
        console.error(
          'Notifikasi kontak gagal dikirim:',
          err instanceof Error ? err.message : 'penyebab tak diketahui',
        )
      }
    }

    return { ok: true } as const
  })

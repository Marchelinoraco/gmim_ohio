import { z } from 'zod'

/**
 * Skema variabel environment. Zod v4 memindahkan validator format string ke
 * fungsi top-level (`z.url()`, `z.email()`); `z.string().url()` sudah deprecated.
 * Kunci tak dikenal (`NEON_BRANCH`, `NEON_AI_GATEWAY_*`, dll.) dibuang otomatis
 * oleh `z.object` sehingga tidak memicu error parse.
 */
const schema = z.object({
  DATABASE_URL: z.url(),
  DATABASE_URL_UNPOOLED: z.url().optional(),
  BETTER_AUTH_SECRET: z.string().min(16),
  BETTER_AUTH_URL: z.url(),
  BLOB_READ_WRITE_TOKEN: z.string().optional(),
  RESEND_API_KEY: z.string().optional(),
  CONTACT_NOTIFICATION_EMAIL: z.email().optional(),
})

/**
 * `.env` menyimpan placeholder kosong (`RESEND_API_KEY=""`, dll.) untuk kredensial
 * yang baru diisi di rencana berikutnya. Perlakukan string kosong sebagai
 * "tidak di-set" agar field `.optional()` tetap lolos validasi.
 */
function readEnv(): Record<string, string | undefined> {
  const out: Record<string, string | undefined> = {}
  for (const [key, value] of Object.entries(process.env)) {
    out[key] = value === '' ? undefined : value
  }
  return out
}

const parsed = schema.safeParse(readEnv())

if (!parsed.success) {
  const rincian = parsed.error.issues
    .map((issue) => `  - ${issue.path.join('.') || '(root)'}: ${issue.message}`)
    .join('\n')
  throw new Error(`Variabel environment tidak valid:\n${rincian}`)
}

/**
 * Variabel environment tervalidasi. SATU-SATUNYA tempat kode aplikasi membaca
 * `process.env` — modul lain mengimpor `env` dari sini.
 */
export const env = parsed.data

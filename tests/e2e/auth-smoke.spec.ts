import { test, expect } from '@playwright/test'

/**
 * Smoke tanpa database: memastikan route better-auth ter-mount dan pendaftaran
 * publik tetap mati. Tidak menyentuh DB — `/ok` tidak query apa pun dan sign-up
 * ditolak (`EMAIL_PASSWORD_SIGN_UP_DISABLED`) sebelum adapter menyentuh tabel.
 * Jalan di env dummy workflow (`test:e2e`) maupun `.env` lokal berisi nilai asli.
 *
 * `.toPass()`: webServer e2e = `pnpm dev`. Hit PERTAMA ke `/api/auth/*` memicu
 * transform on-demand seluruh graf `@/lib/auth` (better-auth + drizzle, ~1.5 MB)
 * dan sesekali time out sekali di runner dingin. Retry singkat menyerap itu;
 * server hasil `pnpm build` tidak punya transform ini.
 */

test('GET /api/auth/ok → 200 (route better-auth ter-mount)', async ({ request }) => {
  await expect(async () => {
    const res = await request.get('/api/auth/ok')
    expect(res.status()).toBe(200)
  }).toPass({ timeout: 20_000 })
})

test('POST /api/auth/sign-up/email → 400 (pendaftaran publik mati)', async ({ request }) => {
  await expect(async () => {
    const res = await request.post('/api/auth/sign-up/email', {
      data: { email: 'x@example.com', password: 'password12345', name: 'x' },
    })
    expect(res.status()).toBe(400)
  }).toPass({ timeout: 20_000 })
})

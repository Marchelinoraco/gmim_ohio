// Muat .env agar test yang butuh sesi bisa baca SEED_ADMIN_EMAIL/PASSWORD.
// Tanpa ini, process.env.SEED_ADMIN_* selalu undefined di test, menyebabkan
// test.skip() selalu true dan alur login tidak pernah dibuktikan (hanya terlihat
// seperti cakupan). Di CI env tidak di-set, jadi skip di sana benar dan disengaja.
import 'dotenv/config'

import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './tests/e2e',
  timeout: 30_000,
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  reporter: process.env.CI ? 'github' : 'list',
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    // Emulasi `prefers-reduced-motion: reduce` — memvalidasi hero TIDAK autoplay
    // dan tombol jadi kontrol Putar/Jeda. Di Playwright versi ini opsi ini lewat
    // `contextOptions` (bukan properti `use` tingkat atas).
    {
      name: 'reduced-motion',
      use: {
        ...devices['Desktop Chrome'],
        contextOptions: { reducedMotion: 'reduce' },
      },
    },
  ],
  webServer: {
    command: 'pnpm dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
})

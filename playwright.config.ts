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
  /**
   * Satu ulangan di lokal, dua di CI.
   *
   * BUKAN untuk menutupi kerapuhan aplikasi. Dev server TanStack Start
   * sesekali menjawab permintaan server-fn bersamaan dengan
   * `Body is unusable: Body has already been read` — galat tingkat fetch di
   * `serverFnFetcher`, bukan asersi yang gagal. Ia hanya muncul saat beberapa
   * berkas spec berjalan paralel; spec yang sama lulus konsisten saat
   * dijalankan sendirian, dan build produksi tidak punya transform on-demand
   * sama sekali.
   *
   * Tanpa ini, `trace: 'on-first-retry'` di bawah juga tak pernah bisa aktif —
   * baris itu mengandaikan ulangan yang selama ini default-nya nol.
   *
   * Satu ulangan saja di lokal: test yang benar-benar rusak tetap gagal dua
   * kali dan tidak lolos diam-diam.
   */
  retries: process.env.CI ? 2 : 1,
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

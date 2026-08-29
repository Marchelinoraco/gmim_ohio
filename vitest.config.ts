import { defineConfig } from 'vitest/config'

// Path alias `@/*` is resolved by Vite 8's native `resolve.tsconfigPaths`
// (same mechanism as vite.config.ts) — no vite-tsconfig-paths plugin needed.
export default defineConfig({
  resolve: { tsconfigPaths: true },
  test: {
    environment: 'node',
    include: ['tests/unit/**/*.test.ts'],
    passWithNoTests: true,
  },
})

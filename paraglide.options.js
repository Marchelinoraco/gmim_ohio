/**
 * Single source of truth for the Paraglide compiler options.
 *
 * Consumed by:
 *  - `vite.config.ts` — the `paraglideVitePlugin()` (dev + build).
 *  - `scripts/compile-i18n.js` — the `pretypecheck` hook, so a fresh
 *    `git clone && pnpm install && pnpm typecheck` can resolve `@/paraglide/*`
 *    without first running a full build.
 *
 * Keeping one object here guarantees the CLI/`compile()` output matches what the
 * Vite plugin emits (same `strategy` + `urlPatterns`), so a `pretypecheck` never
 * leaves `src/paraglide/` in a state that differs from `pnpm dev` / `pnpm build`.
 */
/** @type {import('@inlang/paraglide-js').ParaglideVitePluginOptions} */
export const paraglideOptions = {
  project: './project.inlang',
  outdir: './src/paraglide',
  outputStructure: 'message-modules',
  // URL is the single source of truth for locale. No `preferredLanguage`
  // (audience = Indonesian diaspora on English-configured devices who want `id`
  // content). No `cookie` either: Paraglide's client `getLocale()` calls
  // `setLocale(resolved, { reload: false })` on first run, which — with `cookie`
  // in the chain — writes `PARAGLIDE_LOCALE`. That cookie then makes the server
  // 307 `/` -> `/en` for anyone who ever visited `/en`, trapping them in English
  // (clicking "Indonesia" -> `/` -> bounced back). Dropping `cookie` tree-shakes
  // that path out entirely. `/` always serves `id`; `/en/*` serves `en`.
  strategy: ['url', 'baseLocale'],
  urlPatterns: [
    {
      pattern: '/',
      localized: [['en', '/en']],
    },
    {
      pattern: '/:path(.*)?',
      localized: [['en', '/en/:path(.*)?']],
    },
  ],
}

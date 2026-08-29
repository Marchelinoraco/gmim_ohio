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
  cookieName: 'PARAGLIDE_LOCALE',
  // No `preferredLanguage`: the audience is Indonesian-speaking diaspora whose
  // devices are often set to English but who want `id` content. `/` always
  // serves `id` unless the URL is `/en/*`. The language switcher is a plain
  // `<a href>` to the localized path — it does NOT call `setLocale()` and sets
  // no cookie today. `cookie` stays in the chain so that if a future
  // `setLocale()` call (e.g. a persisted preference) ever writes
  // `PARAGLIDE_LOCALE`, it is honored on the next request.
  strategy: ['url', 'cookie', 'baseLocale'],
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

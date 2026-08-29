/**
 * Regenerates `src/paraglide/**` from the shared compiler options.
 *
 * Runs as the `pretypecheck` hook: `src/paraglide/` is git-ignored (generated),
 * so on a fresh checkout `tsc` would fail to resolve `@/paraglide/*` until a
 * dev server or build has run once. This makes `pnpm typecheck` self-contained.
 *
 * The route tree (`src/routeTree.gen.ts`) is also git-ignored but is only
 * produced by the `tanstackStart()` Vite plugin (no standalone CLI ships in
 * this dep set) — CI and fresh clones must run `pnpm build` (or start
 * `pnpm dev` once) before `pnpm typecheck`. See task-7-report.md.
 */
import { compile } from '@inlang/paraglide-js'
import { paraglideOptions } from '../paraglide.options.js'

await compile(paraglideOptions)

import { defineConfig } from 'vite'
import tailwindcss from '@tailwindcss/vite'
import { paraglideVitePlugin } from '@inlang/paraglide-js'
import { tanstackStart } from '@tanstack/react-start/plugin/vite'
import viteReact from '@vitejs/plugin-react'
import { nitro } from 'nitro/vite'
import { paraglideOptions } from './paraglide.options.js'

export default defineConfig({
  server: { port: 3000 },
  resolve: { tsconfigPaths: true },
  plugins: [
    tailwindcss(),
    paraglideVitePlugin(paraglideOptions),
    tanstackStart(),
    nitro(),
    viteReact(),
  ],
})

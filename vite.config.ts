/// <reference types="vitest/config" />
import { cloudflare } from '@cloudflare/vite-plugin'
import { defineConfig } from 'vite'

// ponytail: es2015 + <script type="module"> = Chrome 61 / Firefox 60 / Safari 11; older needs @vitejs/plugin-legacy
export default defineConfig({
  // Vitest runs tests in Node; the plugin would start a second dev server and refuse
  plugins: process.env.VITEST ? [] : [cloudflare()],
  build: { target: 'es2015' },
  // Vitest blanks CSS imports unless they're included here; tests/fonts.test.ts reads fonts.css?raw
  test: { css: { include: /fonts\.css/ } },
})

import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'node:path'

export default defineConfig({
  root: 'src',
  publicDir: '../public',
  base: '/',
  plugins: [react()],
  resolve: {
    alias: {
      // LEDGER X-025: the browser build parses KaTeX HTML with DOMParser, which
      // trips style-src CSP on every style="" attribute. Use the pure-JS parser.
      'hast-util-from-html-isomorphic': resolve(__dirname, 'node_modules/hast-util-from-html-isomorphic/index.js'),
    },
  },
  build: {
    outDir: '../dist',
    emptyOutDir: true,
    target: 'chrome120',
    modulePreload: { polyfill: false },
    chunkSizeWarningLimit: 4000,
    rollupOptions: {
      input: {
        app: resolve(__dirname, 'src/app.html'),
        popup: resolve(__dirname, 'src/popup.html'),
        background: resolve(__dirname, 'src/background.ts'),
      },
      output: {
        entryFileNames: (c) => (c.name === 'background' ? 'background.js' : 'assets/[name]-[hash].js'),
      },
    },
  },
})

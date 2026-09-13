import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import dts from 'vite-plugin-dts'

export default defineConfig(({ mode }) => {
  const isApp = mode === 'app'
  return {
    plugins: [
      react(),
      ...(isApp
        ? []
        : [
            dts({
              entryRoot: 'src',
              include: ['src'],
              insertTypesEntry: true,
            }),
          ]),
    ],
    build: isApp
      ? {
          outDir: 'dist/app',
          rollupOptions: {
            // T-P9-02: sw.ts is a second entry (not an import of index.html)
            // so it compiles to a plain, unhashed dist/app/sw.js — a service
            // worker must be served from a stable top-level path to control
            // its intended scope.
            input: { main: 'index.html', sw: 'src/sw.ts' },
            output: {
              entryFileNames: (info) => (info.name === 'sw' ? 'sw.js' : 'assets/[name]-[hash].js'),
            },
          },
        }
      : {
          outDir: 'dist',
          // Vite defaults cssCodeSplit to false in lib mode, which refuses
          // a CSS file as a rollupOptions input outright. true is required
          // for the styles.css entry below to build at all.
          cssCodeSplit: true,
          lib: {
            // DEF-003 follow-up: 'styles' is a second entry so Vite emits
            // dist/styles.css (Vite's CSS plugin lets a .css file be a lib
            // entry directly) — previously the lib build had no CSS entry
            // point at all, so docs/INSTALLATION.md's documented
            // `import 'claymark/styles.css'` resolved to nothing.
            entry: { claymark: 'src/index.ts', styles: 'src/styles.css' },
            formats: ['es', 'cjs'],
          },
          rollupOptions: {
            external: ['react', 'react-dom', 'react/jsx-runtime'],
          },
        },
  }
})

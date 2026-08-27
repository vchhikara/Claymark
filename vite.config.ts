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
          lib: {
            entry: 'src/index.ts',
            formats: ['es', 'cjs'],
            fileName: 'claymark',
          },
          rollupOptions: {
            external: ['react', 'react-dom', 'react/jsx-runtime'],
          },
        },
  }
})

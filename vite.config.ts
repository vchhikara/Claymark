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
            input: 'index.html',
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

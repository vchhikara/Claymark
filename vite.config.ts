import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ mode }) => {
  const isApp = mode === 'app'
  return {
    plugins: [react()],
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

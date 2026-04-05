import { resolve } from 'node:path'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [react()],
  build: {
    lib: {
      entry: resolve(__dirname, 'src/index.ts'),
      formats: ['es'],
      fileName: 'index',
      name: 'outliner',
    },
    outDir: 'dist',
    emptyOutDir: true,
    sourcemap: true,
    cssCodeSplit: false,
  },
})

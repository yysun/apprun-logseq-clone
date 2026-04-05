import react from '@vitejs/plugin-react'

export default {
  root: 'src',
  base: '',
  plugins: [react()],
  server: {
    historyApiFallback: true  // SPA mode - serve index.html for all routes
  },
  build: {
    sourcemap: true,
    target: 'esnext',
    outDir: '../public/dist',
  }
}
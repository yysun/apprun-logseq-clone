export default {
  root: 'src',
  base: '',
  server: {
    historyApiFallback: true  // SPA mode - serve index.html for all routes
  },
  build: {
    sourcemap: true,
    target: 'esnext',
    outDir: '../public/dist',
  }
}
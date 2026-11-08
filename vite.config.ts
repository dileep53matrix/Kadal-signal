import { defineConfig } from 'vite';

export default defineConfig({
  server: {
    port: 3000,
    open: false,
    host: true
  },
  publicDir: 'public',
  build: {
    outDir: 'dist',
    sourcemap: true
  }
});

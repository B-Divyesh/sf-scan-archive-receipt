import { defineConfig } from 'vite';

export default defineConfig({
  build: { target: 'es2022', outDir: 'dist' },
  server: { port: 4173 },
  preview: { port: 4173 }
});

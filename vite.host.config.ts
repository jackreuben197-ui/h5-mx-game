import { defineConfig } from 'vite';
import { imageResources } from './scripts/vite-images';
// Rollup entry (not library mode): images stay separate, hashed, and cacheable.
export default defineConfig({ plugins: [imageResources()], base: './', build: {
  target: 'es2022', outDir: 'dist/client', emptyOutDir: true, assetsInlineLimit: 0,
  cssCodeSplit: false, manifest: true,
  rollupOptions: { input: 'src/host-entry.ts', preserveEntrySignatures: 'strict', output: {
    entryFileNames: 'mx-game.js', chunkFileNames: 'chunks/[name]-[hash].js', assetFileNames: 'assets/[name]-[hash][extname]'
  } }
} });

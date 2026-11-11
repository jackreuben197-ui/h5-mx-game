import { defineConfig } from 'vite';
import { imageResources } from './scripts/vite-images';
export default defineConfig({ plugins: [imageResources()], base: './', build: { target: 'es2022', assetsInlineLimit: 0, manifest: true, rollupOptions: {input: {demo:'index.html',entry:'entry-preview.html'}} } });

import { defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import path from 'path';

export default defineConfig({
  plugins: [svelte()],
  root: './src',
  // Set base path for GitHub Pages deployment
  base: process.env.GITHUB_ACTIONS ? '/ShaderStack/' : '/',
  resolve: {
    alias: {
      '@legacy': path.resolve(__dirname, '../js')
    }
  },
  build: {
    outDir: '../dist',
    emptyOutDir: true,
    sourcemap: true,
    manifest: true,
    rollupOptions: {
      output: {
        entryFileNames: 'assets/app.js',
        chunkFileNames: 'assets/[name].js',
        assetFileNames: 'assets/[name][extname]'
      }
    }
  },
  server: {
    port: 5173,
    strictPort: true,
    origin: 'http://localhost:5173',
    fs: { allow: ['..'] }
  }
});
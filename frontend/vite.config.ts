import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

export default defineConfig({
  base: './',
  plugins: [react()],
  clearScreen: false,
  publicDir: resolve(__dirname, '../public'),
  server: {
    port: 5173,
    strictPort: true,
  },
  envPrefix: ['VITE_', 'TAURI_'],
  build: {
    target: process.env.TAURI_PLATFORM == 'windows' ? 'chrome105' : 'safari13',
    minify: !process.env.TAURI_DEBUG ? 'esbuild' : false,
    sourcemap: false, // Disabled for IP protection - no source maps in production
    rollupOptions: {
      input: {
        index: resolve(__dirname, 'index.html'),
        vault: resolve(__dirname, 'vault.html'),
        researchDemo: resolve(__dirname, 'research-demo.html'),
      },
    },
  },
})

/// <reference types="vitest/config" />
import path from 'node:path'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  // Relative asset paths, so the built site works from any folder or host.
  base: './',
  plugins: [react(), tailwindcss()],
  resolve: {
    // The content files live outside frontend/, shared with the future backend.
    alias: { '@content': path.resolve(import.meta.dirname, '../content') },
  },
  server: { fs: { allow: ['..'] } },
  test: {
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',
  },
})

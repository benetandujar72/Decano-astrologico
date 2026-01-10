import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    outDir: '../public/build',
    emptyOutDir: true,
    rollupOptions: {
      output: {
        entryFileNames: 'da-app.js',
        chunkFileNames: 'chunks/[name]-[hash].js',
        assetFileNames: (assetInfo) => {
          if (assetInfo.name === 'style.css') return 'da-app.css';
          return 'assets/[name]-[hash][extname]';
        }
      }
    }
  },
  define: {
    'process.env': {}
  }
})

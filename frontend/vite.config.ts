import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vite.dev/config/
export default defineConfig(({ mode }) => ({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  // Embed VITE_API_URL into the bundle at build time
  define: {
    __API_URL__: JSON.stringify(process.env.VITE_API_URL || ''),
  },
  server: {
    port: 3000,
    open: false,
    host: true,
    // Dev-only proxy — in production, requests go directly to VITE_API_URL
    proxy: mode === 'development' ? {
      '/api': {
        target: process.env.VITE_API_URL || 'https://nvidia-powered-rag-production-5492.up.railway.app',
        changeOrigin: true,
        secure: false,
      },
      '/ws': {
        target: process.env.VITE_API_URL || 'https://nvidia-powered-rag-production-5492.up.railway.app',
        ws: true,
        changeOrigin: true,
        secure: false,
      },
    } : undefined,
  },
}))


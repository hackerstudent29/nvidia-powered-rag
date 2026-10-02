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
  build: {
    chunkSizeWarningLimit: 600,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('react-markdown') || id.includes('remark') || id.includes('rehype') || id.includes('katex')) {
              return 'vendor-markdown';
            }
            if (id.includes('framer-motion') || id.includes('lucide-react')) {
              return 'vendor-ui';
            }
            if (id.includes('react') || id.includes('react-dom')) {
              return 'vendor-core';
            }
          }
        }
      }
    }
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


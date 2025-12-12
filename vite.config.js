import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
  server: {
    proxy: {
      '/api/qiniu': {
        target: 'http://localhost:8787',
        changeOrigin: true,
      },
      '/api/v1': {
        target: 'http://localhost:8787',
        changeOrigin: true,
      },
      '/v1': {
        target: 'http://localhost:8787',
        changeOrigin: true,
      },
    },
  },
})

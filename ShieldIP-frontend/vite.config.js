import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5199,
    host: true,
    proxy: {
      '/api': {
        target: 'https://api-gateway-service-530793814012.us-central1.run.app',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ''),
        secure: true,
      },
    },
  },
})

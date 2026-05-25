import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 3000,
    proxy: {
      '/syncthing-api': {
        target: 'http://localhost:8384',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/syncthing-api/, ''),
        headers: { 'X-API-Key': 'FhrJ56rUqDmMejwqSYh5mRsntGMCWSqQ' },
      },
      '/sda-api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/sda-api/, ''),
      },
    },
  },
})

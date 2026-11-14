import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Todo lo que empiece por /api se reenvia al backend, asi el navegador
// habla con un solo origen. En Docker el backend se llama "backend";
// corriendo en el PC es localhost.
const urlDelBackend = process.env.API_URL || 'http://localhost:8080'
const reenvioAlBackend = { '/api': { target: urlDelBackend, changeOrigin: true } }

export default defineConfig({
  plugins: [react()],
  server: { port: 3000, proxy: reenvioAlBackend },
  preview: { port: 3000, host: true, proxy: reenvioAlBackend },
})

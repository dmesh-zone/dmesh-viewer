import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

import yaml from '@rollup/plugin-yaml';

// https://vite.dev/config/
export default defineConfig({
  base: '/dmesh-viewer/',
  plugins: [
    react(),
    yaml()
  ],
  server: {
    proxy: {
      '/dmesh-viewer/dmesh': {
        target: 'http://localhost:8000',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/dmesh-viewer\/dmesh/, '/dmesh')
      }
    }
  }
})

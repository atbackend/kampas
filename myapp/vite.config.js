// // vite.config.js //upload works well
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/geoserver': {
        target: 'http://192.168.29.247:8080',
        changeOrigin: true,
        secure: false,
        rewrite: (path) => path.replace(/^\/geoserver/, '/geoserver'),
      },
      '/s3-proxy': {
        target: 'https://kampas.s3.amazonaws.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/s3-proxy/, ''),
        configure: (proxy, options) => {
          proxy.on('proxyReq', (proxyReq, req, res) => {
            console.log('Proxying S3 request:', req.url);
          });
        }
      }
    }
  }
})


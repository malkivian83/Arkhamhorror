import vue from '@vitejs/plugin-vue'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [vue({ template: { transformAssetUrls: { includeAbsolute: false } } })],
  server: {
    port: 5173,
    proxy: {
      '/api': { target: process.env.API_PROXY_TARGET ?? 'http://localhost:3001', ws: true },
      // Fuente de símbolos de ArkhamDB: su servidor no permite cargarla desde
      // otros sitios, así que se sirve a través de nuestro origen.
      '/ext/arkhamdb': {
        target: 'https://arkhamdb.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/ext\/arkhamdb/, ''),
      },
    },
  },
})

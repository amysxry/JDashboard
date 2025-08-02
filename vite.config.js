import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import path from 'path'
import { VitePWA } from 'vite-plugin-pwa' 

export default defineConfig({
  plugins: [
    vue(),
    VitePWA({
      registerType: 'autoUpdate',
      devOptions: {
        enabled: true 
      },
      manifest: {
        name: 'Tu App JDashboard', 
        short_name: 'JDashboard',
        description: 'Panel integral para monitorear métricas digitales en tiempo real de tu agencia.',
        theme_color: '#1a1a1a', 
        background_color: '#1a1a1a',
        display: 'standalone',
        scope: '/',
        start_url: '/',
        
        // Agregamos el 'id'
        id: '/', 
        
        icons: [
          {
            // Ruta corregida: el archivo está directamente en 'public'
            src: '/192x192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: '/512x512.png',
            sizes: '512x512',
            type: 'image/png'
          },
          {
            src: '/512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any'
          },
          {
            src: '/512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable'
          }
        ],
        
      }
    })
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src')
    }
  }
})
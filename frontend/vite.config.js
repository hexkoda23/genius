import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'
import dns from 'node:dns'

const isDev = process.env.NODE_ENV !== 'production'

dns.setDefaultResultOrder('verbatim')

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      devOptions: { enabled: false },
      strategies: 'injectManifest',
      srcDir: 'src',
      filename: 'sw.js',
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'masked-icon.svg'],

      manifest: {
        name: 'MathGenius',
        short_name: 'MathGenius',
        description: 'AI-powered mathematics learning for Nigerian students',
        theme_color: '#0d9488',
        background_color: '#faf9f7',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '/dashboard',
        scope: '/',
        icons: [
          { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
        shortcuts: [
          { name: 'Practice', url: '/practice', description: 'Start a practice session' },
          { name: 'CBT Exam', url: '/cbt', description: 'Take a CBT exam' },
          { name: 'Ask Euler', url: '/teach', description: 'Chat with Euler' },
          { name: 'Past Questions', url: '/past-questions', description: 'Browse past questions' },
        ],
      },

      injectManifest: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        globIgnores: ['**/node_modules/**', '**/@vite/**'],
        rollupFormat: 'es',
      },
    }),
  ],

  server: {
    historyApiFallback: true,
    headers: { 'Cache-Control': 'no-store' },
    host: true,
    allowedHosts: ['localhost'],
    hmr: {
      protocol: 'ws',
      host: 'localhost',
      port: 5173,
    },
  },
})

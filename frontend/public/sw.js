const CACHE = 'mathgenius-v2'

// Pages/assets to cache immediately on install
const PRECACHE = [
  '/',
  '/home',
  '/formulas',
  '/solve',
  '/manifest.json',
]

self.addEventListener('install', e => {
  self.skipWaiting()
  e.waitUntil(
    caches.open(CACHE).then(c => c.addAll(PRECACHE).catch(() => { }))
  )
})

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  )
})

self.addEventListener('fetch', e => {
  // Only handle GET requests; skip API and Supabase calls
  if (e.request.method !== 'GET') return
  const url = new URL(e.request.url)
  if (url.hostname.includes('supabase') || url.hostname.includes('groq')) return
  if (url.pathname.startsWith('/api') || url.pathname.startsWith('/teach')) return

  e.respondWith(
    caches.match(e.request).then(cached => {
      // Network-first for HTML navigation, cache-first for assets
      const isNav = e.request.mode === 'navigate'
      if (isNav) {
        return fetch(e.request)
          .then(res => {
            if (res.status === 200) {
              const clone = res.clone()
              caches.open(CACHE).then(c => c.put(e.request, clone))
            }
            return res
          })
          .catch(() => cached || caches.match('/'))
      }
      if (cached) return cached
      return fetch(e.request).then(res => {
        if (res && res.status === 200) {
          const clone = res.clone()
          caches.open(CACHE).then(c => c.put(e.request, clone))
        }
        return res
      })
    })
  )
})
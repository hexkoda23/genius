// public/sw-push.js
// Add this code to your service worker to handle incoming push events.
// If you're using vite-plugin-pwa, create this as src/sw.js and it will
// be merged with the generated service worker.
//
// PLACE THIS FILE AT: src/sw.js
// vite-plugin-pwa will include it automatically via the `strategies: 'injectManifest'`
// option (see note below).

// ── Handle incoming push notifications ───────────────────────────
self.addEventListener('push', (event) => {
  if (!event.data) return

  let data
  try {
    data = event.data.json()
  } catch {
    data = { title: 'MathGenius', body: event.data.text(), url: '/dashboard' }
  }

  const options = {
    body:    data.body,
    icon:    data.icon  || '/icons/icon-192.png',
    badge:   data.badge || '/icons/icon-192.png',
    vibrate: [200, 100, 200],
    data:    { url: data.url || '/dashboard' },
    actions: [
      { action: 'open',    title: 'Open App' },
      { action: 'dismiss', title: 'Dismiss'  },
    ],
    requireInteraction: false,
    tag: 'mathgenius-reminder',   // replaces previous notification of same type
    renotify: true,
  }

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  )
})

// ── Handle notification click ─────────────────────────────────────
self.addEventListener('notificationclick', (event) => {
  event.notification.close()

  if (event.action === 'dismiss') return

  const url = event.notification.data?.url || '/dashboard'

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // If app is already open, focus it and navigate
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.focus()
          client.navigate(url)
          return
        }
      }
      // Otherwise open a new window
      if (clients.openWindow) {
        return clients.openWindow(url)
      }
    })
  )
})

// ── Handle SW messages (e.g. skip waiting for update) ─────────────
self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') {
    self.skipWaiting()
  }
})
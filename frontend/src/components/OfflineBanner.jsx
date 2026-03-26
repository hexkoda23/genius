// src/components/OfflineBanner.jsx
// Shows a banner when the user loses internet connection.
// Disappears automatically when they reconnect.

import { useState, useEffect } from 'react'

export default function OfflineBanner() {
  const [offline,     setOffline]     = useState(!navigator.onLine)
  const [justOnline,  setJustOnline]  = useState(false)
  const [updateReady, setUpdateReady] = useState(false)

  useEffect(() => {
    const goOffline = () => setOffline(true)
    const goOnline  = () => {
      setOffline(false)
      setJustOnline(true)
      setTimeout(() => setJustOnline(false), 3000)  // hide "back online" after 3s
    }

    window.addEventListener('offline', goOffline)
    window.addEventListener('online',  goOnline)
    return () => {
      window.removeEventListener('offline', goOffline)
      window.removeEventListener('online',  goOnline)
    }
  }, [])

  // Listen for SW update available
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return
    navigator.serviceWorker.ready.then(reg => {
      reg.addEventListener('updatefound', () => {
        const newSW = reg.installing
        newSW?.addEventListener('statechange', () => {
          if (newSW.state === 'installed' && navigator.serviceWorker.controller) {
            setUpdateReady(true)
          }
        })
      })
    })
  }, [])

  const handleUpdate = () => {
    navigator.serviceWorker.ready.then(reg => {
      reg.waiting?.postMessage({ type: 'SKIP_WAITING' })
      window.location.reload()
    })
  }

  if (updateReady) {
    return (
      <div className="fixed top-0 left-0 right-0 z-[9999] flex items-center justify-between
                      bg-[#0d9488] text-white px-4 py-2 text-sm shadow-lg">
        <span>🆕 A new version of MathGenius is ready.</span>
        <button
          onClick={handleUpdate}
          className="ml-4 bg-white text-[#0d9488] font-semibold
                     px-3 py-1 rounded-full text-xs hover:bg-teal-50 transition"
        >
          Update now
        </button>
      </div>
    )
  }

  if (justOnline) {
    return (
      <div className="fixed top-0 left-0 right-0 z-[9999] flex items-center justify-center
                      bg-green-600 text-white px-4 py-2 text-sm shadow-lg animate-pulse">
        ✅ You're back online
      </div>
    )
  }

  if (offline) {
    return (
      <div className="fixed top-0 left-0 right-0 z-[9999] bg-[#1c1917] text-white
                      px-4 py-2 shadow-lg">
        <div className="max-w-4xl mx-auto flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-sm">
            <span className="text-lg">📵</span>
            <span>
              <strong>You're offline.</strong>{' '}
              Previously visited pages and past questions are still available.
              New AI features require internet.
            </span>
          </div>
        </div>
      </div>
    )
  }

  return null
}

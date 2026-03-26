import { useState, useEffect } from 'react'

export function usePWA() {
  const [installPrompt,  setInstallPrompt]  = useState(null)
  const [isInstalled,    setIsInstalled]    = useState(false)
  const [isOnline,       setIsOnline]       = useState(navigator.onLine)

  useEffect(() => {
    if ('serviceWorker' in navigator && import.meta.env.PROD) {
      navigator.serviceWorker.register('/sw.js').catch(() => {})
    }

    // Capture install prompt
    const handler = (e) => {
      e.preventDefault()
      setInstallPrompt(e)
    }
    window.addEventListener('beforeinstallprompt', handler)

    // Detect if already installed
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true)
    }

    // Online/offline
    const online  = () => setIsOnline(true)
    const offline = () => setIsOnline(false)
    window.addEventListener('online',  online)
    window.addEventListener('offline', offline)

    return () => {
      window.removeEventListener('beforeinstallprompt', handler)
      window.removeEventListener('online',  online)
      window.removeEventListener('offline', offline)
    }
  }, [])

  const install = async () => {
    if (!installPrompt) return
    installPrompt.prompt()
    const { outcome } = await installPrompt.userChoice
    if (outcome === 'accepted') setIsInstalled(true)
    setInstallPrompt(null)
  }

  return { installPrompt, isInstalled, install, isOnline }
}

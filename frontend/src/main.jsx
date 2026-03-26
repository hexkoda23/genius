import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

// Register service worker for PWA / offline support
// Force unregister stale service workers to fix cache/lock issues
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then((registrations) => {
    for (let registration of registrations) {
      registration.unregister()
    }
  })
}

// Clear stale auth locks/data from previous versions
localStorage.removeItem('mathgenius_auth_v2')
localStorage.removeItem('supabase.auth.token') // Default Supabase key just in case

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>
)
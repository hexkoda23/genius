// src/components/PushNotificationToggle.jsx
// Drop into the Profile settings tab

import { useState, useEffect } from 'react'
import {
  isPushSupported,
  getPushPermission,
  subscribeToPush,
  unsubscribeFromPush,
  isSubscribed,
} from '../lib/pushNotifications'

export default function PushNotificationToggle({ userId }) {
  const [supported,   setSupported]   = useState(false)
  const [subscribed,  setSubscribed]  = useState(false)
  const [permission,  setPermission]  = useState('default')
  const [loading,     setLoading]     = useState(true)
  const [statusMsg,   setStatusMsg]   = useState('')

  useEffect(() => {
    const supported = isPushSupported()
    setSupported(supported)
    setPermission(getPushPermission())
    if (supported) {
      isSubscribed().then(sub => {
        setSubscribed(sub)
        setLoading(false)
      })
    } else {
      setLoading(false)
    }
  }, [])

  const handleToggle = async () => {
    setLoading(true)
    setStatusMsg('')

    if (subscribed) {
      const { error } = await unsubscribeFromPush(userId)
      if (error) {
        setStatusMsg('Could not turn off notifications: ' + error)
      } else {
        setSubscribed(false)
        setStatusMsg('Notifications turned off.')
      }
    } else {
      const { success, device, error } = await subscribeToPush(userId)
      if (error) {
        if (error.includes('denied')) {
          setStatusMsg('Notifications blocked. Go to your browser settings to allow them.')
        } else if (error.includes('VAPID')) {
          setStatusMsg('Push not configured yet — come back soon!')
        } else {
          setStatusMsg('Could not enable notifications: ' + error)
        }
      } else if (success) {
        setSubscribed(true)
        setPermission('granted')
        setStatusMsg(`✅ Notifications enabled on ${device}`)
      }
    }
    setLoading(false)
  }

  if (!supported) {
    return (
      <div className="flex items-center justify-between py-3 border-b border-[var(--color-border)]">
        <div>
          <p className="font-semibold text-sm text-[var(--color-ink)]">Push Notifications</p>
          <p className="text-xs text-[var(--color-muted)] mt-0.5">
            Not supported on this browser. Try Chrome on Android or desktop.
          </p>
        </div>
        <span className="text-xs text-[var(--color-muted)] bg-gray-100 px-2 py-1 rounded-full">
          Unavailable
        </span>
      </div>
    )
  }

  return (
    <div className="py-3 border-b border-[var(--color-border)]">
      <div className="flex items-center justify-between">
        <div>
          <p className="font-semibold text-sm text-[var(--color-ink)]">Push Notifications</p>
          <p className="text-xs text-[var(--color-muted)] mt-0.5">
            Daily practice reminders, streak alerts, and new challenges
          </p>
        </div>

        {/* Toggle switch */}
        <button
          onClick={handleToggle}
          disabled={loading || permission === 'denied'}
          className={`relative inline-flex h-6 w-11 items-center rounded-full
                      transition-colors duration-200 focus:outline-none
                      disabled:opacity-40 disabled:cursor-not-allowed
                      ${subscribed ? 'bg-[var(--color-teal)]' : 'bg-gray-300'}`}
        >
          <span className={`inline-block h-4 w-4 transform rounded-full bg-white
                            shadow transition-transform duration-200
                            ${subscribed ? 'translate-x-6' : 'translate-x-1'}`} />
        </button>
      </div>

      {/* Status / blocked message */}
      {permission === 'denied' && (
        <p className="mt-1.5 text-xs text-red-500">
          🚫 Notifications are blocked in your browser settings.
          Click the 🔒 icon in your address bar to allow them.
        </p>
      )}
      {statusMsg && permission !== 'denied' && (
        <p className="mt-1.5 text-xs text-[var(--color-teal)]">{statusMsg}</p>
      )}

      {/* What you'll receive */}
      {subscribed && (
        <div className="mt-3 bg-[#f0fdfa] rounded-xl p-3 space-y-1">
          <p className="text-xs font-semibold text-[var(--color-teal)] mb-1">
            You'll be notified about:
          </p>
          {[
            '📅 Daily practice reminder at 8:00 PM',
            '🔥 Streak about to break (if no session by 9 PM)',
            '💤 Re-engagement nudge after 3 days away',
            '🏆 When a classmate beats your score',
          ].map(item => (
            <p key={item} className="text-xs text-[var(--color-muted)]">{item}</p>
          ))}
        </div>
      )}
    </div>
  )
}

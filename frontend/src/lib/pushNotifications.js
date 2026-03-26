// src/lib/pushNotifications.js
// Handles browser push notification subscription and storage in Supabase

import { supabase } from './supabase'

// ── Your VAPID public key ─────────────────────────────────────────
// Generate your own at: https://vapidkeys.com
// Then set VITE_VAPID_PUBLIC_KEY in your frontend .env
// And VAPID_PRIVATE_KEY + VAPID_EMAIL in your backend .env
const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY || ''

function urlBase64ToUint8Array(base64String) {
  const padding  = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64   = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData  = window.atob(base64)
  return Uint8Array.from([...rawData].map(c => c.charCodeAt(0)))
}

// ── Check if push is supported ────────────────────────────────────
export function isPushSupported() {
  return 'serviceWorker' in navigator && 'PushManager' in window
}

// ── Get current permission state ──────────────────────────────────
export function getPushPermission() {
  return Notification.permission  // 'default' | 'granted' | 'denied'
}

// ── Subscribe this device ─────────────────────────────────────────
export async function subscribeToPush(userId) {
  if (!isPushSupported()) return { error: 'Push not supported on this browser' }
  if (!VAPID_PUBLIC_KEY)  return { error: 'VAPID key not configured' }

  try {
    const reg          = await navigator.serviceWorker.ready
    const subscription = await reg.pushManager.subscribe({
      userVisibleOnly:      true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
    })

    const { endpoint, keys } = subscription.toJSON()
    const device = `${getBrowserName()} on ${getOSName()}`

    const { error } = await supabase.from('push_subscriptions').upsert({
      user_id:  userId,
      endpoint,
      p256dh:   keys.p256dh,
      auth_key: keys.auth,
      device,
    }, { onConflict: 'user_id,endpoint' })

    if (error) return { error: error.message }
    return { success: true, device }
  } catch (err) {
    if (err.name === 'NotAllowedError') return { error: 'Permission denied by user' }
    return { error: err.message }
  }
}

// ── Unsubscribe this device ───────────────────────────────────────
export async function unsubscribeFromPush(userId) {
  try {
    const reg          = await navigator.serviceWorker.ready
    const subscription = await reg.pushManager.getSubscription()
    if (!subscription) return { success: true }

    const { endpoint } = subscription.toJSON()
    await subscription.unsubscribe()

    await supabase
      .from('push_subscriptions')
      .delete()
      .eq('user_id', userId)
      .eq('endpoint', endpoint)

    return { success: true }
  } catch (err) {
    return { error: err.message }
  }
}

// ── Check if this device is subscribed ───────────────────────────
export async function isSubscribed() {
  if (!isPushSupported()) return false
  try {
    const reg          = await navigator.serviceWorker.ready
    const subscription = await reg.pushManager.getSubscription()
    return !!subscription
  } catch {
    return false
  }
}

// ── Helpers ───────────────────────────────────────────────────────
function getBrowserName() {
  const ua = navigator.userAgent
  if (ua.includes('Chrome'))  return 'Chrome'
  if (ua.includes('Firefox')) return 'Firefox'
  if (ua.includes('Safari'))  return 'Safari'
  if (ua.includes('Edge'))    return 'Edge'
  return 'Browser'
}

function getOSName() {
  const ua = navigator.userAgent
  if (ua.includes('Windows')) return 'Windows'
  if (ua.includes('Mac'))     return 'Mac'
  if (ua.includes('Android')) return 'Android'
  if (ua.includes('iPhone') || ua.includes('iPad')) return 'iOS'
  if (ua.includes('Linux'))   return 'Linux'
  return 'Unknown OS'
}
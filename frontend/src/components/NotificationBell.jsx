import { useState, useEffect, useRef } from 'react'
import { useAuth } from '../context/AuthContext'
import { useNavigate } from 'react-router-dom'
import {
  getNotifications, markAllRead, markOneRead,
  deleteNotification, getUnreadCount,
} from '../lib/notifications'

export default function NotificationBell() {
  const { user }    = useAuth()
  const navigate    = useNavigate()
  const [open,      setOpen]    = useState(false)
  const [notifs,    setNotifs]  = useState([])
  const [unread,    setUnread]  = useState(0)
  const ref = useRef(null)

  useEffect(() => {
    if (!user) return
    loadNotifs()
    const interval = setInterval(loadNotifs, 60000)
    return () => clearInterval(interval)
  }, [user])

  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    if (open) document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  const loadNotifs = async () => {
    const [data, count] = await Promise.all([
      getNotifications(user.id),
      getUnreadCount(user.id),
    ])
    setNotifs(data)
    setUnread(count)
  }

  const handleMarkAllRead = async () => {
    await markAllRead(user.id)
    setNotifs(prev => prev.map(n => ({ ...n, read: true })))
    setUnread(0)
  }

  const handleClick = async (notif) => {
    if (!notif.read) {
      await markOneRead(notif.id)
      setNotifs(prev => prev.map(n => n.id === notif.id ? { ...n, read: true } : n))
      setUnread(prev => Math.max(0, prev - 1))
    }
    if (notif.link) {
      navigate(notif.link)
      setOpen(false)
    }
  }

  const handleDelete = async (e, id) => {
    e.stopPropagation()
    await deleteNotification(id)
    setNotifs(prev => prev.filter(n => n.id !== id))
  }

  const timeAgo = (date) => {
    const secs = Math.floor((Date.now() - new Date(date)) / 1000)
    if (secs < 60)   return 'just now'
    if (secs < 3600) return `${Math.floor(secs / 60)}m ago`
    if (secs < 86400) return `${Math.floor(secs / 3600)}h ago`
    return `${Math.floor(secs / 86400)}d ago`
  }

  if (!user) return null

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(o => !o)}
        className="relative w-10 h-10 flex items-center justify-center
                   rounded-xl border-2 border-[var(--color-border)]
                   hover:border-[var(--color-ink)] transition-all
                   bg-[var(--color-cream)]"
      >
        🔔
        {unread > 0 && (
          <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full
                           bg-red-500 text-white text-[10px] font-bold
                           flex items-center justify-center">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-80
                        bg-white border-2 border-[var(--color-ink)]
                        rounded-2xl shadow-2xl overflow-hidden z-50">
          <div className="bg-[var(--color-ink)] px-4 py-3
                          flex items-center justify-between">
            <p className="font-serif font-bold text-white text-sm">
              🔔 Notifications
            </p>
            {unread > 0 && (
              <button
                onClick={handleMarkAllRead}
                className="text-white/60 hover:text-white text-xs
                           font-mono transition-colors"
              >
                Mark all read
              </button>
            )}
          </div>

          <div className="max-h-96 overflow-y-auto divide-y
                          divide-[var(--color-border)]">
            {notifs.length === 0 ? (
              <div className="p-8 text-center">
                <div className="text-3xl mb-2">🔔</div>
                <p className="text-sm text-[var(--color-muted)]">
                  No notifications yet
                </p>
              </div>
            ) : notifs.map(n => (
              <div
                key={n.id}
                onClick={() => handleClick(n)}
                className={`px-4 py-3 flex items-start gap-3 cursor-pointer
                            transition-colors hover:bg-[var(--color-cream)]
                            ${!n.read ? 'bg-[#e8f4f4]' : 'bg-white'}`}
              >
                <span className="text-xl shrink-0 mt-0.5">{n.icon}</span>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-semibold text-[var(--color-ink)]
                                 leading-snug
                    ${!n.read ? 'font-bold' : ''}`}>
                    {n.title}
                  </p>
                  {n.message && (
                    <p className="text-xs text-[var(--color-muted)] mt-0.5
                                  leading-snug">
                      {n.message}
                    </p>
                  )}
                  <p className="text-[10px] text-[var(--color-muted)] mt-1
                                font-mono">
                    {timeAgo(n.created_at)}
                  </p>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  {!n.read && (
                    <div className="w-2 h-2 rounded-full bg-[var(--color-teal)]" />
                  )}
                  <button
                    onClick={(e) => handleDelete(e, n.id)}
                    className="text-[var(--color-muted)] hover:text-red-500
                               text-xs transition-colors p-1"
                  >
                    ✕
                  </button>
                </div>
              </div>
            ))}
          </div>

          {notifs.length > 0 && (
            <div className="px-4 py-2 border-t border-[var(--color-border)]
                            bg-[var(--color-paper)] text-center">
              <p className="text-xs text-[var(--color-muted)] font-mono">
                {notifs.length} notification{notifs.length !== 1 ? 's' : ''}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
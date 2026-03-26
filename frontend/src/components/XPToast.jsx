import { useEffect, useState } from 'react'
import { BADGES } from '../lib/stats'

export default function XPToast({ xpGained, newBadges = [], onDone }) {
  const [visible, setVisible] = useState(true)

  useEffect(() => {
    const t = setTimeout(() => {
      setVisible(false)
      setTimeout(onDone, 300)
    }, 3500)
    return () => clearTimeout(t)
  }, [])

  const badgeDefs = newBadges.map(id => BADGES.find(b => b.id === id)).filter(Boolean)

  return (
    <div className={`fixed top-20 right-6 z-50 space-y-2 transition-all duration-300
      ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-4'}`}>

      {/* XP gained */}
      {xpGained > 0 && (
        <div className="bg-[var(--color-ink)] text-white px-5 py-3 rounded-2xl
                        shadow-2xl flex items-center gap-3 border-2
                        border-[var(--color-gold)]">
          <span className="text-2xl">⚡</span>
          <div>
            <p className="font-mono text-[10px] uppercase tracking-widest text-white/50">
              XP Earned
            </p>
            <p className="font-serif font-black text-xl text-[var(--color-gold)]">
              +{xpGained} XP
            </p>
          </div>
        </div>
      )}

      {/* New badges */}
      {badgeDefs.map(badge => (
        <div key={badge.id}
             className="bg-[var(--color-gold)] px-5 py-3 rounded-2xl
                        shadow-2xl flex items-center gap-3 border-2
                        border-[var(--color-ink)]">
          <span className="text-2xl">{badge.emoji}</span>
          <div>
            <p className="font-mono text-[10px] uppercase tracking-widest
                          text-[var(--color-ink)]/50">
              Badge Unlocked!
            </p>
            <p className="font-serif font-black text-[var(--color-ink)]">
              {badge.label}
            </p>
          </div>
        </div>
      ))}
    </div>
  )
}
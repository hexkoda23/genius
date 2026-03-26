import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { getLeaderboard, xpProgress, BADGES } from '../lib/stats'
import { useReveal } from '../hooks/useReveal'

export default function Leaderboard() {
  const { user } = useAuth(); const revealRef = useReveal()
  const [board, setBoard] = useState([]); const [loading, setLoading] = useState(true); const [tab, setTab] = useState('global')

  useEffect(() => { getLeaderboard().then(data => { setBoard(data); setLoading(false) }) }, [])
  const myRank = board.findIndex(r => r.id === user?.id) + 1

  return (
    <div className="max-w-7xl mx-auto px-6 py-12 lg:py-24" ref={revealRef}>
      {/* Header */}
      <div className="mb-20 space-y-4">
        <p className="text-[11px] font-bold text-[var(--color-teal)] uppercase tracking-widest">Global Prestige</p>
        <h1 className="text-5xl lg:text-7xl font-extrabold text-[var(--color-ink)] tracking-tight">Esteem <span className="text-[var(--color-teal)]">Rankings.</span></h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-12 items-start">
        <div className="space-y-10">
          {/* Scope Navigation */}
          <div className="flex bg-[var(--color-cream)] p-1 rounded-2xl border border-[var(--color-border)]">
            {['global', 'council', 'cohort'].map(t => (
              <button key={t} onClick={() => setTab(t)}
                className={`flex-1 py-3 rounded-xl text-xs font-bold uppercase tracking-widest transition-all ${tab === t ? 'bg-white text-[var(--color-ink)] shadow-md' : 'text-[var(--color-muted)] hover:text-[var(--color-ink)]'}`}>
                {t} Scope
              </button>
            ))}
          </div>

          {/* Leaderboard Card */}
          <div className="bg-white border border-[var(--color-border)] rounded-[2.5rem] shadow-sm overflow-hidden animate-fade-in">
            {loading ? (
              <div className="p-24 text-center text-xs font-bold uppercase tracking-widest text-[var(--color-muted)] animate-pulse">Synchronizing Data...</div>
            ) : board.length === 0 ? (
              <div className="p-24 text-center space-y-6">
                <p className="text-lg font-medium text-[var(--color-muted)] italic">The scrolls are currently blank. Ascend through performance.</p>
                <button className="text-xs font-bold uppercase tracking-widest text-[var(--color-teal)]">Initialize First Trial ➔</button>
              </div>
            ) : (
              <div className="divide-y divide-[var(--color-border)]">
                {board.map((entry, i) => {
                  const r = i + 1; const isMe = entry.id === user?.id; const { level, progress } = xpProgress(entry.xp || 0)
                  const initials = entry.full_name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || '?'
                  const isTop3 = r <= 3

                  return (
                    <div key={entry.id} className={`p-6 lg:p-8 flex items-center gap-6 lg:gap-8 transition-all group ${isMe ? 'bg-[var(--color-teal)]/5' : 'hover:bg-[var(--color-cream)]'}`}>
                      <div className="w-12 text-center">
                        <span className={`text-2xl lg:text-3xl font-black ${r === 1 ? 'text-amber-500' : r === 2 ? 'text-slate-400' : r === 3 ? 'text-orange-400' : 'text-[var(--color-ink)]/20'}`}>
                          {r === 1 ? '🥇' : r === 2 ? '🥈' : r === 3 ? '🥉' : `#${String(r).padStart(2, '0')}`}
                        </span>
                      </div>

                      <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-lg font-bold shadow-sm ${isMe ? 'bg-[var(--color-ink)] text-white' : 'bg-[var(--color-cream)] text-[var(--color-ink)]'}`}>
                        {initials}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-baseline gap-3 mb-2">
                          <h3 className={`text-lg font-bold truncate ${isMe ? 'text-[var(--color-ink)]' : 'text-[var(--color-ink)]/70'}`}>{entry.full_name || 'Anonymous Student'}</h3>
                          <span className="text-[10px] font-bold text-[var(--color-teal)] uppercase tracking-wider">Lvl {level}</span>
                        </div>
                        <div className="h-1 bg-[var(--color-cream)] rounded-full overflow-hidden">
                          <div className="h-full bg-[var(--color-ink)] transition-all duration-1000" style={{ width: `${progress}%` }} />
                        </div>
                      </div>

                      <div className="text-right">
                        <p className="text-2xl font-black text-[var(--color-ink)] tracking-tighter">{(entry.xp || 0).toLocaleString()}<span className="text-[10px] ml-1 opacity-20">PX</span></p>
                        <p className="text-[10px] font-bold text-orange-500 uppercase tracking-widest flex items-center justify-end gap-1">
                          🔥 {entry.streak_current || 0}
                        </p>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>

        {/* Sidebar Status */}
        <div className="space-y-8 animate-fade-in">
          <div className="bg-[var(--color-ink)] rounded-[2.5rem] p-10 text-white shadow-xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-[var(--color-teal)] rounded-full blur-[80px] opacity-20" />
            <p className="text-[10px] font-bold uppercase tracking-widest text-white/40 mb-10">Personal Status</p>
            <div className="space-y-10">
              <div>
                <p className="text-[10px] font-bold uppercase text-[var(--color-gold)] mb-2">Current Rank</p>
                <p className="text-6xl font-black tracking-tighter">#{myRank || '--'}</p>
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase text-white/40 mb-2">Member Since</p>
                <p className="text-lg font-bold italic text-white/80">Est. 2026 // {new Date().getFullYear()}</p>
              </div>
            </div>
          </div>

          <div className="bg-white border border-[var(--color-border)] rounded-[2.5rem] p-10 shadow-sm">
            <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--color-muted)] mb-8">Network Metrics</p>
            <div className="space-y-6">
              <div className="flex justify-between items-center border-b border-[var(--color-border)] pb-4">
                <span className="text-sm font-medium text-[var(--color-ink)]">Active Minds</span>
                <span className="text-xl font-black text-[var(--color-ink)]">{board.length}</span>
              </div>
              <div className="flex justify-between items-center border-b border-[var(--color-border)] pb-4">
                <span className="text-sm font-medium text-[var(--color-ink)]">Median Mastery</span>
                <span className="text-xl font-black text-[var(--color-ink)]">84%</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-[var(--color-ink)]">Total XP Pool</span>
                <span className="text-xl font-black text-[var(--color-teal)]">1.2M</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { getTopicMastery, getUserStats, xpProgress, BADGES } from '../lib/stats'
import { useNavigate } from 'react-router-dom'
import { useReveal } from '../hooks/useReveal'

function MasteryBar({ pct }) {
  const color = pct >= 80 ? 'var(--color-gold)' : 'var(--color-ink)'
  return (
    <div className="w-full bg-[var(--color-cream)] border border-[var(--color-ink)]/10 h-1.5 overflow-hidden">
      <div className="h-full transition-all duration-1000 ease-out"
        style={{ width: `${pct}%`, backgroundColor: color }} />
    </div>
  )
}

export default function TopicMastery() {
  const { user } = useAuth(); const navigate = useNavigate(); const revealRef = useReveal()
  const [mastery, setMastery] = useState([]); const [stats, setStats] = useState(null); const [loading, setLoading] = useState(true); const [filter, setFilter] = useState('all')

  useEffect(() => {
    if (!user) return
    Promise.all([getTopicMastery(user.id), getUserStats(user.id)]).then(([m, s]) => { setMastery(m); setStats(s); setLoading(false) })
  }, [user])

  const filtered = mastery.filter(t => {
    const pct = t.attempted > 0 ? Math.round((t.correct / t.attempted) * 100) : 0
    if (filter === 'strong') return pct >= 70
    if (filter === 'weak') return pct < 50
    if (filter === 'medium') return pct >= 50 && pct < 70
    return true
  })

  const { level, progress, current, needed } = stats ? xpProgress(stats.xp || 0) : { level: 1, progress: 0, current: 0, needed: 100 }
  const accuracy = stats && stats.total_attempted > 0 ? Math.round((stats.total_correct / stats.total_attempted) * 100) : 0
  const strong = mastery.filter(t => t.attempted > 0 && (t.correct / t.attempted) >= 0.7).length
  const weak = mastery.filter(t => t.attempted > 0 && (t.correct / t.attempted) < 0.5).length

  return (
    <div className="max-w-[1440px] mx-auto px-6 md:px-12 py-12" ref={revealRef}>
      {/* Editorial Header */}
      <div className="mb-16 space-y-6">
        <p className="eyebrow">neural_mastery_archive_v4.2</p>
        <h1 className="font-serif font-black text-7xl md:text-9xl tracking-tight uppercase leading-[0.8]">
          MASTERY <br /><span className="text-[var(--color-gold)] italic">ARCHIVE.</span>
        </h1>
        <p className="font-serif italic text-lg text-[var(--color-muted)] max-w-xl">A comprehensive audit of your cognitive intersections. Each node represents a discrete mathematical schema verified through dialectic proof.</p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[1fr_350px] gap-24 items-start">
        <div className="space-y-16">
          {/* Telemetry Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {[
              { label: 'LEVEL', val: `0${level}`.slice(-2), sub: 'ACADEMIC_TIER' },
              { label: 'EXPERIENCE', val: (stats?.xp || 0).toLocaleString(), sub: 'PX_ACCUMULATED' },
              { label: 'DIALECTIC_STREAK', val: `${stats?.streak_current || 0}D`, sub: 'CONSECUTIVE_DAYS' },
              { label: 'PRECISION', val: `${accuracy}%`, sub: 'SUCCESS_RATIO' },
            ].map(s => (
              <div key={s.label} className="border-2 border-[var(--color-ink)] p-8 bg-white shadow-[8px_8px_0_var(--color-cream)]">
                <p className="font-mono text-[8px] font-black uppercase tracking-widest text-[var(--color-muted)] mb-4">{s.label}</p>
                <p className="font-serif font-black text-4xl italic text-[var(--color-ink)]">{s.val}</p>
                <p className="font-mono text-[7px] font-black uppercase tracking-widest text-[var(--color-gold)] mt-1">{s.sub}</p>
              </div>
            ))}
          </div>

          {/* Filter System */}
          <div className="space-y-8">
            <div className="flex items-center justify-between border-b-2 border-[var(--color-ink)] pb-4">
              <p className="font-mono text-[10px] font-black uppercase tracking-[0.3em]">SCHEMA_BREAKDOWN</p>
              <div className="flex gap-4">
                {['all', 'strong', 'medium', 'weak'].map(f => (
                  <button key={f} onClick={() => setFilter(f)} className={`font-mono text-[9px] font-black uppercase tracking-widest transition-all ${filter === f ? 'text-[var(--color-gold)] border-b-2 border-[var(--color-gold)]' : 'text-[var(--color-muted)] hover:text-[var(--color-ink)]'}`}>
                    {f}
                  </button>
                ))}
              </div>
            </div>

            {loading ? (
              <div className="py-24 text-center font-mono text-[10px] animate-pulse">SYNCHRONIZING_MASTERY_DATA...</div>
            ) : filtered.length === 0 ? (
              <div className="py-32 text-center border-4 border-dashed border-[var(--color-ink)]/10">
                <p className="font-serif italic text-lg opacity-40">The archive holds no records for this filter.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {filtered.map(t => {
                  const pct = t.attempted > 0 ? Math.round((t.correct / t.attempted) * 100) : 0
                  return (
                    <div key={t.id} className="border-2 border-[var(--color-ink)] p-8 bg-white hover:bg-[var(--color-cream)] transition-all group cursor-pointer" onClick={() => navigate('/cbt')}>
                      <div className="flex justify-between items-start mb-6">
                        <div>
                          <h3 className="font-serif font-black text-xl uppercase tracking-tighter leading-none mb-2">{t.topic}</h3>
                          <p className="font-mono text-[8px] font-black uppercase tracking-widest text-[var(--color-muted)]">{t.correct}/{t.attempted} SUCCESSFUL_PROOFS</p>
                        </div>
                        <span className="font-serif font-black text-3xl italic text-[var(--color-gold)]">{pct}%</span>
                      </div>
                      <MasteryBar pct={pct} />
                      <div className="flex justify-between items-center mt-6">
                        <span className="font-mono text-[7px] font-black uppercase text-[var(--color-muted)]">LAST_ACCESSED: {new Date(t.last_practiced).toLocaleDateString()}</span>
                        <span className="font-mono text-[8px] font-black uppercase text-[var(--color-ink)] group-hover:text-[var(--color-gold)] transition-colors underline underline-offset-4">REINFORCE_SCHEMA ➔</span>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right Sidebar: Prestige & Badges */}
        <div className="space-y-12">
          <div className="border-4 border-[var(--color-ink)] p-8 bg-white shadow-[16px_16px_0_var(--color-gold)]">
            <p className="font-mono text-[10px] font-black uppercase tracking-[0.3em] mb-8">BADGE_MANIFEST</p>
            <div className="space-y-6">
              {stats?.badges?.length > 0 ? (
                <div className="grid grid-cols-2 gap-4">
                  {stats.badges.map(bId => {
                    const b = BADGES.find(x => x.id === bId)
                    return b ? <div key={bId} title={b.desc} className="aspect-square border-2 border-[var(--color-ink)] flex items-center justify-center text-3xl bg-[var(--color-cream)] hover:bg-white transition-all scale-100 hover:scale-105">{b.emoji}</div> : null
                  })}
                </div>
              ) : (
                <p className="font-serif italic text-sm opacity-40">Insignia pending verification.</p>
              )}
            </div>
          </div>

          <div className="border-2 border-[var(--color-ink)] p-8 bg-[var(--color-cream)]">
            <p className="font-mono text-[10px] font-black uppercase tracking-[0.3em] mb-8">COLLECTIVE_AUDIT</p>
            <div className="space-y-6">
              <div className="flex justify-between items-baseline border-b border-[var(--color-ink)]/10 pb-4">
                <span className="font-serif italic text-sm">Strong_Nodes</span>
                <span className="font-mono font-black text-xl">{strong}</span>
              </div>
              <div className="flex justify-between items-baseline border-b border-[var(--color-ink)]/10 pb-4">
                <span className="font-serif italic text-sm">Weak_Conduits</span>
                <span className="font-mono font-black text-xl">{weak}</span>
              </div>
            </div>
            <button onClick={() => navigate('/cbt')} className="w-full bg-[var(--color-ink)] text-white py-4 font-mono text-[9px] font-black uppercase tracking-widest mt-8 hover:bg-black transition-all">INITIALIZE_MASTER_EXAM</button>
          </div>
        </div>
      </div>
    </div>
  )
}
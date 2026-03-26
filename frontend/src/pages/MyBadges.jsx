import { useNavigate } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { getUserStats, BADGES } from '../lib/stats'

export default function MyBadges() {
    const { user } = useAuth()
    const navigate = useNavigate()
    const [stats, setStats] = useState(null)

    useEffect(() => {
        if (!user) return
        getUserStats(user.id).then(setStats)
    }, [user])

    const earned = BADGES.filter(b => stats?.badges?.includes(b.id))
    const locked = BADGES.filter(b => !stats?.badges?.includes(b.id))

    return (
        <div className="max-w-5xl mx-auto px-6 py-12 space-y-16">

            {/* Header */}
            <div className="flex items-end justify-between border-b-4 border-[var(--color-ink)] pb-8">
                <div>
                    <p className="text-[11px] font-bold text-[var(--color-gold)] uppercase tracking-widest mb-2">Achievement Archive</p>
                    <h1 className="text-5xl lg:text-7xl font-black text-[var(--color-ink)] tracking-tight uppercase">
                        My <span className="text-[var(--color-gold)]">Badges</span>
                    </h1>
                </div>
                <button onClick={() => navigate('/profile')}
                    className="flex items-center gap-2 px-6 py-3 rounded-2xl border border-[var(--color-border)] text-sm font-bold hover:bg-[var(--color-cream)] transition-all">
                    ← Back to Profile
                </button>
            </div>

            {/* Progress summary */}
            <div className="bg-[var(--color-gold)]/10 border border-[var(--color-gold)]/30 rounded-3xl p-8 flex items-center gap-8">
                <div className="text-6xl font-black text-[var(--color-gold)]">{earned.length}</div>
                <div>
                    <p className="text-xl font-bold text-[var(--color-ink)]">{earned.length} of {BADGES.length} badges earned</p>
                    <div className="mt-3 h-3 w-64 bg-white rounded-full overflow-hidden border border-[var(--color-border)]">
                        <div
                            className="h-full bg-[var(--color-gold)] rounded-full transition-all duration-700"
                            style={{ width: `${BADGES.length > 0 ? (earned.length / BADGES.length) * 100 : 0}%` }}
                        />
                    </div>
                </div>
            </div>

            {/* Earned badges */}
            {earned.length > 0 && (
                <section className="space-y-6">
                    <h2 className="text-xs font-bold uppercase tracking-widest text-[var(--color-muted)]">Earned</h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {earned.map(badge => (
                            <div key={badge.id}
                                className="flex items-center gap-6 p-6 rounded-3xl border-2 border-[var(--color-gold)]/40 bg-[var(--color-gold)]/5 hover:border-[var(--color-gold)] transition-all">
                                <div className="w-16 h-16 rounded-2xl bg-[var(--color-gold)]/20 flex items-center justify-center text-4xl shrink-0">
                                    {badge.emoji}
                                </div>
                                <div>
                                    <p className="text-base font-bold text-[var(--color-ink)]">{badge.label}</p>
                                    <p className="text-sm text-[var(--color-muted)] mt-1">{badge.desc}</p>
                                    <span className="inline-block mt-2 px-3 py-1 text-[10px] font-black uppercase tracking-widest rounded-full bg-[var(--color-gold)] text-white">
                                        Unlocked
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>
                </section>
            )}

            {/* Locked badges */}
            {locked.length > 0 && (
                <section className="space-y-6">
                    <h2 className="text-xs font-bold uppercase tracking-widest text-[var(--color-muted)]">Locked — Keep Going!</h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {locked.map(badge => (
                            <div key={badge.id}
                                className="flex items-center gap-6 p-6 rounded-3xl border border-[var(--color-border)] opacity-50 grayscale">
                                <div className="w-16 h-16 rounded-2xl bg-[var(--color-cream)] flex items-center justify-center text-4xl shrink-0">
                                    {badge.emoji}
                                </div>
                                <div>
                                    <p className="text-base font-bold text-[var(--color-ink)]">{badge.label}</p>
                                    <p className="text-sm text-[var(--color-muted)] mt-1">{badge.desc}</p>
                                    <span className="inline-block mt-2 px-3 py-1 text-[10px] font-black uppercase tracking-widest rounded-full bg-[var(--color-cream)] text-[var(--color-muted)] border border-[var(--color-border)]">
                                        Locked
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>
                </section>
            )}

            {earned.length === 0 && (
                <div className="text-center py-20 space-y-4">
                    <p className="text-6xl">🏅</p>
                    <h3 className="text-2xl font-bold text-[var(--color-ink)]">No Badges Yet</h3>
                    <p className="text-[var(--color-muted)]">Complete CBT exams and build a streak to earn your first badge.</p>
                    <button onClick={() => navigate('/cbt')}
                        className="mt-4 px-8 py-4 bg-[var(--color-gold)] text-white rounded-2xl font-bold uppercase tracking-wider">
                        Start a CBT Exam
                    </button>
                </div>
            )}
        </div>
    )
}

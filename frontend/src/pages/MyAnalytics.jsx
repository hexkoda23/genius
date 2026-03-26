import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'
import { getUserStats, xpProgress, getTopicMastery, BADGES } from '../lib/stats'

const StatCard = ({ label, value, sub, color = 'teal' }) => {
    const colors = {
        teal: 'bg-[var(--color-teal)]/10 border-[var(--color-teal)]/20 text-[var(--color-teal)]',
        gold: 'bg-[var(--color-gold)]/10 border-[var(--color-gold)]/20 text-[var(--color-gold)]',
        red: 'bg-red-50 border-red-100 text-red-500',
        ink: 'bg-[var(--color-ink)]/5 border-[var(--color-border)] text-[var(--color-ink)]',
    }
    return (
        <div className={`rounded-3xl border p-8 text-center ${colors[color]}`}>
            <p className="text-4xl font-black mb-1">{value}</p>
            <p className="text-[11px] font-bold uppercase tracking-widest opacity-70">{label}</p>
            {sub && <p className="text-xs text-[var(--color-muted)] mt-2">{sub}</p>}
        </div>
    )
}

export default function MyAnalytics() {
    const { user } = useAuth()
    const navigate = useNavigate()
    const [stats, setStats] = useState(null)
    const [mastery, setMastery] = useState([])
    const [sessions, setSessions] = useState([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        if (!user) return
        Promise.all([
            getUserStats(user.id),
            getTopicMastery(user.id),
            supabase.from('cbt_sessions')
                .select('*')
                .eq('user_id', user.id)
                .eq('status', 'completed')
                .order('completed_at', { ascending: false })
                .limit(10)
        ]).then(([s, m, { data: sess }]) => {
            setStats(s)
            setMastery((m || []).sort((a, b) => b.mastery - a.mastery))
            setSessions(sess || [])
            setLoading(false)
        }).catch(() => setLoading(false))
    }, [user])

    if (loading) {
        return (
            <div className="min-h-screen bg-[var(--color-paper)] flex items-center justify-center">
                <div className="w-16 h-16 border-4 border-[var(--color-teal)] border-t-transparent rounded-full animate-spin" />
            </div>
        )
    }

    const { level, progress, current, needed } = stats
        ? xpProgress(stats.xp || 0)
        : { level: 1, progress: 0, current: 0, needed: 100 }

    const accuracy = stats?.total_attempted > 0
        ? Math.round((stats.total_correct / stats.total_attempted) * 100)
        : 0

    const earnedBadges = BADGES.filter(b => stats?.badges?.includes(b.id))

    const topTopics = mastery.slice(0, 8)

    return (
        <div className="max-w-6xl mx-auto px-6 py-12 space-y-16">

            {/* Header */}
            <div className="flex items-end justify-between border-b-4 border-[var(--color-ink)] pb-8">
                <div>
                    <p className="text-[11px] font-bold text-[var(--color-teal)] uppercase tracking-widest mb-2">Performance Intelligence</p>
                    <h1 className="text-5xl lg:text-7xl font-black text-[var(--color-ink)] tracking-tight uppercase">
                        My <span className="text-[var(--color-teal)]">Analytics</span>
                    </h1>
                </div>
                <button onClick={() => navigate('/profile')}
                    className="flex items-center gap-2 px-6 py-3 rounded-2xl border border-[var(--color-border)] text-sm font-bold hover:bg-[var(--color-cream)] transition-all">
                    ← Back to Profile
                </button>
            </div>

            {/* XP & Level */}
            <section className="space-y-6">
                <h2 className="text-xs font-bold uppercase tracking-widest text-[var(--color-muted)]">Experience & Ranking</h2>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <StatCard label="Level" value={level} color="teal" />
                    <StatCard label="Total XP" value={(stats?.xp || 0).toLocaleString()} color="gold" />
                    <StatCard label="Current Streak" value={`🔥 ${stats?.streak_current || 0}`} sub="days" color="ink" />
                    <StatCard label="Best Streak" value={`⚡ ${stats?.streak_best || 0}`} sub="days" color="ink" />
                </div>

                {/* XP Progress Bar */}
                <div className="bg-[var(--color-cream)] rounded-3xl p-8 border border-[var(--color-border)]">
                    <div className="flex justify-between text-xs font-bold text-[var(--color-muted)] uppercase tracking-widest mb-4">
                        <span>Level {level}</span>
                        <span>{current} / {needed} XP to Level {level + 1}</span>
                    </div>
                    <div className="h-4 bg-white rounded-full overflow-hidden border border-[var(--color-border)]">
                        <div
                            className="h-full bg-[var(--color-teal)] rounded-full transition-all duration-1000"
                            style={{ width: `${progress}%` }}
                        />
                    </div>
                </div>
            </section>

            {/* Performance Stats */}
            <section className="space-y-6">
                <h2 className="text-xs font-bold uppercase tracking-widest text-[var(--color-muted)]">Performance Stats</h2>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <StatCard label="Questions Attempted" value={(stats?.total_attempted || 0).toLocaleString()} color="ink" />
                    <StatCard label="Correct Answers" value={(stats?.total_correct || 0).toLocaleString()} color="teal" />
                    <StatCard label="Accuracy Rate" value={`${accuracy}%`} color={accuracy >= 70 ? 'teal' : accuracy >= 50 ? 'gold' : 'red'} />
                    <StatCard label="CBT Sessions" value={stats?.total_sessions || 0} color="ink" />
                </div>
            </section>

            {/* Topic Mastery */}
            {topTopics.length > 0 && (
                <section className="space-y-6">
                    <div className="flex items-center justify-between">
                        <h2 className="text-xs font-bold uppercase tracking-widest text-[var(--color-muted)]">Topic Mastery</h2>
                        <button onClick={() => navigate('/mastery')}
                            className="text-xs font-bold text-[var(--color-teal)] hover:underline">
                            View Full Mastery →
                        </button>
                    </div>
                    <div className="space-y-4">
                        {topTopics.map(t => (
                            <div key={t.topic} className="space-y-2">
                                <div className="flex justify-between items-center">
                                    <span className="text-sm font-semibold text-[var(--color-ink)] capitalize">{t.topic}</span>
                                    <span className={`text-xs font-bold px-3 py-1 rounded-full ${t.mastery >= 80 ? 'bg-green-100 text-green-600' :
                                            t.mastery >= 60 ? 'bg-blue-100 text-blue-600' :
                                                t.mastery >= 40 ? 'bg-amber-100 text-amber-600' :
                                                    'bg-red-100 text-red-500'
                                        }`}>
                                        {t.mastery}% · {t.correct}/{t.attempted}
                                    </span>
                                </div>
                                <div className="h-2.5 bg-[var(--color-cream)] rounded-full border border-[var(--color-border)] overflow-hidden">
                                    <div
                                        className={`h-full rounded-full transition-all duration-700 ${t.mastery >= 80 ? 'bg-green-500' :
                                                t.mastery >= 60 ? 'bg-[var(--color-teal)]' :
                                                    t.mastery >= 40 ? 'bg-amber-400' :
                                                        'bg-red-400'
                                            }`}
                                        style={{ width: `${t.mastery}%` }}
                                    />
                                </div>
                            </div>
                        ))}
                    </div>
                </section>
            )}

            {/* Recent CBT Sessions */}
            {sessions.length > 0 && (
                <section className="space-y-6">
                    <div className="flex items-center justify-between">
                        <h2 className="text-xs font-bold uppercase tracking-widest text-[var(--color-muted)]">Recent CBT Sessions</h2>
                        <button onClick={() => navigate('/cbt-history')}
                            className="text-xs font-bold text-[var(--color-teal)] hover:underline">
                            View All History →
                        </button>
                    </div>
                    <div className="space-y-3">
                        {sessions.map(s => {
                            const pct = s.percentage || 0
                            const grade = pct >= 70 ? { label: 'Pass', cls: 'text-green-600 bg-green-50' }
                                : pct >= 50 ? { label: 'Credit', cls: 'text-blue-600 bg-blue-50' }
                                    : { label: 'Fail', cls: 'text-red-500 bg-red-50' }
                            return (
                                <div key={s.id} className="flex items-center gap-6 p-5 rounded-2xl border border-[var(--color-border)] bg-[var(--color-cream)] hover:border-[var(--color-teal)] transition-all">
                                    <div className={`px-3 py-1.5 rounded-xl text-xs font-black uppercase ${grade.cls}`}>
                                        {grade.label}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="font-bold text-sm text-[var(--color-ink)]">{s.exam_type}</p>
                                        <p className="text-xs text-[var(--color-muted)]">
                                            {s.total_questions} questions · {s.topic || 'Mixed topics'} · {s.difficulty || 'mixed'}
                                        </p>
                                    </div>
                                    <div className="text-right shrink-0">
                                        <p className="text-2xl font-black text-[var(--color-ink)]">{pct}%</p>
                                        <p className="text-[10px] text-[var(--color-muted)]">
                                            {s.score}/{s.total_questions}
                                        </p>
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                </section>
            )}

            {sessions.length === 0 && mastery.length === 0 && (
                <div className="text-center py-24 space-y-4">
                    <p className="text-6xl">📊</p>
                    <h3 className="text-2xl font-bold text-[var(--color-ink)]">No Data Yet</h3>
                    <p className="text-[var(--color-muted)]">Start a CBT session or practice questions to see your analytics here.</p>
                    <button onClick={() => navigate('/cbt')}
                        className="mt-6 px-8 py-4 bg-[var(--color-teal)] text-white rounded-2xl font-bold uppercase tracking-wider">
                        Start a CBT Exam
                    </button>
                </div>
            )}

            {/* Badges Preview */}
            {earnedBadges.length > 0 && (
                <section className="space-y-6">
                    <div className="flex items-center justify-between">
                        <h2 className="text-xs font-bold uppercase tracking-widest text-[var(--color-muted)]">Badges Earned ({earnedBadges.length})</h2>
                        <button onClick={() => navigate('/badges')}
                            className="text-xs font-bold text-[var(--color-teal)] hover:underline">
                            View All Badges →
                        </button>
                    </div>
                    <div className="flex flex-wrap gap-4">
                        {earnedBadges.map(b => (
                            <div key={b.id} className="flex items-center gap-3 px-5 py-3 rounded-2xl border border-[var(--color-teal)]/30 bg-[var(--color-teal)]/5">
                                <span className="text-2xl">{b.emoji}</span>
                                <span className="text-sm font-bold text-[var(--color-ink)]">{b.label}</span>
                            </div>
                        ))}
                    </div>
                </section>
            )}
        </div>
    )
}

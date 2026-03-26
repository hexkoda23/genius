import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'
import { getUserStats } from '../lib/stats'
import { getDashboardStats } from '../lib/progress'
import { useReveal } from '../hooks/useReveal'

function getWeekBounds() {
    const now = new Date(); const mon = new Date(now)
    mon.setDate(now.getDate() - now.getDay() + (now.getDay() === 0 ? -6 : 1))
    mon.setHours(0, 0, 0, 0)
    return { from: mon.toISOString(), label: mon.toLocaleDateString('en-GB', { day: 'numeric', month: 'long' }) }
}

function AccuracyMeter({ pct }) {
    const color = pct >= 80 ? 'var(--color-gold)' : 'var(--color-ink)'
    return (
        <div className="relative w-48 h-48 flex items-center justify-center">
            <svg className="absolute inset-0 w-full h-full -rotate-90">
                <circle cx="96" cy="96" r="88" fill="none" stroke="var(--color-cream)" strokeWidth="4" />
                <circle cx="96" cy="96" r="88" fill="none" stroke="var(--color-ink)" strokeWidth="4" strokeDasharray="552" strokeDashoffset={552 - (552 * pct / 100)} className="transition-all duration-1000 ease-out" />
            </svg>
            <div className="text-center">
                <p className="font-serif font-black text-5xl italic">{pct}%</p>
                <p className="font-mono text-[8px] font-black uppercase tracking-widest text-[var(--color-gold)] mt-1">PRECISION</p>
            </div>
        </div>
    )
}

export default function WeeklyReport() {
    const { user, profile } = useAuth(); const revealRef = useReveal()
    const [stats, setStats] = useState(null); const [xpStats, setXpStats] = useState(null)
    const [weekSessions, setWeekSessions] = useState([]); const [loading, setLoading] = useState(true)
    const { from: weekStart, label: weekLabel } = getWeekBounds()

    useEffect(() => { if (user) loadAll() }, [user])
    const loadAll = async () => {
        const [dash, xp] = await Promise.all([getDashboardStats(user.id), getUserStats(user.id)])
        setStats(dash); setXpStats(xp)
        const { data } = await supabase.from('cbt_sessions').select('*').eq('user_id', user.id).gte('completed_at', weekStart).order('completed_at', { ascending: false })
        setWeekSessions(data || []); setLoading(false)
    }

    const handlePrint = () => window.print()
    if (loading) return <div className="max-w-[1440px] mx-auto px-6 py-32 text-center font-mono text-[10px] animate-pulse uppercase">GENERATING_COGNITIVE_AUDIT...</div>

    const weekCorrect = weekSessions.reduce((a, s) => a + (s.total_questions ? Math.round(s.score / 100 * s.total_questions) : 0), 0)
    const weekAttempted = weekSessions.reduce((a, s) => a + (s.total_questions || 0), 0)
    const weekAccuracy = weekAttempted > 0 ? Math.round((weekCorrect / weekAttempted) * 100) : 0
    const bestScore = weekSessions.length > 0 ? Math.max(...weekSessions.map(s => s.score)) : 0
    const grade = weekAccuracy >= 80 ? 'A' : weekAccuracy >= 65 ? 'B' : weekAccuracy >= 50 ? 'C' : weekAccuracy >= 40 ? 'D' : 'F'

    return (
        <div className="max-w-[1440px] mx-auto px-6 md:px-12 py-12 print:p-0" ref={revealRef}>
            {/* Editorial Header */}
            <div className="mb-16 flex items-end justify-between flex-wrap gap-8 print:hidden">
                <div className="space-y-6">
                    <p className="eyebrow">neural_audit_v7.0</p>
                    <h1 className="font-serif font-black text-7xl md:text-9xl tracking-tight uppercase leading-[0.8]">
                        COGNITIVE <br /><span className="text-[var(--color-gold)] italic">SYNOPSIS.</span>
                    </h1>
                    <p className="font-serif italic text-lg text-[var(--color-muted)] max-w-xl">A longitudinal analysis of academic performance for the tenure commencing {weekLabel}.</p>
                </div>
                <div className="flex gap-4 mb-4">
                    <button onClick={handlePrint} className="bg-[var(--color-ink)] text-white px-8 py-4 font-mono text-[10px] font-black uppercase tracking-widest hover:bg-black transition-all">GENERATE_ARCHIVE_PDF</button>
                    <Link to="/dashboard" className="border-2 border-[var(--color-ink)] px-8 py-4 font-mono text-[10px] font-black uppercase tracking-widest hover:bg-[var(--color-cream)] transition-all">RETURN_TO_COMMAND</Link>
                </div>
            </div>

            <div className="border-4 border-[var(--color-ink)] bg-white shadow-[32px_32px_0_var(--color-cream)] overflow-hidden">
                {/* Identification Header */}
                <div className="bg-[var(--color-ink)] p-12 text-white flex justify-between items-center flex-wrap gap-8">
                    <div className="space-y-4">
                        <p className="font-mono text-[10px] font-black uppercase tracking-[0.4em] opacity-40">STUDENT_IDENTIFICATION</p>
                        <h2 className="font-serif font-black text-5xl italic uppercase tracking-tighter">{profile?.full_name || 'ANONYMOUS_STUDENT'}</h2>
                        <p className="font-mono text-xs opacity-60 tracking-[0.2em]">{user?.email?.toUpperCase()}</p>
                    </div>
                    <div className="text-right flex flex-col items-center">
                        <div className="font-serif font-black text-[120px] leading-none text-[var(--color-gold)] italic -rotate-12 translate-x-[-10px]">{grade}</div>
                        <p className="font-mono text-[10px] font-black uppercase tracking-[0.4em] opacity-40 -translate-y-4">EVALUATION_GRADE</p>
                    </div>
                </div>

                <div className="p-12 space-y-16">
                    {/* Performance Metrics */}
                    <div className="grid grid-cols-1 lg:grid-cols-[auto_1fr] gap-24 items-center">
                        <AccuracyMeter pct={weekAttempted > 0 ? weekAccuracy : stats?.accuracy || 0} />
                        <div className="grid grid-cols-2 gap-12">
                            {[
                                { label: 'DIALECTIC_SESSIONS', val: weekSessions.length, sub: 'COMPLETED_THIS_TENURE' },
                                { label: 'SYLLABUS_PENETRATION', val: weekAttempted || 0, sub: 'TOTAL_QUERIES_RESOLVED' },
                                { label: 'PEAK_ACCURACY', val: `${bestScore}%`, sub: 'HIGHEST_EXAM_QUOTIENT' },
                                { label: 'EXPERIENCE_YIELD', val: (xpStats?.xp || 0).toLocaleString(), sub: 'TOTAL_PX_ARCHIVED' },
                            ].map(m => (
                                <div key={m.label} className="border-b-2 border-[var(--color-ink)]/5 pb-4">
                                    <p className="font-mono text-[8px] font-black uppercase tracking-widest text-[var(--color-muted)] mb-2">{m.label}</p>
                                    <p className="font-serif font-black text-3xl italic">{m.val}</p>
                                    <p className="font-mono text-[7px] font-black uppercase tracking-widest text-[var(--color-gold)] mt-1">{m.sub}</p>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Sector Analysis */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-24">
                        <div className="space-y-8">
                            <p className="font-mono text-[10px] font-black uppercase tracking-[0.3em] text-[var(--color-gold)] border-b border-[var(--color-ink)]/10 pb-4">SCHEMA_STRENGTHS</p>
                            <div className="space-y-4">
                                {stats?.strongTopics?.slice(0, 5).map(t => (
                                    <div key={t.topic} className="flex items-center gap-4 group">
                                        <span className="w-2 h-2 bg-emerald-500 rounded-full" />
                                        <p className="font-serif italic font-black text-xl flex-1 group-hover:text-[var(--color-teal)] transition-colors">{t.topic}</p>
                                        <span className="font-mono text-[9px] font-black uppercase opacity-40">STABLE</span>
                                    </div>
                                )) || <p className="font-serif italic text-sm opacity-40">No strong schemas detected.</p>}
                            </div>
                        </div>

                        <div className="space-y-8">
                            <p className="font-mono text-[10px] font-black uppercase tracking-[0.3em] text-[var(--color-ink)] border-b border-[var(--color-ink)]/10 pb-4">CRITICAL_DEFICITS</p>
                            <div className="space-y-6">
                                {stats?.weakTopics?.slice(0, 4).map(t => {
                                    const pct = t.questions_attempted > 0 ? Math.round((t.questions_correct / t.questions_attempted) * 100) : 0
                                    return (
                                        <div key={t.topic} className="space-y-2">
                                            <div className="flex justify-between items-baseline">
                                                <p className="font-serif italic font-black text-lg">{t.topic}</p>
                                                <span className="font-mono text-[10px] font-black text-rose-500">{pct}% ACC</span>
                                            </div>
                                            <div className="h-1 bg-[var(--color-cream)] w-full">
                                                <div className="h-full bg-rose-500" style={{ width: `${pct}%` }} />
                                            </div>
                                        </div>
                                    )
                                }) || <p className="font-serif italic text-sm opacity-40">No critical deficits recorded.</p>}
                            </div>
                        </div>
                    </div>

                    {/* Closing Seal */}
                    <div className="pt-16 border-t-2 border-[var(--color-ink)]/5 flex justify-between items-end flex-wrap gap-8">
                        <div>
                            <p className="font-mono text-[9px] font-black uppercase tracking-widest text-[var(--color-muted)] mb-2">AUDIT_VERIFICATION_STAMP</p>
                            <p className="font-serif italic font-black text-sm">Generated by Euler_Core // {new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).toUpperCase()}</p>
                        </div>
                        <div className="text-right">
                            <p className="font-serif italic font-black text-lg text-[var(--color-ink)]">MATHGENIUS.APP</p>
                            <p className="font-mono text-[8px] font-black uppercase tracking-widest opacity-40">AI-DRIVEN_PEDAGOGY_NEXUS</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}

import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { getUserStats, xpProgress } from '../lib/stats'
import { getDashboardStats } from '../lib/progress'
import { useReveal } from '../hooks/useReveal'

const MILESTONE_CONFIG = [
    { key: 'streak_7', icon: '🔥', label: '7-Day Streak', check: s => (s?.streak_current || 0) >= 7 },
    { key: 'streak_30', icon: '👑', label: '30-Day Streak', check: s => (s?.streak_current || 0) >= 30 },
    { key: 'questions_50', icon: '📝', label: '50 Questions Done', check: (_, d) => (d?.totalAttempted || 0) >= 50 },
    { key: 'questions_100', icon: '🏆', label: '100 Questions Done', check: (_, d) => (d?.totalAttempted || 0) >= 100 },
    { key: 'accuracy_80', icon: '💯', label: '80% Accuracy', check: (_, d) => (d?.accuracy || 0) >= 80 },
    { key: 'topics_10', icon: '📚', label: '10 Topics Studied', check: (_, d) => (d?.topicsStudied || 0) >= 10 },
]

export default function Certificate() {
    const { user, profile } = useAuth(); const revealRef = useReveal()
    const [xpStats, setXpStats] = useState(null); const [dashStats, setDashStats] = useState(null); const [loading, setLoading] = useState(true)

    useEffect(() => {
        if (!user) return
        Promise.all([getUserStats(user.id), getDashboardStats(user.id)]).then(([xp, dash]) => {
            setXpStats(xp); setDashStats(dash); setLoading(false)
        })
    }, [user])

    const earned = MILESTONE_CONFIG.filter(m => { try { return m.check(xpStats, dashStats) } catch { return false } })
    const handlePrint = () => window.print()
    if (loading) return <div className="max-w-[1440px] mx-auto px-6 py-32 text-center font-mono text-[10px] animate-pulse uppercase">SYNCHRONIZING_PRESTIGE_DATA...</div>

    const { level } = xpProgress(xpStats?.xp || 0)
    const today = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }).toUpperCase()

    return (
        <div className="max-w-[1440px] mx-auto px-6 md:px-12 py-12" ref={revealRef}>
            {/* Editorial Header */}
            <div className="mb-16 flex items-end justify-between flex-wrap gap-8 print:hidden">
                <div className="space-y-6">
                    <p className="eyebrow">achievement_vault_v2.0</p>
                    <h1 className="font-serif font-black text-7xl md:text-9xl tracking-tight uppercase leading-[0.8]">
                        PRESTIGE <br /><span className="text-[var(--color-gold)] italic">CREDENTIAL.</span>
                    </h1>
                    <p className="font-serif italic text-lg text-[var(--color-muted)] max-w-xl">A formal verification of your mathematical aptitude and consistent dialectic engagement within the MathGenius framework.</p>
                </div>
                <div className="flex gap-4 mb-4">
                    <button onClick={handlePrint} className="bg-[var(--color-ink)] text-white px-8 py-4 font-mono text-[10px] font-black uppercase tracking-widest hover:bg-black transition-all">GENERATE_PRINT_UPLINK</button>
                    <Link to="/dashboard" className="border-2 border-[var(--color-ink)] px-8 py-4 font-mono text-[10px] font-black uppercase tracking-widest hover:bg-[var(--color-cream)] transition-all">RETURN_TO_COMMAND</Link>
                </div>
            </div>

            {/* Credential Card */}
            <div className="border-4 border-[var(--color-ink)] bg-white shadow-[32px_32px_0_var(--color-cream)] overflow-hidden relative print:shadow-none print:border-2">
                {/* Formal Border Accent */}
                <div className="absolute inset-4 border border-[var(--color-ink)]/10 pointer-events-none" />

                <div className="p-12 md:p-24 text-center space-y-16 relative z-10">
                    <div className="space-y-4">
                        <p className="font-mono text-[10px] font-black uppercase tracking-[0.6em] text-[var(--color-gold)]">FORMAL_ATTESTATION</p>
                        <div className="w-12 h-px bg-[var(--color-ink)]/20 mx-auto" />
                    </div>

                    <div className="space-y-4">
                        <p className="font-serif italic text-lg">This document certifies that the individual known as</p>
                        <h2 className="font-serif font-black text-6xl md:text-8xl italic uppercase tracking-tighter leading-none border-b-2 border-dashed border-[var(--color-ink)]/20 pb-8 mx-auto max-w-2xl">{profile?.full_name || 'ANONYMOUS_STUDENT'}</h2>
                    </div>

                    <div className="max-w-3xl mx-auto">
                        <p className="font-serif text-xl leading-relaxed text-[var(--color-ink)]/80">
                            Has attained <strong>ACADEMIC_LEVEL_{level}</strong> through the accumulation of <strong className="text-[var(--color-gold)]">{(xpStats?.xp || 0).toLocaleString()} XP</strong>,
                            maintaining a consistent <strong>{xpStats?.streak_current || 0}_DAY_STREAK</strong>, and successfully resolving
                            <strong> {dashStats?.totalAttempted || 0}_SYLLABUS_QUERIES</strong> with a sustained precision of
                            <strong className="text-[var(--color-gold)]"> {dashStats?.accuracy || 0}%</strong>.
                        </p>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-3 gap-8 max-w-2xl mx-auto pt-8">
                        {earned.map(m => (
                            <div key={m.key} className="p-6 border-2 border-[var(--color-ink)] bg-[var(--color-cream)] relative overflow-hidden group">
                                <span className="text-4xl relative z-10 transition-transform group-hover:scale-110 block mb-2">{m.icon}</span>
                                <p className="font-mono text-[8px] font-black uppercase tracking-widest relative z-10">{m.label}</p>
                                <div className="absolute -right-2 -bottom-2 font-serif font-black text-6xl text-[var(--color-ink)]/5 select-none">{m.icon}</div>
                            </div>
                        ))}
                    </div>

                    <div className="pt-24 flex justify-between items-end border-t border-[var(--color-ink)]/10">
                        <div className="text-left space-y-2">
                            <p className="font-mono text-[9px] font-black uppercase tracking-widest text-[var(--color-muted)]">COMMAND_AUTHORITY</p>
                            <p className="font-serif font-black text-2xl italic tracking-tighter">EulerAI / MATHGENIUS</p>
                            <p className="font-mono text-[7px] font-black uppercase tracking-widest opacity-40">PEDAGOGICAL_REINFORCEMENT_NEXUS</p>
                        </div>

                        <div className="w-32 h-32 border-4 border-double border-[var(--color-gold)] rounded-full flex items-center justify-center -rotate-12 bg-[var(--color-gold)]/5 print:bg-none">
                            <div className="text-center">
                                <p className="font-mono text-[8px] font-black uppercase tracking-widest text-[var(--color-gold)] leading-none">VERIFIED</p>
                                <p className="font-serif font-black text-xl italic text-[var(--color-ink)] leading-none mt-1">LEO</p>
                                <p className="font-mono text-[7px] font-black uppercase text-[var(--color-gold)] mt-1 tracking-tighter">EST._2026</p>
                            </div>
                        </div>

                        <div className="text-right space-y-2">
                            <p className="font-mono text-[9px] font-black uppercase tracking-widest text-[var(--color-muted)]">DATE_OF_ISSUANCE</p>
                            <p className="font-serif font-black text-xl italic tracking-tighter">{today}</p>
                            <p className="font-mono text-[7px] font-black uppercase tracking-widest opacity-40">CERTIFICATION_HASH: {user?.id?.slice(0, 12)}</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}

import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { xpProgress } from '../lib/stats'
import { useReveal } from '../hooks/useReveal'

const API = import.meta.env.VITE_API_URL

async function fetchPublicProfile(userId) {
    const res = await fetch(`${API}/tracking/public-profile/${userId}`)
    if (!res.ok) throw new Error('Not found')
    return res.json()
}

const LEVEL_TITLES = ['', 'Novice', 'Learner', 'Student', 'Scholar', 'Expert', 'Master', 'Champion', 'Legend', 'Genius', 'Grand Master']

export default function ShareProfile() {
    const { userId } = useParams(); const revealRef = useReveal()
    const [data, setData] = useState(null); const [loading, setLoading] = useState(true); const [error, setError] = useState(null)

    useEffect(() => {
        fetchPublicProfile(userId).then(setData).catch(() => setError('Profile not found or sharing is unavailable.')).finally(() => setLoading(false))
    }, [userId])

    if (loading) return <div className="max-w-[1440px] mx-auto px-6 py-32 text-center font-mono text-[10px] animate-pulse uppercase">RETRIEVING_PUBLIC_RECORD...</div>

    if (error) return (
        <div className="max-w-[1440px] mx-auto px-6 py-32 text-center space-y-8">
            <h2 className="font-serif font-black text-6xl uppercase italic text-[var(--color-ink)]">RECORD_NOT_FOUND.</h2>
            <p className="font-mono text-[10px] uppercase tracking-widest text-[var(--color-muted)]">{error}</p>
            <Link to="/" className="inline-block bg-[var(--color-ink)] text-white px-8 py-4 font-mono text-[10px] font-black uppercase tracking-widest hover:bg-black transition-all">RETURN_TO_HOME</Link>
        </div>
    )

    const { level } = xpProgress(data.xp || 0)
    const title = LEVEL_TITLES[Math.min(level, LEVEL_TITLES.length - 1)] || 'Student'

    return (
        <div className="max-w-[1440px] mx-auto px-6 md:px-12 py-12" ref={revealRef}>
            {/* Editorial Header */}
            <div className="mb-16 flex items-end justify-between flex-wrap gap-8">
                <div className="space-y-6">
                    <p className="eyebrow">public_identity_ledger_v1.0</p>
                    <h1 className="font-serif font-black text-7xl md:text-9xl tracking-tight uppercase leading-[0.8]">
                        PUBLIC <br /><span className="text-[var(--color-gold)] italic">RECORD.</span>
                    </h1>
                    <p className="font-serif italic text-lg text-[var(--color-muted)] max-w-xl">A decentralized acknowledgment of academic tenure and verified cognitive progression within the MathGenius ecosystem.</p>
                </div>
                <div className="text-right print:hidden">
                    <p className="font-mono text-[10px] font-black uppercase tracking-[0.4em] text-[var(--color-gold)]">POWERED_BY</p>
                    <p className="font-serif font-black text-3xl italic tracking-tighter text-[var(--color-teal)]">MATHGENIUS</p>
                </div>
            </div>

            <div className="max-w-4xl mx-auto border-4 border-[var(--color-ink)] bg-white shadow-[32px_32px_0_var(--color-cream)] overflow-hidden">
                {/* Visual Identity Strip */}
                <div className="bg-[var(--color-ink)] p-12 text-white grid grid-cols-1 md:grid-cols-[auto_1fr] gap-12 items-center">
                    <div className="w-32 h-32 border-4 border-white flex items-center justify-center font-serif font-black text-5xl bg-[var(--color-gold)] text-black -rotate-6">
                        {(data.name || 'S')[0].toUpperCase()}
                    </div>
                    <div className="space-y-4">
                        <p className="font-mono text-[10px] font-black uppercase tracking-[0.4em] opacity-40">IDENTIFIED_PERSONA</p>
                        <h2 className="font-serif font-black text-6xl italic uppercase tracking-tighter leading-none">{data.name || 'ANONYMOUS_STUDENT'}</h2>
                        {data.school && <p className="font-mono text-xs opacity-60 tracking-[0.2em]">{data.school.toUpperCase()}</p>}
                        <div className="pt-4 flex gap-4">
                            <span className="px-4 py-1 border border-white/20 font-mono text-[9px] font-black uppercase tracking-widest">{title}</span>
                            <span className="px-4 py-1 border border-[var(--color-gold)] text-[var(--color-gold)] font-mono text-[9px] font-black uppercase tracking-widest">LVL.{level}</span>
                        </div>
                    </div>
                </div>

                <div className="p-12 space-y-16">
                    {/* Telemetry Grid */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
                        {[
                            { label: 'EXPERIENCE', val: (data.xp || 0).toLocaleString(), sub: 'PX_ACCUMULATED' },
                            { label: 'STREAK', val: `${data.streak || 0}D`, sub: 'CONSECUTIVE_DAYS' },
                            { label: 'QUERIES', val: data.total_questions || 0, sub: 'RESOLVED_SYLLABUS' },
                            { label: 'PRECISION', val: `${data.accuracy || 0}%`, sub: 'COGNITIVE_ACCURACY' },
                        ].map(s => (
                            <div key={s.label} className="border-b-2 border-[var(--color-ink)]/5 pb-6 text-center md:text-left">
                                <p className="font-mono text-[8px] font-black uppercase tracking-widest text-[var(--color-muted)] mb-2">{s.label}</p>
                                <p className="font-serif font-black text-3xl italic">{s.val}</p>
                                <p className="font-mono text-[7px] font-black uppercase tracking-widest text-[var(--color-gold)] mt-1">{s.sub}</p>
                            </div>
                        ))}
                    </div>

                    {/* Verified Schemas */}
                    {data.top_topics?.length > 0 && (
                        <div className="space-y-8">
                            <p className="font-mono text-[10px] font-black uppercase tracking-[0.3em] text-[var(--color-gold)] border-b border-[var(--color-ink)]/10 pb-4">VERIFIED_COGNITIVE_SCHEMAS</p>
                            <div className="flex flex-wrap gap-4">
                                {data.top_topics.map(t => (
                                    <span key={t.topic || t} className="px-6 py-2 border-2 border-[var(--color-ink)] font-serif italic font-black text-sm uppercase bg-[var(--color-cream)] group hover:bg-[var(--color-ink)] hover:text-white transition-all">
                                        {t.topic || t}
                                    </span>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Interaction Bridge */}
                    <div className="bg-[var(--color-cream)] p-12 text-center space-y-6">
                        <p className="font-serif italic text-lg text-[var(--color-muted)]">Interested in formal academic acceleration?</p>
                        <Link to="/signup" className="inline-block bg-[var(--color-ink)] text-white px-12 py-5 font-mono text-[10px] font-black uppercase tracking-[0.4em] hover:bg-black transition-all">INITIALIZE_NEURAL_UPLINK ➔</Link>
                    </div>

                    <div className="pt-8 border-t border-[var(--color-ink)]/5 text-center">
                        <p className="font-mono text-[8px] font-black opacity-30 uppercase tracking-widest">RECORD_INTEGRITY_VERIFIED_BY_MATHGENIUS_CORE_ALGORITHM</p>
                    </div>
                </div>
            </div>
        </div>
    )
}

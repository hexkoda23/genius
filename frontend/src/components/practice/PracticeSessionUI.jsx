const MASTERY_CONFIG = {
    beginner: { label: 'BEGINNER', color: '#94a3b8', pct: 15, icon: '○' },
    developing: { label: 'DEVELOPING', color: 'var(--color-gold)', pct: 45, icon: '◔' },
    proficient: { label: 'PROFICIENT', color: 'var(--color-teal)', pct: 75, icon: '◑' },
    master: { label: 'MASTER', color: 'var(--color-ink)', pct: 100, icon: '●' },
}

export function MasteryBar({ topic, mastery }) {
    if (!mastery) return null
    const cfg = MASTERY_CONFIG[mastery.mastery_level] || MASTERY_CONFIG.beginner
    const pct = Math.min(100, Math.round(mastery.avg_score || 0))
    return (
        <div className="border-b border-[var(--color-ink)]/5 pb-4">
            <div className="flex items-center justify-between mb-2">
                <span className="font-serif italic text-sm text-[var(--color-ink)]">{topic}</span>
                <span className="font-mono text-[9px] uppercase tracking-widest font-black" style={{ color: cfg.color }}>{cfg.label}</span>
            </div>
            <div className="h-1 bg-[var(--color-cream)] overflow-hidden">
                <div className="h-full transition-all duration-1000" style={{ width: `${pct}%`, backgroundColor: cfg.color }} />
            </div>
        </div>
    )
}

export function ResultBadge({ result }) {
    if (result === 'CORRECT') return <span className="font-mono font-black text-green-600 text-lg">✓ CORRECT_RESOLUTION</span>
    if (result === 'PARTIAL') return <span className="font-mono font-black text-yellow-600 text-lg">◑ PARTIAL_RESOLUTION</span>
    return <span className="font-mono font-black text-red-500 text-lg">✗ RESOLUTION_FAILED</span>
}

export function StepBreakdown({ steps }) {
    if (!steps?.length) return null
    const cfg = {
        CORRECT: { bg: 'bg-green-50', text: 'text-green-800', border: 'border-green-200', label: 'RESOLVED' },
        INCORRECT: { bg: 'bg-red-50', text: 'text-red-800', border: 'border-red-200', label: 'ANOMALY' },
        MISSING: { bg: 'bg-amber-50', text: 'text-amber-800', border: 'border-amber-200', label: 'OMISSION' },
    }
    return (
        <div className="border-2 border-[var(--color-ink)] bg-white overflow-hidden shadow-[12px_12px_0_var(--color-cream)]">
            <div className="bg-[var(--color-ink)] p-4 flex items-center justify-between">
                <p className="font-mono text-[9px] uppercase tracking-widest text-white/40 font-bold">LOGIC_FLOW_ANALYSIS</p>
                <div className="flex gap-2">
                    {['CORRECT', 'INCORRECT', 'MISSING'].map(s => {
                        const count = steps.filter(x => x.status === s).length
                        if (!count) return null
                        return <span key={s} className={`font-mono text-[8px] font-black uppercase px-2 py-0.5 border ${s === 'CORRECT' ? 'border-green-500 text-green-500' : s === 'INCORRECT' ? 'border-red-500 text-red-500' : 'border-amber-500 text-amber-500'}`}>{count} {s}</span>
                    })}
                </div>
            </div>
            <div className="divide-y divide-[var(--color-ink)]/10">
                {steps.map((s, i) => {
                    const c = cfg[s.status] || cfg.CORRECT
                    return (
                        <div key={i} className={`p-6 flex gap-6 ${c.bg}`}>
                            <div className="shrink-0 flex flex-col items-center gap-2">
                                <span className="w-8 h-8 rounded-full border-2 border-[var(--color-ink)] flex items-center justify-center font-serif italic font-black text-sm">{s.step}</span>
                                <span className={`font-mono text-[8px] font-black rotate-90 origin-center whitespace-nowrap mt-4 ${c.text}`}>{c.label}</span>
                            </div>
                            <div className="flex-1 space-y-4">
                                <div className="font-mono text-sm p-4 bg-white border border-[var(--color-ink)]/10 text-[var(--color-ink)] break-words leading-relaxed">{s.text || '---'}</div>
                                {s.note && (
                                    <div className={`text-xs italic leading-relaxed font-light pl-4 border-l-2 ${s.status === 'CORRECT' ? 'border-green-500 text-green-700' : s.status === 'INCORRECT' ? 'border-red-500 text-red-700' : 'border-amber-500 text-amber-700'}`}>
                                        {s.note}
                                    </div>
                                )}
                            </div>
                        </div>
                    )
                })}
            </div>
        </div>
    )
}

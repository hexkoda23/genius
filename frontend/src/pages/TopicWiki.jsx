import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { ExplanationBody } from '../utils/RenderMath'
import { useReveal } from '../hooks/useReveal'

function cacheGet(topic) { try { return JSON.parse(localStorage.getItem(`wiki_${topic}`)) } catch { return null } }
function cacheSet(topic, data) { try { localStorage.setItem(`wiki_${topic}`, JSON.stringify({ ...data, _ts: Date.now() })) } catch { } }

const RELATED_TOPICS = {
    'Quadratic Equations': ['Linear Equations', 'Polynomials', 'Functions'],
    'Differentiation': ['Integration', 'Limits', 'Logarithms'],
    'Integration': ['Differentiation', 'Area under Curves', 'Sequences and Series'],
    'Probability': ['Statistics', 'Permutation and Combination'],
    'Trigonometry': ['Bearings and Distances', 'Circle Theorems'],
}

export default function TopicWiki() {
    const { topic: rawTopic } = useParams(); const revealRef = useReveal()
    const topic = decodeURIComponent(rawTopic || ''); const [content, setContent] = useState('')
    const [loading, setLoading] = useState(true); const [error, setError] = useState(null); const [copied, setCopied] = useState(false)

    useEffect(() => {
        if (!topic) return; const cached = cacheGet(topic)
        if (cached && Date.now() - cached._ts < 86400000) { setContent(cached.content); setLoading(false); return }
        fetchWiki()
    }, [topic])

    const fetchWiki = async () => {
        setLoading(true); setError(null)
        try {
            const base = import.meta.env.VITE_API_URL
            const res = await fetch(`${base}/teach/wiki/${encodeURIComponent(topic)}`)
            if (!res.ok) throw new Error('Failed'); const data = await res.json()
            setContent(data.content); cacheSet(topic, data)
        } catch { setError('WIKI_ACCESS_FAILURE_V.404') }; setLoading(false)
    }

    const handleCopy = () => { navigator.clipboard.writeText(content); setCopied(true); setTimeout(() => setCopied(false), 2000) }
    const related = RELATED_TOPICS[topic] || []

    return (
        <div className="max-w-[1440px] mx-auto px-6 md:px-12 py-12 bg-[var(--color-paper)] min-h-screen relative" ref={revealRef}>
            <div className="grain pointer-events-none" />

            <div className="mb-24 flex flex-col md:flex-row items-end justify-between gap-12 relative z-10">
                <div className="max-w-4xl">
                    <p className="eyebrow">LEXICON_LOGIC_v4.2</p>
                    <h1 className="font-serif font-black text-6xl md:text-[8rem] tracking-tighter uppercase leading-[0.8] italic">
                        {topic.split(' ').slice(0, -1).join(' ')} <br /><span className="text-[var(--color-gold)] not-italic">{topic.split(' ').slice(-1)}</span>
                    </h1>
                    <p className="font-serif italic text-2xl text-[var(--color-muted)] mt-12 border-l-4 border-[var(--color-gold)] pl-8 max-w-xl uppercase tracking-tighter">AI-synthesized ontological deconstruction of {topic} for standard-tier mastery.</p>
                </div>
                <div className="flex gap-4">
                    <button onClick={handleCopy} className="border-4 border-[var(--color-ink)] px-8 py-4 font-mono text-[9px] font-black uppercase hover:bg-[var(--color-cream)] transition-all shadow-[8px_8px_0_var(--color-cream)]">{copied ? 'SYSC_COPIED' : 'COPY_LEXICON'}</button>
                    <button onClick={fetchWiki} disabled={loading} className="bg-[var(--color-ink)] text-white px-8 py-4 font-mono text-[9px] font-black uppercase hover:bg-black transition-all shadow-[8px_8px_0_var(--color-gold)] disabled:opacity-20">REFRESH_SYNTHESIS</button>
                </div>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-[1fr_350px] gap-24 relative z-10">
                <div className="space-y-12">
                    {related.length > 0 && (
                        <div className="flex flex-wrap items-center gap-4 border-b-2 border-[var(--color-ink)]/5 pb-8">
                            <span className="font-mono text-[9px] font-black uppercase text-[var(--color-muted)] tracking-widest">MORPHOLOGICAL_NODES:</span>
                            {related.map(t => (
                                <Link key={t} to={`/wiki/${encodeURIComponent(t)}`} className="px-4 py-2 font-mono text-[9px] font-black uppercase border-2 border-[var(--color-ink)] hover:bg-[var(--color-gold)] hover:text-white transition-all">{t}</Link>
                            ))}
                        </div>
                    )}

                    {loading ? (
                        <div className="h-96 border-4 border-dashed border-[var(--color-ink)]/10 animate-pulse flex items-center justify-center">
                            <p className="font-mono text-[10px] font-black text-[var(--color-teal)] uppercase tracking-widest">SYNTHESIZING_LEXICAL_DATA...</p>
                        </div>
                    ) : error ? (
                        <div className="border-4 border-red-600 bg-red-50 p-12 text-center">
                            <p className="font-serif font-black text-2xl italic uppercase tracking-tighter text-red-700">{error}</p>
                        </div>
                    ) : (
                        <div className="border-4 border-[var(--color-ink)] bg-white shadow-[48px_48px_0_var(--color-cream)] overflow-hidden">
                            <div className="bg-[var(--color-ink)] px-12 py-4 flex items-center justify-between">
                                <p className="font-serif font-bold text-white uppercase italic text-lg tracking-widest">STUDY_LECHER // {topic}</p>
                                <div className="flex items-center gap-2">
                                    <div className="w-2 h-2 rounded-full bg-[var(--color-teal)] animate-pulse" />
                                    <p className="font-mono text-[9px] font-black uppercase text-white/40 tracking-[0.2em]">SYNTHESIS_ACTIVE</p>
                                </div>
                            </div>
                            <div className="p-12 md:p-24 prose max-w-none text-[var(--color-ink)] font-serif italic text-2xl md:text-3xl leading-relaxed uppercase tracking-tight">
                                <ExplanationBody text={content} />
                            </div>
                        </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-12">
                        <Link to={`/practice?topic=${encodeURIComponent(topic)}&auto=true`} className="bg-[var(--color-ink)] text-white py-12 text-center font-serif font-black text-4xl uppercase tracking-tighter italic hover:bg-black transition-all shadow-[12px_12px_0_var(--color-gold)]">INITIALIZE_DRILL ➔</Link>
                        <Link to="/teach" className="border-4 border-[var(--color-ink)] py-12 text-center font-serif font-black text-4xl uppercase tracking-tighter italic hover:bg-[var(--color-cream)] transition-all">CONSULT_EULER ➔</Link>
                    </div>
                </div>

                <div className="relative z-10">
                    <div className="sticky top-48">
                        <div className="border-4 border-[var(--color-ink)] bg-white p-8 shadow-[12px_12px_0_var(--color-cream)]">
                            <p className="eyebrow mb-8">NODE_STATISTICS</p>
                            <div className="space-y-8">
                                <div>
                                    <p className="font-mono text-[9px] font-black uppercase text-[var(--color-muted)] mb-2">COMPLEXITY_INDEX</p>
                                    <p className="font-serif font-black text-4xl italic leading-none">O(log N)</p>
                                </div>
                                <div>
                                    <p className="font-mono text-[9px] font-black uppercase text-[var(--color-muted)] mb-2">RELEVANCE_SCORE</p>
                                    <p className="font-serif font-black text-4xl italic leading-none">0.985</p>
                                </div>
                                <div className="pt-8 border-t-2 border-[var(--color-ink)]/5">
                                    <p className="font-serif italic text-lg text-[var(--color-muted)] uppercase tracking-tighter leading-tight">This lexicon entry is part of the sovereign mathematical archive, curated by the Euler-9 cognitive engine.</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}

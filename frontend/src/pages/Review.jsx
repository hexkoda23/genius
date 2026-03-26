import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'
import { ExplanationBody } from '../utils/RenderMath'
import { useReveal } from '../hooks/useReveal'

const OPTION_LABELS = ['A', 'B', 'C', 'D']
const QUALITY_LABELS = [
    { q: 0, label: 'TOTAL_LOSS', color: 'bg-red-600', emoji: '💀' },
    { q: 1, label: 'NEAR_LOSS', color: 'bg-red-400', emoji: '😣' },
    { q: 2, label: 'STRIATED', color: 'bg-orange-400', emoji: '😓' },
    { q: 3, label: 'MARGINAL', color: 'bg-yellow-400', emoji: '😐' },
    { q: 4, label: 'STANDARD', color: 'bg-green-400', emoji: '😊' },
    { q: 5, label: 'PERFECT', color: 'bg-green-600', emoji: '🎯' },
]

async function callAPI(path, opts = {}) {
    const base = import.meta.env.VITE_API_URL
    const res = await fetch(`${base}${path}`, { headers: { 'Content-Type': 'application/json' }, ...opts })
    return res.json()
}

function AddQueuePanel({ userId, onAdded }) {
    const TOPICS = ['Quadratic Equations', 'Logarithms', 'Differentiation', 'Integration', 'Probability', 'Trigonometry', 'Matrices', 'Vectors', 'Circle Theorems']
    const [selected, setSelected] = useState([]); const [loading, setLoading] = useState(false); const [msg, setMsg] = useState(null)
    const toggle = t => setSelected(s => s.includes(t) ? s.filter(x => x !== t) : [...s, t])
    const addToQueue = async () => {
        if (!selected.length || loading) return; setLoading(true)
        try {
            const { data: questions } = await supabase.from('exam_questions').select('id, option_a, correct_answer').in('topic', selected).not('option_a', 'is', null).limit(selected.length * 5)
            if (!questions?.length) { setMsg('NO_DATA_FOUND_FOR_NODES.'); setLoading(false); return }
            const rows = questions.map(q => ({ user_id: userId, question_id: q.id, next_review: new Date().toISOString(), ease_factor: 2.5, interval_days: 1, repetitions: 0 }))
            await supabase.from('spaced_repetition').upsert(rows, { onConflict: 'user_id,question_id', ignoreDuplicates: true })
            setMsg(`✅ ${questions.length}_NODES_INJECTED_TO_QUEUE.`)
            onAdded()
        } catch (e) { setMsg('❌ INJECTION_FAILURE.') }
        setLoading(false)
    }

    return (
        <div className="border-4 border-[var(--color-ink)] bg-white p-12 shadow-[32px_32px_0_var(--color-cream)]">
            <p className="eyebrow mb-12">QUEUE_INJECTION_PROTOCOL</p>
            <div className="flex flex-wrap gap-4 mb-12">
                {TOPICS.map(t => (
                    <button key={t} onClick={() => toggle(t)} className={`px-6 py-3 font-mono text-[9px] font-black uppercase border-2 transition-all ${selected.includes(t) ? 'bg-[var(--color-ink)] text-white border-[var(--color-ink)]' : 'border-[var(--color-ink)] hover:bg-[var(--color-cream)]'}`}>{t}</button>
                ))}
            </div>
            {msg && <p className="font-mono text-[10px] font-black uppercase text-[var(--color-teal)] mb-8 tracking-widest">{msg}</p>}
            <button onClick={addToQueue} disabled={!selected.length || loading} className="w-full bg-[var(--color-ink)] text-white py-10 font-serif font-black text-3xl uppercase tracking-tighter italic hover:bg-black transition-all shadow-[12px_12px_0_var(--color-gold)] disabled:opacity-20">{loading ? 'INJECTING_NODES...' : `INJECT_${selected.length}_PROTOCOLS ➔`}</button>
        </div>
    )
}

export default function Review() {
    const { user } = useAuth(); const navigate = useNavigate(); const revealRef = useReveal()
    const [questions, setQuestions] = useState([]); const [idx, setIdx] = useState(0); const [selected, setSelected] = useState(null); const [submitted, setSubmitted] = useState(false); const [quality, setQuality] = useState(null); const [loading, setLoading] = useState(true); const [doneCount, setDoneCount] = useState(0)

    useEffect(() => { if (user) load() }, [user])
    const load = async () => { setLoading(true); try { const data = await callAPI(`/tracking/spaced-questions/${user.id}`); setQuestions(data.questions || []) } catch { setQuestions([]) }; setLoading(false) }
    const q = questions[idx]
    const handleSubmit = () => { if (!selected || submitted) return; setSubmitted(true) }
    const handleQuality = async (qNum) => {
        setQuality(qNum)
        try { await callAPI('/tracking/spaced-review', { method: 'POST', body: JSON.stringify({ user_id: user.id, question_id: q.id, quality: qNum, topic: q.topic || q._sr?.topic }) }) } catch { }
        setDoneCount(d => d + 1)
        setTimeout(() => { if (idx + 1 >= questions.length) { setIdx(questions.length) } else { setIdx(i => i + 1); setSelected(null); setSubmitted(false); setQuality(null) } }, 600)
    }
    const optionText = (q, letter) => { if (!q) return ''; const map = { A: q.option_a, B: q.option_b, C: q.option_c, D: q.option_d }; return map[letter] || '' }

    if (!loading && questions.length === 0) return (
        <div className="max-w-[1440px] mx-auto px-6 md:px-12 py-12 bg-[var(--color-paper)] min-h-screen relative" ref={revealRef}>
            <div className="grain pointer-events-none" />
            <div className="mb-24">
                <p className="eyebrow">RECALIBRATION_DEPLETED_v2.0</p>
                <h1 className="font-serif font-black text-7xl md:text-[10rem] tracking-tighter uppercase leading-[0.8] italic">
                    QUEUE <br /><span className="text-[var(--color-gold)] not-italic">EMPTY.</span>
                </h1>
                <p className="font-serif italic text-2xl text-[var(--color-muted)] mt-12 border-l-4 border-[var(--color-gold)] pl-8 max-w-xl uppercase tracking-tighter">Analytical synchronization complete. All standard cognitive nodes have been satisfied for the current temporal window.</p>
            </div>
            <AddQueuePanel userId={user.id} onAdded={load} />
        </div>
    )

    if (!loading && idx >= questions.length) return (
        <div className="max-w-[1440px] mx-auto px-6 md:px-12 py-24 text-center bg-[var(--color-paper)] min-h-screen relative" ref={revealRef}>
            <div className="grain pointer-events-none" />
            <div className="border-8 border-[var(--color-ink)] bg-white p-12 md:p-32 shadow-[64px_64px_0_var(--color-cream)] relative z-10">
                <p className="eyebrow mx-auto justify-center mb-16">RECALIBRATION_SUMMARY_v2.1</p>
                <div className="mb-24">
                    <h2 className="font-serif font-black text-7xl md:text-[14rem] italic uppercase tracking-tighter leading-[0.7] mb-8 text-[var(--color-teal)]">FIN.</h2>
                    <p className="font-mono text-[14px] font-black uppercase tracking-[0.8em] text-[var(--color-gold)] italic">SESSION_SYNCHRONIZED_SUCCESS</p>
                </div>
                <p className="font-serif italic text-2xl text-[var(--color-muted)] max-w-xl mx-auto mb-24 uppercase tracking-tighter">You successfully recalibrated {doneCount} cognitive nodes. Spaced repetition vectors have been adjusted for optimal retention.</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-2xl mx-auto">
                    <button onClick={load} className="bg-[var(--color-ink)] text-white py-10 font-serif font-black text-3xl uppercase tracking-tighter italic hover:bg-black transition-all shadow-[12px_12px_0_var(--color-gold)]">SCAN_FOR_MORE ➔</button>
                    <Link to="/dashboard" className="border-4 border-[var(--color-ink)] py-10 font-serif font-black text-3xl uppercase tracking-tighter italic hover:bg-[var(--color-cream)] transition-all">DASHBOARD_UPLINK ➔</Link>
                </div>
            </div>
        </div>
    )

    if (loading) return (
        <div className="max-w-[1440px] mx-auto px-6 md:px-12 py-24 bg-[var(--color-paper)] min-h-screen animate-pulse" ref={revealRef}>
            <div className="h-64 border-4 border-[var(--color-ink)]/10" />
        </div>
    )

    const sr = q?._sr || {}; const due = questions.length; const progress = Math.round((idx / due) * 100)

    return (
        <div className="max-w-[1440px] mx-auto px-6 md:px-12 py-12 bg-[var(--color-paper)] min-h-screen relative" ref={revealRef}>
            <div className="grain pointer-events-none" />
            <div className="mb-24 flex flex-col md:flex-row items-end justify-between gap-12 relative z-10">
                <div className="max-w-4xl">
                    <p className="eyebrow">COGNITIVE_RECALIBRATION_v2.1 // {due}_DUE</p>
                    <h1 className="font-serif font-black text-7xl md:text-[10rem] tracking-tighter uppercase leading-[0.8] italic">
                        REVIEW <br /><span className="text-[var(--color-gold)] not-italic">QUEUE.</span>
                    </h1>
                    {/* Progress */}
                    <div className="mt-12 flex items-center gap-8">
                        <p className="font-mono text-[10px] font-black uppercase text-[var(--color-ink)]">{idx + 1}_OF_{due}_NODES</p>
                        <div className="flex-1 h-2 bg-[var(--color-ink)]/5 border-2 border-[var(--color-ink)]">
                            <div className="h-full bg-[var(--color-teal)]" style={{ width: `${progress}%` }} />
                        </div>
                    </div>
                </div>
            </div>

            <div className="max-w-5xl mx-auto space-y-12 relative z-10">
                <div className="border-4 border-[var(--color-ink)] bg-white shadow-[48px_48px_0_var(--color-cream)] relative overflow-hidden">
                    <div className="absolute top-0 right-0 px-12 py-3 bg-[var(--color-ink)] font-mono text-[10px] font-black uppercase text-white">RECALL_NODE // {q?.exam_type} {q?.year}</div>
                    <div className="p-12 md:p-24 border-b-4 border-[var(--color-ink)]/10">
                        {q?.image_url && <img src={q.image_url} alt="Question" className="max-w-full mb-12 border-4 border-[var(--color-ink)] shadow-[12px_12px_0_var(--color-cream)] mx-auto" />}
                        <p className="font-serif font-black text-4xl md:text-5xl italic uppercase leading-none tracking-tighter italic text-[var(--color-ink)]">{q?.question_text}</p>
                    </div>
                    <div className="p-12 space-y-4">
                        {OPTION_LABELS.map(letter => {
                            const text = optionText(q, letter); if (!text) return null
                            const isCorrect = letter === q?.correct_answer; const isSelected = letter === selected
                            let borderCls = 'border-[var(--color-ink)]'; let bgCls = 'bg-white'; let textColor = 'text-[var(--color-ink)]'
                            if (submitted) {
                                if (isCorrect) { borderCls = 'border-green-600'; bgCls = 'bg-green-50'; textColor = 'text-green-800' }
                                else if (isSelected) { borderCls = 'border-red-600'; bgCls = 'bg-red-50'; textColor = 'text-red-800' }
                                else { borderCls = 'border-[var(--color-ink)]/10'; bgCls = 'bg-white'; textColor = 'opacity-30' }
                            } else if (isSelected) { borderCls = 'border-[var(--color-ink)]'; bgCls = 'bg-[var(--color-ink)]'; textColor = 'text-white' }

                            return (
                                <button key={letter} disabled={submitted} onClick={() => setSelected(letter)} className={`w-full text-left flex items-start gap-4 px-8 py-6 border-4 transition-all ${borderCls} ${bgCls} ${textColor}`}>
                                    <span className={`shrink-0 w-8 h-8 border-2 border-current flex items-center justify-center font-mono text-xs font-black ${isSelected && !submitted ? 'bg-white text-[var(--color-ink)]' : ''}`}>{letter}</span>
                                    <span className="font-serif italic text-2xl leading-tight flex-1 uppercase tracking-tight">{text}</span>
                                </button>
                            )
                        })}
                    </div>
                    {!submitted ? (
                        <button onClick={handleSubmit} disabled={!selected} className="w-full bg-[var(--color-ink)] text-white py-12 font-serif font-black text-4xl uppercase tracking-tighter italic hover:bg-black transition-all shadow-[12px_12px_0_var(--color-gold)] disabled:opacity-20">CHECK_CONCORDANCE ➔</button>
                    ) : !quality ? (
                        <div className="p-12 bg-[var(--color-paper)] border-t-4 border-[var(--color-ink)]">
                            <p className="font-serif font-black text-3xl italic uppercase tracking-tighter mb-8 text-[var(--color-ink)]">{selected === q?.correct_answer ? '✅ DATA_MATCHED.' : `❌ DATA_MISMATCH. CORRECT: ${q?.correct_answer}`}</p>
                            {q?.explanation && <div className="bg-white border-2 border-[var(--color-ink)] p-8 mb-12 font-serif italic text-xl uppercase tracking-tighter leading-tight"><ExplanationBody text={q.explanation} /></div>}
                            <div className="space-y-4">
                                <p className="font-mono text-[9px] font-black uppercase text-[var(--color-gold)] tracking-[0.4em] mb-4">RECALL_QUALITY_METRIC</p>
                                <div className="grid grid-cols-2 md:grid-cols-6 gap-2">
                                    {QUALITY_LABELS.map(({ q: qNum, label, color, emoji }) => (
                                        <button key={qNum} onClick={() => handleQuality(qNum)} className={`p-4 border-2 font-mono text-[8px] font-black uppercase flex flex-col items-center gap-2 transition-all hover:bg-[var(--color-gold)] hover:text-white border-[var(--color-ink)] bg-white`}>
                                            <span className="text-xl">{emoji}</span>
                                            <span>{label}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="p-12 text-center animate-pulse"><p className="font-mono text-[10px] font-black text-[var(--color-teal)] uppercase tracking-widest">REALIGNING_TEMPORAL_VECTOR...</p></div>
                    )}
                </div>
            </div>
        </div>
    )
}

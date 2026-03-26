import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'
import { useReveal } from '../hooks/useReveal'

function hashSeed(seed) { return [...seed].reduce((a, c) => (a * 31 + c.charCodeAt(0)) >>> 0, 0) }
function randomSeed(len = 6) {
    const chars = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'
    return Array.from({ length: len }, () => chars[Math.floor(Math.random() * chars.length)]).join('')
}

const EXAM_TYPES = ['JAMB', 'WAEC', 'NECO', 'BECE']
const OPTION_LETTERS = ['A', 'B', 'C', 'D']
const TOTAL_QUESTIONS = 10

function CreateChallenge() {
    const [examType, setExamType] = useState('JAMB'); const [creating, setCreating] = useState(false); const [link, setLink] = useState(null); const [copied, setCopied] = useState(false); const revealRef = useReveal()
    const create = async () => { setCreating(true); const seed = randomSeed(); const url = `${window.location.origin}/challenge/${seed}?exam=${examType}`; setLink(url); setCreating(false) }
    const copy = () => { navigator.clipboard.writeText(link); setCopied(true); setTimeout(() => setCopied(false), 2000) }

    return (
        <div className="max-w-[1440px] mx-auto px-6 md:px-12 py-12 bg-[var(--color-paper)] min-h-screen relative" ref={revealRef}>
            <div className="grain pointer-events-none" />
            <div className="mb-24 flex flex-col md:flex-row items-end justify-between gap-12 relative z-10">
                <div className="max-w-4xl">
                    <p className="eyebrow">GAUNTLET_GENERATOR_v1.2</p>
                    <h1 className="font-serif font-black text-6xl md:text-[10rem] tracking-tighter uppercase leading-[0.8] italic">
                        CREATE <br /><span className="text-[var(--color-gold)] not-italic">GAUNTLET.</span>
                    </h1>
                    <p className="font-serif italic text-2xl text-[var(--color-muted)] mt-12 border-l-4 border-[var(--color-gold)] pl-8 max-w-xl uppercase tracking-tighter">Issue a sovereign challenge to external nodes via a synchronized 10-problem protocol.</p>
                </div>
            </div>

            <div className="max-w-4xl mx-auto border-4 border-[var(--color-ink)] bg-white p-12 md:p-16 shadow-[48px_48px_0_var(--color-cream)] relative z-10">
                <p className="eyebrow mb-12">GAUNTLET_SPECIFICATIONS</p>
                <div className="space-y-12">
                    <div>
                        <p className="font-mono text-[9px] font-black uppercase text-[var(--color-gold)] mb-4 tracking-[0.4em]">EXAM_PROTOCOL</p>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            {EXAM_TYPES.map(t => (
                                <button key={t} onClick={() => setExamType(t)} className={`py-6 font-serif font-black text-2xl uppercase tracking-tighter italic border-4 transition-all ${examType === t ? 'bg-[var(--color-ink)] text-white border-[var(--color-ink)]' : 'border-[var(--color-ink)] hover:bg-[var(--color-cream)]'}`}>{t}</button>
                            ))}
                        </div>
                    </div>
                    <div className="bg-[var(--color-paper)] border-4 border-dashed border-[var(--color-ink)]/10 p-8 font-serif italic text-2xl uppercase tracking-tighter leading-tight text-[var(--color-muted)]">SYSTEM_MODE: 10_RANDOM_PROBLEMS // FIXED_SEED // MULTI_NODE_SYNC</div>
                    <button onClick={create} disabled={creating} className="w-full bg-[var(--color-ink)] text-white py-12 font-serif font-black text-4xl uppercase tracking-tighter italic hover:bg-black transition-all shadow-[12px_12px_0_var(--color-gold)] disabled:opacity-20">{creating ? 'PROVISIONING...' : 'INITIALIZE_GAUNTLET_LINK ➔'}</button>
                </div>
            </div>

            {link && (
                <div className="max-w-4xl mx-auto border-4 border-[var(--color-ink)] bg-[var(--color-ink)] p-12 md:p-16 shadow-[48px_48px_0_var(--color-cream)] relative z-10 mt-12 animate-slide-up">
                    <p className="eyebrow text-white/40 mb-12">UPLINK_PROTOCOL_KEY_GENERATED</p>
                    <div className="flex flex-col md:flex-row gap-4 mb-12">
                        <input readOnly value={link} className="flex-1 bg-white border-4 border-white p-6 font-mono text-[10px] uppercase font-black tracking-widest outline-none" />
                        <button onClick={copy} className={`px-12 py-6 font-serif font-black text-2xl uppercase tracking-tighter italic transition-all ${copied ? 'bg-green-600 text-white' : 'bg-[var(--color-gold)] text-white hover:bg-amber-600 shadow-[8px_8px_0_black]'}`}>{copied ? 'PROTOCOL_COPIED' : 'COPY_KEY ➔'}</button>
                    </div>
                    <Link to={link.replace(window.location.origin, '')} className="font-mono text-[9px] font-black uppercase text-white/40 hover:text-[var(--color-gold)] transition-all tracking-[0.4em]">ENTER_GAUNTLET_INTERFACE_01 ➔</Link>
                </div>
            )}
        </div>
    )
}

function TakeChallenge({ seed, examType }) {
    const { user } = useAuth(); const [questions, setQuestions] = useState([]); const [answers, setAnswers] = useState({}); const [submitted, setSubmitted] = useState(false); const [loading, setLoading] = useState(true); const [copied, setCopied] = useState(false); const revealRef = useReveal()
    useEffect(() => { loadQuestions() }, [seed])
    const loadQuestions = async () => {
        setLoading(true); const h = hashSeed(seed)
        const { data } = await supabase.from('exam_questions').select('*').eq('exam_type', examType).not('option_a', 'is', null).not('correct_answer', 'is', null).order('id').limit(500)
        if (!data?.length) { setLoading(false); return }
        const start = h % Math.max(1, data.length - TOTAL_QUESTIONS); setQuestions(data.slice(start, start + TOTAL_QUESTIONS)); setLoading(false)
    }
    const optText = (q, l) => ({ A: q.option_a, B: q.option_b, C: q.option_c, D: q.option_d }[l] || '')
    const score = submitted ? questions.filter((q, i) => answers[i] === q.correct_answer).length : 0
    const scorePct = submitted ? Math.round((score / questions.length) * 100) : 0
    const shareMsg = `GAUNTLET_SCORE: ${scorePct}%. SECTOR: ${examType}. CAN_YOU_REPLICATE? ${window.location.href}`

    if (loading) return (
        <div className="max-w-[1440px] mx-auto px-6 md:px-12 py-24 bg-[var(--color-paper)] min-h-screen text-center animate-pulse" ref={revealRef}>
            <p className="font-mono text-[10px] font-black text-[var(--color-teal)] uppercase tracking-widest">SYNCHRONIZING_GAUNTLET_NODES...</p>
        </div>
    )

    if (submitted) return (
        <div className="max-w-[1440px] mx-auto px-6 md:px-12 py-12 bg-[var(--color-paper)] min-h-screen relative" ref={revealRef}>
            <div className="grain pointer-events-none" />
            <div className="border-8 border-[var(--color-ink)] bg-white p-12 md:p-32 shadow-[64px_64px_0_var(--color-cream)] relative z-10 text-center">
                <p className="eyebrow mx-auto justify-center mb-16">GAUNTLET_EVALUATION_SUMMARY</p>
                <div className="mb-24">
                    <h2 className="font-serif font-black text-8xl md:text-[20rem] italic uppercase tracking-tighter leading-[0.7] mb-8 text-[var(--color-teal)]">{scorePct}%</h2>
                    <p className="font-mono text-[14px] font-black uppercase tracking-[0.8em] text-[var(--color-gold)] italic">{scorePct >= 80 ? 'DOMINANT_COGNITIVE_REACH' : scorePct >= 50 ? 'STANDARD_PROTOCOL_SATISFIED' : 'MARGINAL_DATA_ALIGNMENT'}</p>
                </div>
                <p className="font-serif italic text-2xl text-[var(--color-muted)] max-w-xl mx-auto mb-24 uppercase tracking-tighter">You successfully resolved {score} out of {questions.length} objective nodes in the {examType} sector.</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-2xl mx-auto">
                    <button onClick={() => { navigator.clipboard.writeText(shareMsg); setCopied(true) }} className={`py-10 font-serif font-black text-3xl uppercase tracking-tighter italic transition-all shadow-[12px_12px_0_var(--color-gold)] ${copied ? 'bg-green-600 text-white' : 'bg-[var(--color-ink)] text-white hover:bg-black'}`}>{copied ? 'SCORE_DISTRIBUTED' : 'DISTRIBUTE_SCORE ➔'}</button>
                    <Link to="/challenge" className="border-4 border-[var(--color-ink)] py-10 font-serif font-black text-3xl uppercase tracking-tighter italic hover:bg-[var(--color-cream)] transition-all">GENERATE_NEW_GAUNTLET</Link>
                </div>
            </div>

            <div className="mt-24 space-y-12 max-w-4xl mx-auto">
                <p className="font-mono text-[10px] font-black uppercase text-[var(--color-gold)] tracking-[0.8em] mb-12">POST-MORTEM_NODE_ANALYSIS</p>
                {questions.map((q, i) => {
                    const isRight = answers[i] === q.correct_answer
                    return (
                        <div key={q.id} className={`border-4 bg-white p-12 transition-all ${isRight ? 'border-green-600' : 'border-red-600 shadow-[16px_16px_0_var(--color-cream)] opacity-50'}`}>
                            <p className="font-mono text-[9px] font-black uppercase text-[var(--color-muted)] mb-4">NODE_0{i + 1}</p>
                            <p className="font-serif italic text-2xl uppercase tracking-tighter leading-tight text-[var(--color-ink)] mb-8">{q.question_text?.slice(0, 150)}...</p>
                            <div className="flex gap-12">
                                <div>
                                    <p className="font-mono text-[8px] font-black uppercase text-[var(--color-muted)]">MY_DATA</p>
                                    <p className={`font-serif font-black text-2xl ${isRight ? 'text-green-600' : 'text-red-600'}`}>{answers[i] || 'NULL'}</p>
                                </div>
                                <div>
                                    <p className="font-mono text-[8px] font-black uppercase text-[var(--color-muted)]">CORE_DATA</p>
                                    <p className="font-serif font-black text-2xl text-green-600">{q.correct_answer}</p>
                                </div>
                            </div>
                        </div>
                    )
                })}
            </div>
        </div>
    )

    return (
        <div className="max-w-[1440px] mx-auto px-6 md:px-12 py-12 bg-[var(--color-paper)] min-h-screen relative" ref={revealRef}>
            <div className="grain pointer-events-none" />
            <div className="mb-24 flex flex-col md:flex-row items-end justify-between gap-12 relative z-10">
                <div className="max-w-4xl">
                    <p className="eyebrow">SOVEREIGN_GAUNTLET_ENGAGED // SEED_{seed}</p>
                    <h1 className="font-serif font-black text-7xl md:text-[10rem] tracking-tighter uppercase leading-[0.8] italic">
                        GAUNTLET <br /><span className="text-[var(--color-gold)] not-italic">{examType}.</span>
                    </h1>
                    <div className="mt-12 flex items-center gap-8">
                        <p className="font-mono text-[10px] font-black uppercase text-[var(--color-ink)]">{Object.keys(answers).length}_OF_{questions.length}_NODES_RESOLVED</p>
                        <div className="flex-1 h-2 bg-[var(--color-ink)]/5 border-2 border-[var(--color-ink)]">
                            <div className="h-full bg-[var(--color-teal)]" style={{ width: `${(Object.keys(answers).length / questions.length) * 100}%` }} />
                        </div>
                    </div>
                </div>
            </div>

            <div className="space-y-16 max-w-5xl mx-auto relative z-10">
                {questions.map((q, i) => (
                    <div key={q.id} className="border-4 border-[var(--color-ink)] bg-white shadow-[24px_24px_0_var(--color-cream)] overflow-hidden transition-all hover:shadow-none">
                        <div className="bg-[var(--color-ink)] px-8 py-3 flex items-center justify-between">
                            <p className="font-mono text-[9px] font-black uppercase text-white/40 tracking-[0.4em]">NODE_0{i + 1}</p>
                            {answers[i] && <p className="font-mono text-[9px] font-black uppercase text-[var(--color-gold)] tracking-[0.2em]">RESOLVED_V.{answers[i]}</p>}
                        </div>
                        <div className="p-12 md:p-16">
                            <p className="font-serif italic text-3xl md:text-4xl uppercase tracking-tighter leading-tight text-[var(--color-ink)] mb-12">{q.question_text}</p>
                            <div className="space-y-4">
                                {OPTION_LETTERS.map(l => {
                                    const text = optText(q, l); if (!text) return null
                                    const isSelected = answers[i] === l
                                    return (
                                        <button key={l} onClick={() => setAnswers(a => ({ ...a, [i]: l }))} className={`w-full text-left flex items-start gap-4 px-8 py-4 border-4 transition-all ${isSelected ? 'bg-[var(--color-ink)] text-white border-[var(--color-ink)]' : 'border-[var(--color-ink)] hover:bg-[var(--color-cream)]'}`}>
                                            <span className={`shrink-0 w-6 h-6 border-2 border-current flex items-center justify-center font-mono text-[10px] font-black ${isSelected ? 'bg-white text-[var(--color-ink)] border-white' : ''}`}>{l}</span>
                                            <span className="font-serif italic text-xl leading-tight flex-1 uppercase tracking-tight">{text}</span>
                                        </button>
                                    )
                                })}
                            </div>
                        </div>
                    </div>
                ))}

                <button onClick={() => setSubmitted(true)} disabled={Object.keys(answers).length < questions.length} className="w-full bg-[var(--color-ink)] text-white py-12 font-serif font-black text-4xl uppercase tracking-tighter italic hover:bg-black transition-all shadow-[12px_12px_0_var(--color-gold)] disabled:opacity-20 animate-pulse">COMMIT_GAUNTLET_RESOLUTION ➔</button>
            </div>
        </div>
    )
}

export default function Challenge() {
    const { seed } = useParams(); const params = new URLSearchParams(window.location.search); const examType = params.get('exam') || 'JAMB'
    if (!seed || seed === 'new') return <CreateChallenge />
    return <TakeChallenge seed={seed} examType={examType} />
}

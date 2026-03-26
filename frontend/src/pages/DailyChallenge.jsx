import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { getDailyChallenge } from '../services/api'
import { awardXP, XP, updateStreak } from '../lib/stats'
import { useReveal } from '../hooks/useReveal'
import { ExplanationBody } from '../utils/RenderMath'

const TODAY = new Date().toISOString().slice(0, 10)
const DONE_KEY = `dailyChallenge_${TODAY}`
const DAILY_XP = XP.DAILY_CHALLENGE
const OPTION_LABELS = ['A', 'B', 'C', 'D']

function optionText(q, letter) {
  const map = { A: q.option_a, B: q.option_b, C: q.option_c, D: q.option_d }
  return map[letter] || ''
}

export default function DailyChallenge() {
  const { user } = useAuth(); const revealRef = useReveal()
  const [question, setQuestion] = useState(null); const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState(null); const [submitted, setSubmitted] = useState(false)
  const [correct, setCorrect] = useState(false); const [alreadyDone, setAlreadyDone] = useState(false)
  const [examType, setExamType] = useState('JAMB'); const [xpAwarded, setXpAwarded] = useState(false)

  useEffect(() => {
    const done = localStorage.getItem(DONE_KEY); if (done) { setAlreadyDone(true); setLoading(false); return }
    loadChallenge(examType)
  }, [])

  const loadChallenge = async (type) => {
    setLoading(true); setQuestion(null); setSelected(null); setSubmitted(false); setCorrect(false)
    try { const res = await getDailyChallenge(type); setQuestion(res.data.question) } catch { setQuestion(null) }
    setLoading(false)
  }

  const handleSubmit = async () => {
    if (!selected || submitted || !user) return
    const isCorrect = selected === question.correct_answer; setCorrect(isCorrect); setSubmitted(true)
    if (isCorrect && !xpAwarded) {
      localStorage.setItem(DONE_KEY, 'done'); setAlreadyDone(true)
      try { await awardXP(user.id, DAILY_XP, 'daily_challenge'); await updateStreak(user.id) } catch (err) { console.error('XP award failed:', err) }
      setXpAwarded(true)
    }
  }

  if (alreadyDone && !submitted) {
    return (
      <div className="max-w-[1440px] mx-auto px-6 py-24 text-center bg-[var(--color-paper)] min-h-screen relative" ref={revealRef}>
        <div className="grain pointer-events-none" />
        <div className="border-8 border-[var(--color-ink)] bg-white p-12 md:p-32 shadow-[64px_64px_0_var(--color-cream)] relative z-10 transition-all hover:shadow-none">
          <p className="eyebrow mx-auto justify-center mb-16">TEMPORAL_LOCK_v11.4</p>
          <div className="mb-24">
            <h2 className="font-serif font-black text-7xl md:text-[12rem] italic uppercase tracking-tighter leading-[0.7] mb-8 text-[var(--color-teal)]">LOCKED.</h2>
            <p className="font-mono text-[14px] font-black uppercase tracking-[0.8em] text-[var(--color-gold)] italic">DAILY_PROTOCOL_RESOLVED_SUCCESS</p>
          </div>
          <p className="font-serif italic text-2xl text-[var(--color-muted)] max-w-xl mx-auto mb-24 uppercase tracking-tighter">The current temporal window is satisfied. Return in 24 hours for the next cognitive pulse.</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-2xl mx-auto">
            <Link to="/cbt" className="bg-[var(--color-ink)] text-white py-10 font-serif font-black text-3xl uppercase tracking-tighter italic hover:bg-black transition-all shadow-[12px_12px_0_var(--color-gold)]">FULL_CBT_UPLINK ➔</Link>
            <Link to="/practice" className="border-4 border-[var(--color-ink)] py-10 font-serif font-black text-3xl uppercase tracking-tighter italic hover:bg-[var(--color-cream)] transition-all">PRACTICE_ARCHIVE ➔</Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-[1440px] mx-auto px-6 md:px-12 py-12 bg-[var(--color-paper)] min-h-screen relative" ref={revealRef}>
      <div className="grain pointer-events-none" />

      <div className="mb-24 flex flex-col md:flex-row items-end justify-between gap-12 relative z-10">
        <div className="max-w-4xl">
          <p className="eyebrow">TEMPORAL_PULSE_v11.4 // {TODAY}</p>
          <h1 className="font-serif font-black text-7xl md:text-[10rem] tracking-tighter uppercase leading-[0.8] italic">
            DAILY <br /><span className="text-[var(--color-gold)] not-italic">PULSE.</span>
          </h1>
          <p className="font-serif italic text-2xl text-[var(--color-muted)] mt-12 border-l-4 border-[var(--color-gold)] pl-8 max-w-xl uppercase tracking-tighter">A singular, synchronized cognitive challenge released every 24 hours for sovereign rank maintenance.</p>
        </div>
      </div>

      <div className="flex gap-4 mb-16 relative z-10">
        {['JAMB', 'WAEC', 'NECO', 'BECE'].map((t) => (
          <button key={t} onClick={() => { setExamType(t); loadChallenge(t) }} className={`px-12 py-6 font-mono text-[9px] font-black uppercase border-4 transition-all ${examType === t ? 'bg-[var(--color-ink)] text-white border-[var(--color-ink)] shadow-[12px_12px_0_var(--color-gold)]' : 'border-[var(--color-ink)] text-[var(--color-ink)] hover:bg-[var(--color-cream)]'}`}>
            {t}_PROTOCOL
          </button>
        ))}
      </div>

      {loading ? (
        <div className="h-96 border-4 border-dashed border-[var(--color-ink)]/10 animate-pulse flex items-center justify-center">
          <p className="font-mono text-[10px] font-black text-[var(--color-teal)] uppercase tracking-widest">SYNCHRONIZING_DAILY_STATE...</p>
        </div>
      ) : question ? (
        <div className="max-w-5xl mx-auto space-y-12 relative z-10">
          <div className="border-4 border-[var(--color-ink)] bg-white shadow-[48px_48px_0_var(--color-cream)] relative overflow-hidden">
            <div className="absolute top-0 right-0 px-12 py-3 bg-[var(--color-ink)] font-mono text-[10px] font-black uppercase text-white">DAILY_CHALLENGE // {question.exam_type}</div>
            <div className="p-12 md:p-24 border-b-4 border-[var(--color-ink)]/10">
              {question.image_url && <img src={question.image_url} alt="Question figure" className="max-w-full mb-12 border-4 border-[var(--color-ink)] shadow-[12px_12px_0_var(--color-cream)]" />}
              <p className="font-serif font-black text-4xl md:text-5xl italic uppercase leading-none tracking-tighter italic text-[var(--color-ink)]">{question.question_text}</p>
            </div>
            <div className="p-12 space-y-4">
              {OPTION_LABELS.map(letter => {
                const text = optionText(question, letter); if (!text) return null
                const isCorrect = letter === question.correct_answer; const isSelected = letter === selected
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
              <button onClick={handleSubmit} disabled={!selected} className="w-full bg-[var(--color-ink)] text-white py-12 font-serif font-black text-4xl uppercase tracking-tighter italic hover:bg-black transition-all">COMMIT_RESOLUTION ➔</button>
            ) : (
              <div className="p-12 bg-[var(--color-paper)] border-t-4 border-[var(--color-ink)]">
                <p className={`font-serif font-black text-3xl italic uppercase tracking-tighter mb-8 ${correct ? 'text-green-700' : 'text-red-700'}`}>{correct ? 'PULSE_RECEPTION_SUCCESS.' : `PULSE_RECEPTION_FAIL. CORRECT: ${question.correct_answer}`}</p>
                {question.explanation && (
                  <div className="bg-white border-2 border-[var(--color-ink)] p-12 mb-8">
                    <p className="eyebrow mb-8">PULSE_DECONSTRUCTION</p>
                    <div className="font-serif font-black text-2xl italic uppercase tracking-tighter leading-tight text-[var(--color-ink)]"><ExplanationBody text={question.explanation} /></div>
                  </div>
                )}
                <div className="grid grid-cols-2 gap-8">
                  <Link to="/cbt" className="bg-[var(--color-ink)] text-white py-8 text-center font-serif font-black text-2xl uppercase tracking-tighter italic hover:bg-black transition-all shadow-[8px_8px_0_var(--color-gold)]">FULL_CBT_UPLINK ➔</Link>
                  <Link to="/practice" className="border-4 border-[var(--color-ink)] py-8 text-center font-serif font-black text-2xl uppercase tracking-tighter italic hover:bg-[var(--color-cream)] transition-all">PRACTICE_ARCHIVE ➔</Link>
                </div>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="border-4 border-red-600 bg-red-50 p-12 text-center relative z-10">
          <p className="font-serif font-black text-2xl italic uppercase tracking-tighter text-red-700">PULSE_SYNCHRONIZATION_FAIL_V.404</p>
        </div>
      )}
    </div>
  )
}
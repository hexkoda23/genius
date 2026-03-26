import { useState, useEffect, useRef, useCallback } from 'react'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'
import { fetchCBTQuestions } from '../lib/cbt'
import { ExplanationBody } from '../utils/RenderMath'
import { explainCBTAnswer } from '../services/api'
import ShareResultCard from '../components/ShareResultCard'
import { TestimonialPrompt } from '../components/TestimonialModal'
import { useReveal } from '../hooks/useReveal'

const EXAM_CONFIG = {
  WAEC: { label: 'WAEC_COORD', color: '#1a4d4d', questions: 50, minutes: 90, emoji: '📗' },
  NECO: { label: 'NECO_UPLINK', color: '#1e3a8a', questions: 50, minutes: 90, emoji: '📘' },
  BECE: { label: 'BECE_JUNIOR', color: '#92400e', questions: 50, minutes: 80, emoji: '📙' },
  JAMB: { label: 'JAMB_UTME', color: '#7e22ce', questions: 60, minutes: 100, emoji: '📕' },
}

const GRADE_BANDS = [
  { min: 75, grade: 'A1', label: 'DISTINCTION', color: 'text-emerald-600' },
  { min: 70, grade: 'B2', label: 'EXCEPTIONAL', color: 'text-green-600' },
  { min: 65, grade: 'B3', label: 'SUPERIOR', color: 'text-green-500' },
  { min: 60, grade: 'C4', label: 'MERIT', color: 'text-blue-600' },
  { min: 55, grade: 'C5', label: 'CREDIT', color: 'text-blue-500' },
  { min: 50, grade: 'C6', label: 'STANDARD', color: 'text-sky-600' },
  { min: 45, grade: 'D7', label: 'PASS_THRESHOLD', color: 'text-yellow-600' },
  { min: 40, grade: 'E8', label: 'PASS_MARGINAL', color: 'text-orange-500' },
  { min: 0, grade: 'F9', label: 'RESOLUTION_FAIL', color: 'text-red-600' },
]

function getGrade(pct) { return GRADE_BANDS.find(b => pct >= b.min) || GRADE_BANDS[GRADE_BANDS.length - 1] }
function formatTime(secs) { const m = Math.floor(secs / 60), s = secs % 60; return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}` }

function OptionBtn({ letter, text, selected, correct, revealed, onClick }) {
  let border = 'border-[var(--color-ink)]'; let bg = 'bg-white'; let textColor = 'text-[var(--color-ink)]'
  if (revealed) {
    if (letter === correct) { border = 'border-green-600'; bg = 'bg-green-50'; textColor = 'text-green-800' }
    else if (letter === selected) { border = 'border-red-600'; bg = 'bg-red-50'; textColor = 'text-red-800' }
    else { border = 'border-[var(--color-ink)]/10'; bg = 'bg-white'; textColor = 'opacity-30' }
  } else if (selected === letter) {
    border = 'border-[var(--color-ink)]'; bg = 'bg-[var(--color-ink)]'; textColor = 'text-white'
  }

  return (
    <button onClick={() => !revealed && onClick(letter)} disabled={revealed} className={`w-full text-left flex items-start gap-4 px-6 py-4 border-4 transition-all ${border} ${bg} ${textColor} hover:shadow-[4px_4px_0_var(--color-cream)]`}>
      <span className={`shrink-0 w-8 h-8 border-2 border-current flex items-center justify-center font-mono text-xs font-black ${selected === letter && !revealed ? 'bg-white text-[var(--color-ink)]' : ''}`}>{letter}</span>
      <span className="font-serif italic text-lg leading-tight flex-1 uppercase tracking-tight">{text}</span>
    </button>
  )
}

export default function MockExam() {
  const { user } = useAuth(); const revealRef = useReveal()
  const [examType, setExamType] = useState('WAEC'); const [year, setYear] = useState(''); const [years, setYears] = useState([])
  const [phase, setPhase] = useState('setup'); const [questions, setQuestions] = useState([]); const [answers, setAnswers] = useState({})
  const [current, setCurrent] = useState(0); const [flagged, setFlagged] = useState(new Set()); const [timeLeft, setTimeLeft] = useState(0)
  const [loading, setLoading] = useState(false); const [submitting, setSubmitting] = useState(false); const timerRef = useRef(null)
  const [result, setResult] = useState(null); const [showShareCard, setShowShareCard] = useState(false); const [explanations, setExplanations] = useState({}); const [explaining, setExplaining] = useState(null)

  const cfg = EXAM_CONFIG[examType]
  useEffect(() => { loadYears() }, [examType])
  const loadYears = async () => {
    const { data } = await supabase.from('exam_questions').select('year').eq('exam_type', examType).not('year', 'is', null)
    setYears([...new Set((data || []).map(r => r.year))].sort((a, b) => b - a)); setYear('')
  }

  const startExam = async () => {
    setLoading(true)
    const { data: qs } = await fetchCBTQuestions({ examType, year: year ? parseInt(year) : null, count: cfg.questions })
    if (!qs?.length) { setLoading(false); return }; setQuestions(qs); setAnswers({}); setFlagged(new Set()); setCurrent(0); setTimeLeft(cfg.minutes * 60); setPhase('exam'); setLoading(false)
  }

  useEffect(() => {
    if (phase !== 'exam') return
    timerRef.current = setInterval(() => { setTimeLeft(t => { if (t <= 1) { clearInterval(timerRef.current); submitExam(); return 0 }; return t - 1 }) }, 1000)
    return () => clearInterval(timerRef.current)
  }, [phase])

  const submitExam = useCallback(async () => {
    if (submitting) return; setSubmitting(true); clearInterval(timerRef.current)
    const timeTaken = cfg.minutes * 60 - timeLeft; let correct = 0; questions.forEach((q, i) => { if (answers[i] === q.correct_answer) correct++ })
    const pct = Math.round((correct / questions.length) * 100); const grade = getGrade(pct)
    if (user) await supabase.from('mock_exam_sessions').insert({ user_id: user.id, exam_type: examType, year: year ? parseInt(year) : null, total_q: questions.length, score: correct, pct, time_taken: timeTaken, answers: answers, completed_at: new Date().toISOString() })
    setResult({ correct, total: questions.length, pct, grade, timeTaken }); setPhase('review'); setSubmitting(false)
  }, [questions, answers, examType, year, timeLeft, user, submitting])

  const explainQ = async (idx) => {
    if (explanations[idx] || explaining === idx) return; setExplaining(idx); const q = questions[idx]
    try {
      const res = await explainCBTAnswer({ question_text: q.question_text, option_a: q.option_a, option_b: q.option_b, option_c: q.option_c, option_d: q.option_d, correct_answer: q.correct_answer, student_answer: answers[idx] || '—', topic: q.topic })
      setExplanations(e => ({ ...e, [idx]: res.data.explanation }))
    } catch { setExplanations(e => ({ ...e, [idx]: 'Could not load explanation.' })) }; setExplaining(null)
  }

  const answered = Object.keys(answers).length; const remaining = questions.length - answered

  if (phase === 'setup') return (
    <div className="max-w-[1440px] mx-auto px-6 md:px-12 py-12 bg-[var(--color-paper)] min-h-screen relative" ref={revealRef}>
      <div className="grain pointer-events-none" />

      <div className="mb-24 flex flex-col md:flex-row items-end justify-between gap-12 relative z-10">
        <div className="max-w-4xl">
          <p className="eyebrow">EXAM_PROTOCOL_v9.1</p>
          <h1 className="font-serif font-black text-7xl md:text-[10rem] tracking-tighter uppercase leading-[0.8] italic">
            MOCK <br /><span className="text-[var(--color-gold)] not-italic">EXAMS.</span>
          </h1>
          <p className="font-serif italic text-2xl text-[var(--color-muted)] mt-12 border-l-4 border-[var(--color-gold)] pl-8 max-w-xl uppercase tracking-tighter">Full-length standardized evaluation protocols for academic sovereignty.</p>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-16 relative z-10">
        {Object.entries(EXAM_CONFIG).map(([type, c]) => (
          <button key={type} onClick={() => setExamType(type)} className={`border-4 p-8 text-left transition-all ${examType === type ? 'bg-[var(--color-ink)] text-white border-[var(--color-ink)] shadow-[16px_16px_0_var(--color-gold)]' : 'bg-white border-[var(--color-ink)] text-[var(--color-ink)] shadow-[8px_8px_0_var(--color-cream)]'}`}>
            <p className="font-mono text-[9px] font-black uppercase tracking-widest opacity-40 mb-4">{type}_PROTOCOL</p>
            <p className="font-serif font-black text-4xl italic uppercase tracking-tighter leading-none mb-2">{c.label}</p>
            <p className="font-mono text-[9px] font-black uppercase tracking-wider">{c.questions}Q // {c.minutes}M</p>
          </button>
        ))}
      </div>

      <div className="border-4 border-[var(--color-ink)] bg-white p-12 md:p-16 shadow-[32px_32px_0_var(--color-cream)] relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-24 items-center">
          <div className="space-y-12">
            <p className="eyebrow">PROTOCOL_PARAMS_v4</p>
            <div>
              <label className="font-mono text-[9px] font-black uppercase tracking-[0.4em] text-[var(--color-gold)] block mb-4">CHRONO_INDEX (YEAR_SELECTION)</label>
              <select value={year} onChange={e => setYear(e.target.value)} className="w-full bg-[var(--color-paper)] border-4 border-[var(--color-ink)] p-8 font-serif font-black text-3xl italic placeholder:opacity-20 uppercase tracking-tighter outline-none focus:bg-white transition-all appearance-none cursor-pointer">
                <option value="">GENERAL_MIXED_ARCHIVE</option>
                {years.map(y => <option key={y} value={y}>{y}_SESSION</option>)}
              </select>
            </div>
            <div className="grid grid-cols-3 gap-8 ">
              {[{ label: 'VOLUME', value: cfg.questions + 'Q' }, { label: 'DURATION', value: cfg.minutes + 'M' }, { label: 'GRADING', value: 'LUXE' }].map(s => (
                <div key={s.label} className="border-2 border-[var(--color-ink)] p-4 bg-[var(--color-paper)]">
                  <p className="font-mono text-[8px] font-black uppercase text-[var(--color-muted)] mb-1">{s.label}</p>
                  <p className="font-serif font-black text-2xl italic leading-none">{s.value}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-12">
            <div className="bg-[var(--color-cream)] border-2 border-[var(--color-gold)] p-8 text-[var(--color-ink)] font-serif italic text-xl uppercase tracking-tighter leading-tight relative overflow-hidden">
              <div className="absolute top-0 right-0 px-4 py-1 bg-[var(--color-gold)] font-mono text-[8px] font-black text-white">NOTICE_v12</div>
              ALERT: ONCE INITIALIZED, THE TEMPORAL LIMIT CANNOT BE MODIFIED. ALL UNRESOLVED NODES WILL BE MARKED AS FAILURE. COMMIT FULL COGNITIVE RESOURCE.
            </div>
            <button onClick={startExam} disabled={loading} className="w-full bg-[var(--color-ink)] text-white py-12 font-serif font-black text-4xl uppercase tracking-tighter italic hover:bg-black transition-all shadow-[12px_12px_0_var(--color-gold)]">
              {loading ? 'INITIALIZING_STREAM...' : `ENGAGE_${cfg.label}_PROTOCOL ➔`}
            </button>
          </div>
        </div>
      </div>
    </div>
  )

  const q = questions[current]

  if (phase === 'exam') return (
    <div className="max-w-[1440px] mx-auto bg-[var(--color-paper)] min-h-screen">
      <div className="sticky top-0 z-50 bg-white border-b-4 border-[var(--color-ink)] px-12 py-6 flex items-center justify-between">
        <div className="flex items-center gap-12">
          <p className="font-serif font-black text-3xl italic tracking-tighter uppercase text-[var(--color- ink)]">{cfg.label}_EXAM</p>
          <div className="flex gap-1">
            {questions.map((_, i) => (
              <div key={i} className={`h-2 border-[1px] border-[var(--color-ink)] ${i === current ? 'bg-[var(--color-gold)] w-8' : answers[i] ? 'bg-[var(--color-teal)] w-3' : 'bg-white w-2'} transition-all`} />
            ))}
          </div>
        </div>
        <div className="flex items-center gap-12">
          <div className="text-right">
            <p className="font-mono text-[9px] font-black uppercase text-[var(--color-muted)]">TEMPORAL_REMAINING</p>
            <p className={`font-serif font-black text-4xl italic leading-none ${timeLeft < 300 ? 'text-red-600 animate-pulse' : ''}`}>{formatTime(timeLeft)}</p>
          </div>
          <button onClick={() => { if (confirm('COMMIT_FOR_EVALUATION?')) submitExam() }} disabled={submitting} className="bg-[var(--color-ink)] text-white px-12 py-4 font-serif font-black text-xl italic uppercase tracking-tighter hover:bg-black transition-all">COMMIT_EVAL</button>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-12 py-24 grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-24 relative">
        <div className="space-y-12 relative z-10">
          <div className="border-4 border-[var(--color-ink)] bg-white p-12 md:p-24 shadow-[48px_48px_0_var(--color-cream)] relative overflow-hidden">
            <div className="absolute top-0 right-0 px-12 py-3 bg-[var(--color-ink)] font-mono text-[10px] font-black uppercase text-white">PROBLEM_STREAMS // 0{current + 1}</div>
            <div className="mb-16">
              <p className="font-mono text-[9px] font-black uppercase text-[var(--color-gold)] mb-4 tracking-widest">{q.topic || 'GEN_CALCULUS'}</p>
              <p className="font-serif font-black text-4xl md:text-5xl italic uppercase leading-none tracking-tighter italic text-[var(--color-ink)]">{q.question_text}</p>
            </div>
            <div className="space-y-4">
              {['A', 'B', 'C', 'D'].map(letter => (
                <OptionBtn key={letter} letter={letter} text={q[`option_${letter.toLowerCase()}`]} selected={answers[current]} revealed={false} onClick={l => setAnswers(a => ({ ...a, [current]: l }))} />
              ))}
            </div>
            <div className="flex gap-4 mt-16 pt-12 border-t-2 border-[var(--color-ink)]/5">
              <button onClick={() => setCurrent(c => Math.max(0, c - 1))} disabled={current === 0} className="flex-1 border-4 border-[var(--color-ink)] py-8 font-serif font-black text-2xl italic uppercase tracking-tighter disabled:opacity-20 hover:bg-[var(--color-cream)]">PREV_NODE</button>
              <button onClick={() => setCurrent(c => Math.min(questions.length - 1, c + 1))} disabled={current === questions.length - 1} className="flex-1 bg-[var(--color-ink)] text-white py-8 font-serif font-black text-2xl italic uppercase tracking-tighter disabled:opacity-20 hover:bg-black">NEXT_NODE ➔</button>
            </div>
          </div>
        </div>

        <div className="relative z-10">
          <div className="sticky top-48 border-4 border-[var(--color-ink)] bg-white p-8">
            <p className="eyebrow mb-8">NODE_MAP</p>
            <div className="grid grid-cols-5 gap-2">
              {questions.map((_, i) => (
                <button key={i} onClick={() => setCurrent(i)} className={`w-10 h-10 border-2 font-mono text-[10px] font-black flex items-center justify-center transition-all ${i === current ? 'bg-[var(--color-gold)] text-white border-[var(--color-gold)]' : answers[i] ? 'bg-[var(--color-teal)] text-white border-[var(--color-teal)]' : 'bg-white border-[var(--color-ink)] text-[var(--color-ink)] opacity-30 hover:opacity-100'}`}>
                  {i + 1}
                </button>
              ))}
            </div>
            <div className="mt-8 space-y-4 border-t-2 border-[var(--color-ink)]/5 pt-8">
              <div className="flex items-center gap-4"><div className="w-4 h-4 bg-[var(--color-teal)]" /><p className="font-mono text-[8px] font-black uppercase text-[var(--color-muted)]">RESOLVED</p></div>
              <div className="flex items-center gap-4"><div className="w-4 h-4 border-2 border-[var(--color-ink)]" /><p className="font-mono text-[8px] font-black uppercase text-[var(--color-muted)]">OPEN_NODES</p></div>
              <div className="flex items-center gap-4"><div className="w-4 h-4 bg-[var(--color-gold)]" /><p className="font-mono text-[8px] font-black uppercase text-[var(--color-muted)]">ACTIVE_INDEX</p></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )

  if (phase === 'review') return (
    <div className="max-w-[1440px] mx-auto px-6 md:px-12 py-24 bg-[var(--color-paper)] min-h-screen relative" ref={revealRef}>
      <div className="grain pointer-events-none" />

      <div className="border-8 border-[var(--color-ink)] bg-white p-12 md:p-32 shadow-[64px_64px_0_var(--color-cream)] text-center relative z-10">
        <p className="eyebrow mx-auto justify-center mb-16">EVALUATION_HEURISTICS_v9.2</p>
        <div className="mb-24">
          <h2 className="font-serif font-black text-9xl md:text-[20rem] italic uppercase tracking-tighter leading-[0.7] mb-8 text-[var(--color-ink)]">{result.grade.grade}</h2>
          <p className="font-mono text-[14px] font-black uppercase tracking-[0.8em] text-[var(--color-gold)] italic">{result.grade.label}</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 mb-24">
          {[{ label: 'ACCURACY', value: result.pct + '%' }, { label: 'RESOLVED', value: result.correct + '/' + result.total }, { label: 'TEMPORAL', value: formatTime(result.timeTaken) }, { label: 'TYPE', value: cfg.label }].map(s => (
            <div key={s.label} className="border-4 border-[var(--color-ink)] p-8 bg-[var(--color-paper)]">
              <p className="font-mono text-[9px] font-black uppercase text-[var(--color-muted)] mb-4">{s.label}</p>
              <p className="font-serif font-black text-4xl italic leading-none">{s.value}</p>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-24">
          <button onClick={() => setPhase('setup')} className="bg-[var(--color-ink)] text-white py-12 font-serif font-black text-4xl uppercase tracking-tighter italic hover:bg-black transition-all shadow-[16px_16px_0_var(--color-gold)]">NEW_PROTOCOL ➔</button>
          <button onClick={() => setShowShareCard(true)} className="border-4 border-[var(--color-ink)] py-12 font-serif font-black text-4xl uppercase tracking-tighter italic hover:bg-[var(--color-cream)] transition-all">BROADCAST_CREDENTIAL ➔</button>
        </div>

        <div className="mt-24 pt-24 border-t-8 border-[var(--color-ink)]/5 text-left">
          <h3 className="font-serif font-black text-6xl italic uppercase tracking-tighter mb-16">NODE_REVIEW_STREAMS.</h3>
          <div className="space-y-12">
            {questions.map((q, i) => {
              const isCorrect = answers[i] === q.correct_answer; const isSkipped = answers[i] == null
              return (
                <div key={i} className="border-4 border-[var(--color-ink)] bg-white shadow-[16px_16px_0_var(--color-cream)]/5">
                  <div className="p-8 border-b-2 border-[var(--color-ink)]/5 flex items-center justify-between">
                    <p className="font-serif font-black text-2xl italic uppercase tracking-tighter transition-all">Q_0{i + 1} // {q.topic || 'GEN_EXAM'}</p>
                    <span className={`font-mono text-[10px] font-black uppercase ${isCorrect ? 'text-green-600' : isSkipped ? 'text-amber-600' : 'text-red-600'}`}>{isCorrect ? 'RESOLVED_CORR' : isSkipped ? 'DATA_ABSENT' : 'LOGICAL_FAIL'}</span>
                  </div>
                  <div className="p-12">
                    <p className="font-serif italic text-3xl uppercase tracking-tighter leading-tight mb-12">{q.question_text}</p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
                      {['A', 'B', 'C', 'D'].map(l => (
                        <OptionBtn key={l} letter={l} text={q[`option_${l.toLowerCase()}`]} selected={answers[i]} correct={q.correct_answer} revealed />
                      ))}
                    </div>
                    {!isCorrect && (
                      <div className="mt-12">
                        {explanations[i] ? (
                          <div className="bg-[var(--color-paper)] border-4 border-dashed border-[var(--color-ink)]/10 p-12">
                            <p className="eyebrow mb-8">EULER_AI_DECONSTRUCTION</p>
                            <div className="font-serif font-black text-2xl italic uppercase tracking-tighter leading-tight text-[var(--color-ink)]"><ExplanationBody text={explanations[i]} /></div>
                          </div>
                        ) : (
                          <button onClick={() => explainQ(i)} disabled={explaining === i} className="font-mono text-[10px] font-black uppercase text-[var(--color-gold)] hover:underline italic tracking-[0.2em]">INITIALIZE_DECONSTRUCTION ➔</button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {showShareCard && result && (
        <ShareResultCard pct={result.pct} score={result.correct} total={result.total} examType={examType} topic={year ? `${examType} ${year}` : examType} onClose={() => setShowShareCard(false)} />
      )}
    </div>
  )
}
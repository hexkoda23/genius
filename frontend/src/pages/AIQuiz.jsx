import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { generateMCQ } from '../services/api'
import { ExplanationBody } from '../utils/RenderMath'
import { useReveal } from '../hooks/useReveal'

const TEACH_LEVEL_KEY = 'mathgenius_teach_level'
const PROFILE_LEVEL_MAP = { primary: 'primary', jss: 'jss', 'junior secondary': 'jss', secondary: 'secondary', sss: 'secondary', university: 'university' }

function resolveLevel(profile) {
  if (profile?.level) { const mapped = PROFILE_LEVEL_MAP[profile.level.toLowerCase()]; if (mapped) return mapped }
  try { const stored = localStorage.getItem(TEACH_LEVEL_KEY); if (stored && PROFILE_LEVEL_MAP[stored] !== undefined) return stored } catch { }
  return 'secondary'
}

const LEVEL_TOPICS = {
  primary: ['Counting and Place Value', 'Fractions', 'Addition and Subtraction', 'Multiplication and Division', 'Decimals and Money', 'Percentages', 'Perimeter and Area', 'Angles', 'Symmetry', 'Pictograms', 'Time', 'Factors'],
  jss: ['Whole Numbers', 'Fractions', 'Percentages', 'Ratio and Proportion', 'Algebraic Expressions', 'Simple Equations', 'Angles', 'Circles', 'Perimeter', 'Mean, Median, Mode', 'Profit and Loss', 'Simple Interest', 'Number Bases', 'Venn Diagrams'],
  secondary: ['Quadratic Equations', 'Logarithms', 'Simultaneous Equations', 'Sequences and Series', 'Binomial Expansion', 'Circle Theorems', 'Trigonometric Ratios', 'Bearings', 'Vectors and Matrices', 'Probability', 'Differentiation', 'Integration', 'Statistics', 'Indices'],
  university: ['Integration by Parts', 'Taylor Series', 'Eigenvalues', 'Laplace Transforms', 'Partial Derivatives', 'First Order ODEs', 'Complex Numbers', 'Binomial Theorem', 'Normal Distribution', 'Newton-Raphson', 'Multiple Integrals', 'Hypothesis Testing', 'Fourier Series'],
}
const LEVEL_API_MAP = { primary: 'primary', jss: 'junior secondary', secondary: 'secondary', university: 'university' }
const LEVEL_META = {
  primary: { label: 'PRIM_ARCHIVE', emoji: '📚', color: '#1a4d4d' },
  jss: { label: 'JSS_ARCHIVE', emoji: '🏫', color: '#92400e' },
  secondary: { label: 'SEC_ARCHIVE', emoji: '🎓', color: '#1e3a8a' },
  university: { label: 'UNI_ARCHIVE', emoji: '🏛️', color: '#1a1a1a' },
}
const DIFFICULTY_OPTIONS = ['easy', 'medium', 'hard']
const OPTION_LETTERS = ['A', 'B', 'C', 'D']

export default function AIQuiz() {
  const { user, profile } = useAuth(); const revealRef = useReveal()
  const [level, setLevel] = useState(() => resolveLevel(null)); const [topic, setTopic] = useState(''); const [difficulty, setDifficulty] = useState('medium')
  const [generating, setGenerating] = useState(false); const [question, setQuestion] = useState(null); const [selected, setSelected] = useState(null)
  const [submitted, setSubmitted] = useState(false); const [score, setScore] = useState({ correct: 0, total: 0 }); const [error, setError] = useState(null)

  useEffect(() => { if (profile) setLevel(resolveLevel(profile)) }, [profile])
  useEffect(() => {
    const onStorage = (e) => { if (e.key === TEACH_LEVEL_KEY && e.newValue) { setLevel(e.newValue); setTopic(''); setQuestion(null) } }
    window.addEventListener('storage', onStorage); return () => window.removeEventListener('storage', onStorage)
  }, [])

  const handleLevelChange = (newLevel) => { setLevel(newLevel); setTopic(''); setQuestion(null); setSelected(null); setSubmitted(false); try { localStorage.setItem(TEACH_LEVEL_KEY, newLevel) } catch { } }
  const currentTopics = LEVEL_TOPICS[level] || LEVEL_TOPICS.secondary; const currentMeta = LEVEL_META[level]; const apiLevel = LEVEL_API_MAP[level] || 'secondary'

  const generate = async () => {
    if (!topic.trim() || generating) return; setGenerating(true); setQuestion(null); setSelected(null); setSubmitted(false); setError(null)
    try { const res = await generateMCQ(topic.trim(), difficulty, apiLevel); setQuestion(res.data) } catch { setError('GENERATION_FAILURE') }; setGenerating(false)
  }
  const handleSubmit = () => { if (!selected || submitted) return; const isCorrect = selected === question.correct_answer; setSubmitted(true); setScore(s => ({ correct: s.correct + (isCorrect ? 1 : 0), total: s.total + 1 })) }

  return (
    <div className="max-w-[1440px] mx-auto px-6 md:px-12 py-12 bg-[var(--color-paper)] min-h-screen relative" ref={revealRef}>
      <div className="grain pointer-events-none" />

      <div className="mb-24 flex flex-col md:flex-row items-end justify-between gap-12 relative z-10">
        <div className="max-w-4xl">
          <p className="eyebrow">NEURAL_DECONSTRUCTION_v5.1</p>
          <h1 className="font-serif font-black text-7xl md:text-[10rem] tracking-tighter uppercase leading-[0.8] italic">
            AI <br /><span className="text-[var(--color-gold)] not-italic">QUIZ.</span>
          </h1>
          <p className="font-serif italic text-2xl text-[var(--color-muted)] mt-12 border-l-4 border-[var(--color-gold)] pl-8 max-w-xl uppercase tracking-tighter">Euler-driven cognitive expansion through instantaneous topic-node synthesis.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[1fr_400px] gap-24 relative z-10">
        {/* Main Workspace */}
        <div className="space-y-12">
          <div className="border-4 border-[var(--color-ink)] bg-white p-12 md:p-16 shadow-[32px_32px_0_var(--color-cream)]">
            <p className="eyebrow mb-12">TOPIC_INJECTION_NODE</p>
            <div className="space-y-12">
              <div className="space-y-4">
                <p className="font-mono text-[9px] font-black uppercase tracking-[0.4em] text-[var(--color-gold)]">COGNITIVE_SECTOR</p>
                <input type="text" value={topic} onChange={e => setTopic(e.target.value)} onKeyDown={e => e.key === 'Enter' && generate()} placeholder="INPUT_COGNITIVE_TARGET..." className="w-full bg-[var(--color-paper)] border-4 border-[var(--color-ink)] p-8 font-serif font-black text-3xl italic placeholder:opacity-20 uppercase tracking-tighter outline-none focus:bg-white transition-all" />
                <div className="flex flex-wrap gap-2 mt-4">
                  {currentTopics.map(t => (
                    <button key={t} onClick={() => setTopic(t)} className={`px-4 py-2 font-mono text-[9px] font-black uppercase border-2 transition-all ${topic === t ? 'bg-[var(--color-ink)] text-white border-[var(--color-ink)]' : 'border-[var(--color-ink)] hover:bg-[var(--color-cream)]'}`}>{t}</button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                <div className="space-y-4">
                  <p className="font-mono text-[9px] font-black uppercase tracking-[0.4em] text-[var(--color-gold)]">MASTERY_DOMAIN</p>
                  <div className="grid grid-cols-2 gap-2">
                    {Object.entries(LEVEL_META).map(([key, meta]) => (
                      <button key={key} onClick={() => handleLevelChange(key)} className={`p-4 border-2 font-mono text-[9px] font-black uppercase flex flex-col items-center gap-2 transition-all ${level === key ? 'bg-[var(--color-ink)] text-white border-[var(--color-ink)] shadow-[8px_8px_0_var(--color-gold)]' : 'border-[var(--color-ink)] hover:bg-[var(--color-cream)]'}`}>
                        <span className="text-xl">{meta.emoji}</span>
                        <span>{meta.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
                <div className="space-y-4">
                  <p className="font-mono text-[9px] font-black uppercase tracking-[0.4em] text-[var(--color-gold)]">INTENSITY_STRATA</p>
                  <div className="grid grid-cols-3 gap-2">
                    {DIFFICULTY_OPTIONS.map(d => (
                      <button key={d} onClick={() => setDifficulty(d)} className={`p-4 border-2 font-mono text-[9px] font-black uppercase transition-all ${difficulty === d ? 'bg-[var(--color-ink)] text-white border-[var(--color-ink)] shadow-[8px_8px_0_var(--color-gold)]' : 'border-[var(--color-ink)] hover:bg-[var(--color-cream)]'}`}>{d.slice(0, 3)}</button>
                    ))}
                  </div>
                </div>
              </div>

              <button onClick={generate} disabled={!topic.trim() || generating} className="w-full bg-[var(--color-ink)] text-white py-12 font-serif font-black text-4xl uppercase tracking-tighter italic hover:bg-black transition-all shadow-[12px_12px_0_var(--color-gold)] disabled:opacity-20">
                {generating ? 'SYNTHESIZING_NODE...' : 'GENERATE_CHALLENGE ➔'}
              </button>
            </div>
          </div>

          {question && !generating && (
            <div className="border-4 border-[var(--color-ink)] bg-white shadow-[48px_48px_0_var(--color-cream)] relative overflow-hidden">
              <div className="absolute top-0 right-0 px-12 py-3 bg-[var(--color-ink)] font-mono text-[10px] font-black uppercase text-white">ACTIVE_SYNTHESIS // {topic}</div>
              <div className="p-12 md:p-24 border-b-4 border-[var(--color-ink)]/10">
                <p className="font-serif font-black text-4xl md:text-5xl italic uppercase leading-none tracking-tighter text-[var(--color-ink)]"><ExplanationBody text={question.question_text} /></p>
              </div>
              <div className="p-12 space-y-4">
                {OPTION_LETTERS.map(letter => {
                  const text = (question[`option_${letter.toLowerCase()}`]); if (!text) return null
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
                  <p className={`font-serif font-black text-3xl italic uppercase tracking-tighter mb-8 ${selected === question.correct_answer ? 'text-green-700' : 'text-red-700'}`}>{selected === question.correct_answer ? 'RESOLUTION_VERIFIED_SUCCESS.' : `RESOLUTION_FAILURE. CORRECT: ${question.correct_answer}`}</p>
                  {question.explanation && (
                    <div className="bg-white border-2 border-[var(--color-ink)] p-12 mb-8">
                      <p className="eyebrow mb-8">EULER_AI_DECONSTRUCTION</p>
                      <div className="font-serif font-black text-2xl italic uppercase tracking-tighter leading-tight text-[var(--color-ink)]"><ExplanationBody text={question.explanation} /></div>
                    </div>
                  )}
                  <button onClick={generate} className="w-full bg-[var(--color-ink)] text-white py-8 font-serif font-black text-2xl uppercase tracking-tighter italic hover:bg-black transition-all shadow-[8px_8px_0_var(--color-gold)]">INITIALIZE_NEXT_NODE ➔</button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Sidebar Telemetry */}
        <div className="relative z-10">
          <div className="sticky top-48 space-y-12">
            <div className="border-4 border-[var(--color-ink)] bg-white p-8 shadow-[12px_12px_0_var(--color-cream)]">
              <p className="eyebrow mb-8">SESSION_TELEMETRY</p>
              <div className="space-y-8">
                <div>
                  <p className="font-mono text-[9px] font-black uppercase text-[var(--color-muted)] mb-2">ACCURACY_CONCORDANCE</p>
                  <p className="font-serif font-black text-6xl italic leading-none">{score.total > 0 ? Math.round((score.correct / score.total) * 100) : 0}%</p>
                </div>
                <div>
                  <p className="font-mono text-[9px] font-black uppercase text-[var(--color-muted)] mb-2">NODES_RESOLVED</p>
                  <p className="font-serif font-black text-4xl italic leading-none">{score.correct}/{score.total}</p>
                </div>
                <div className="w-full h-2 bg-[var(--color-paper)] border-2 border-[var(--color-ink)]">
                  <div className="h-full bg-[var(--color-teal)]" style={{ width: `${score.total > 0 ? (score.correct / score.total) * 100 : 0}%` }} />
                </div>
              </div>
            </div>
            {error && <div className="border-4 border-red-600 bg-red-50 p-8 font-serif font-black text-xl italic uppercase tracking-tighter text-red-700">SYNTHESIS_ERROR_V.404</div>}
          </div>
        </div>
      </div>
    </div>
  )
}

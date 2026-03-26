import { useState, useEffect, useRef, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { useSearchParams } from 'react-router-dom'
import { generateQuestion, gradeAnswer, getWorkedExample } from '../services/api'
import { createSession, saveAttempt, completeSession, getSessionHistory } from '../lib/practice'
import { submitAssignment } from '../lib/social2'
import { getConversations } from '../lib/conversations'
import { ExplanationBody } from '../utils/RenderMath'
import { useReveal } from '../hooks/useReveal'
import {
  updateStreak, getStreak,
  updateTopicMastery, getTopicMastery,
  updateSpacedRepetition, getDueTopics,
} from '../lib/learning'
import { updateTopicProgress } from '../lib/progress'

// Modular Components
import { VideoBrowser, VideoPanel } from '../components/practice/PracticeVideos'
import { MasteryBar, StepBreakdown } from '../components/practice/PracticeSessionUI'

const CHALLENGE_TIME = 60
const DIFFICULTY_CONFIG = {
  easy: { label: 'Easy', color: 'var(--color-teal)', emoji: '●' },
  medium: { label: 'Medium', color: 'var(--color-gold)', emoji: '▲' },
  hard: { label: 'Hard', color: '#ef4444', emoji: '■' },
}
const LEVEL_LABELS = { primary: 'Primary', jss: 'Junior', sss: 'Senior', university: 'Academic' }

export default function Practice() {
  const { user, profile } = useAuth(); const [searchParams] = useSearchParams()
  const [topicsByLevel, setTopicsByLevel] = useState({}); const [selectedLevel, setSelectedLevel] = useState('')
  const [topic, setTopic] = useState(''); const [difficulty, setDifficulty] = useState('easy'); const [started, setStarted] = useState(false)
  const [setupTab, setSetupTab] = useState('practice'); const [loading, setLoading] = useState(false)
  const [sessionError, setSessionError] = useState(null); const [sessionId, setSessionId] = useState(null)
  const [questionNumber, setQuestionNumber] = useState(1); const [question, setQuestion] = useState('')
  const [answer, setAnswer] = useState(''); const [studentAnswer, setStudentAnswer] = useState(''); const [submitted, setSubmitted] = useState(false)
  const [gradeResult, setGradeResult] = useState(null); const [score, setScore] = useState(0); const [correctCount, setCorrectCount] = useState(0)
  const [finished, setFinished] = useState(false); const [history, setHistory] = useState([]); const [elapsed, setElapsed] = useState(0)
  const [sessionMode, setSessionMode] = useState('normal'); const [mixedTopics, setMixedTopics] = useState([]); const [predictedTopics, setPredictedTopics] = useState([])
  const [workedExample, setWorkedExample] = useState(null); const [showWorkedExample, setShowWorkedExample] = useState(false)
  const [hints, setHints] = useState([]); const [hintLevel, setHintLevel] = useState(0); const [askedQuestions, setAskedQuestions] = useState([])
  const [challengeMode, setChallengeMode] = useState(false); const [timeLeft, setTimeLeft] = useState(CHALLENGE_TIME)
  const [streak, setStreak] = useState(null); const [masteryData, setMasteryData] = useState([]); const [dueTopics, setDueTopics] = useState([])
  const [assignmentId, setAssignmentId] = useState(null)
  const timerRef = useRef(); const revealRef = useReveal()

  const loadData = useCallback(async () => {
    if (!user) return
    const [hist, strk, mast, due, convs] = await Promise.all([
      getSessionHistory(user.id), getStreak(user.id), getTopicMastery(user.id), getDueTopics(user.id), getConversations(user.id)
    ])
    setHistory(hist.data || []); setStreak(strk.data || null); setMasteryData(mast.data || []); setDueTopics(due.data || [])
    if (convs.data?.length) {
      const g = {}; convs.data.forEach(c => { if (c.topic) { const lv = (c.level === 'secondary' ? 'sss' : c.level) || 'sss'; if (!g[lv]) g[lv] = new Set(); g[lv].add(c.topic) } })
      const f = Object.fromEntries(Object.entries(g).map(([l, ts]) => [l, [...ts].sort()])); setTopicsByLevel(f)
      if (!selectedLevel && Object.keys(f).length) setSelectedLevel(Object.keys(f)[0])
    } else {
      const fallback = {
        sss: ['Quadratic Equations', 'Logarithms', 'Differentiation', 'Integration', 'Probability', 'Trigonometry', 'Matrices', 'Vectors', 'Circle Theorems'],
        jss: ['Algebraic Expressions', 'Simple Equations', 'Factorisation', 'Area of Shapes', 'Perimeter', 'Angles in Triangles', 'Ratios and Proportions'],
        primary: ['Addition and Subtraction', 'Multiplication and Division', 'Fractions', 'Decimals', 'Percentages', 'Basic Geometry'],
        university: ['Calculus I', 'Calculus II', 'Linear Algebra', 'Differential Equations'],
      }
      setTopicsByLevel(fallback)
      if (!selectedLevel) setSelectedLevel('sss')
    }
  }, [user, selectedLevel])

  useEffect(() => { loadData() }, [loadData])
  useEffect(() => {
    const uTopic = searchParams.get('topic'); const uAssign = searchParams.get('assignment')
    if (uTopic) setTopic(uTopic); if (uAssign) setAssignmentId(uAssign)
  }, [searchParams])

  const submitRef = useRef(null)
  useEffect(() => {
    if (!started || finished) return
    const id = setInterval(() => {
      if (challengeMode) {
        setTimeLeft(t => {
          if (t <= 1) {
            submitRef.current && submitRef.current(true)
            return 0
          }
          return t - 1
        })
      } else {
        setElapsed(e => e + 1)
      }
    }, 1000)
    return () => clearInterval(id)
  }, [started, finished, challengeMode])

  const startSession = async (customTopic, customLvl, m = 'normal', mSlots = [], pSlots = []) => {
    const t = customTopic || topic; const l = customLvl || selectedLevel || 'sss'; if (!t) return
    setLoading(true); setSessionError(null); setSessionMode(m); setMixedTopics(mSlots); setPredictedTopics(pSlots)
    try {
      const { data: s } = await createSession(user.id, t, l, difficulty)
      setSessionId(s?.id || null); setAskedQuestions([]); setCorrectCount(0); setScore(0); setQuestionNumber(1); setFinished(false)
      if (m === 'normal') {
        const ex = await getWorkedExample(t, l, difficulty).catch(() => null)
        if (ex?.data?.example) { setWorkedExample(ex.data); setShowWorkedExample(true) }
      }
      await loadQuestion(1, t, l, m, mSlots, pSlots)
      setStarted(true)
    } catch { setSessionError('Uplink failed. Session initialization failed.') } finally { setLoading(false) }
  }

  const loadQuestion = async (num, t, l, m, mSlots, pSlots) => {
    setLoading(true); setStudentAnswer(''); setSubmitted(false); setGradeResult(null); setElapsed(0); setHints([]); setHintLevel(0)
    try {
      let qT = t, qL = l
      if (m === 'mixed' && mSlots.length) { qT = mSlots[num - 1].topic; qL = mSlots[num - 1].level; setTopic(qT) }
      else if (m === 'predicted' && pSlots.length) { qT = pSlots[num - 1].topic; qL = pSlots[num - 1].level; setTopic(qT) }
      const res = await generateQuestion(qT, qL, difficulty, num, askedQuestions)
      setQuestion(res.data.question); setAnswer(res.data.answer); setHints(res.data.hints || []); setAskedQuestions(p => [...p, res.data.question])
    } catch { setQuestion('Engine failed to produce challenge.') } finally { setLoading(false) }
  }

  const handleSubmit = async () => {
    if (!studentAnswer.trim() || submitted) return
    setLoading(true)
    try {
      const { data: grade } = await gradeAnswer(topic, question, answer, studentAnswer)
      setGradeResult(grade); setSubmitted(true); setScore(s => s + (grade.score || 0))
      if (grade.is_correct) setCorrectCount(c => c + 1)
      if (user && topic) updateTopicProgress(user.id, topic, selectedLevel, grade.is_correct)
      if (sessionId) await saveAttempt(sessionId, { questionText: question, studentAnswer, correctAnswer: answer, isCorrect: grade.is_correct, feedback: grade.feedback, timeTaken: elapsed })
    } catch { setGradeResult({ result: 'ERROR', feedback: 'Neural feedback offline.' }) } finally { setLoading(false) }
  }
  useEffect(() => { submitRef.current = handleSubmit }, [handleSubmit])

  const handleNext = async () => {
    if (questionNumber >= 5) {
      const finalScore = Math.round(score / 5); setLoading(true)
      if (sessionId) await completeSession(sessionId, finalScore)
      if (assignmentId && user) await submitAssignment(assignmentId, user.id, sessionId, finalScore)
      if (user && (sessionMode === 'normal' || sessionMode === 'weak-drill')) {
        await Promise.all([updateStreak(user.id), updateTopicMastery(user.id, topic, selectedLevel, finalScore, correctCount, 5), updateSpacedRepetition(user.id, topic, selectedLevel, finalScore)])
      } else if (user) await updateStreak(user.id)
      await loadData(); setFinished(true); setLoading(false)
    } else {
      const next = questionNumber + 1; setQuestionNumber(next)
      await loadQuestion(next, topic, selectedLevel, sessionMode, mixedTopics, predictedTopics)
    }
  }

  const SetupView = () => (
    <div className="max-w-7xl mx-auto px-6 py-12 lg:py-24" ref={revealRef}>
      <div className="flex flex-col lg:grid lg:grid-cols-[1fr_420px] gap-16">
        <div className="space-y-12">
          <div className="space-y-4">
            <p className="text-[11px] font-bold text-[var(--color-teal)] uppercase tracking-widest">Training Module</p>
            <h1 className="text-5xl lg:text-7xl font-extrabold text-[var(--color-ink)] tracking-tight">Forge Your <span className="text-[var(--color-teal)]">Mastery.</span></h1>
            <p className="text-lg font-medium text-[var(--color-muted)] max-w-xl">High-intensity mathematical conditioning across verified academic sectors.</p>
          </div>

          <div className="flex bg-[var(--color-cream)] p-1 rounded-2xl border border-[var(--color-border)] max-w-md">
            {['practice', 'videos'].map(t => (
              <button key={t} onClick={() => setSetupTab(t)}
                className={`flex-1 py-3 rounded-xl text-xs font-bold uppercase tracking-widest transition-all ${setupTab === t ? 'bg-white text-[var(--color-ink)] shadow-md' : 'text-[var(--color-muted)] hover:text-[var(--color-ink)]'}`}>
                {t} Interface
              </button>
            ))}
          </div>

          {setupTab === 'practice' ? (
            <div className="space-y-12 animate-fade-in">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {[
                  { label: 'Weakest Drill', icon: '🎯', desc: 'Focus on vulnerabilities' },
                  { label: 'Mixed Depth', icon: '🔋', desc: 'Random topic sweep' },
                  { label: 'Predicted Final', icon: '👑', desc: 'Likely exam questions' }
                ].map(m => (
                  <button key={m.label} className="p-8 bg-white border border-[var(--color-border)] rounded-[2.5rem] text-left hover:border-[var(--color-teal)] transition-all group shadow-sm">
                    <div className="text-3xl mb-6 group-hover:scale-110 transition-transform">{m.icon}</div>
                    <h3 className="text-lg font-bold text-[var(--color-ink)] mb-2">{m.label}</h3>
                    <p className="text-[10px] font-bold uppercase text-[var(--color-muted)] opacity-60 tracking-wider font-mono">{m.desc}</p>
                  </button>
                ))}
              </div>

              <div className="space-y-8 p-10 bg-white border border-[var(--color-border)] rounded-[3rem] shadow-sm">
                <div className="space-y-4">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--color-muted)]">Sector Selection</p>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                    {Object.keys(topicsByLevel).map(l => (
                      <button key={l} onClick={() => setSelectedLevel(l)}
                        className={`py-4 rounded-xl border text-xs font-bold transition-all ${selectedLevel === l ? 'bg-[var(--color-ink)] text-white border-[var(--color-ink)] shadow-lg' : 'bg-[var(--color-cream)] text-[var(--color-ink)] border-transparent hover:border-[var(--color-ink)]/20'}`}>
                        {LEVEL_LABELS[l] || l}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-4">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--color-muted)]">Verified Topics</p>
                  <div className="flex flex-wrap gap-2">
                    {topicsByLevel[selectedLevel]?.map(t => (
                      <button key={t} onClick={() => setTopic(t)}
                        className={`px-5 py-2.5 rounded-full border text-[11px] font-bold transition-all ${topic === t ? 'bg-[var(--color-teal)] text-white border-[var(--color-teal)] shadow-md' : 'bg-white text-[var(--color-ink)] border-[var(--color-border)] hover:border-[var(--color-ink)]'}`}>
                        {t}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-6 border-t border-[var(--color-border)]">
                  <div className="space-y-3">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--color-muted)]">Intensity Protocol</p>
                    <div className="flex bg-[var(--color-cream)] p-1 rounded-xl">
                      {Object.entries(DIFFICULTY_CONFIG).map(([k, v]) => (
                        <button key={k} onClick={() => setDifficulty(k)}
                          className={`flex-1 py-3 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all ${difficulty === k ? 'bg-white text-[var(--color-ink)] shadow-sm' : 'text-[var(--color-muted)]'}`}>
                          {v.label}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="space-y-3">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--color-muted)]">Temporal Mode</p>
                    <button onClick={() => setChallengeMode(!challengeMode)}
                      className={`w-full h-full rounded-xl border-2 font-bold text-[10px] uppercase tracking-widest transition-all ${challengeMode ? 'bg-orange-500 border-orange-500 text-white shadow-lg' : 'bg-white border-[var(--color-border)] hover:border-orange-500 hover:text-orange-600'}`}>
                      {challengeMode ? 'Challenge: 60s Limit Active' : 'Normal Pace Mode'}
                    </button>
                  </div>
                </div>

                <button onClick={() => startSession()} disabled={!topic || loading}
                  className="w-full h-16 bg-[var(--color-ink)] text-white rounded-2xl font-bold text-sm uppercase tracking-widest hover:shadow-2xl transition-all disabled:opacity-30 mt-8">
                  {loading ? 'Initializing Engine...' : 'Deploy Drill Station ➔'}
                </button>
              </div>
            </div>
          ) : (
            <VideoBrowser topicsByLevel={topicsByLevel} selectedLevel={selectedLevel} />
          )}
        </div>

        <div className="space-y-8">
          <div className="bg-white border border-[var(--color-border)] rounded-[2.5rem] p-10 shadow-sm relative overflow-hidden group">
            <div className="absolute -right-4 -bottom-4 text-7xl opacity-[0.03] group-hover:scale-125 transition-transform duration-1000">📊</div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--color-teal)] mb-10">Telemetry Snapshot</p>
            <div className="space-y-12">
              <div className="flex items-end gap-3 pb-8 border-b border-[var(--color-border)]">
                <span className="text-8xl font-black tracking-tighter leading-none italic">{streak?.current_streak || 0}</span>
                <span className="text-xs font-bold uppercase text-[var(--color-muted)] mb-3">Day <br /> Streak</span>
              </div>
              <div className="space-y-6">
                <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--color-muted)] opacity-40">Topic Mastery Index</p>
                {masteryData.slice(0, 4).map(m => <MasteryBar key={m.topic} topic={m.topic} mastery={m} />)}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )

  const SessionView = () => (
    <div className="max-w-4xl mx-auto px-6 py-24 space-y-12" ref={revealRef}>
      <div className="flex items-center justify-between border-b border-[var(--color-border)] pb-8">
        <div className="space-y-1">
          <p className="text-[10px] font-bold text-[var(--color-teal)] uppercase tracking-widest">Module: {topic}</p>
          <h2 className="text-3xl font-extrabold text-[var(--color-ink)] tracking-tight">Challenge {questionNumber} / 05</h2>
        </div>
        <div className="text-right">
          <p className="text-[10px] font-bold uppercase text-[var(--color-muted)] mb-1">Time Elapsed</p>
          <p className={`text-4xl font-black tabular-nums ${challengeMode && timeLeft < 10 ? 'text-red-500 animate-pulse' : 'text-[var(--color-ink)]'}`}>
            {challengeMode ? `${timeLeft}s` : `${Math.floor(elapsed / 60)}:${String(elapsed % 60).padStart(2, '0')}`}
          </p>
        </div>
      </div>

      {loading ? (
        <div className="p-48 text-center text-xs font-bold uppercase tracking-widest text-[var(--color-muted)] animate-pulse">Synthesizing Challenge...</div>
      ) : (
        <div className="space-y-10 animate-fade-in">
          <div className="bg-white border border-[var(--color-border)] rounded-[3rem] p-12 lg:p-20 shadow-xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-[var(--color-teal)] rounded-full blur-[100px] opacity-[0.03]" />
            <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--color-teal)] mb-12">Expression Architecture</p>
            <div className="text-2xl lg:text-4xl font-bold leading-relaxed text-[var(--color-ink)]">
              <ExplanationBody text={question} />
            </div>
          </div>

          <div className="space-y-6">
            <div className="relative group">
              <textarea value={studentAnswer} onChange={e => setStudentAnswer(e.target.value)} disabled={submitted}
                placeholder="Enter your resolution..." rows={4}
                className="w-full bg-white border border-[var(--color-border)] rounded-[2.5rem] p-12 text-2xl font-bold text-[var(--color-ink)] outline-none focus:border-[var(--color-teal)] shadow-sm transition-all resize-none disabled:opacity-50" />
              <div className="absolute bottom-6 right-8 flex gap-3">
                <button onClick={() => setHintLevel(p => Math.min(p + 1, hints.length))}
                  disabled={hintLevel >= hints.length || submitted}
                  className="px-6 py-2.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-cream)] text-[10px] font-bold uppercase tracking-widest hover:border-[var(--color-ink)] transition-all disabled:opacity-30">
                  Hint [{hintLevel}/{hints.length}]
                </button>
              </div>
            </div>

            {hintLevel > 0 && (
              <div className="p-6 rounded-2xl bg-amber-50 border border-amber-100 text-sm font-medium text-amber-700 animate-slide-up">
                <p className="text-[10px] font-bold uppercase tracking-wider mb-1 opacity-60">Guidance:</p>
                {hints[hintLevel - 1]}
              </div>
            )}

            <button onClick={submitted ? handleNext : handleSubmit} disabled={!studentAnswer.trim() && !submitted}
              className={`w-full h-16 rounded-2xl font-bold text-sm uppercase tracking-widest transition-all ${submitted ? 'bg-[var(--color-teal)] text-white shadow-xl' : 'bg-[var(--color-ink)] text-white hover:opacity-90'}`}>
              {submitted ? 'Load Next Task ➔' : 'Commit Resolution ➔'}
            </button>
          </div>

          {submitted && gradeResult && (
            <div className="bg-white border border-[var(--color-border)] rounded-[2.5rem] p-10 lg:p-14 shadow-xl animate-slide-up space-y-10">
              <div className="flex flex-col md:flex-row md:items-center gap-8 pb-10 border-b border-[var(--color-border)]">
                <div className={`w-24 h-24 rounded-3xl flex items-center justify-center text-4xl shadow-lg ${gradeResult.is_correct ? 'bg-green-500 text-white' : 'bg-red-500 text-white'}`}>
                  {gradeResult.is_correct ? '✓' : '✗'}
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--color-muted)] mb-1">{gradeResult.is_correct ? 'Success' : 'Attention Required'}</p>
                  <h3 className="text-2xl font-extrabold text-[var(--color-ink)] tracking-tight">{gradeResult.feedback}</h3>
                </div>
              </div>
              {gradeResult.steps?.length > 0 && <StepBreakdown steps={gradeResult.steps} />}
              <div className="pt-8 border-t border-[var(--color-border)]">
                <VideoPanel topic={topic} level={selectedLevel} />
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )

  const FinishedView = () => {
    const p = Math.round(score / 5); const grade = p >= 80 ? 'Distinction' : p >= 60 ? 'Credit' : p >= 40 ? 'Pass' : 'Improvement'
    return (
      <div className="max-w-4xl mx-auto px-6 py-32 text-center space-y-16" ref={revealRef}>
        <div className="space-y-4">
          <p className="text-[11px] font-bold text-[var(--color-teal)] uppercase tracking-widest">Session Complete</p>
          <h1 className="text-7xl lg:text-9xl font-black text-[var(--color-ink)] tracking-tighter italic uppercase">{grade}.</h1>
        </div>

        <div className="bg-white border border-[var(--color-border)] rounded-[3rem] shadow-2xl overflow-hidden grid grid-cols-1 md:grid-cols-2">
          <div className="p-12 lg:p-16 text-left space-y-8">
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--color-muted)]">Analytics Summary</p>
            <div className="space-y-6">
              <div className="flex justify-between items-end pb-4 border-b border-[var(--color-border)]">
                <span className="text-sm font-bold text-[var(--color-ink)]">Performance Score</span>
                <span className="text-5xl font-black text-[var(--color-ink)]">{p}%</span>
              </div>
              <div className="flex justify-between items-end pb-4 border-b border-[var(--color-border)]">
                <span className="text-sm font-bold text-[var(--color-ink)]">Precision Ratio</span>
                <span className="text-5xl font-black text-[var(--color-teal)]">{correctCount}/5</span>
              </div>
            </div>
          </div>
          <div className="p-12 lg:p-16 bg-[var(--color-ink)] text-white text-left relative overflow-hidden">
            <div className="absolute -right-8 -bottom-8 text-[15rem] opacity-[0.05] italic font-black">?</div>
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/40 mb-6">Euler's Evaluation</p>
            <p className="text-2xl font-bold leading-relaxed italic text-white/90">
              "{p >= 60 ? 'Exemplary focus. Your neural pathways on this topic are stabilizing.' : 'Direct remediation suggested. Consult the archives to clarify core principles.'}"
            </p>
          </div>
        </div>

        <div className="max-w-xs mx-auto pt-10">
          <button onClick={() => window.location.reload()} className="w-full h-16 bg-[var(--color-teal)] text-white rounded-2xl font-bold text-sm uppercase tracking-widest shadow-xl hover:scale-105 transition-all">
            Initialize New Drill ➔
          </button>
          <p className="text-[10px] font-bold uppercase tracking-[0.4em] text-[var(--color-muted)] mt-8 italic opacity-40">Session Data Archived</p>
        </div>
      </div>
    )
  }

  return <div className="min-h-screen bg-[var(--color-paper)]">{!started ? <SetupView /> : finished ? <FinishedView /> : <SessionView />}</div>
}

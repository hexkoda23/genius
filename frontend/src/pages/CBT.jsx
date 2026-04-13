import { useState, useEffect, useRef, useCallback } from 'react'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'
import {
  fetchCBTQuestions, createCBTSession, completeCBTSession,
  getCBTHistory, getAvailableTopics, getAvailableYears,
  getQuestionBankStats,
} from '../lib/cbt'
import { explainCBTAnswer, generateCBTReport, getUserProfile } from '../services/api'
import { API_BASE_URL } from '../lib/supabase'
import { ExplanationBody } from '../utils/RenderMath'
import { recordCBTResult, updateStreak } from '../lib/stats'
import { createNotification } from '../lib/notifications'
import { useReveal } from '../hooks/useReveal'

function normalizeImageSrc(src) {
  if (!src) return null
  if (src.startsWith('http://') || src.startsWith('https://')) return src
  
  // Ensure we use the correct base URL for images
  // In production, this should be your Render backend URL
  const base = API_BASE_URL.replace(/\/$/, '')
  
  // If the path already includes /images, don't duplicate it
  if (src.startsWith('/images/')) return `${base}${src}`
  if (src.startsWith('images/')) return `${base}/${src}`
  
  // Otherwise, assume it's a relative path that needs /images prefix
  return `${base}/images/${src.replace(/^\//, '')}`
}

function QuestionImage({ src, alt }) {
  const [error, setError] = useState(false)
  const finalSrc = normalizeImageSrc(src)
  if (!finalSrc || error) {
    return (
      <div className="my-6 p-8 border border-dashed border-[var(--color-border)] rounded-2xl bg-[var(--color-cream)]/50 flex flex-col items-center justify-center text-center animate-pulse">
        <div className="text-4xl mb-3 opacity-30">📐</div>
        <p className="text-sm font-bold text-[var(--color-ink)] opacity-50">Diagram reference found, but image is currently unavailable.</p>
        <p className="text-[10px] text-[var(--color-muted)] mt-1 uppercase tracking-widest">Our team is working on restoring this asset.</p>
        <button
          onClick={(e) => {
            e.preventDefault();
            alert("Thank you! This question has been flagged for image restoration.");
          }}
          className="mt-4 px-4 py-2 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-full text-[10px] font-bold uppercase tracking-wider hover:border-[var(--color-teal)] hover:text-[var(--color-teal)] transition-all"
        >
          Report Missing Diagram
        </button>
      </div>
    )
  }
  return (
    <div className="my-6 rounded-2xl overflow-hidden border border-[var(--color-border)] bg-white shadow-sm ring-1 ring-black/5">
      <img
        src={finalSrc}
        alt={alt || "Question diagram"}
        className="max-h-[400px] w-auto mx-auto object-contain p-2"
        onError={() => setError(true)}
      />
    </div>
  )
}

const EXAM_TYPES = ['JAMB', 'WAEC', 'NECO', 'BECE', 'NABTEB']
const THEORY_ONLY_EXAMS = ['NABTEB']
const EXAM_INFO = {
  JAMB: { label: 'Joint Admissions & Matriculation Board', level: 'University Entry' },
  WAEC: { label: 'West African Examinations Council', level: 'Senior Secondary' },
  NECO: { label: 'National Examinations Council', level: 'Senior Secondary' },
  BECE: { label: 'Basic Education Certificate Exam', level: 'JSS 3' },
  NABTEB: { label: 'National Business & Technical Exams', level: 'Vocational / SSS' },
}
const DURATIONS = [5, 10, 15, 20, 30, 45, 60]
const COUNTS = [5, 10, 20, 30, 40, 50, 60]
const DIFFICULTIES = [
  { value: 'mixed', label: 'Mixed', emoji: '🎲' },
  { value: 'easy', label: 'Easy', emoji: '🟢' },
  { value: 'medium', label: 'Medium', emoji: '🟡' },
  { value: 'hard', label: 'Hard', emoji: '🔴' },
]

function getGrade(pct) {
  if (pct >= 80) return { letter: 'A', color: 'text-green-500', label: 'Excellent' }
  if (pct >= 70) return { letter: 'B', color: 'text-blue-500', label: 'Good' }
  if (pct >= 55) return { letter: 'C', color: 'text-amber-500', label: 'Average' }
  if (pct >= 45) return { letter: 'D', color: 'text-orange-500', label: 'Below Average' }
  return { letter: 'F', color: 'text-red-500', label: 'Fail' }
}

function formatTime(secs) {
  const m = Math.floor(secs / 60); const s = secs % 60
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

function OptionBtn({ letter, text, selected, correct, revealed, onClick }) {
  let base = 'w-full text-left flex items-start gap-4 px-5 py-4 border-2 rounded-xl transition-all'
  let style = 'border-[var(--color-border)] bg-[var(--color-surface)] hover:border-[var(--color-teal)] hover:bg-[var(--color-cream)] text-[var(--color-ink)]'

  if (revealed) {
    if (letter === correct) style = 'border-green-500 bg-green-500/10 text-green-700 dark:text-green-400'
    else if (letter === selected && letter !== correct) style = 'border-red-500 bg-red-500/10 text-red-700 dark:text-red-400'
    else style = 'border-[var(--color-border)] bg-[var(--color-surface)] opacity-40 text-[var(--color-muted)]'
  } else if (selected === letter) {
    style = 'border-[var(--color-teal)] bg-[var(--color-teal)]/10 text-[var(--color-ink)]'
  }

  return (
    <button
      onClick={() => !revealed && onClick(letter)}
      disabled={revealed}
      className={`${base} ${style}`}
    >
      <span className={`shrink-0 w-7 h-7 rounded-full border-2 flex items-center justify-center font-bold text-xs ${revealed && letter === correct ? 'border-green-500 bg-green-500 text-white' :
        revealed && letter === selected && letter !== correct ? 'border-red-500 bg-red-500 text-white' :
          selected === letter && !revealed ? 'border-[var(--color-teal)] bg-[var(--color-teal)] text-white' :
            'border-current'
        }`}>{letter}</span>
      <span className="text-base leading-relaxed flex-1">{text}</span>
      {revealed && letter === correct && <span className="shrink-0 text-green-500 text-xl">✓</span>}
      {revealed && letter === selected && letter !== correct && <span className="shrink-0 text-red-500 text-xl">✗</span>}
    </button>
  )
}

export default function CBT() {
  const { user } = useAuth()
  const [screen, setScreen] = useState('setup')
  const [examType, setExamType] = useState('JAMB')
  const [topics, setTopics] = useState([])
  const [difficulty, setDifficulty] = useState('mixed')
  const [duration, setDuration] = useState(30)
  const [count, setCount] = useState(20)
  const [year, setYear] = useState('')
  const [availTopics, setAvailTopics] = useState([])
  const [availYears, setAvailYears] = useState([])
  const [bankStats, setBankStats] = useState({})
  const [history, setHistory] = useState([])
  const [loadingSetup, setLoadingSetup] = useState(false)
  const [questions, setQuestions] = useState([])
  const [currentIdx, setCurrentIdx] = useState(0)
  const [answers, setAnswers] = useState({})
  const [flagged, setFlagged] = useState({})
  const [timeLeft, setTimeLeft] = useState(0)
  const [sessionId, setSessionId] = useState(null)
  const [startTime, setStartTime] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [showSubmitModal, setShowSubmitModal] = useState(false)
  const [report, setReport] = useState(null)
  const [aiSummary, setAiSummary] = useState('')
  const timerRef = useRef(null)
  const revealRef = useReveal()

  useEffect(() => { if (user) { loadSetupData(); loadHistory() } }, [user])
  useEffect(() => { if (examType) loadTopicsAndYears() }, [examType])

  const loadSetupData = async () => { const stats = await getQuestionBankStats(); setBankStats(stats) }
  const loadHistory = async () => { const { data } = await getCBTHistory(user.id); setHistory(data || []) }
  const loadTopicsAndYears = async () => {
    const [t, y] = await Promise.all([getAvailableTopics(examType), getAvailableYears(examType)])
    setAvailTopics(t); setAvailYears(y)
  }
  const toggleTopic = (t) => setTopics(prev => prev.includes(t) ? prev.filter(x => x !== t) : [...prev, t])

  const startExam = async () => {
    if (THEORY_ONLY_EXAMS.includes(examType)) return
    setLoadingSetup(true)
    try {
      const { data: qs, error } = await fetchCBTQuestions({ examType, topics: topics.length ? topics : null, difficulty, year: year ? parseInt(year) : null, count })
      if (error) { alert(`Error: ${error.message || JSON.stringify(error)}`); setLoadingSetup(false); return }
      if (!qs?.length) { alert(`No questions found for ${examType}${year ? ' ' + year : ''}. Try different filters.`); setLoadingSetup(false); return }
      const { data: session, error: sessErr } = await createCBTSession(user.id, { examType, duration, count: qs.length })
      if (sessErr) { alert(`Session Error: ${sessErr.message}`); setLoadingSetup(false); return }
      setQuestions(qs); setSessionId(session?.id); setCurrentIdx(0); setAnswers({}); setFlagged({})
      setTimeLeft(duration * 60); setStartTime(Date.now()); setScreen('exam')
    } catch (e) { alert('Failed to start exam: ' + e.message) } finally { setLoadingSetup(false) }
  }

  const handleSubmit = useCallback(async (autoSubmit = false) => {
    if (submitting || !sessionId) return
    clearInterval(timerRef.current)
    setSubmitting(true)
    setShowSubmitModal(false)

    try {
      const timeTaken = Math.round((Date.now() - startTime) / 1000)
      const answerRows = questions.map(q => ({
        question_id: q.id,
        question_text: q.question_text,
        option_a: q.option_a,
        option_b: q.option_b,
        option_c: q.option_c,
        option_d: q.option_d,
        correct_answer: q.correct_answer,
        student_answer: answers[q.id] || null,
        is_correct: answers[q.id] === q.correct_answer,
        topic: q.topic,
        image_url: q.image_url || null
      }))

      const { score, percentage, error } = await completeCBTSession(user.id, sessionId, answerRows, timeTaken)

      if (error) {
        console.error("Submission error:", error)
        alert(`Failed to save exam results: ${error.message || "Unknown error"}`)
        // If autosubmit (timer ran out), we still want to show what we have
        if (!autoSubmit) {
          setSubmitting(false)
          return
        }
      }

      setReport({
        answers: answerRows,
        score: score || 0,
        percentage: percentage || 0,
        total: questions.length,
        timeTaken,
        examType
      })
      setScreen('report')

      // Background tasks (AI Report & Stats)
      generateCBTReport(answerRows, score, questions.length, timeTaken, examType)
        .then(res => setAiSummary(res.data.summary)).catch(() => { })

      recordCBTResult(user.id, {
        score: score || 0,
        total: questions.length,
        timeTaken,
        answers: answerRows,
        examType
      }).then(() => loadHistory())

    } catch (err) {
      console.error("Critical submission failure:", err)
      alert("A critical error occurred while submitting. Please check your internet connection.")
    } finally {
      setSubmitting(false)
    }
  }, [questions, answers, sessionId, startTime, submitting, examType, user.id])

  useEffect(() => {
    if (screen !== 'exam') return
    timerRef.current = setInterval(() => {
      setTimeLeft(t => t <= 1 ? (handleSubmit(true), 0) : t - 1)
    }, 1000)
    return () => clearInterval(timerRef.current)
  }, [screen, handleSubmit])

  const answeredCount = Object.keys(answers).length
  const currentQ = questions[currentIdx]

  /* ───────── SETUP VIEW ───────── */
  const SetupView = () => (
    <div className="max-w-5xl mx-auto px-4 md:px-8 py-6 md:py-10" ref={revealRef}>
      {/* Header */}
      <div className="mb-10">
        <p className="text-xs font-bold text-[var(--color-teal)] uppercase tracking-widest mb-2">Computer Based Test</p>
        <h1 className="text-4xl md:text-5xl font-extrabold text-[var(--color-ink)] tracking-tight">
          CBT Exam <span className="text-[var(--color-teal)]">Simulator</span>
        </h1>
        <p className="text-[var(--color-muted)] mt-3 text-base max-w-2xl">
          Practice with real past questions from WAEC, NECO, JAMB and BECE in a timed exam environment.
        </p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[1fr_340px] gap-8">
        {/* Config Panel */}
        <div className="space-y-6">
          {/* Exam Type */}
          <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl p-6">
            <p className="text-xs font-bold text-[var(--color-muted)] uppercase tracking-widest mb-4">Select Exam Type</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
              {EXAM_TYPES.map(et => (
                <button
                  key={et}
                  onClick={() => { setExamType(et); setTopics([]); setYear('') }}
                  className={`py-3 px-2 rounded-xl font-bold text-sm transition-all border-2 ${examType === et
                    ? 'bg-[var(--color-teal)] text-white border-[var(--color-teal)] shadow-lg shadow-[var(--color-teal)]/20'
                    : 'border-[var(--color-border)] text-[var(--color-muted)] hover:border-[var(--color-teal)] hover:text-[var(--color-teal)] bg-[var(--color-surface)]'
                    }`}
                >
                  {et}
                </button>
              ))}
            </div>
            {examType && EXAM_INFO[examType] && (
              <div className="mt-4 p-3 rounded-xl bg-[var(--color-cream)] border border-[var(--color-border)]">
                <p className="text-xs font-semibold text-[var(--color-ink)]">{EXAM_INFO[examType].label}</p>
                <p className="text-[10px] text-[var(--color-muted)] mt-0.5">{EXAM_INFO[examType].level}</p>
              </div>
            )}
            {THEORY_ONLY_EXAMS.includes(examType) && (
              <div className="mt-4 p-4 rounded-xl bg-amber-50 border border-amber-200">
                <p className="text-sm font-semibold text-amber-700">⚠️ NABTEB uses theory questions only. CBT simulation is not available.</p>
              </div>
            )}
          </div>

          {/* Year + Difficulty */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl p-6">
              <p className="text-xs font-bold text-[var(--color-muted)] uppercase tracking-widest mb-4">Filter by Year</p>
              <select
                value={year}
                onChange={e => setYear(e.target.value)}
                className="w-full bg-[var(--color-paper)] border-2 border-[var(--color-border)] rounded-xl px-4 py-3 text-[var(--color-ink)] font-semibold text-sm outline-none focus:border-[var(--color-teal)] transition-all"
              >
                <option value="">Any Year</option>
                {availYears.map(y => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>

            <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl p-6">
              <p className="text-xs font-bold text-[var(--color-muted)] uppercase tracking-widest mb-4">Difficulty Level</p>
              <div className="grid grid-cols-2 gap-2">
                {DIFFICULTIES.map(d => (
                  <button
                    key={d.value}
                    onClick={() => setDifficulty(d.value)}
                    className={`py-2.5 px-3 rounded-xl text-sm font-semibold transition-all border-2 flex items-center gap-2 ${difficulty === d.value
                      ? 'bg-[var(--color-ink)] text-white border-[var(--color-ink)]'
                      : 'border-[var(--color-border)] text-[var(--color-muted)] hover:border-[var(--color-ink)] bg-[var(--color-surface)]'
                      }`}
                  >
                    {d.emoji} {d.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Count + Duration */}
          <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl p-6 space-y-6">
            <div>
              <div className="flex justify-between items-center mb-3">
                <p className="text-xs font-bold text-[var(--color-muted)] uppercase tracking-widest">Number of Questions</p>
                <span className="text-sm font-bold text-[var(--color-teal)]">{count} questions</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {COUNTS.map(c => (
                  <button
                    key={c}
                    onClick={() => setCount(c)}
                    className={`px-4 py-2 rounded-lg text-sm font-bold transition-all border-2 ${count === c ? 'bg-[var(--color-teal)] text-white border-[var(--color-teal)]' : 'border-[var(--color-border)] text-[var(--color-muted)] hover:border-[var(--color-teal)] bg-[var(--color-surface)]'
                      }`}
                  >{c}</button>
                ))}
              </div>
            </div>

            <div>
              <div className="flex justify-between items-center mb-3">
                <p className="text-xs font-bold text-[var(--color-muted)] uppercase tracking-widest">Time Limit</p>
                <span className="text-sm font-bold text-[var(--color-teal)]">{duration} minutes</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {DURATIONS.map(d => (
                  <button
                    key={d}
                    onClick={() => setDuration(d)}
                    className={`px-4 py-2 rounded-lg text-sm font-bold transition-all border-2 ${duration === d ? 'bg-[var(--color-teal)] text-white border-[var(--color-teal)]' : 'border-[var(--color-border)] text-[var(--color-muted)] hover:border-[var(--color-teal)] bg-[var(--color-surface)]'
                      }`}
                  >{d} min</button>
                ))}
              </div>
            </div>
          </div>

          {/* Start Button */}
          <button
            onClick={startExam}
            disabled={loadingSetup || THEORY_ONLY_EXAMS.includes(examType)}
            className="w-full py-5 bg-[var(--color-teal)] text-white rounded-2xl font-bold text-lg hover:opacity-90 transition-all shadow-lg shadow-[var(--color-teal)]/30 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {loadingSetup ? '⏳ Loading Questions...' : `🚀 Start ${examType} Exam — ${count} Questions, ${duration} min`}
          </button>
        </div>

        {/* Sidebar: History */}
        <div className="space-y-6">
          <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl p-6">
            <p className="text-xs font-bold text-[var(--color-muted)] uppercase tracking-widest mb-5">Recent Results</p>
            <div className="space-y-4">
              {history.length ? history.slice(0, 6).map((h, i) => (
                <div key={i} className="flex items-center justify-between py-3 border-b border-[var(--color-border)] last:border-0">
                  <div>
                    <p className="text-sm font-bold text-[var(--color-ink)]">{h.exam_type || 'Exam'} {h.year || ''}</p>
                    <p className="text-[10px] text-[var(--color-muted)] mt-0.5">{h.total_questions} questions · {new Date(h.completed_at).toLocaleDateString()}</p>
                  </div>
                  <span className={`text-xl font-black ${h.percentage >= 70 ? 'text-green-500' : h.percentage >= 45 ? 'text-amber-500' : 'text-red-500'}`}>
                    {h.percentage}%
                  </span>
                </div>
              )) : (
                <div className="text-center py-8">
                  <p className="text-4xl mb-3">📋</p>
                  <p className="text-sm text-[var(--color-muted)]">No exams taken yet.<br />Start your first simulation!</p>
                </div>
              )}
            </div>
          </div>

          <div className="bg-gradient-to-br from-[var(--color-teal)]/10 to-[var(--color-gold)]/10 border border-[var(--color-border)] rounded-2xl p-6">
            <p className="text-xs font-bold text-[var(--color-muted)] uppercase tracking-widest mb-4">Tips for Success</p>
            <ul className="space-y-3 text-sm text-[var(--color-ink)]">
              {['Read each question carefully before selecting.', 'Skip hard questions and come back later.', 'Aim for at least 70% to be on track.', 'Use the navigator panel to track progress.'].map((tip, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span className="text-[var(--color-teal)] font-bold shrink-0">✓</span>
                  {tip}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  )

  /* ───────── EXAM VIEW ───────── */
  const ExamView = () => {
    const isWarning = timeLeft <= 60
    return (
      <div className="max-w-6xl mx-auto px-4 md:px-8 py-2 md:py-4" ref={revealRef}>
        {/* Top Bar */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl px-4 md:px-6 py-4 shadow-sm">
          <div className="flex justify-between items-center md:block">
            <div className="text-left">
              <p className="text-[10px] font-bold text-[var(--color-muted)] uppercase tracking-widest">{examType} Exam</p>
              <p className="text-base md:text-lg font-extrabold text-[var(--color-ink)]">Question {currentIdx + 1} of {questions.length}</p>
            </div>
            <div className="text-right md:hidden">
              <p className="text-[10px] font-bold text-[var(--color-muted)] uppercase tracking-widest">Answered</p>
              <p className="text-base font-extrabold text-[var(--color-teal)]">{answeredCount}/{questions.length}</p>
            </div>
          </div>

          <div className="flex items-center justify-between md:justify-end gap-3 md:gap-6">
            <div className="text-center hidden md:block">
              <p className="text-[10px] font-bold text-[var(--color-muted)] uppercase tracking-widest">Answered</p>
              <p className="text-lg font-extrabold text-[var(--color-teal)]">{answeredCount}/{questions.length}</p>
            </div>
            <div className={`flex items-center gap-2 px-3 md:px-4 py-2 rounded-xl border-2 flex-1 md:flex-none justify-center ${isWarning ? 'border-red-500 bg-red-500/10' : 'border-[var(--color-border)] bg-[var(--color-surface)]'}`}>
              <span className={`text-sm md:text-lg ${isWarning ? 'animate-pulse' : ''}`}>⏱</span>
              <span className={`font-mono font-black text-xl md:text-2xl tabular-nums ${isWarning ? 'text-red-500' : 'text-[var(--color-ink)]'}`}>{formatTime(timeLeft)}</span>
            </div>
            <button
              onClick={() => setShowSubmitModal(true)}
              className="px-4 md:px-5 py-2 md:py-2.5 bg-[var(--color-gold)] text-[var(--color-ink)] rounded-xl font-bold text-xs md:text-sm hover:opacity-90 transition-all flex-1 md:flex-none"
            >Submit Exam</button>
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-[1fr_280px] gap-6">
          {/* Question Card */}
          <div className="space-y-5">
            <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl p-6 md:p-8 shadow-sm min-h-[160px]">
              <div className="flex items-start justify-between gap-4 mb-5">
                <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-[var(--color-teal)]/10 text-[var(--color-teal)]">
                  Q{currentIdx + 1}
                </span>
                {currentQ?.topic && (
                  <span className="text-xs font-medium text-[var(--color-muted)] bg-[var(--color-cream)] px-3 py-1 rounded-full border border-[var(--color-border)]">
                    {currentQ.topic}
                  </span>
                )}
              </div>
              <p className="text-[var(--color-ink)] text-base md:text-lg font-medium leading-relaxed">
                <ExplanationBody text={currentQ?.question_text} />
              </p>
              {currentQ?.image_url && (
                <QuestionImage src={currentQ.image_url} alt={`Question ${currentIdx + 1} diagram`} />
              )}
            </div>

            {/* Options */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {['A', 'B', 'C', 'D', ...(currentQ?.option_e ? ['E'] : [])].map(letter => (
                <OptionBtn
                  key={letter}
                  letter={letter}
                  text={currentQ?.[`option_${letter.toLowerCase()}`]}
                  selected={answers[currentQ?.id]}
                  correct={null}
                  revealed={false}
                  onClick={(l) => setAnswers(a => ({ ...a, [currentQ.id]: l }))}
                />
              ))}
            </div>

            {/* Navigation */}
            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setCurrentIdx(i => Math.max(0, i - 1))}
                disabled={currentIdx === 0}
                className="flex-1 md:flex-none px-6 py-3.5 border-2 border-[var(--color-border)] rounded-xl font-bold text-sm text-[var(--color-muted)] hover:border-[var(--color-ink)] hover:text-[var(--color-ink)] transition-all disabled:opacity-30 flex items-center justify-center"
              >← Previous</button>
              <button
                onClick={() => setCurrentIdx(i => Math.min(questions.length - 1, i + 1))}
                disabled={currentIdx === questions.length - 1}
                className="flex-[2] py-3.5 bg-[var(--color-ink)] md:bg-transparent border-2 border-[var(--color-border)] md:border-[var(--color-border)] rounded-xl font-bold text-sm text-white md:text-[var(--color-muted)] hover:border-[var(--color-ink)] hover:text-[var(--color-ink)] transition-all disabled:opacity-30"
              >Next →</button>
            </div>
          </div>

          {/* Question Navigator */}
          <div className="space-y-5">
            <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl p-5 sticky top-24">
              <p className="text-xs font-bold text-[var(--color-muted)] uppercase tracking-widest mb-4">Question Navigator</p>
              <div className="grid grid-cols-5 gap-2 mb-5">
                {questions.map((q, i) => (
                  <button
                    key={i}
                    onClick={() => setCurrentIdx(i)}
                    className={`aspect-square rounded-lg font-bold text-xs transition-all ${i === currentIdx ? 'bg-[var(--color-teal)] text-white shadow-md'
                      : answers[q.id] ? 'bg-green-500 text-white'
                        : 'bg-[var(--color-cream)] text-[var(--color-muted)] hover:bg-[var(--color-border)] border border-[var(--color-border)]'
                      }`}
                  >{i + 1}</button>
                ))}
              </div>
              <div className="space-y-2 text-xs">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded bg-[var(--color-teal)]" />
                  <span className="text-[var(--color-muted)]">Current question</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded bg-green-500" />
                  <span className="text-[var(--color-muted)]">Answered</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded bg-[var(--color-cream)] border border-[var(--color-border)]" />
                  <span className="text-[var(--color-muted)]">Not answered</span>
                </div>
              </div>
              <div className="mt-5 pt-4 border-t border-[var(--color-border)]">
                <div className="flex justify-between text-xs mb-2">
                  <span className="text-[var(--color-muted)]">Progress</span>
                  <span className="font-bold text-[var(--color-teal)]">{answeredCount}/{questions.length}</span>
                </div>
                <div className="h-2 bg-[var(--color-cream)] rounded-full overflow-hidden">
                  <div
                    className="h-full bg-[var(--color-teal)] rounded-full transition-all duration-500"
                    style={{ width: `${(answeredCount / questions.length) * 100}%` }}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Submit Confirmation Modal */}
        {showSubmitModal && (
          <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl p-8 max-w-md w-full shadow-2xl animate-fade-in">
              <div className="text-center mb-6">
                <div className="text-5xl mb-4">📝</div>
                <h2 className="text-2xl font-extrabold text-[var(--color-ink)] mb-2">Submit Exam?</h2>
                <p className="text-[var(--color-muted)] text-sm">
                  You have answered <span className="font-bold text-[var(--color-ink)]">{answeredCount}</span> of <span className="font-bold text-[var(--color-ink)]">{questions.length}</span> questions.
                </p>
                {answeredCount < questions.length && (
                  <p className="mt-2 text-amber-600 dark:text-amber-400 text-sm font-medium">
                    ⚠️ {questions.length - answeredCount} question{questions.length - answeredCount !== 1 ? 's' : ''} unanswered.
                  </p>
                )}
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowSubmitModal(false)}
                  disabled={submitting}
                  className="flex-1 py-3 border-2 border-[var(--color-border)] rounded-xl font-bold text-sm text-[var(--color-muted)] hover:border-[var(--color-ink)] hover:text-[var(--color-ink)] transition-all disabled:opacity-50"
                >Continue Exam</button>
                <button
                  onClick={() => handleSubmit()}
                  disabled={submitting}
                  className="flex-1 py-3 bg-[var(--color-teal)] text-white rounded-xl font-bold text-sm hover:opacity-90 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {submitting ? (
                    <>
                      <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                      Saving...
                    </>
                  ) : "Yes, Submit"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    )
  }

  /* ───────── REPORT VIEW ───────── */
  const ReportView = () => {
    const grade = getGrade(report.percentage)
    const mins = Math.floor(report.timeTaken / 60)
    const secs = report.timeTaken % 60
    return (
      <div className="max-w-4xl mx-auto px-4 md:px-8 py-6 md:py-10" ref={revealRef}>
        {/* Score Card */}
        <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-3xl overflow-hidden shadow-lg mb-8">
          <div className="bg-gradient-to-r from-[var(--color-teal)]/20 to-[var(--color-gold)]/10 p-8 md:p-12 text-center border-b border-[var(--color-border)]">
            <p className="text-xs font-bold text-[var(--color-muted)] uppercase tracking-widest mb-4">Exam Results · {report.examType}</p>
            <div className={`text-8xl md:text-[10rem] font-black leading-none ${grade.color} mb-4`}>{grade.letter}</div>
            <p className="text-2xl font-bold text-[var(--color-ink)]">{grade.label}</p>
            <p className="text-[var(--color-muted)] text-sm mt-1">{report.percentage}% score</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-[var(--color-border)]">
            <div className="p-4 sm:p-6 text-center">
              <p className="text-[10px] font-bold text-[var(--color-muted)] uppercase tracking-widest mb-1 sm:mb-2">Score</p>
              <p className="text-2xl sm:text-3xl font-black text-[var(--color-ink)]">{report.score}/{report.total}</p>
            </div>
            <div className="p-4 sm:p-6 text-center">
              <p className="text-[10px] font-bold text-[var(--color-muted)] uppercase tracking-widest mb-1 sm:mb-2">Percentage</p>
              <p className={`text-2xl sm:text-3xl font-black ${grade.color}`}>{report.percentage}%</p>
            </div>
            <div className="p-4 sm:p-6 text-center">
              <p className="text-[10px] font-bold text-[var(--color-muted)] uppercase tracking-widest mb-1 sm:mb-2">Time Taken</p>
              <p className="text-2xl sm:text-3xl font-black text-[var(--color-ink)]">{mins}m {secs}s</p>
            </div>
          </div>
        </div>

        {/* AI Feedback */}
        {(aiSummary || report.percentage >= 0) && (
          <div className="bg-[var(--color-ink)] text-white rounded-2xl p-6 mb-8">
            <p className="text-xs font-bold text-white/50 uppercase tracking-widest mb-3">🤖 AI Feedback</p>
            <p className="text-sm leading-relaxed opacity-90">
              {aiSummary || (report.percentage >= 70
                ? 'Great performance! You are on track for exam success. Keep practicing to maintain this level.'
                : 'You can do better. Focus on the topics you missed and practice more past questions.')}
            </p>
          </div>
        )}

        {/* Progress Bar */}
        <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl p-6 mb-8">
          <div className="flex justify-between text-sm font-bold mb-3">
            <span className="text-[var(--color-ink)]">Overall Performance</span>
            <span className={grade.color}>{report.percentage}%</span>
          </div>
          <div className="h-4 bg-[var(--color-cream)] rounded-full overflow-hidden border border-[var(--color-border)]">
            <div
              className={`h-full rounded-full transition-all duration-1000 ${report.percentage >= 70 ? 'bg-green-500' : report.percentage >= 45 ? 'bg-amber-500' : 'bg-red-500'}`}
              style={{ width: `${report.percentage}%` }}
            />
          </div>
          <div className="flex justify-between text-[10px] text-[var(--color-muted)] mt-2">
            <span>0%</span>
            <span className="text-amber-500">Pass (45%)</span>
            <span className="text-green-500">Credit (70%)</span>
            <span>100%</span>
          </div>
        </div>

        {/* Detailed Review */}
        <div className="space-y-4 mb-8">
          <h2 className="text-lg font-extrabold text-[var(--color-ink)]">Question Review</h2>
          {report.answers.map((a, i) => (
            <div
              key={i}
              className={`bg-[var(--color-surface)] border-2 rounded-2xl p-5 ${a.is_correct ? 'border-green-500/30' : 'border-red-500/30'
                }`}
            >
              <div className="flex items-start gap-3 mb-4">
                <span className={`shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white ${a.is_correct ? 'bg-green-500' : 'bg-red-500'}`}>
                  {a.is_correct ? '✓' : '✗'}
                </span>
                <div className="flex-1">
                  <p className="text-xs font-bold text-[var(--color-muted)] mb-1">Question {i + 1} {a.topic ? `· ${a.topic}` : ''}</p>
                  <p className="text-sm text-[var(--color-ink)] font-medium leading-relaxed">{a.question_text}</p>
                  {a.image_url && (
                    <QuestionImage src={a.image_url} alt="Question diagram" />
                  )}
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pl-10">
                <div className={`p-3 rounded-xl border text-sm ${a.is_correct ? 'border-green-500/30 bg-green-500/10 text-green-700 dark:text-green-400' : 'border-red-500/30 bg-red-500/10 text-red-700 dark:text-red-400'}`}>
                  <p className="text-[10px] font-bold uppercase opacity-60 mb-1">Your Answer</p>
                  <p className="font-bold">{a.student_answer || '— Not answered'}</p>
                </div>
                {!a.is_correct && (
                  <div className="p-3 rounded-xl border border-green-500/30 bg-green-500/10 text-sm">
                    <p className="text-[10px] font-bold text-green-600 uppercase opacity-60 mb-1">Correct Answer</p>
                    <p className="font-bold text-green-700 dark:text-green-400">{a.correct_answer}</p>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Reset */}
        <button
          onClick={() => window.location.reload()}
          className="w-full py-4 bg-[var(--color-teal)] text-white rounded-2xl font-bold text-lg hover:opacity-90 transition-all shadow-lg shadow-[var(--color-teal)]/30"
        >
          🔄 Start a New Exam
        </button>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[var(--color-paper)] pt-20 md:pt-28">
      {screen === 'setup' ? <SetupView /> : screen === 'exam' ? <ExamView /> : <ReportView />}
    </div>
  )
}

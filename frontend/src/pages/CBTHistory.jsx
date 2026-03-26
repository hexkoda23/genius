import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'
import { useNavigate } from 'react-router-dom'
import { useReveal } from '../hooks/useReveal'

function getGrade(pct) {
  if (pct >= 75) return { grade: 'A', color: 'text-green-600', bg: 'bg-green-600' }
  if (pct >= 60) return { grade: 'B', color: 'text-blue-600', bg: 'bg-blue-600' }
  if (pct >= 50) return { grade: 'C', color: 'text-[var(--color-gold)]', bg: 'bg-[var(--color-gold)]' }
  if (pct >= 45) return { grade: 'D', color: 'text-orange-600', bg: 'bg-orange-600' }
  return { grade: 'F', color: 'text-red-600', bg: 'bg-red-600' }
}

export default function CBTHistory() {
  const { user } = useAuth(); const navigate = useNavigate(); const revealRef = useReveal()
  const [sessions, setSessions] = useState([]); const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState(null); const [answers, setAnswers] = useState({})
  const [filter, setFilter] = useState('all')

  useEffect(() => { if (user) loadHistory() }, [user])
  const loadHistory = async () => {
    const { data } = await supabase.from('cbt_sessions').select('*').eq('user_id', user.id).eq('status', 'completed').order('completed_at', { ascending: false })
    setSessions(data || []); setLoading(false)
  }
  const loadAnswers = async (sessionId) => {
    if (answers[sessionId]) return
    const { data } = await supabase.from('cbt_answers').select('*').eq('session_id', sessionId)
    setAnswers(prev => ({ ...prev, [sessionId]: data || [] }))
  }
  const handleExpand = async (sessionId) => { if (expanded === sessionId) { setExpanded(null); return }; setExpanded(sessionId); await loadAnswers(sessionId) }
  const filtered = sessions.filter(s => { if (filter === 'all') return true; if (filter === 'pass') return s.percentage >= 45; if (filter === 'fail') return s.percentage < 45; return s.exam_type === filter })
  const avgScore = sessions.length > 0 ? Math.round(sessions.reduce((sum, s) => sum + s.percentage, 0) / sessions.length) : 0
  const best = sessions.length > 0 ? Math.max(...sessions.map(s => s.percentage)) : 0

  return (
    <div className="max-w-[1440px] mx-auto px-6 md:px-12 py-12 bg-[var(--color-paper)] min-h-screen relative" ref={revealRef}>
      <div className="grain pointer-events-none" />

      <div className="mb-24 flex flex-col md:flex-row items-end justify-between gap-12 relative z-10">
        <div className="max-w-4xl">
          <p className="eyebrow">TEMPORAL_LEDGER_v4.4</p>
          <h1 className="font-serif font-black text-7xl md:text-[10rem] tracking-tighter uppercase leading-[0.8] italic">
            CBT <br /><span className="text-[var(--color-gold)] not-italic">HISTORY.</span>
          </h1>
          <p className="font-serif italic text-2xl text-[var(--color-muted)] mt-12 border-l-4 border-[var(--color-gold)] pl-8 max-w-xl uppercase tracking-tighter">Full chronological record of your cognitive performance across the Euler CBT engine.</p>
        </div>
        <div className="flex gap-12 bg-[var(--color-surface)] border-4 border-[var(--color-ink)] p-8 shadow-[12px_12px_0_var(--color-cream)]">
          <div className="text-center px-8 border-r-2 border-[var(--color-ink)]/10">
            <p className="font-mono text-[9px] font-black uppercase text-[var(--color-muted)] mb-2">AVG_MASTERY</p>
            <p className="font-serif font-black text-4xl leading-none italic">{avgScore}%</p>
          </div>
          <div className="text-center px-8">
            <p className="font-mono text-[9px] font-black uppercase text-[var(--color-muted)] mb-2">MAX_REACH</p>
            <p className="font-serif font-black text-4xl leading-none italic text-[var(--color-gold)]">{best}%</p>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-4 mb-16 relative z-10">
        {[
          { value: 'all', label: 'ALL_SESSIONS' },
          { value: 'JAMB', label: 'JAMB_NODES' },
          { value: 'WAEC', label: 'WAEC_NODES' },
          { value: 'NECO', label: 'NECO_NODES' },
          { value: 'BECE', label: 'BECE_NODES' },
          { value: 'pass', label: 'RESOLVED_PASS' },
          { value: 'fail', label: 'CRITICAL_FAIL' },
        ].map(f => (
          <button key={f.value} onClick={() => setFilter(f.value)} className={`px-8 py-4 font-mono text-[9px] font-black uppercase tracking-widest border-4 transition-all ${filter === f.value ? 'bg-[var(--color-ink)] text-white border-[var(--color-ink)]' : 'border-[var(--color-ink)] text-[var(--color-ink)] hover:bg-[var(--color-cream)]'}`}>
            {f.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-12">
          {[...Array(5)].map((_, i) => <div key={i} className="h-24 border-4 border-dashed border-[var(--color-ink)]/10 animate-pulse" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="py-48 text-center border-4 border-dashed border-[var(--color-ink)]/20">
          <p className="font-serif italic font-black text-6xl opacity-20 uppercase tracking-tighter leading-none">NO_RECORDS_DETECTED.</p>
        </div>
      ) : (
        <div className="space-y-8 relative z-10">
          {filtered.map(s => {
            const { grade, color, bg } = getGrade(s.percentage)
            const mins = Math.floor((s.time_taken_secs || 0) / 60); const secs = (s.time_taken_secs || 0) % 60
            const isOpen = expanded === s.id; const sessionAnswers = answers[s.id] || []
            const correct = sessionAnswers.filter(a => a.is_correct).length

            return (
              <div key={s.id} className={`border-4 border-[var(--color-ink)] bg-[var(--color-surface)] shadow-[12px_12px_0_var(--color-cream)] hover:shadow-none transition-all ${isOpen ? 'shadow-none' : ''}`}>
                <button onClick={() => handleExpand(s.id)} className="w-full text-left p-8 flex items-center gap-8 group">
                  <div className={`w-16 h-16 border-2 border-current flex items-center justify-center font-serif font-black text-2xl italic ${bg} text-white`}>
                    {grade}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-serif font-black text-2xl uppercase italic tracking-tighter transition-all group-hover:text-[var(--color-gold)]">
                      {s.exam_type} {s.year || ''} // {s.topic || 'FULL_GENERAL_EVAL'}
                    </p>
                    <p className="font-mono text-[9px] font-black uppercase text-[var(--color-muted)] mt-2 tracking-widest">
                      {new Date(s.completed_at).toLocaleDateString()} // {s.total_questions}Q_STREAM // {mins}M_{secs}S_ELAPSED
                    </p>
                  </div>
                  <div className="text-right">
                    <p className={`font-serif font-black text-4xl italic leading-none ${color}`}>{s.percentage}%</p>
                    <p className="font-mono text-[9px] font-black uppercase opacity-40 mt-1">{s.score}/{s.total_questions}</p>
                  </div>
                  <span className="font-serif italic text-3xl opacity-20">{isOpen ? '▲' : '▼'}</span>
                </button>

                {isOpen && (
                  <div className="p-12 border-t-4 border-[var(--color-ink)] bg-[var(--color-paper)] relative overflow-hidden">
                    <div className="absolute right-[-5%] bottom-[-5%] font-serif font-black text-[25rem] text-[var(--color-ink)] opacity-[0.03] italic select-none pointer-events-none -rotate-12">Σ</div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16 relative z-10">
                      {[
                        { label: 'RESOLVED', value: correct, color: 'text-green-600' },
                        { label: 'FAILED', value: sessionAnswers.length - correct, color: 'text-red-500' },
                        { label: 'SKIPPED', value: sessionAnswers.filter(a => !a.student_answer).length, color: 'text-[var(--color-muted)]' },
                      ].map(st => (
                        <div key={st.label} className="border-4 border-[var(--color-ink)] bg-[var(--color-surface)] p-8 shadow-[8px_8px_0_var(--color-cream)]">
                          <p className="font-mono text-[9px] font-black uppercase text-[var(--color-muted)] mb-2">{st.label}</p>
                          <p className={`font-serif font-black text-4xl italic ${st.color}`}>{st.value}</p>
                        </div>
                      ))}
                    </div>

                    <div className="space-y-4 relative z-10 max-h-[500px] overflow-y-auto pr-4 scrollbar-thin">
                      {sessionAnswers.length === 0 ? (
                        <p className="font-mono text-[10px] font-black text-[var(--color-teal)] animate-pulse uppercase tracking-widest">FETCHING_SESSION_METADATA...</p>
                      ) : sessionAnswers.map((a, i) => (
                        <div key={i} className="bg-[var(--color-surface)] border-2 border-[var(--color-ink)] p-6 flex items-start gap-6 shadow-[4px_4px_0_var(--color-ink)]/5">
                          <span className={`w-8 h-8 shrink-0 flex items-center justify-center font-mono text-[10px] font-black ${a.is_correct ? 'bg-green-600 text-white' : 'bg-red-600 text-white'}`}>
                            {a.is_correct ? 'CORR' : 'FAIL'}
                          </span>
                          <div className="flex-1">
                            <p className="font-serif italic text-lg text-[var(--color-ink)] uppercase leading-tight mb-2">{i + 1}. {a.question_text}</p>
                            <div className="flex gap-8 font-mono text-[9px] font-black uppercase tracking-widest">
                              <span className={a.is_correct ? 'text-green-600' : 'text-red-500'}>INPUT: {a.student_answer || 'NONE'}</span>
                              {!a.is_correct && <span className="text-green-600">ARCHIVE_ANS: {a.correct_answer}</span>}
                              {a.topic && <span className="text-[var(--color-muted)]">SECTOR: {a.topic}</span>}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
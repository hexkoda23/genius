import { useState, useEffect, useRef } from 'react'
import { useAuth } from '../context/AuthContext'
import { getStudyPlan, generateStudyPlan, getTopicProgress } from '../services/api'
import { supabase } from '../lib/supabase'
import { useReveal } from '../hooks/useReveal'

function daysUntil(dateStr) {
  if (!dateStr) return null
  const diff = Math.ceil((new Date(dateStr) - new Date()) / 86400000)
  return diff > 0 ? diff : 0
}

function formatDate(dateStr) {
  if (!dateStr) return ''
  return new Date(dateStr).toLocaleDateString('en-GB', {
    weekday: 'short', day: 'numeric', month: 'short',
  })
}

function DayCard({ day, isToday, index }) {
  const [open, setOpen] = useState(isToday)
  return (
    <div className={`border-4 border-[var(--color-ink)] bg-white transition-all shadow-[12px_12px_0_var(--color-cream)] hover:shadow-none
      ${isToday ? 'shadow-[12px_12px_0_var(--color-gold)] border-[var(--color-gold)]' : ''}`}>
      <button onClick={() => setOpen(o => !o)} className="w-full flex items-center justify-between p-8 text-left group">
        <div className="flex items-center gap-8">
          <div className={`w-16 h-16 border-2 border-current flex items-center justify-center font-serif font-black text-2xl italic ${isToday ? 'bg-[var(--color-gold)] text-black' : 'text-[var(--color-ink)]'}`}>
            {index + 1}
          </div>
          <div>
            <p className="font-serif font-black text-2xl uppercase italic tracking-tighter transition-all group-hover:text-[var(--color-gold)]">
              {day.topic}
              {isToday && <span className="ml-4 font-mono text-[9px] bg-red-600 text-white px-3 py-1 not-italic">LIVE_NODE</span>}
            </p>
            <p className="font-mono text-[9px] font-black uppercase text-[var(--color-muted)] mt-2 tracking-widest">
              {formatDate(day.date)} // {day.duration_mins || 45} MIN_BURST
            </p>
          </div>
        </div>
        <span className="font-serif italic text-3xl opacity-20">{open ? '▲' : '▼'}</span>
      </button>

      {open && (
        <div className="px-12 pb-12 space-y-8 border-t-2 border-[var(--color-ink)]/5 pt-8">
          {day.focus && <p className="font-serif italic text-xl text-[var(--color-muted)] uppercase tracking-tight border-l-4 border-[var(--color-gold)] pl-6">{day.focus}</p>}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {(day.tasks || []).map((task, i) => (
              <div key={i} className="flex gap-4 items-start">
                <span className="font-mono text-[10px] font-black text-[var(--color-gold)] mt-1.5">{String(i + 1).padStart(2, '0')}</span>
                <p className="font-serif italic font-black text-lg uppercase tracking-tight leading-none">{task}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export default function StudyPlanner() {
  const { user, profile } = useAuth(); const revealRef = useReveal()
  const [plan, setPlan] = useState(null); const [weakTopics, setWeakTopics] = useState([]); const [generating, setGenerating] = useState(false)
  const [streaming, setStreaming] = useState(''); const [error, setError] = useState(''); const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('plan')

  const examTarget = profile?.exam_target || 'WAEC'; const examDate = profile?.exam_date || null; const daysLeft = daysUntil(examDate)

  useEffect(() => { if (!user) return; Promise.all([loadSavedPlan(), loadWeakTopics()]).finally(() => setLoading(false)) }, [user])
  async function loadSavedPlan() { try { const res = await getStudyPlan(user.id); if (res.data) setPlan(res.data) } catch { } }
  async function loadWeakTopics() {
    try {
      const { data } = await getTopicProgress(user.id)
      if (data) setWeakTopics(data.filter(t => t.mastery_level === 'beginner' || t.mastery_level === 'intermediate' || (t.avg_score ?? 100) < 60))
    } catch { }
  }

  async function handleGenerate() {
    setGenerating(true); setStreaming(''); setError('');
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:8000'}/study-plan/generate`, {
        method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}` },
        body: JSON.stringify({ user_id: user.id, exam_target: examTarget, exam_date: examDate, days_until: daysLeft }),
      })
      if (!response.ok) throw new Error(`Server error ${response.status}`)
      const reader = response.body.getReader(); const decoder = new TextDecoder(); let raw = ''
      while (true) {
        const { done, value } = await reader.read(); if (done) break
        raw += decoder.decode(value, { stream: true }); setStreaming(raw)
      }
      let clean = raw.trim(); if (clean.startsWith('```')) { clean = clean.split('```')[1]; if (clean.startsWith('json')) clean = clean.slice(4) }
      const parsed = JSON.parse(clean.trim())
      setPlan({ plan: parsed, exam_target: examTarget, exam_date: examDate, days_until: daysLeft, weak_topics: weakTopics.map(t => t.topic), generated_at: new Date().toISOString() })
      setStreaming('')
    } catch (err) { setError(err.message || 'ENGINE_FAULT_SYSTEM_CRITICAL') } finally { setGenerating(false) }
  }

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--color-paper)]">
      <div className="w-12 h-12 border-4 border-[var(--color-ink)] border-t-[var(--color-gold)] animate-spin" />
    </div>
  )

  const days = plan?.plan?.days || []
  const todayStr = new Date().toISOString().split('T')[0]
  const todayIdx = days.findIndex(d => d.date === todayStr)

  return (
    <div className="max-w-[1440px] mx-auto px-6 md:px-12 py-12 bg-[var(--color-paper)] relative min-h-screen" ref={revealRef}>
      <div className="grain pointer-events-none" />

      <div className="mb-24 flex flex-col md:flex-row items-end justify-between gap-12 relative z-10">
        <div className="max-w-4xl">
          <p className="eyebrow">COGNITIVE_ARCHITECTURE_v9.2</p>
          <h1 className="font-serif font-black text-7xl md:text-[10rem] tracking-tighter uppercase leading-[0.8] italic">
            STUDY <br /><span className="text-[var(--color-gold)] not-italic">PLANNER.</span>
          </h1>
          <p className="font-serif italic text-2xl text-[var(--color-muted)] mt-12 border-l-4 border-[var(--color-gold)] pl-8 max-w-xl uppercase tracking-tighter">AI-powered cognitive displacement mapping for {examTarget} preparation.</p>
        </div>
        <div className="bg-white border-4 border-[var(--color-ink)] p-8 shadow-[12px_12px_0_var(--color-cream)]">
          <p className="font-mono text-[9px] font-black uppercase text-[var(--color-muted)] mb-2">TEMPORAL_STATUS</p>
          <p className="font-serif font-black text-4xl leading-none italic uppercase tracking-tighter">{daysLeft ?? '??'} DAYS_REMAINING</p>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[1fr_450px] gap-24 relative z-10">
        <div className="space-y-12">
          <div className="flex border-4 border-[var(--color-ink)] bg-white shadow-[12px_12px_0_var(--color-ink)]/5 w-fit overflow-hidden">
            {['plan', 'topics'].map(t => (
              <button key={t} onClick={() => setActiveTab(t)} className={`px-12 py-6 font-mono text-[10px] font-black uppercase tracking-[0.4em] transition-all border-r-2 last:border-r-0 border-[var(--color-ink)] ${activeTab === t ? 'bg-[var(--color-ink)] text-white' : 'hover:bg-[var(--color-cream)] text-[var(--color-muted)]'}`}>
                {t === 'plan' ? 'DAILY_NODES' : `WEAK_SECTORS [${weakTopics.length}]`}
              </button>
            ))}
          </div>

          {activeTab === 'plan' && (
            <div className="space-y-12">
              <button onClick={handleGenerate} disabled={generating} className="w-full bg-[var(--color-ink)] text-white py-12 font-serif font-black text-4xl uppercase tracking-tighter italic hover:bg-black transition-all shadow-[16px_16px_0_var(--color-gold)] disabled:opacity-20">
                {generating ? 'SYNCHRONIZING_ENGINE...' : plan ? 'RE-CALIBRATE_ARCHITECTURE ➔' : 'GENERATE_STUDY_SCHEMA ➔'}
              </button>

              {streaming && !plan && (
                <div className="border-4 border-[var(--color-ink)] bg-white p-12 space-y-6">
                  <p className="font-mono text-[11px] font-black text-[var(--color-teal)] animate-pulse uppercase tracking-[0.4em]">EULER_NODE_STREAMING_PLAN...</p>
                  <p className="font-mono text-[9px] text-[var(--color-muted)] leading-relaxed h-32 overflow-hidden opacity-40 italic">{streaming.slice(-400)}</p>
                </div>
              )}

              {plan?.plan?.summary && (
                <div className="border-4 border-[var(--color-gold)] bg-amber-50 p-12 relative overflow-hidden">
                  <div className="absolute top-0 right-0 px-8 py-2 bg-[var(--color-gold)] font-mono text-[9px] font-black uppercase text-black">STRATEGY_BRIEF</div>
                  <p className="font-serif italic font-black text-3xl uppercase tracking-tighter text-[var(--color-ink)] leading-none mb-6">Mastery Directive</p>
                  <p className="font-serif italic text-xl text-[var(--color-ink)] opacity-70 leading-relaxed uppercase tracking-tight">{plan.plan.summary}</p>
                </div>
              )}

              <div className="space-y-8">
                {days.map((day, i) => (
                  <DayCard key={i} index={i} day={day} isToday={i === todayIdx} />
                ))}
                {!days.length && !generating && (
                  <div className="py-32 text-center border-4 border-dashed border-[var(--color-ink)]/20">
                    <p className="font-serif italic font-black text-4xl opacity-20 uppercase tracking-tighter leading-none">AWAITING_PLAN_INITIALIZATION...</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'topics' && (
            <div className="space-y-8">
              {weakTopics.length ? weakTopics.map((t, i) => (
                <div key={i} className="border-4 border-[var(--color-ink)] bg-white p-12 flex items-center justify-between shadow-[12px_12px_0_var(--color-cream)]">
                  <div className="space-y-2">
                    <p className="font-serif font-black italic text-3xl uppercase tracking-tighter leading-none">{t.topic}</p>
                    <p className="font-mono text-[9px] font-black uppercase text-[var(--color-muted)] tracking-widest">{t.sessions_done || 0} SESSIONS_COMPLETE</p>
                  </div>
                  <div className="text-right">
                    <p className="font-mono font-black text-4xl text-[var(--color-ink)]">{Math.round(t.avg_score || 0)}%</p>
                    <p className="font-mono text-[9px] font-black uppercase text-red-600 tracking-widest mt-2">{t.mastery_level || 'CRITICAL_NODE'}</p>
                  </div>
                </div>
              )) : (
                <div className="py-32 text-center border-4 border-dashed border-[var(--color-ink)]/20">
                  <p className="font-serif italic font-black text-4xl opacity-20 uppercase tracking-tighter leading-none">NO_WEAK_SECTORS_DETECTED.</p>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="space-y-16">
          {!examDate && (
            <div className="border-4 border-red-600 bg-red-50 p-12 shadow-[20px_20px_0_var(--color-ink)]/5">
              <p className="font-mono text-[10px] font-black uppercase tracking-[0.4em] text-red-600 mb-8">SYSTEM_WARNING_502</p>
              <p className="font-serif italic font-black text-2xl uppercase tracking-tighter leading-none mb-6">Temporal Anchor Missing</p>
              <p className="font-serif italic text-lg text-red-800 opacity-70 leading-snug uppercase tracking-tight mb-8">The system cannot calculate trajectory without an exam date anchor.</p>
              <a href="/profile" className="inline-block border-2 border-red-600 px-8 py-3 font-mono text-[9px] font-black uppercase tracking-widest hover:bg-red-600 hover:text-white transition-all">SET_ANCHOR ➔</a>
            </div>
          )}

          <div className="border-4 border-[var(--color-ink)] bg-white p-12 shadow-[20px_20px_0_var(--color-cream)]">
            <p className="font-mono text-[10px] font-black uppercase tracking-[0.4em] text-[var(--color-gold)] mb-12">SECTOR_ANALYTICS</p>
            <div className="space-y-8">
              <div className="flex justify-between items-end border-b-2 border-[var(--color-ink)]/5 pb-6">
                <span className="font-mono text-[9px] font-black uppercase opacity-40">TARGET_CODE</span>
                <span className="font-serif italic font-black text-2xl uppercase">{examTarget}</span>
              </div>
              <div className="flex justify-between items-end border-b-2 border-[var(--color-ink)]/5 pb-6">
                <span className="font-mono text-[9px] font-black uppercase opacity-40">PLAN_DURATION</span>
                <span className="font-serif italic font-black text-2xl uppercase">{days.length} DAYS</span>
              </div>
              <div className="flex justify-between items-end border-b-2 border-[var(--color-ink)]/5 pb-6">
                <span className="font-mono text-[9px] font-black uppercase opacity-40">SYSTEM_ID</span>
                <span className="font-serif italic font-black text-2xl uppercase">MG-EULER-PLX</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'
import { getMyClassrooms, getJoinedClassrooms, getClassroomLeaderboard, getStudentStats, getChildren, linkChild } from '../lib/classroom'
import { getStrugglingAlerts, resolveAlert } from '../lib/social2'
import { downloadProgressReport } from '../services/api'
import { useReveal } from '../hooks/useReveal'

const MASTERY_CFG = {
  master: { icon: '🏆', color: '#10b981', label: 'MASTERED' },
  proficient: { icon: '⭐', color: '#3b82f6', label: 'PROFICIENT' },
  developing: { icon: '📈', color: '#f59e0b', label: 'DEVELOPING' },
  beginner: { icon: '🌱', color: '#94a3b8', label: 'BEGINNER' },
}

function MiniBar({ value, max = 100, color = 'var(--color-teal)' }) {
  return (
    <div className="h-1 bg-[var(--color-ink)]/10 border border-[var(--color-ink)]">
      <div className="h-full transition-all duration-1000" style={{ width: `${Math.min(100, (value / max) * 100)}%`, backgroundColor: color }} />
    </div>
  )
}

function StatTile({ label, value, sub, icon, color = 'var(--color-ink)' }) {
  return (
    <div className="border-2 border-[var(--color-ink)] bg-white p-6 shadow-[12px_12px_0_var(--color-cream)]">
      <div className="flex items-center justify-between mb-4">
        <span className="text-xl">{icon}</span>
        <span className="font-mono text-[8px] font-black tracking-[0.4em] uppercase text-[var(--color-muted)]">{label}</span>
      </div>
      <div className="font-serif font-black text-4xl uppercase tracking-tighter italic" style={{ color }}>{value}</div>
      {sub && <div className="font-mono text-[8px] font-black uppercase text-[var(--color-muted)] mt-2 tracking-widest">{sub}</div>}
    </div>
  )
}

function StudentCard({ student, rank, onClick, isTeacher }) {
  const topMastery = student.mastery?.[0]
  const mCfg = topMastery ? MASTERY_CFG[topMastery.mastery_level] || MASTERY_CFG.beginner : null
  const scoreCol = student.avgScore >= 75 ? 'text-green-600' : student.avgScore >= 55 ? 'text-amber-500' : 'text-red-500'

  return (
    <button onClick={onClick} className="w-full text-left border-4 border-[var(--color-ink)] bg-white p-8 hover:shadow-[24px_24px_0_var(--color-cream)] transition-all group overflow-hidden relative">
      <div className="flex items-start justify-between mb-6">
        <div className="flex items-center gap-4">
          <span className="font-mono text-[10px] font-black text-[var(--color-gold)]">#{rank}</span>
          <div>
            <p className="font-serif font-black text-2xl uppercase italic tracking-tighter text-[var(--color-ink)]">{student.name}</p>
            {mCfg && <p className="font-mono text-[8px] font-black uppercase tracking-widest mt-1" style={{ color: mCfg.color }}>{mCfg.label} // {topMastery.topic}</p>}
          </div>
        </div>
        <span className={`font-serif font-black text-4xl italic tracking-tighter ${scoreCol}`}>{student.avgScore}%</span>
      </div>
      <MiniBar value={student.avgScore} color="var(--color-teal)" />
      <div className="flex items-center justify-between mt-6 font-mono text-[8px] font-black uppercase tracking-widest text-[var(--color-muted)]">
        <span>{student.sessCount}_SESSIONS // {student.topicsMaster}_MASTERED</span>
        <span className="text-[var(--color-teal)] group-hover:underline">DEEP_SCAN ➔</span>
      </div>
    </button>
  )
}

function StudentDetail({ student, stats, onBack, onDownloadPDF, downloadingPDF }) {
  const [tab, setTab] = useState('overview'); const revealRef = useReveal()
  if (!stats) return <div className="p-24 text-center animate-pulse"><p className="font-mono text-[10px] font-black text-[var(--color-teal)] uppercase tracking-widest">DECODING_BIOMETRIC_DATA...</p></div>
  const topics = stats.mastery || []; const sessions = stats.sessions || []; const streak = stats.streak || {}
  const avgScore = sessions.length ? Math.round(sessions.reduce((s, x) => s + (x.score || 0), 0) / sessions.length) : 0
  const weakTopics = topics.filter(t => t.avg_score < 50); const strongTopics = topics.filter(t => t.avg_score >= 80)
  const scoreColor = avgScore >= 75 ? 'text-green-600' : avgScore >= 55 ? 'text-amber-500' : 'text-red-500'

  return (
    <div ref={revealRef} className="animate-slide-up">
      <button onClick={onBack} className="font-mono text-[9px] font-black uppercase text-[var(--color-gold)] mb-8 flex items-center gap-2"><span>❴</span> RETURN_TO_DECILE_GRID <span>❵</span></button>
      <div className="border-8 border-[var(--color-ink)] bg-[var(--color-ink)] p-12 md:p-16 mb-12 shadow-[48px_48px_0_var(--color-cream)]">
        <div className="flex flex-col md:flex-row items-start justify-between gap-12">
          <div>
            <p className="eyebrow text-white/40 mb-4">DEEP_SCAN_PROTOCOL_v9.1</p>
            <h2 className="font-serif font-black text-white text-5xl md:text-8xl uppercase italic tracking-tighter leading-none">{student.name}</h2>
            <p className="font-mono text-[10px] font-black uppercase text-[var(--color-gold)] tracking-[0.5em] mt-8">RANK_0{student.rank} // {streak.current_streak || 0}_DAY_SURGE</p>
          </div>
          <div className="text-right flex flex-col items-end gap-8">
            <div className="border-4 border-white/10 p-8">
              <div className={`font-serif font-black text-8xl italic tracking-tighter leading-none ${scoreColor}`}>{avgScore}%</div>
              <p className="font-mono text-[9px] font-black uppercase text-white/40 mt-4 tracking-widest">AGGREGATE_ACCURACY</p>
            </div>
            <button onClick={onDownloadPDF} disabled={downloadingPDF} className="bg-[var(--color-gold)] text-white px-8 py-4 font-serif font-black text-xl uppercase italic tracking-tighter shadow-[8px_8px_0_black] hover:bg-amber-600 transition-all disabled:opacity-50">{downloadingPDF ? 'GENERATING_REPORT...' : 'GENERATE_PDF_LEDGER ➔'}</button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
        <StatTile label="TOTAL_SESSIONS" value={sessions.length} icon="📝" />
        <StatTile label="TOPICS_EXPLORED" value={topics.length} icon="📚" />
        <StatTile label="NODES_MASTERED" value={strongTopics.length} icon="🏆" color="#10b981" />
        <StatTile label="CRITICAL_ALERTS" value={weakTopics.length} icon="⚠️" color="#ef4444" />
      </div>

      <div className="flex gap-12 border-b-4 border-[var(--color-ink)] mb-12 overflow-x-auto">
        {[['overview', 'OVERVIEW'], ['topics', 'MASTERY_VECTORS'], ['sessions', 'TEMPORAL_LOGS']].map(([id, label]) => (
          <button key={id} onClick={() => setTab(id)} className={`pb-4 font-serif font-black text-2xl uppercase italic tracking-tighter transition-all -mb-1 ${tab === id ? 'text-[var(--color-ink)] border-b-4 border-[var(--color-gold)]' : 'text-[var(--color-muted)] opacity-50 hover:opacity-100 hover:text-[var(--color-ink)]'}`}>{label}</button>
        ))}
      </div>

      {tab === 'overview' && (
        <div className="space-y-12">
          {sessions.length > 0 && (
            <div className="border-4 border-[var(--color-ink)] bg-white p-12 shadow-[32px_32px_0_var(--color-cream)]">
              <p className="eyebrow mb-12">SCORE_DEVIATION_CHART // LAST_8_SESSIONS</p>
              <div className="flex items-end gap-4 h-48 border-b-4 border-[var(--color-ink)] pb-4">
                {sessions.slice(0, 8).reverse().map((s, i) => {
                  const h = Math.max(10, ((s.score || 0) / 100) * 100)
                  const col = s.score >= 75 ? 'var(--color-teal)' : s.score >= 50 ? 'var(--color-gold)' : '#ef4444'
                  return (
                    <div key={i} className="flex-1 flex flex-col items-center gap-4 group">
                      <span className="font-mono text-[8px] font-black opacity-0 group-hover:opacity-100 transition-all">{s.score}%</span>
                      <div className="w-full border-2 border-[var(--color-ink)] transition-all hover:scale-x-110 origin-bottom" style={{ height: `${h}%`, backgroundColor: col }} />
                    </div>
                  )
                })}
              </div>
            </div>
          )}
          {weakTopics.length > 0 && (
            <div className="border-4 border-red-600 bg-red-50 p-12">
              <p className="font-serif font-black text-3xl uppercase italic tracking-tighter text-red-800 mb-8">⚠️ CRITICAL_DEVIATIONS_DETECTED</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {weakTopics.map(t => (
                  <div key={t.topic} className="flex flex-col gap-4">
                    <div className="flex justify-between items-center">
                      <span className="font-serif font-black text-xl text-red-900 uppercase italic tracking-tighter">{t.topic}</span>
                      <span className="font-mono text-[10px] font-black text-red-600">{Math.round(t.avg_score)}%_ACCURACY</span>
                    </div>
                    <div className="h-1 bg-red-200 border border-red-300">
                      <div className="h-full bg-red-600" style={{ width: `${t.avg_score}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {tab === 'topics' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {topics.map(t => {
            const mc = MASTERY_CFG[t.mastery_level] || MASTERY_CFG.beginner
            return (
              <div key={t.topic} className="border-4 border-[var(--color-ink)] bg-white p-8 flex items-center gap-6">
                <span className="text-4xl">{mc.icon}</span>
                <div className="flex-1">
                  <div className="flex justify-between items-center mb-4">
                    <p className="font-serif font-black text-xl uppercase italic tracking-tighter leading-none">{t.topic}</p>
                    <p className="font-mono text-[8px] font-black uppercase tracking-widest" style={{ color: mc.color }}>{mc.label} // {Math.round(t.avg_score)}%</p>
                  </div>
                  <MiniBar value={t.avg_score} color={mc.color} />
                </div>
              </div>
            )
          })}
        </div>
      )}

      {tab === 'sessions' && (
        <div className="border-4 border-[var(--color-ink)] bg-white shadow-[32px_32px_0_var(--color-cream)] overflow-hidden">
          <div className="divide-y-2 divide-[var(--color-ink)]/5">
            {sessions.map(s => (
              <div key={s.id} className="p-8 flex items-center justify-between hover:bg-[var(--color-paper)] transition-all">
                <div>
                  <p className="font-serif font-black text-2xl uppercase italic tracking-tighter text-[var(--color-ink)]">{s.topic || 'UNSPECIFIED_NODE'}</p>
                  <p className="font-mono text-[8px] font-black uppercase text-[var(--color-muted)] mt-2 tracking-widest">{s.difficulty} // {new Date(s.completed_at).toLocaleDateString('en-GB')}</p>
                </div>
                <span className={`font-serif font-black text-5xl italic tracking-tighter ${s.score >= 75 ? 'text-green-600' : s.score >= 50 ? 'text-amber-500' : 'text-red-500'}`}>{s.score}%</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export default function TeacherParentDashboard() {
  const { user, profile } = useAuth(); const isTeacher = profile?.role === 'teacher'; const isParent = profile?.role === 'parent'; const revealRef = useReveal()
  const [loading, setLoading] = useState(true); const [classes, setClasses] = useState([]); const [selectedCls, setSelectedCls] = useState(null)
  const [students, setStudents] = useState([]); const [selStudent, setSelStudent] = useState(null); const [studentStats, setStudentStats] = useState(null); const [downloadingPDF, setDownloadingPDF] = useState(false)
  const [alerts, setAlerts] = useState([]); const [alertsLoaded, setAlertsLoaded] = useState(false)
  const [childEmail, setChildEmail] = useState(''); const [linkMsg, setLinkMsg] = useState(''); const [linking, setLinking] = useState(false); const [children, setChildren] = useState([])

  useEffect(() => { if (user) init() }, [user])
  const init = async () => {
    setLoading(true)
    if (isTeacher) { const { data } = await getMyClassrooms(user.id); setClasses(data || []); if (data?.[0]) await loadClass(data[0]) }
    else if (isParent) {
      const { data: childLinks } = await getChildren(user.id); const kids = (childLinks || []).map(c => ({ id: c.child_id, name: c.profiles?.display_name || c.profiles?.email?.split('@')[0] || 'STUDENT' })); setChildren(kids)
      const { data: joined } = await getJoinedClassrooms(user.id); setClasses((joined || []).map(j => j.classrooms).filter(Boolean)); if (kids[0]) loadSingleStudent(kids[0])
    }
    const { data: alertData } = await getStrugglingAlerts(user.id); setAlerts(alertData || []); setAlertsLoaded(true); setLoading(false)
  }
  const handleDownloadPDF = async () => {
    if (!selStudent || !studentStats) return; setDownloadingPDF(true)
    try {
      const s = studentStats; const attempted = (s.mastery || []).reduce((acc, t) => acc + (t.questions_attempted || 0), 0)
      const correct = (s.mastery || []).reduce((acc, t) => acc + (t.questions_correct || 0), 0)
      const avg = s.sessions?.length ? Math.round(s.sessions.reduce((acc, x) => acc + (x.score || 0), 0) / s.sessions.length) : 0
      await downloadProgressReport({ student_name: selStudent.name, teacher_name: profile?.display_name || 'COORDINATOR', period_label: 'CURRENT_CYCLE', sessions: s.sessions?.slice(0, 10), mastery: s.mastery, streak: s.streak, weak_topics: s.mastery?.filter(t => t.avg_score < 50).slice(0, 5), strong_topics: s.mastery?.filter(t => t.avg_score >= 80).slice(0, 5), accuracy: attempted > 0 ? Math.round((correct / attempted) * 100) : 0, avg_score: avg })
    } catch (e) { console.error(e) } finally { setDownloadingPDF(false) }
  }
  const handleResolveAlert = async (id) => { await resolveAlert(id); setAlerts(prev => prev.filter(a => a.id !== id)) }
  const loadClass = async (cls) => { setSelectedCls(cls); setSelStudent(null); setStudentStats(null); const { data: board } = await getClassroomLeaderboard(cls.id); const enriched = await Promise.all((board || []).map(async s => { const st = await getStudentStats(s.userId); return { ...s, mastery: st.mastery?.slice(0, 1) } })); setStudents(enriched) }
  const loadSingleStudent = async (student) => { setSelStudent(student); setStudentStats(null); setStudentStats(await getStudentStats(student.userId || student.id)) }
  const handleLinkChild = async () => { if (!childEmail.trim()) return; setLinking(true); setLinkMsg(''); const { error } = await linkChild(user.id, childEmail.trim()); if (error) setLinkMsg('❌ ' + error); else { setLinkMsg('✅ LINK_SUCCESS'); setChildEmail(''); await init() }; setLinking(false) }

  if (loading) return <div className="p-24 text-center animate-pulse"><p className="font-mono text-[10px] font-black text-[var(--color-teal)] uppercase tracking-widest">INITIALIZING_HEGEMONY_COMMAND_CENTER...</p></div>
  if (!isTeacher && !isParent) return (
    <div className="max-w-[1440px] mx-auto px-6 md:px-12 py-48 text-center" ref={revealRef}>
      <p className="font-serif font-black text-9xl italic opacity-10 uppercase tracking-tighter leading-none mb-12">LOCKED_PROTOCOL.</p>
      <p className="font-mono text-[10px] uppercase tracking-[0.4em] text-[var(--color-muted)] max-w-lg mx-auto leading-relaxed">THIS_TERMINAL_IS_RESERVED_FOR_COORDINATORS_AND_PRECEPTS. UNAUTHORIZED_ACCESS_IS_DENIED.</p>
    </div>
  )

  return (
    <div className="max-w-[1440px] mx-auto px-6 md:px-12 py-12 bg-[var(--color-paper)] min-h-screen relative" ref={revealRef}>
      <div className="grain pointer-events-none" />
      <div className="mb-24 relative z-10 max-w-4xl">
        <p className="eyebrow">{isTeacher ? 'TEACHER_HEGEMONY_DASHBOARD' : 'PARENT_VIGIL_DASHBOARD'}</p>
        <h1 className="font-serif font-black text-7xl md:text-[10rem] tracking-tighter uppercase leading-[0.8] italic">
          SOVEREIGN <br /><span className="text-[var(--color-gold)] not-italic">{isTeacher ? 'HEGEMONY.' : 'VIGILANCE.'}</span>
        </h1>
        <p className="font-serif italic text-2xl text-[var(--color-muted)] mt-12 border-l-4 border-[var(--color-gold)] pl-8 max-w-xl uppercase tracking-tighter">Command interface for the monitoring and optimization of student cognitive trajectories.</p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[320px_1fr] gap-12 relative z-10">
        {/* ── SIDEBAR ── */}
        <div className="space-y-8">
          {isTeacher && classes.length > 0 && (
            <div className="border-4 border-[var(--color-ink)] bg-white shadow-[12px_12px_0_var(--color-cream)]">
              <div className="bg-[var(--color-ink)] px-6 py-3"><p className="font-mono text-[8px] font-black uppercase text-white/40 tracking-widest">STRATEGIC_CELLS</p></div>
              <div className="divide-y-2 divide-[var(--color-ink)]/5">
                {classes.map(cls => (
                  <button key={cls.id} onClick={() => loadClass(cls)} className={`w-full px-6 py-5 text-left transition-all ${selectedCls?.id === cls.id ? 'bg-[var(--color-cream)]' : 'hover:bg-[var(--color-paper)]'}`}>
                    <p className="font-serif font-black text-xl uppercase italic tracking-tighter text-[var(--color-ink)]">{cls.name}</p>
                    <p className="font-mono text-[8px] font-black uppercase text-[var(--color-gold)] mt-2 tracking-widest">KEY_{cls.invite_code}</p>
                  </button>
                ))}
              </div>
            </div>
          )}

          {isParent && (
            <div className="border-4 border-[var(--color-ink)] bg-white p-8 shadow-[12px_12px_0_var(--color-cream)]">
              <p className="font-mono text-[8px] font-black uppercase text-[var(--color-muted)] mb-4 tracking-[0.4em]">UPLINK_NEW_NODE</p>
              <input value={childEmail} onChange={e => setChildEmail(e.target.value)} placeholder="NODE_IDENTIFIER (EMAIL)..." type="email" className="w-full bg-[var(--color-paper)] border-2 border-[var(--color-ink)] p-4 font-mono text-[10px] uppercase font-black outline-none mb-4" />
              {linkMsg && <p className="font-mono text-[8px] font-black uppercase mb-4">{linkMsg}</p>}
              <button onClick={handleLinkChild} disabled={linking || !childEmail.trim()} className="w-full bg-[var(--color-ink)] text-white py-4 font-serif font-black text-xl uppercase italic tracking-tighter shadow-[4px_4px_0_var(--color-gold)]">{linking ? 'SYNCHRONIZING...' : 'UPLINK_NODE ➔'}</button>
            </div>
          )}

          {isParent && children.length > 0 && (
            <div className="border-4 border-[var(--color-ink)] bg-white shadow-[12px_12px_0_var(--color-cream)]">
              <div className="bg-[var(--color-ink)] px-6 py-3"><p className="font-mono text-[8px] font-black uppercase text-white/40 tracking-widest">MONITORED_NODES</p></div>
              <div className="divide-y-2 divide-[var(--color-ink)]/5">
                {children.map(child => (
                  <button key={child.id} onClick={() => loadSingleStudent(child)} className={`w-full px-6 py-5 text-left transition-all ${selStudent?.id === child.id ? 'bg-[var(--color-cream)]' : 'hover:bg-[var(--color-paper)]'}`}>
                    <p className="font-serif font-black text-xl uppercase italic tracking-tighter text-[var(--color-ink)]">{child.name}</p>
                  </button>
                ))}
              </div>
            </div>
          )}

          {isTeacher && students.length > 0 && (
            <div className="border-4 border-[var(--color-ink)] bg-white p-8 space-y-6 shadow-[12px_12px_0_var(--color-cream)]">
              <p className="font-mono text-[8px] font-black uppercase text-[var(--color-muted)] tracking-[0.4em]">CELL_ANALYTICS</p>
              {[{ label: 'TOTAL_NODES', value: students.length }, { label: 'AGGREGATE_AVG', value: `${Math.round(students.reduce((s, x) => s + x.avgScore, 0) / students.length)}%` }, { label: 'PEAK_PERFORMER', value: students[0]?.name || '—' }].map(s => (
                <div key={s.label} className="border-b border-[var(--color-ink)]/10 pb-4">
                  <p className="font-mono text-[8px] font-black text-[var(--color-muted)] uppercase tracking-widest">{s.label}</p>
                  <p className="font-serif font-black text-2xl uppercase italic tracking-tighter text-[var(--color-ink)]">{s.value}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── MAIN CONTENT ── */}
        <div className="space-y-12">
          {selStudent ? (
            <StudentDetail student={selStudent} stats={studentStats} onBack={() => { setSelStudent(null); setStudentStats(null) }} onDownloadPDF={handleDownloadPDF} downloadingPDF={downloadingPDF} />
          ) : students.length > 0 ? (
            <div className="space-y-12">
              {alertsLoaded && alerts.length > 0 && (
                <div className="space-y-4">
                  <p className="font-mono text-[9px] font-black uppercase text-red-600 tracking-[0.5em] animate-pulse flex items-center gap-4"><span className="w-2 h-2 bg-red-600 rounded-full" /> CRITICAL_DEVIATION_ALERTS // {alerts.length}_DETECTIONS</p>
                  <div className="grid grid-cols-1 gap-4">
                    {alerts.map(a => {
                      const name = a.profiles?.display_name || a.profiles?.email?.split('@')[0] || 'STUDENT'
                      return (
                        <div key={a.id} className="border-4 border-red-600 bg-red-50 p-8 flex flex-col md:flex-row items-center justify-between gap-8">
                          <div className="flex items-center gap-6">
                            <div className="w-12 h-12 border-2 border-red-600 bg-white flex items-center justify-center font-serif font-black text-red-600 text-xl shadow-[4px_4px_0_red]">{name[0]?.toUpperCase()}</div>
                            <div>
                              <p className="font-serif font-black text-2xl uppercase italic tracking-tighter text-red-900">{name}</p>
                              <p className="font-mono text-[9px] font-black uppercase text-red-600 tracking-widest mt-1">3_SESSIONS_AVG_AT_{a.avg_score}% // DETECTED_NODES: {a.topics || 'UNSPECIFIED'}</p>
                            </div>
                          </div>
                          <div className="flex gap-4">
                            <button onClick={() => { const student = students.find(s => s.userId === a.student_id); if (student) loadSingleStudent(student) }} className="bg-red-600 text-white px-8 py-4 font-serif font-black text-xl uppercase italic tracking-tighter shadow-[4px_4px_0_black]">ANALYZE ➔</button>
                            <button onClick={() => handleResolveAlert(a.id)} className="border-2 border-red-300 text-red-600 px-8 py-4 font-mono text-[9px] font-black uppercase tracking-widest hover:bg-red-100 transition-all">DISMISS</button>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              <div className="flex items-center justify-between border-b-4 border-[var(--color-ink)] pb-4">
                <h2 className="font-serif font-black text-4xl uppercase italic tracking-tighter text-[var(--color-ink)]">{selectedCls?.name || 'STUDENT_GRID'}</h2>
                <p className="font-mono text-[10px] font-black uppercase text-[var(--color-muted)] tracking-widest">CLICK_NODE_FOR_DEEP_SCAN</p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {students.map((s, i) => (
                  <StudentCard key={s.userId} student={s} rank={i + 1} isTeacher={isTeacher} onClick={() => loadSingleStudent({ ...s, id: s.userId })} />
                ))}
              </div>
            </div>
          ) : (
            <div className="border-8 border-dashed border-[var(--color-ink)]/10 p-32 text-center opacity-30">
              <p className="text-8xl mb-12">{isTeacher ? '🏫' : '👨‍👩‍👧'}</p>
              <p className="font-serif font-black text-3xl uppercase italic tracking-tighter">{isTeacher ? 'SELECT_STRATEGIC_CELL_FROM_INDEX' : 'UPLINK_NODE_VIA_SIDEBAR'}</p>
              <p className="font-mono text-[10px] uppercase tracking-[0.4em] mt-8">AWAITING_COORDINATOR_INPUT...</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

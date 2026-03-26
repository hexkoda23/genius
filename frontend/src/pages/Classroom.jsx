import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { createClassroom, getMyClassrooms, getJoinedClassrooms, joinClassroom, getClassroomLeaderboard, getStudentStats } from '../lib/classroom'
import { createAssignment, getAssignmentsForClass, getAssignmentResults, closeAssignment } from '../lib/social2'
import { useNavigate } from 'react-router-dom'
import { useReveal } from '../hooks/useReveal'

const MEDAL = { 1: '🥇', 2: '🥈', 3: '🥉' }
const MASTERY_COLOR = { master: 'text-green-600', proficient: 'text-blue-600', developing: 'text-amber-500', beginner: 'text-slate-400' }
const LEVEL_LABELS = { primary: 'PRIMARY', jss: 'JSS', secondary: 'SECONDARY', university: 'UNIVERSITY' }

function MiniStatBox({ label, value, color = '' }) {
  return (
    <div className="border-2 border-[var(--color-ink)] bg-white p-4 shadow-[8px_8px_0_var(--color-cream)]">
      <div className={`text-4xl font-black font-serif italic uppercase tracking-tighter ${color || 'text-[var(--color-ink)]'}`}>{value}</div>
      <div className="text-[8px] font-mono font-black uppercase tracking-widest text-[var(--color-muted)] mt-2">{label}</div>
    </div>
  )
}

export default function Classroom() {
  const { user, profile } = useAuth(); const isTeacher = profile?.role === 'teacher'; const isParent = profile?.role === 'parent'; const navigate = useNavigate(); const revealRef = useReveal()
  const [myClasses, setMyClasses] = useState([]); const [joinedClasses, setJoinedClasses] = useState([]); const [selectedClass, setSelectedClass] = useState(null); const [leaderboard, setLeaderboard] = useState([]); const [loading, setLoading] = useState(true); const [classTab, setClassTab] = useState('leaderboard')
  const [newName, setNewName] = useState(''); const [newLevel, setNewLevel] = useState('secondary'); const [creating, setCreating] = useState(false)
  const [code, setCode] = useState(''); const [joining, setJoining] = useState(false); const [joinMsg, setJoinMsg] = useState('')
  const [assignments, setAssignments] = useState([]); const [assignResults, setAssignResults] = useState({}); const [showAssignForm, setShowAssignForm] = useState(false)
  const [assignForm, setAssignForm] = useState({ title: '', topic: '', level: 'secondary', difficulty: 'medium', dueDate: '' }); const [creatingAssign, setCreatingAssign] = useState(false)
  const [selectedStudent, setSelectedStudent] = useState(null); const [studentStats, setStudentStats] = useState(null)

  useEffect(() => { if (user) loadAll() }, [user])
  const loadAll = async () => {
    setLoading(true); const [myRes, joinRes] = await Promise.all([isTeacher ? getMyClassrooms(user.id) : { data: [] }, getJoinedClassrooms(user.id)])
    setMyClasses(myRes.data || []); setJoinedClasses(joinRes.data || []); const first = (myRes.data || [])[0] || (joinRes.data || [])[0]?.classrooms
    if (first) selectClass(first); setLoading(false)
  }
  const selectClass = async (cls) => { setSelectedClass(cls); setSelectedStudent(null); setClassTab('leaderboard'); const { data } = await getClassroomLeaderboard(cls.id); setLeaderboard(data || []); await loadAssignments(cls.id) }
  const handleCreate = async () => { if (!newName.trim()) return; setCreating(true); const { data } = await createClassroom(user.id, newName, newLevel); if (data) { setMyClasses(c => [data, ...c]); setNewName(''); selectClass(data) }; setCreating(false) }
  const handleJoin = async () => { if (!code.trim()) return; setJoining(true); setJoinMsg(''); const { data, error } = await joinClassroom(user.id, code); if (error) setJoinMsg('❌ ' + error); else { setJoinMsg('✅ JOIN_SUCCESS'); setCode(''); await loadAll() }; setJoining(false) }
  const loadAssignments = async (id) => {
    const { data } = await getAssignmentsForClass(id); setAssignments(data || [])
    if (isTeacher) { const results = {}; await Promise.all((data || []).map(async (a) => { const { data: subs } = await getAssignmentResults(a.id); results[a.id] = subs || [] })); setAssignResults(results) }
  }
  const handleCreateAssignment = async () => { if (!assignForm.title || !assignForm.topic) return; setCreatingAssign(true); const { data } = await createAssignment(user.id, selectedClass.id, assignForm); if (data) { setAssignments(prev => [data, ...prev]); setAssignForm({ title: '', topic: '', level: 'secondary', difficulty: 'medium', dueDate: '' }); setShowAssignForm(false) }; setCreatingAssign(false) }
  const handleStartAssignment = (a) => navigate(`/practice?topic=${encodeURIComponent(a.topic)}&assignment=${a.id}&level=${a.level}`)
  const handleCloseAssignment = async (id) => { await closeAssignment(id); setAssignments(prev => prev.map(a => a.id === id ? { ...a, status: 'closed' } : a)) }
  const handleStudentClick = async (s) => { setSelectedStudent(s); setStudentStats(null); setStudentStats(await getStudentStats(s.userId)) }

  if (loading) return <div className="p-24 text-center animate-pulse"><p className="font-mono text-[10px] font-black text-[var(--color-teal)] uppercase tracking-widest">INITIALIZING_ACADEMY_INTERFACE...</p></div>

  return (
    <div className="max-w-[1440px] mx-auto px-6 md:px-12 py-12 bg-[var(--color-paper)] min-h-screen relative" ref={revealRef}>
      <div className="grain pointer-events-none" />

      <div className="mb-24 flex flex-col md:flex-row items-end justify-between gap-12 relative z-10">
        <div className="max-w-4xl">
          <p className="eyebrow">{isTeacher ? 'ACADEMY_ADMIN_PANEL' : 'SOVEREIGN_ACADEMY_HUB'}</p>
          <h1 className="font-serif font-black text-7xl md:text-[10rem] tracking-tighter uppercase leading-[0.8] italic">
            SOVEREIGN <br /><span className="text-[var(--color-gold)] not-italic">ACADEMY.</span>
          </h1>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[320px_1fr] gap-12 relative z-10">
        {/* ── SIDEBAR ── */}
        <div className="space-y-8">
          {/* Create / Join Cards */}
          {isTeacher ? (
            <div className="border-4 border-[var(--color-ink)] bg-white p-8 shadow-[12px_12px_0_var(--color-cream)]">
              <p className="eyebrow mb-8">INITIALIZE_CLASSROOM</p>
              <div className="space-y-6">
                <input value={newName} onChange={e => setNewName(e.target.value)} placeholder="CLASS_IDENTIFIER (e.g. JSS3_GOLD)..." className="w-full border-2 border-[var(--color-ink)] p-4 font-mono text-[10px] uppercase font-black outline-none mb-4" />
                <select value={newLevel} onChange={e => setNewLevel(e.target.value)} className="w-full border-2 border-[var(--color-ink)] p-4 font-mono text-[10px] uppercase font-black outline-none bg-white mb-4">
                  {Object.entries(LEVEL_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                </select>
                <button onClick={handleCreate} disabled={creating || !newName.trim()} className="w-full bg-[var(--color-ink)] text-white py-4 font-serif font-black text-xl uppercase italic tracking-tighter shadow-[4px_4px_0_var(--color-gold)] disabled:opacity-20">{creating ? 'PROVISIONING...' : 'CREATE_CLASSROOM ➔'}</button>
              </div>
            </div>
          ) : (
            <div className="border-4 border-[var(--color-ink)] bg-white p-8 shadow-[12px_12px_0_var(--color-cream)]">
              <p className="eyebrow mb-8">ENROLLMENT_PROTOCOL</p>
              <input value={code} onChange={e => setCode(e.target.value.toUpperCase())} placeholder="INVITE_KEY (8-CHARS)..." maxLength={8} className="w-full border-2 border-[var(--color-ink)] p-4 font-mono text-[10px] uppercase font-black outline-none mb-4 tracking-widest" />
              {joinMsg && <p className="font-mono text-[8px] font-black uppercase mb-4">{joinMsg}</p>}
              <button onClick={handleJoin} disabled={joining || code.length < 8} className="w-full bg-[var(--color-ink)] text-white py-4 font-serif font-black text-xl uppercase italic tracking-tighter shadow-[4px_4px_0_var(--color-gold)]">{joining ? 'JOINING...' : 'JOIN_ACADEMY ➔'}</button>
            </div>
          )}

          <div className="border-4 border-[var(--color-ink)] bg-white shadow-[12px_12px_0_var(--color-cream)]">
            <div className="bg-[var(--color-ink)] px-6 py-3"><p className="font-mono text-[8px] font-black uppercase text-white/40 tracking-widest">{isTeacher ? 'MY_CLASSROOMS' : 'ENROLLED_CLASSROOMS'}</p></div>
            <div className="divide-y-2 divide-[var(--color-ink)]/5">
              {(isTeacher ? myClasses : joinedClasses.map(j => j.classrooms)).filter(Boolean).map(cls => (
                <button key={cls.id} onClick={() => selectClass(cls)} className={`w-full px-6 py-5 text-left transition-all ${selectedClass?.id === cls.id ? 'bg-[var(--color-cream)]' : 'hover:bg-[var(--color-paper)]'}`}>
                  <p className="font-serif font-black text-xl uppercase italic tracking-tighter text-[var(--color-ink)] leading-none">{cls.name}</p>
                  <p className="font-mono text-[8px] font-black uppercase text-[var(--color-gold)] mt-2 tracking-widest">{LEVEL_LABELS[cls.level]} // KEY_{cls.invite_code}</p>
                </button>
              ))}
              {(isTeacher ? myClasses : joinedClasses).length === 0 && <div className="p-12 text-center font-mono text-[9px] uppercase text-[var(--color-muted)] tracking-widest">NO_CLASSES_ACTIVE.</div>}
            </div>
          </div>

          {isTeacher && selectedClass && (
            <div className="border-4 border-dashed border-[var(--color-ink)] p-6 text-center">
              <p className="font-mono text-[8px] uppercase tracking-widest text-[var(--color-muted)] mb-2">INVITE_PROTOCOL_KEY</p>
              <p className="font-serif font-black text-4xl tracking-widest text-[var(--color-teal)] uppercase">{selectedClass.invite_code}</p>
            </div>
          )}
        </div>

        {/* ── MAIN CONTENT ── */}
        <div className="space-y-12">
          {!selectedClass ? (
            <div className="h-96 flex flex-col items-center justify-center border-8 border-dashed border-[var(--color-ink)]/10 text-[var(--color-muted)]">
              <p className="text-8xl mb-8 opacity-20">🏫</p>
              <p className="font-serif font-black text-3xl uppercase italic tracking-tighter opacity-20 italic">AWAITING_CLASSROOM_SELECTION</p>
            </div>
          ) : selectedStudent ? (
            <div className="animate-slide-up">
              <button onClick={() => setSelectedStudent(null)} className="font-mono text-[9px] font-black uppercase text-[var(--color-gold)] mb-8 flex items-center gap-2"><span>❴</span> RETURN_TO_LEADERBOARD <span>❵</span></button>
              <div className="border-4 border-[var(--color-ink)] bg-white shadow-[48px_48px_0_var(--color-cream)] overflow-hidden">
                <div className="bg-[var(--color-ink)] px-12 py-8">
                  <p className="eyebrow text-white/40 mb-4">NODE_ANALYSIS_PROTOCOL</p>
                  <h2 className="font-serif font-black text-white text-5xl md:text-6xl uppercase italic tracking-tighter leading-none">{selectedStudent.name}</h2>
                  <p className="font-mono text-[9px] font-black uppercase text-[var(--color-gold)] tracking-[0.5em] mt-4">RANK_0{selectedStudent.rank} // ACADEMY_MEMBER</p>
                </div>
                <div className="p-12 space-y-12">
                  {!studentStats ? (
                    <div className="p-12 text-center animate-pulse"><p className="font-mono text-[10px] font-black text-[var(--color-teal)] uppercase tracking-widest">PULLING_BIOMETRIC_STATS...</p></div>
                  ) : (
                    <>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                        <MiniStatBox label="AVG_ACCURACY" value={`${selectedStudent.avgScore}%`} />
                        <MiniStatBox label="SESSIONS" value={selectedStudent.sessCount} />
                        <MiniStatBox label="MASTERED" value={selectedStudent.topicsMaster} />
                        <MiniStatBox label="STREAK" value={`${studentStats.streak.current_streak}🔥`} color="text-amber-500" />
                      </div>
                      <div>
                        <p className="eyebrow mb-8">MASTERY_VECTORS_TOP_8</p>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          {studentStats.mastery.slice(0, 8).map(m => (
                            <div key={m.topic} className="flex flex-col gap-4 border-2 border-[var(--color-ink)]/10 p-4">
                              <div className="flex justify-between items-center">
                                <span className="font-serif font-black text-lg uppercase italic tracking-tighter text-[var(--color-ink)] leading-none">{m.topic}</span>
                                <span className={`font-mono text-[8px] font-black uppercase tracking-widest ${MASTERY_COLOR[m.mastery_level] || ''}`}>{m.mastery_level} // {m.avg_score}%</span>
                              </div>
                              <div className="h-1 bg-[var(--color-ink)]/5 border border-[var(--color-ink)]">
                                <div className="h-full bg-[var(--color-teal)]" style={{ width: `${m.avg_score}%` }} />
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-12">
              <div className="flex flex-col md:flex-row items-end justify-between border-b-4 border-[var(--color-ink)] pb-6 gap-8">
                <h2 className="font-serif font-black text-5xl md:text-7xl uppercase italic tracking-tighter text-[var(--color-ink)] leading-none">{selectedClass.name}</h2>
                <div className="flex gap-4 bg-[var(--color-paper)] p-2">
                  {[{ id: 'leaderboard', label: '🏆 RANKINGS' }, { id: 'assignments', label: `📋 DIRECTIVES (${assignments.length})` }].map(t => (
                    <button key={t.id} onClick={() => setClassTab(t.id)} className={`px-6 py-2 font-serif font-black text-lg uppercase italic tracking-tighter transition-all ${classTab === t.id ? 'bg-[var(--color-ink)] text-white' : 'text-[var(--color-muted)] hover:bg-[var(--color-cream)]'}`}>{t.label}</button>
                  ))}
                </div>
              </div>

              {classTab === 'leaderboard' && (
                <div className="border-4 border-[var(--color-ink)] bg-white shadow-[48px_48px_0_var(--color-cream)] overflow-hidden">
                  <div className="bg-[var(--color-ink)] px-8 py-3 grid grid-cols-12 font-mono text-[9px] font-black uppercase text-white/40 tracking-widest">
                    <span className="col-span-1">RANK</span>
                    <span className="col-span-5">MEMBER_IDENTIFIER</span>
                    <span className="col-span-2 text-center">AGGREGATE</span>
                    <span className="col-span-2 text-center">SESSIONS</span>
                    <span className="col-span-2 text-center">POINTS</span>
                  </div>
                  <div className="divide-y-2 divide-[var(--color-ink)]/5">
                    {leaderboard.map(s => (
                      <button key={s.userId} onClick={() => isTeacher ? handleStudentClick(s) : null} className={`w-full grid grid-cols-12 px-8 py-6 items-center text-left transition-all hover:bg-[var(--color-paper)] ${s.userId === user?.id ? 'border-l-8 border-[var(--color-gold)] bg-[var(--color-cream)]' : 'border-l-8 border-transparent'}`}>
                        <span className="col-span-1 font-serif font-black text-2xl italic">{MEDAL[s.rank] || `#${s.rank}`}</span>
                        <span className="col-span-5 flex items-center gap-4">
                          <span className="font-serif font-black text-2xl uppercase italic tracking-tighter text-[var(--color-ink)]">{s.name} {s.userId === user?.id && <span className="ml-4 font-mono text-[8px] border border-[var(--color-gold)] text-[var(--color-gold)] px-2">YOU</span>}</span>
                        </span>
                        <span className={`col-span-2 text-center font-serif font-black text-2xl italic ${s.avgScore >= 70 ? 'text-green-600' : s.avgScore >= 50 ? 'text-amber-500' : 'text-red-500'}`}>{s.avgScore}%</span>
                        <span className="col-span-2 text-center font-mono text-[10px] uppercase font-black">{s.sessCount}</span>
                        <span className="col-span-2 text-center font-serif font-black text-3xl italic text-[var(--color-gold)]">{s.points}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {classTab === 'assignments' && (
                <div className="space-y-8">
                  {isTeacher && (
                    <div>
                      {!showAssignForm ? (
                        <button onClick={() => setShowAssignForm(true)} className="bg-[var(--color-ink)] text-white px-12 py-6 font-serif font-black text-2xl uppercase italic tracking-tighter shadow-[12px_12px_0_var(--color-gold)] hover:bg-black transition-all">INITIALIZE_NEW_DIRECTIVE ➔</button>
                      ) : (
                        <div className="border-4 border-[var(--color-ink)] bg-white p-12 shadow-[32px_32px_0_var(--color-cream)] animate-slide-up">
                          <p className="eyebrow mb-12">DIRECTIVE_PROVISIONING_v2.0</p>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
                            <div className="md:col-span-2">
                              <label className="font-mono text-[8px] font-black uppercase text-[var(--color-muted)] mb-4 tracking-[0.4em] block">TITLE</label>
                              <input value={assignForm.title} onChange={e => setAssignForm(f => ({ ...f, title: e.target.value }))} placeholder="DIRECTIVE_TITLE_PRIMARY..." className="w-full border-2 border-[var(--color-ink)] p-4 font-serif font-black text-2xl italic uppercase outline-none" />
                            </div>
                            <div>
                              <label className="font-mono text-[8px] font-black uppercase text-[var(--color-muted)] mb-4 tracking-[0.4em] block">SUBJECT_TOPIC</label>
                              <input value={assignForm.topic} onChange={e => setAssignForm(f => ({ ...f, topic: e.target.value }))} placeholder="E.G_ALGEBROIC_EXPRESSIONS..." className="w-full border-2 border-[var(--color-ink)] p-4 font-serif font-black text-2xl italic uppercase outline-none" />
                            </div>
                            <div>
                              <label className="font-mono text-[8px] font-black uppercase text-[var(--color-muted)] mb-4 tracking-[0.4em] block">TARGET_DIFFICULTY</label>
                              <select value={assignForm.difficulty} onChange={e => setAssignForm(f => ({ ...f, difficulty: e.target.value }))} className="w-full border-2 border-[var(--color-ink)] p-4 font-mono text-[10px] font-black uppercase bg-white outline-none">
                                <option value="easy">GREEN // EASY</option>
                                <option value="medium">GOLD // MEDIUM</option>
                                <option value="hard">RED // HARD</option>
                              </select>
                            </div>
                          </div>
                          <div className="flex gap-8">
                            <button onClick={handleCreateAssignment} disabled={creatingAssign || !assignForm.title || !assignForm.topic} className="flex-1 bg-[var(--color-ink)] text-white py-8 font-serif font-black text-3xl uppercase italic tracking-tighter shadow-[8px_8px_0_var(--color-gold)] disabled:opacity-20">{creatingAssign ? 'COMMITTING...' : 'COMMIT_DIRECTIVE ➔'}</button>
                            <button onClick={() => setShowAssignForm(false)} className="px-12 py-8 border-4 border-[var(--color-ink)] font-serif font-black text-3xl uppercase italic tracking-tighter hover:bg-[var(--color-cream)] transition-all">CANCEL</button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  <div className="grid grid-cols-1 gap-12">
                    {assignments.map(a => {
                      const subs = assignResults[a.id] || []; const mySubmit = !isTeacher && subs.find(s => s.student_id === user.id)
                      return (
                        <div key={a.id} className={`border-4 border-[var(--color-ink)] bg-white p-12 shadow-[24px_24px_0_var(--color-cream)] transition-all ${a.status === 'closed' ? 'opacity-30grayscale' : 'hover:shadow-none'}`}>
                          <div className="flex flex-col md:flex-row justify-between items-start gap-8 mb-12">
                            <div>
                              <div className="flex items-center gap-4 mb-4">
                                <h3 className="font-serif font-black text-4xl uppercase italic tracking-tighter leading-none text-[var(--color-ink)]">{a.title}</h3>
                                <span className={`font-mono text-[8px] font-black px-4 py-1 border-2 ${a.status === 'active' ? 'bg-green-600 text-white border-green-600' : 'bg-gray-400 text-white border-gray-400'}`}>{a.status.toUpperCase()}</span>
                              </div>
                              <p className="font-mono text-[9px] font-black uppercase text-[var(--color-muted)] tracking-widest">{a.topic} // {a.difficulty.toUpperCase()}_DIFFICULTY</p>
                            </div>
                            <div className="flex gap-4">
                              {!isTeacher && a.status === 'active' && !mySubmit && <button onClick={() => handleStartAssignment(a)} className="bg-[var(--color-gold)] text-white px-12 py-6 font-serif font-black text-2xl uppercase italic tracking-tighter shadow-[8px_8px_0_black] hover:bg-amber-600 transition-all">ENGAGE_DIRECTIVE ➔</button>}
                              {!isTeacher && mySubmit && <span className="font-serif font-black text-3xl italic text-green-600 uppercase tracking-tighter">SUBMITTED // {mySubmit.score}%</span>}
                              {isTeacher && a.status === 'active' && <button onClick={() => handleCloseAssignment(a.id)} className="font-mono text-[9px] font-black uppercase text-red-600 hover:opacity-50 underline tracking-widest">TERMINATE_AVAILABILITY</button>}
                            </div>
                          </div>
                          {isTeacher && subs.length > 0 && (
                            <div className="border-t-4 border-[var(--color-ink)]/5 pt-8">
                              <p className="eyebrow mb-8">SUBMISSION_LEDGER // {subs.length}_ITEMS</p>
                              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {subs.map(s => (
                                  <div key={s.id} className="bg-[var(--color-paper)] p-4 border-2 border-[var(--color-ink)] flex justify-between items-center transition-all hover:bg-white">
                                    <span className="font-serif font-black text-lg uppercase italic tracking-tighter">{s.profiles?.display_name || 'STUDENT'}</span>
                                    <span className={`font-serif font-black text-2xl italic ${s.score >= 70 ? 'text-green-600' : s.score >= 50 ? 'text-amber-500' : 'text-red-500'}`}>{s.score}%</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

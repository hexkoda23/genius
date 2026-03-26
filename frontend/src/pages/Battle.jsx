import { useState, useEffect, useRef } from 'react'
import { useAuth } from '../context/AuthContext'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { generateBattleQuestions, gradeBattleAnswer } from '../services/api'
import {
  createBattleRoom, joinBattleRoom, getBattleRoom, saveRoomQuestions,
  submitBattleAnswer, finishBattleForPlayer, getBattleAnswers,
  subscribeToBattleRoom,
} from '../lib/social2'
import { ExplanationBody } from '../utils/RenderMath'
import { useReveal } from '../hooks/useReveal'

const DIFFICULTY_CONFIG = {
  easy: { label: 'LOW_INTENSITY', color: 'text-green-600 border-green-600' },
  medium: { label: 'STANDARD_LOAD', color: 'text-[var(--color-gold)] border-[var(--color-gold)]' },
  hard: { label: 'CRITICAL_FLUX', color: 'text-red-600 border-red-600' },
}
const LEVELS = ['primary', 'jss', 'secondary', 'university']
const LEVEL_LABELS = { primary: '基礎_PRIM', jss: '中等_JSS', secondary: '高等_SEC', university: '究極_UNI' }

function WaitingRoom({ room, user, onCancel }) {
  const isHost = room.host_id === user.id; const [copied, setCopied] = useState(false)
  const copyCode = () => { navigator.clipboard.writeText(room.code); setCopied(true); setTimeout(() => setCopied(false), 2000) }

  return (
    <div className="max-w-2xl mx-auto px-6 py-24 text-center relative z-10">
      <div className="border-4 border-[var(--color-ink)] bg-white p-12 md:p-24 shadow-[48px_48px_0_var(--color-cream)]">
        <p className="eyebrow mx-auto justify-center mb-12">MATCHMAKING_TERMINAL_v2.0</p>
        <div className="mb-16">
          <h2 className="font-serif font-black text-6xl md:text-8xl italic uppercase tracking-tighter leading-none mb-4">{room.topic}</h2>
          <p className="font-mono text-[11px] font-black uppercase tracking-[0.4em] opacity-40 italic">{room.level} // {room.difficulty}</p>
        </div>

        {isHost ? (
          <div className="space-y-12">
            <div>
              <p className="font-mono text-[10px] font-black uppercase tracking-[0.4em] text-[var(--color-gold)] mb-8">BROADCAST_UPLINK_CODE</p>
              <div className="flex gap-4 items-center justify-center">
                <div className="border-4 border-[var(--color-ink)] bg-[var(--color-paper)] px-12 py-8 font-serif font-black text-6xl md:text-8xl italic tracking-widest text-[var(--color-ink)]">
                  {room.code}
                </div>
                <button onClick={copyCode} className="w-24 h-24 border-4 border-[var(--color-ink)] flex items-center justify-center font-serif font-black text-3xl hover:bg-[var(--color-ink)] hover:text-white transition-all">
                  {copied ? '✓' : '⧉'}
                </button>
              </div>
            </div>
            <div className="py-8 border-y-2 border-[var(--color-ink)]/5">
              <p className="font-mono text-[10px] font-black text-[var(--color-teal)] animate-pulse uppercase tracking-[0.4em]">WAITING_FOR_OPPONENT_HANDSHAKE...</p>
            </div>
          </div>
        ) : (
          <div className="py-12">
            <p className="font-serif italic font-black text-4xl uppercase tracking-tighter text-[var(--color-teal)]">SYNCHRONIZED_WITH_HOST.</p>
            <p className="font-mono text-[10px] font-black uppercase tracking-[0.4em] opacity-40 mt-4">INITIALIZING_BATTLE_STREAMS...</p>
          </div>
        )}

        <button onClick={onCancel} className="mt-16 font-mono text-[10px] font-black uppercase tracking-[0.4em] text-[var(--color-muted)] hover:text-red-600 transition-all italic border-b-2 border-transparent hover:border-red-600">TERMINATE_COMM_LINK</button>
      </div>
    </div>
  )
}

function ResultsScreen({ room, myAnswers, opponentAnswers, user, onPlayAgain }) {
  const isHost = room.host_id === user.id; const myScore = isHost ? room.host_score : room.guest_score
  const opScore = isHost ? room.guest_score : room.host_score; const won = room.winner_id === user.id
  const tied = !room.winner_id && room.status === 'finished'

  return (
    <div className="max-w-5xl mx-auto px-6 py-24 relative z-10 text-center">
      <div className="border-8 border-[var(--color-ink)] bg-white p-12 md:p-32 shadow-[64px_64px_0_var(--color-cream)]">
        <p className="eyebrow mx-auto justify-center mb-16">POST_BATTLE_HEURISTICS</p>

        <div className="mb-24">
          <h2 className="font-serif font-black text-9xl md:text-[15rem] italic uppercase tracking-tighter leading-[0.7] mb-8">
            {won ? <span className="text-[var(--color-teal)]">VICTORY.</span> : tied ? <span className="text-purple-600">DRAW.</span> : <span className="text-slate-700 underline decoration-8">DEFEAT.</span>}
          </h2>
          <p className="font-mono text-[12px] font-black uppercase tracking-[0.6em] opacity-40 italic">{room.topic} // ARCHIVE_v4.1</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 mb-24">
          <div className="border-4 border-[var(--color-ink)] p-12 bg-[var(--color-paper)] shadow-[16px_16px_0_var(--color-teal)]/20">
            <p className="font-mono text-[10px] font-black uppercase text-[var(--color-teal)] mb-6">PERSONAL_ACCURACY</p>
            <p className="font-serif font-black text-8xl md:text-9xl leading-none italic uppercase tracking-tighter">{myScore}%</p>
          </div>
          <div className="border-4 border-[var(--color-ink)] p-12 bg-[var(--color-paper)]">
            <p className="font-mono text-[10px] font-black uppercase text-[var(--color-muted)] mb-6">OPPONENT_ACCURACY</p>
            <p className="font-serif font-black text-8xl md:text-9xl leading-none italic uppercase tracking-tighter opacity-40">{opScore}%</p>
          </div>
        </div>

        <div className="space-y-4 mb-24">
          {myAnswers.map((a, i) => {
            const opA = opponentAnswers.find(o => o.question_idx === i)
            return (
              <div key={i} className="flex items-center justify-between border-b-2 border-[var(--color-ink)]/5 pb-4">
                <span className="font-serif font-black italic text-2xl text-[var(--color-gold)]">Q_0{i + 1}</span>
                <div className="flex gap-8">
                  <span className={`font-mono text-[10px] font-black uppercase ${a.is_correct ? 'text-green-600' : 'text-red-500'}`}>YOU: {a.is_correct ? 'RESOLVED' : 'FAILED'}</span>
                  <span className={`font-mono text-[10px] font-black uppercase ${opA?.is_correct ? 'text-green-600' : 'text-red-500'} opacity-40`}>OPP: {opA?.is_correct ? 'RESOLVED' : 'FAILED'}</span>
                </div>
                <span className="font-mono text-[10px] font-black uppercase opacity-20">{a.time_taken}S_TX</span>
              </div>
            )
          })}
        </div>

        <button onClick={onPlayAgain} className="w-full bg-[var(--color-ink)] text-white py-12 font-serif font-black text-4xl uppercase tracking-tighter italic hover:bg-black transition-all shadow-[16px_16px_0_var(--color-gold)]">RE-ENGAGE_BATTLE ➔</button>
      </div>
    </div>
  )
}

export default function Battle() {
  const { user } = useAuth(); const navigate = useNavigate(); const [searchParams] = useSearchParams(); const revealRef = useReveal()
  const [phase, setPhase] = useState('setup'); const [topic, setTopic] = useState(''); const [level, setLevel] = useState('secondary')
  const [difficulty, setDifficulty] = useState('medium'); const [joinCode, setJoinCode] = useState(''); const [error, setError] = useState('')
  const [loading, setLoading] = useState(false); const [room, setRoom] = useState(null); const [questions, setQuestions] = useState([])
  const [qIdx, setQIdx] = useState(0); const [myAnswer, setMyAnswer] = useState(''); const [submitted, setSubmitted] = useState(false)
  const [gradeResult, setGradeResult] = useState(null); const [showAnswer, setShowAnswer] = useState(false); const [hintLevel, setHintLevel] = useState(0)
  const [myAnswers, setMyAnswers] = useState([]); const [opAnswers, setOpAnswers] = useState([]); const [elapsed, setElapsed] = useState(0)
  const timerRef = useRef(null); const channelRef = useRef(null)

  useEffect(() => { const code = searchParams.get('join'); if (code) { setJoinCode(code); handleJoinRoom(code) } }, [])
  useEffect(() => { if (phase === 'playing' && !submitted) timerRef.current = setInterval(() => setElapsed(e => e + 1), 1000); return () => clearInterval(timerRef.current) }, [phase, qIdx, submitted])

  const subscribeToRoom = (roomId) => {
    if (channelRef.current) channelRef.current.unsubscribe()
    channelRef.current = subscribeToBattleRoom(roomId, async (payload) => {
      const updated = payload.new; setRoom(updated)
      if (updated.status === 'active' && phase === 'waiting') await activateBattle(updated)
      if (updated.status === 'finished') {
        const { data: answers } = await getBattleAnswers(roomId)
        setMyAnswers(answers?.filter(a => a.user_id === user.id) || []); setOpAnswers(answers?.filter(a => a.user_id !== user.id) || []); setPhase('finished')
      }
    })
  }

  const activateBattle = async (r) => {
    setRoom(r); let qs = r.questions || []
    if (!qs.length) { await new Promise(res => setTimeout(res, 800)); const { data: fresh } = await getBattleRoom(r.id); qs = fresh?.questions || [] }
    if (qs.length === 5) { setQuestions(qs); setPhase('playing'); setQIdx(0); setElapsed(0) }
  }

  const handleCreateRoom = async () => {
    if (!topic.trim()) { setError('Topic Required'); return }; setLoading(true); setError('')
    const { data: newRoom, error: err } = await createBattleRoom(user.id, topic, level, difficulty)
    if (err || !newRoom) { setError('Failed to create room'); setLoading(false); return }
    const { data: qData } = await generateBattleQuestions(topic, level, difficulty)
    if (qData?.questions?.length === 5) await saveRoomQuestions(newRoom.id, qData.questions)
    setRoom(newRoom); subscribeToRoom(newRoom.id); setPhase('waiting'); setLoading(false)
  }

  const handleJoinRoom = async (code) => {
    const c = (code || joinCode).trim(); if (!c) { setError('Code Required'); return }; setLoading(true); setError('')
    const { data: joined, error: err } = await joinBattleRoom(user.id, c)
    if (err || !joined) { setError(err || 'Failed to join'); setLoading(false); return }
    setRoom(joined); subscribeToRoom(joined.id); setPhase('waiting')
    if (joined.questions?.length === 5) { setQuestions(joined.questions); setPhase('playing'); setQIdx(0); setElapsed(0) }
    setLoading(false)
  }

  const handleSubmit = async () => {
    if (!myAnswer.trim() || submitted) return; clearInterval(timerRef.current); setSubmitted(true)
    const q = questions[qIdx]; const { data: grade } = await gradeBattleAnswer(room.topic, q.question, q.answer, myAnswer)
    setGradeResult(grade); const isCorrect = grade?.is_correct || false
    await submitBattleAnswer(room.id, user.id, qIdx, myAnswer, isCorrect, elapsed)
    setMyAnswers(prev => [...prev, { question_idx: qIdx, answer: myAnswer, is_correct: isCorrect, time_taken: elapsed }])
  }

  const handleNext = async () => {
    if (qIdx >= 4) {
      const correct = [...myAnswers, { is_correct: gradeResult?.is_correct }].filter(Boolean).filter(a => a.is_correct).length
      const pct = Math.round((correct / 5) * 100); const isHost = room.host_id === user.id
      await finishBattleForPlayer(room.id, user.id, isHost, pct)
    } else {
      setQIdx(i => i + 1); setMyAnswer(''); setSubmitted(false); setGradeResult(null); setShowAnswer(false); setHintLevel(0); setElapsed(0)
    }
  }

  const handleCancel = () => { if (channelRef.current) channelRef.current.unsubscribe(); setPhase('setup'); setRoom(null); setQuestions([]); setMyAnswers([]); setOpAnswers([]) }

  return (
    <div className="max-w-[1440px] mx-auto px-6 md:px-12 py-12 bg-[var(--color-paper)] min-h-screen relative overflow-hidden" ref={revealRef}>
      <div className="grain pointer-events-none" />

      {phase === 'setup' && (
        <>
          <div className="mb-24 flex flex-col md:flex-row items-end justify-between gap-12 relative z-10">
            <div className="max-w-4xl">
              <p className="eyebrow">ELITE_ENGAGEMENT_v7.3</p>
              <h1 className="font-serif font-black text-7xl md:text-[10rem] tracking-tighter uppercase leading-[0.8] italic">
                BATTLE <br /><span className="text-[var(--color-gold)] not-italic">ARENA.</span>
              </h1>
              <p className="font-serif italic text-2xl text-[var(--color-muted)] mt-12 border-l-4 border-[var(--color-gold)] pl-8 max-w-xl uppercase tracking-tighter">Synchronized head-to-head cognitive duels for sovereign dominance.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-24 relative z-10">
            <div className="border-4 border-[var(--color-ink)] bg-white p-12 md:p-16 shadow-[48px_48px_0_var(--color-cream)]">
              <p className="eyebrow mb-12">INITIALIZE_HOST_NODE</p>
              <div className="space-y-12">
                <div className="space-y-4">
                  <p className="font-mono text-[9px] font-black uppercase tracking-[0.4em] text-[var(--color-gold)]">BATTLE_SECTOR</p>
                  <input type="text" value={topic} onChange={e => setTopic(e.target.value)} placeholder="E.G_CALCULUS_FLUX" className="w-full bg-[var(--color-paper)] border-4 border-[var(--color-ink)] p-8 font-serif font-black text-3xl italic placeholder:opacity-20 uppercase tracking-tighter outline-none focus:bg-white transition-all" />
                </div>
                <div className="grid grid-cols-2 gap-12">
                  <div className="space-y-4">
                    <p className="font-mono text-[9px] font-black uppercase tracking-[0.4em] text-[var(--color-gold)]">MASTERY_LEVEL</p>
                    <div className="grid grid-cols-2 gap-0 border-2 border-[var(--color-ink)]">
                      {LEVELS.map(l => (
                        <button key={l} onClick={() => setLevel(l)} className={`py-4 font-mono text-[9px] font-black uppercase border-r-2 last:border-r-0 border-[var(--color-ink)] transition-all ${level === l ? 'bg-[var(--color-ink)] text-white' : 'hover:bg-[var(--color-cream)]'}`}>{LEVEL_LABELS[l]}</button>
                      ))}
                    </div>
                  </div>
                  <div className="space-y-4">
                    <p className="font-mono text-[9px] font-black uppercase tracking-[0.4em] text-[var(--color-gold)]">INTENSITY_FLUX</p>
                    <div className="grid grid-cols-3 gap-0 border-2 border-[var(--color-ink)]">
                      {['easy', 'medium', 'hard'].map(d => (
                        <button key={d} onClick={() => setDifficulty(d)} className={`py-4 font-mono text-[9px] font-black uppercase border-r-2 last:border-r-0 border-[var(--color-ink)] transition-all ${difficulty === d ? 'bg-[var(--color-ink)] text-white' : 'hover:bg-[var(--color-cream)]'}`}>{d.slice(0, 3)}</button>
                      ))}
                    </div>
                  </div>
                </div>
                <button onClick={handleCreateRoom} disabled={loading || !topic.trim()} className="w-full bg-[var(--color-ink)] text-white py-12 font-serif font-black text-4xl uppercase tracking-tighter italic hover:bg-black transition-all shadow-[12px_12px_0_var(--color-gold)] disabled:opacity-20">
                  {loading ? 'GENERATING_ARENA...' : 'OPEN_DUEL_PORTAL ➔'}
                </button>
              </div>
            </div>

            <div className="border-4 border-[var(--color-ink)] bg-white p-12 md:p-16 shadow-[48px_48px_0_var(--color-cream)]">
              <p className="eyebrow mb-12">JOIN_EXISTING_ARENA</p>
              <div className="space-y-12">
                <div className="space-y-4">
                  <p className="font-mono text-[9px] font-black uppercase tracking-[0.4em] text-[var(--color-gold)]">DUEL_UPLINK_TOKEN</p>
                  <input type="text" value={joinCode} onChange={e => setJoinCode(e.target.value.toUpperCase())} maxLength={6} placeholder="TOKEN_ID" className="w-full bg-[var(--color-paper)] border-4 border-[var(--color-ink)] p-12 font-serif font-black text-6xl md:text-8xl italic placeholder:opacity-20 uppercase tracking-[0.4em] text-center outline-none focus:bg-white transition-all" />
                </div>
                <button onClick={() => handleJoinRoom()} disabled={loading || joinCode.length < 6} className="w-full bg-slate-800 text-white py-12 font-serif font-black text-4xl uppercase tracking-tighter italic hover:bg-black transition-all shadow-[12px_12px_0_var(--color-ink)] disabled:opacity-20">
                  {loading ? 'UPLINKING...' : 'INITIALIZE_DUEL ➔'}
                </button>
                <p className="font-mono text-[10px] text-center uppercase tracking-widest opacity-40">INPUT_REQUIRED: 6_CHAR_AUTH_TOKEN</p>
              </div>
            </div>
          </div>
        </>
      )}

      {phase === 'waiting' && <WaitingRoom room={room} user={user} onCancel={handleCancel} />}
      {phase === 'finished' && <ResultsScreen room={room} user={user} myAnswers={myAnswers} opponentAnswers={opAnswers} onPlayAgain={handleCancel} />}

      {phase === 'playing' && (
        <div className="max-w-5xl mx-auto py-12 relative z-10">
          <div className="flex flex-col md:flex-row items-end justify-between gap-8 mb-16 border-b-4 border-[var(--color-ink)] pb-12">
            <div>
              <p className="font-mono text-[9px] font-black uppercase tracking-[0.4em] text-[var(--color-gold)] mb-4">ENGAGEMENT_CONTEXT</p>
              <h2 className="font-serif font-black text-5xl italic uppercase tracking-tighter leading-none">{room.topic}</h2>
            </div>
            <div className="flex gap-1">
              {[0, 1, 2, 3, 4].map(i => (
                <div key={i} className={`w-12 h-3 border-2 border-[var(--color-ink)] ${i < qIdx ? 'bg-[var(--color-teal)]' : i === qIdx ? 'bg-[var(--color-gold)] animate-pulse' : 'bg-white'}`} />
              ))}
            </div>
            <div className="text-right">
              <p className="font-mono text-[9px] font-black uppercase text-[var(--color-muted)] mb-2">TEMPORAL_DRIVE</p>
              <p className="font-serif font-black text-5xl italic leading-none">{Math.floor(elapsed / 60)}:{String(elapsed % 60).padStart(2, '0')}</p>
            </div>
          </div>

          <div className="border-4 border-[var(--color-ink)] bg-white p-12 md:p-24 shadow-[64px_64px_0_var(--color-cream)]">
            <div className="space-y-12">
              <div className="p-12 border-4 border-[var(--color-ink)] bg-[var(--color-paper)] relative overflow-hidden">
                <div className="absolute top-0 right-0 px-8 py-2 bg-[var(--color-ink)] font-mono text-[9px] font-black uppercase text-white">PROBLEM_0{qIdx + 1}</div>
                <p className="font-serif font-black text-4xl italic uppercase tracking-tighter leading-tight"><ExplanationBody text={questions[qIdx].question} /></p>
              </div>

              {questions[qIdx].hints?.length > 0 && !submitted && (
                <div className="space-y-4">
                  {questions[qIdx].hints.slice(0, hintLevel).map((h, i) => (
                    <div key={i} className="border-2 border-[var(--color-gold)] bg-amber-50 p-6 flex gap-4 items-center">
                      <span className="font-serif font-black italic text-xl text-[var(--color-gold)]">H_0{i + 1}</span>
                      <p className="font-serif italic text-xl uppercase tracking-tight text-amber-900">{h}</p>
                    </div>
                  ))}
                  {hintLevel < questions[qIdx].hints.length && (
                    <button onClick={() => setHintLevel(l => l + 1)} className="font-mono text-[9px] font-black uppercase text-[var(--color-gold)] hover:underline tracking-widest italic">INITIALIZE_HINT_STREAM ➔</button>
                  )}
                </div>
              )}

              {!submitted ? (
                <div className="space-y-8">
                  <textarea value={myAnswer} onChange={e => setMyAnswer(e.target.value)} placeholder="INPUT_SCHEMA_RESOLUTION..." rows={4} className="w-full bg-[var(--color-paper)] border-4 border-[var(--color-ink)] p-12 font-serif font-black text-4xl italic placeholder:opacity-10 uppercase tracking-tighter outline-none focus:bg-white transition-all resize-none" />
                  <button onClick={handleSubmit} disabled={!myAnswer.trim()} className="w-full bg-[var(--color-ink)] text-white py-12 font-serif font-black text-4xl uppercase tracking-tighter italic hover:bg-black transition-all shadow-[12px_12px_0_var(--color-gold)] disabled:opacity-20">COMMIT_SOLUTION ➔</button>
                </div>
              ) : (
                <div className="space-y-12">
                  <div className={`p-10 border-4 ${gradeResult?.is_correct ? 'border-green-600 bg-green-50' : 'border-red-600 bg-red-50'}`}>
                    <p className={`font-serif font-black text-3xl italic uppercase tracking-tighter ${gradeResult?.is_correct ? 'text-green-700' : 'text-red-700'}`}>
                      {gradeResult?.is_correct ? 'SCHEMA_VERIFIED_CORRECT.' : 'RESOLUTION_FAILURE.'} // {gradeResult?.feedback}
                    </p>
                  </div>
                  <button onClick={handleNext} className="w-full bg-[var(--color-ink)] text-white py-12 font-serif font-black text-4xl uppercase tracking-tighter italic hover:bg-black transition-all shadow-[12px_12px_0_var(--color-gold)]">
                    {qIdx >= 4 ? 'TERMINATE_BATTLE ➔' : 'INITIALIZE_NEXT_BURST ➔'}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

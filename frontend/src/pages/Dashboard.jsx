import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { getDashboardStats } from '../lib/progress'
import { getUserStats, xpProgress } from '../lib/stats'
import { getTopicMastery } from '../lib/learning'
import { getOverallStats, getTopicPerformance, getMainframeStats } from '../services/api'
import { useReveal } from '../hooks/useReveal'

const WAEC_WEIGHTS = { 'Number Bases': 4, 'Fractions': 3, 'Indices and Surds': 4, 'Logarithms': 4, 'Sequences and Series': 4, 'Quadratic Equations': 5, 'Linear Equations': 3, 'Simultaneous Equations': 3, 'Inequalities': 3, 'Polynomials': 3, 'Coordinate Geometry': 4, 'Plane Geometry': 4, 'Circle Geometry': 4, 'Mensuration': 5, 'Trigonometry': 5, 'Vectors': 3, 'Matrices': 3, 'Statistics': 5, 'Probability': 4, 'Sets': 3, 'Functions': 3, 'Differentiation': 3, 'Integration': 3, 'Permutations and Combinations': 3, 'Commercial Arithmetic': 4, 'Ratio and Proportion': 2 }

function PredictionWidget({ stats, xpStats, masteryData, examTarget }) {
  const [expanded, setExpanded] = useState(false)
  const total = stats?.totalAttempted || 0
  const accuracy = stats?.accuracy || 0
  const streak = xpStats?.streak_current || 0

  if (total < 10) return null

  const exam = examTarget || 'WAEC'
  const topicScores = {}
    ; (masteryData || []).forEach(m => { topicScores[m.topic] = Math.round(m.avg_score || 0) })

  let weightedSum = 0, totalWeight = 0, coveredTopics = []
  Object.entries(WAEC_WEIGHTS).forEach(([topic, weight]) => {
    totalWeight += weight
    if (topicScores[topic] !== undefined) {
      weightedSum += topicScores[topic] * weight
      coveredTopics.push({ topic, score: topicScores[topic], weight })
    } else {
      weightedSum += 30 * weight
    }
  })

  const predicted = Math.min(99, (totalWeight > 0 ? Math.round(weightedSum / totalWeight) : accuracy) + Math.min(5, Math.floor(streak / 6)))
  const isHigh = predicted >= 75
  const isMedium = predicted >= 60

  return (
    <div className="bg-[var(--color-paper)] border border-[var(--color-border)] rounded-3xl shadow-lg overflow-hidden animate-fade-in mb-12">
      <div className={`p-8 flex items-center justify-between ${isHigh ? 'bg-green-50' : isMedium ? 'bg-blue-50' : 'bg-red-50'}`}>
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--color-muted)] mb-2">Predictive Performance // {exam}</p>
          <p className={`text-4xl font-extrabold tracking-tight ${isHigh ? 'text-green-700' : isMedium ? 'text-blue-700' : 'text-red-700'}`}>
            {isHigh ? 'Distinction Likely' : isMedium ? 'Credit Projected' : 'Improvement Required'}
          </p>
        </div>
        <div className="text-right border-l border-black/10 pl-10">
          <div className={`text-6xl font-black tracking-tighter ${isHigh ? 'text-green-700' : isMedium ? 'text-blue-700' : 'text-red-700'}`}>{predicted}%</div>
          <p className="text-[10px] font-bold uppercase text-[var(--color-muted)] mt-1">Confidence Score</p>
        </div>
      </div>
      <div className="p-8 space-y-6">
        <div className="h-2.5 bg-[var(--color-ink)]/5 rounded-full overflow-hidden">
          <div className={`h-full transition-all duration-1000 ${isHigh ? 'bg-green-600' : isMedium ? 'bg-blue-600' : 'bg-red-600'}`} style={{ width: `${predicted}%` }} />
        </div>
        <button onClick={() => setExpanded(!expanded)} className="text-xs font-bold text-[var(--color-teal)] flex items-center gap-2 hover:opacity-70 transition-opacity">
          {expanded ? 'Hide topic impact' : 'View priority topics'}
          <span>{expanded ? '↑' : '↓'}</span>
        </button>
        {expanded && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4 animate-slide-up">
            {coveredTopics.filter(t => t.score < 60).slice(0, 4).map(t => (
              <div key={t.topic} className="p-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-cream)] flex justify-between items-center">
                <span className="text-sm font-bold text-[var(--color-ink)]">{t.topic}</span>
                <Link to={`/practice?topic=${encodeURIComponent(t.topic)}`} className="text-[10px] font-bold text-red-500 uppercase tracking-widest bg-white border border-red-100 px-3 py-1 rounded-full">Boost</Link>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function StatCard({ icon, label, value, sub }) {
  return (
    <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-3xl p-8 hover:border-[var(--color-teal)] transition-all group">
      <div className="flex justify-between items-start mb-6">
        <span className="text-3xl filter grayscale group-hover:grayscale-0 transition-all">{icon}</span>
      </div>
      <div className="text-5xl font-black text-[var(--color-ink)] tracking-tight mb-2">{value}</div>
      <p className="text-xs font-bold text-[var(--color-muted)] uppercase tracking-widest">{label}</p>
      {sub && <p className="text-[10px] text-[var(--color-teal)] font-bold mt-6 pt-4 border-t border-[var(--color-border)]">{sub}</p>}
    </div>
  )
}

function AccuracyBar({ topic, attempted, correct }) {
  const pct = attempted > 0 ? Math.round((correct / attempted) * 100) : 0
  const isGood = pct >= 80
  const isMid = pct >= 50
  return (
    <div className="space-y-3">
      <div className="flex justify-between text-[11px] font-bold uppercase tracking-wider">
        <span className="text-[var(--color-ink)]">{topic}</span>
        <span className={!isMid ? 'text-red-500' : 'text-[var(--color-muted)]'}>{pct}%</span>
      </div>
      <div className="h-1.5 bg-[var(--color-ink)]/5 rounded-full overflow-hidden">
        <div className={`h-full transition-all duration-1000 ${isGood ? 'bg-green-500' : isMid ? 'bg-amber-500' : 'bg-red-500'}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}

export default function Dashboard() {
  const { user, profile } = useAuth(); const [stats, setStats] = useState(null); const [xpStats, setXpStats] = useState(null); const [masteryData, setMasteryData] = useState([]); const [history, setHistory] = useState([]); const [corrections, setCorrections] = useState([]); const [euler, setEuler] = useState(null); const [loading, setLoading] = useState(true); const revealRef = useReveal()
  useEffect(() => { if (user) loadAll() }, [user])
  const loadAll = async () => {
    if (!user) return
    setLoading(true)
    console.log('[DASHBOARD] Loading optimized mainframe for user:', user.id)
    try {
      const res = await getMainframeStats(user.id)
      const data = res.data

      if (data.success) {
        setStats({
          topicsStudied: data.mastery.all.length,
          totalAttempted: (data.mastery.all || []).reduce((acc, t) => acc + (t.total_attempted || 0), 0),
          totalCorrect: Math.round((data.stats.avg_score / 100) * (data.mastery.all || []).reduce((acc, t) => acc + (t.total_attempted || 0), 0)),
          accuracy: data.stats.avg_score,
          avgScore: data.stats.avg_score,
          practiceCount: data.stats.total_exams,
          bookmarkCount: 0, // Placeholder if not in mainframe
          conversationCount: data.euler.recent.length,
          weakTopics: data.mastery.weak,
          strongTopics: data.mastery.strong,
          recentProgress: [],
          recentSessions: data.history,
          streak: { current: data.stats.streak, longest: data.profile.longest_streak || 0 },
          masteryBreakdown: { master: 0, proficient: 0, developing: 0, beginner: 0 },
          dueTopics: [], topicsMastered: 0,
        })
        setXpStats({ xp: data.profile.xp || 0, streak_current: data.profile.streak_days || 0 })
        setMasteryData(data.mastery.all || [])
        setHistory(data.history || [])
        setCorrections(data.corrections || [])
        setEuler(data.euler || null)
      }
    } catch (e) {
      console.error('[DASHBOARD] Optimized load error:', e)
      // Fallback to empty state
      setStats({
        topicsStudied: 0, totalAttempted: 0, totalCorrect: 0, accuracy: 0, avgScore: 0,
        practiceCount: 0, bookmarkCount: 0, conversationCount: 0,
        weakTopics: [], strongTopics: [], recentProgress: [], recentSessions: [],
        streak: { current: 0, longest: 0 }, masteryBreakdown: { master: 0, proficient: 0, developing: 0, beginner: 0 },
        dueTopics: [], topicsMastered: 0,
      })
      setXpStats({ xp: 0, streak_current: 0 })
    } finally {
      setLoading(false)
    }
  }
  if (loading) return <div className="p-24 text-center animate-pulse text-[11px] font-bold uppercase text-[var(--color-muted)] tracking-widest">Synchronizing Channels...</div>
  const { level, progress } = xpProgress(xpStats?.xp || 0)
  const rank = stats?.rank || 1

  return (
    <div className="max-w-7xl mx-auto px-6 py-12 lg:py-24" ref={revealRef}>
      <div className="mb-16 flex flex-col md:flex-row md:items-end justify-between gap-8">
        <div className="space-y-4">
          <p className="text-[11px] font-bold text-[var(--color-teal)] uppercase tracking-widest">Student Mainframe</p>
          <h1 className="text-5xl lg:text-7xl font-extrabold text-[var(--color-ink)] tracking-tight">Analytics <span className="text-[var(--color-teal)]">Vault.</span></h1>
        </div>
        <div className="flex gap-4">
          <Link to="/practice" className="bg-[var(--color-ink)] text-white px-8 py-4 rounded-xl font-bold text-sm hover:shadow-xl transition-all">Engage Practice</Link>
          <Link to="/teach" className="px-8 py-4 border border-[var(--color-border)] rounded-xl font-bold text-sm hover:bg-[var(--color-cream)] transition-all">Talk to Euler</Link>
        </div>
      </div>

      <div className="space-y-8 animate-fade-in">
        {/* Tier Stats */}
        <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-[2.5rem] p-8 lg:p-12 shadow-sm flex flex-col lg:flex-row items-center gap-12">
          <div className="flex items-center gap-8 flex-1">
            <div className="w-20 h-20 rounded-2xl bg-[var(--color-teal)] flex items-center justify-center text-white text-4xl font-extrabold shadow-lg shadow-[var(--color-teal)]/20">{level}</div>
            <div className="space-y-1">
              <p className="text-[10px] font-bold text-[var(--color-muted)] uppercase tracking-widest">Intelligence Tier</p>
              <h2 className="text-3xl font-extrabold text-[var(--color-ink)]">Rank {rank} Adept</h2>
              <p className="text-xs font-medium text-[var(--color-muted)]">{xpStats?.xp?.toLocaleString()} XP Units Accumulated</p>
            </div>
          </div>
          <div className="flex-1 w-full space-y-4">
            <div className="flex justify-between text-xs font-bold uppercase tracking-wider text-[var(--color-ink)]">
              <span>Progress to Tier {level + 1}</span>
              <span>{progress}%</span>
            </div>
            <div className="h-3 bg-[var(--color-cream)] rounded-full overflow-hidden border border-[var(--color-border)]">
              <div style={{ width: `${progress}%` }} className="h-full bg-[var(--color-ink)] transition-all duration-1000" />
            </div>
          </div>
          <div className="text-center lg:text-right border-t lg:border-t-0 lg:border-l border-[var(--color-border)] pt-8 lg:pt-0 lg:pl-12">
            <p className="text-[10px] font-bold text-orange-500 uppercase tracking-widest mb-1 flex items-center lg:justify-end gap-2">
              <span className="w-2 h-2 rounded-full bg-orange-500 animate-pulse" /> Streak Active
            </p>
            <p className="text-5xl font-black text-orange-500 tracking-tighter">{xpStats?.streak_current || 0} Days</p>
          </div>
        </div>

        {/* Global Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCard icon="📚" label="Nodes Explored" value={stats.topicsStudied} sub="Syllabus Penetration active" />
          <StatCard icon="🎯" label="Problems Solved" value={stats.totalAttempted} sub={`${stats.totalCorrect} Correct Resolutions`} />
          <StatCard icon="📊" label="Precision Index" value={`${stats.accuracy}%`} sub={`Historical Avg: ${stats.avgScore}%`} />
          <StatCard icon="🔖" label="Archive Logs" value={stats.bookmarkCount} sub={`${stats.conversationCount} Tutor Sessions`} />
        </div>

        {/* Predictions */}
        <PredictionWidget stats={stats} xpStats={xpStats} masteryData={masteryData} examTarget={profile?.exam_target} />

        {/* Recent Activity & Corrections */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* History */}
          <div className="lg:col-span-2 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-[2.5rem] p-10 overflow-hidden">
            <div className="flex justify-between items-center mb-10 pb-4 border-b border-[var(--color-border)]">
              <h3 className="text-xs font-bold text-[var(--color-ink)] uppercase tracking-[0.3em]">Exam Chronology</h3>
              <Link to="/cbt-history" className="text-[10px] font-bold text-[var(--color-teal)] uppercase">View All →</Link>
            </div>
            <div className="space-y-6">
              {history.length === 0 ? <p className="text-sm text-[var(--color-muted)]">No sessions recorded.</p> : history.map(s => (
                <div key={s.id} className="flex items-center justify-between p-4 rounded-2xl hover:bg-[var(--color-cream)] transition-all border border-transparent hover:border-[var(--color-border)] group">
                  <div className="flex items-center gap-6">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-xl ${s.percentage >= 70 ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
                      {s.percentage >= 70 ? '🏆' : '📝'}
                    </div>
                    <div>
                      <p className="text-sm font-bold text-[var(--color-ink)]">{s.exam_type} {s.year || s.topic}</p>
                      <p className="text-[10px] font-medium text-[var(--color-muted)]">{new Date(s.completed_at).toLocaleDateString()}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={`text-lg font-black ${s.percentage >= 70 ? 'text-green-600' : 'text-red-600'}`}>{s.percentage}%</p>
                    <p className="text-[10px] font-bold text-[var(--color-muted)]">{s.score}/{s.total}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Corrections/Euler */}
          <div className="space-y-8">
            <div className="bg-[var(--color-ink)] text-white rounded-[2.5rem] p-10">
              <h3 className="text-[10px] font-bold text-white/50 uppercase tracking-[0.3em] mb-8">Euler Sync</h3>
              {euler?.recent?.length > 0 ? (
                <div className="space-y-6">
                  <p className="text-sm font-medium leading-relaxed">You last asked about <span className="text-[var(--color-teal)] font-bold">{euler.recent[0].topic || 'General Maths'}</span>.</p>
                  <Link to="/teach" className="inline-block bg-[var(--color-teal)] text-white px-6 py-3 rounded-xl font-bold text-[10px] uppercase tracking-wider hover:opacity-90 transition-opacity">Resume Dialectic</Link>
                </div>
              ) : (
                <p className="text-sm text-white/50 italic">Euler is awaiting your first inquiry.</p>
              )}
            </div>

            <div className="bg-[var(--color-paper)] border border-[var(--color-border)] rounded-[2.5rem] p-10">
              <h3 className="text-[10px] font-bold text-[var(--color-muted)] uppercase tracking-[0.3em] mb-8">Weakest Nodes</h3>
              <div className="space-y-6">
                {stats.weakTopics.map(t => (
                  <div key={t.topic} className="flex justify-between items-center">
                    <span className="text-xs font-bold text-[var(--color-ink)]">{t.topic}</span>
                    <span className="text-[10px] font-bold text-red-500 bg-red-50 px-2 py-1 rounded-md">{t.accuracy}%</span>
                  </div>
                ))}
                {stats.weakTopics.length === 0 && <p className="text-xs text-[var(--color-muted)]">No weak nodes detected.</p>}
              </div>
            </div>
          </div>
        </div>

        {/* Performance Breakdown */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-[2.5rem] p-10 lg:p-12">
            <h3 className="text-xs font-bold text-red-500 uppercase tracking-[0.3em] mb-10 pb-4 border-b border-[var(--color-border)]">Attention Required</h3>
            <div className="space-y-10">
              {stats.weakTopics.length === 0 ? <p className="text-sm font-medium text-green-600">All channels stabilized.</p> : stats.weakTopics.map(t => (
                <div key={t.topic} className="space-y-4">
                  <AccuracyBar topic={t.topic} attempted={t.questions_attempted || t.total_attempted} correct={Math.round((t.accuracy / 100) * (t.questions_attempted || t.total_attempted))} />
                  <Link to={`/practice?topic=${encodeURIComponent(t.topic)}&auto=true`} className="text-[10px] font-bold text-[var(--color-teal)] uppercase tracking-wider hover:opacity-70 transition-opacity flex items-center gap-2">Execute Remediation Protocol →</Link>
                </div>
              ))}
            </div>
          </div>
          <div className="bg-[var(--color-cream)] border border-[var(--color-border)] rounded-[2.5rem] p-10 lg:p-12">
            <h3 className="text-xs font-bold text-green-600 uppercase tracking-[0.3em] mb-10 pb-4 border-b border-[var(--color-border)]">Mastery Report</h3>
            <div className="space-y-10">
              {stats.strongTopics.length === 0 ? <p className="text-sm font-medium text-[var(--color-muted)]">Awaiting mastery data...</p> : stats.strongTopics.map(t => (
                <AccuracyBar key={t.topic} topic={t.topic} attempted={t.questions_attempted || t.total_attempted} correct={Math.round((t.accuracy / 100) * (t.questions_attempted || t.total_attempted))} />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

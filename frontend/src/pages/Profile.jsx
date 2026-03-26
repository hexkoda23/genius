import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

import { useTheme } from '../context/ThemeContext'
import { supabase } from '../lib/supabase'
import { getUserStats, xpProgress, BADGES } from '../lib/stats'
import { getReferralCode, getReferralStats, getReferralLink, applyReferralCode } from '../lib/referrals'
import { createNotification } from '../lib/notifications'
import { getUserProfile, updateUserProfile } from '../services/api'
import { useReveal } from '../hooks/useReveal'

const AVATAR_COLORS = [
  { id: 'teal', bg: 'bg-[var(--color-teal)]', label: 'Teal' },
  { id: 'ink', bg: 'bg-[var(--color-ink)]', label: 'Dark' },
  { id: 'gold', bg: 'bg-[var(--color-gold)]', label: 'Gold' },
  { id: 'purple', bg: 'bg-indigo-500', label: 'Indigo' },
  { id: 'pink', bg: 'bg-rose-500', label: 'Rose' },
  { id: 'green', bg: 'bg-emerald-500', label: 'Emerald' },
]

const EXAM_TARGETS = ['WAEC', 'NECO', 'JAMB', 'WAEC & JAMB', 'NECO & JAMB', 'All']

export default function Profile() {
  const { user, profile, refreshProfile } = useAuth(); const { isDark, toggleTheme } = useTheme(); const revealRef = useReveal()
  const [stats, setStats] = useState(null); const [referralData, setReferralData] = useState(null); const [referralStats, setReferralStats] = useState(null)
  const [fullName, setFullName] = useState(''); const [school, setSchool] = useState(''); const [bio, setBio] = useState(''); const [examTarget, setExamTarget] = useState('WAEC'); const [examDate, setExamDate] = useState(''); const [avatarColor, setAvatarColor] = useState('teal')
  const [refCode, setRefCode] = useState(''); const [refInput, setRefInput] = useState(''); const [refMsg, setRefMsg] = useState(null); const [copied, setCopied] = useState(false); const [saving, setSaving] = useState(false); const [saved, setSaved] = useState(false); const [tab, setTab] = useState('profile')
  const [role, setRole] = useState('student'); const [parentEmail, setParentEmail] = useState(''); const [emailAlertsOn, setEmailAlertsOn] = useState(true); const [alertThreshold, setAlertThreshold] = useState(50); const [savingEmail, setSavingEmail] = useState(false); const [emailSaved, setEmailSaved] = useState(false)
  const [targetScore, setTargetScore] = useState(''); const [targetYear, setTargetYear] = useState(''); const [studyGoalMins, setStudyGoalMins] = useState(30)

  useEffect(() => {
    if (user && profile) {
      setFullName(profile.full_name || ''); setSchool(profile.school || ''); setBio(profile.bio || ''); setExamTarget(profile.exam_target || 'WAEC'); setExamDate(profile.exam_date || ''); setAvatarColor(profile.avatar_color || 'teal'); setParentEmail(profile.parent_email || ''); setEmailAlertsOn(profile.email_alerts_enabled !== false); setAlertThreshold(profile.alert_threshold || 50); setRole(profile.role || 'student')
    }
  }, [profile])

  useEffect(() => {
    if (!user) return
    Promise.all([getUserStats(user.id), getReferralCode(user.id), getReferralStats(user.id), getUserProfile(user.id)]).then(([s, r, rs, p]) => {
      setStats(s); setReferralData(r); setReferralStats(rs); setRefCode(r?.referral_code || '')
      const prof = p?.data?.profile
      if (prof) {
        if (prof.target_score) setTargetScore(prof.target_score)
        if (prof.target_year) setTargetYear(prof.target_year)
        if (prof.study_goal_mins_per_day) setStudyGoalMins(prof.study_goal_mins_per_day)
      }
    })
  }, [user])

  const handleSaveEmailAlerts = async () => {
    setSavingEmail(true); await supabase.from('profiles').update({ parent_email: parentEmail || null, email_alerts_enabled: emailAlertsOn, alert_threshold: alertThreshold }).eq('id', user.id)
    setSavingEmail(false); setEmailSaved(true); setTimeout(() => setEmailSaved(false), 2500)
  }

  const handleSave = async () => {
    setSaving(true); await supabase.from('profiles').update({ full_name: fullName, school, bio, exam_target: examTarget, exam_date: examDate || null, avatar_color: avatarColor, role }).eq('id', user.id)
    try { await updateUserProfile(user.id, { target_exam: examTarget, target_score: targetScore ? parseInt(targetScore) : null, target_year: targetYear ? parseInt(targetYear) : null, study_goal_mins_per_day: parseInt(studyGoalMins) || 30 }) } catch { }
    if (refreshProfile) await refreshProfile()
    setSaving(false); setSaved(true); setTimeout(() => setSaved(false), 2500)
  }

  const handleCopyLink = () => { const link = getReferralLink(refCode); navigator.clipboard.writeText(link); setCopied(true); setTimeout(() => setCopied(false), 2000) }
  const handleApplyCode = async () => {
    if (!refInput.trim()) return
    const result = await applyReferralCode(user.id, refInput.trim())
    if (result.success) {
      setRefMsg({ type: 'success', text: '✅ Code applied! +50 XP added.' })
      await createNotification(user.id, { type: 'referral', title: 'Referral Applied!', message: 'You earned 50 XP for joining via referral.', icon: '🎁', link: '/mastery' })
    } else { setRefMsg({ type: 'error', text: `❌ ${result.error}` }) }
    setTimeout(() => setRefMsg(null), 4000)
  }

  const { level, progress, current, needed } = stats ? xpProgress(stats.xp || 0) : { level: 1, progress: 0, current: 0, needed: 100 }
  const initials = fullName ? fullName.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() : user?.email?.[0]?.toUpperCase() || '?'
  const avatarBg = AVATAR_COLORS.find(c => c.id === avatarColor)?.bg || 'bg-[var(--color-teal)]'
  const daysToExam = examDate ? Math.max(0, Math.ceil((new Date(examDate) - new Date()) / 86400000)) : null

  const NAV_TILES = [
    { id: 'analytics', label: 'Analytics & Growth', desc: 'Track your XP, mastery, and exam history', icon: '📊', link: '/profile/analytics', color: 'teal' },
    { id: 'vault', label: 'Identity Vault', desc: 'Manage your name, school, and academic targets', icon: '🔐', link: '/profile/vault', color: 'ink' },
    { id: 'badges', label: 'Badge Archive', desc: 'View your collection of honorary insignia', icon: '🏅', link: '/profile/badges', color: 'gold' },
    { id: 'referrals', label: 'Peer Propagation', desc: 'Manage your referral link and XP dividends', icon: '🤝', link: '/profile/referrals', color: 'purple' },
    { id: 'settings', label: 'System Settings', desc: 'Aesthetic modes and guardian supervision', icon: '⚙️', link: '/profile/settings', color: 'muted' },
  ]

  return (
    <div className="max-w-7xl mx-auto px-6 py-12 lg:py-24" ref={revealRef}>
      {/* Header */}
      <div className="mb-20 space-y-4">
        <p className="text-[11px] font-bold text-[var(--color-teal)] uppercase tracking-widest">User Dossier</p>
        <h1 className="text-5xl lg:text-7xl font-extrabold text-[var(--color-ink)] tracking-tight">Identity <span className="text-[var(--color-teal)]">Manifesto.</span></h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[380px_1fr] gap-12 items-start">
        {/* Profile Sidebar */}
        <div className="space-y-8">
          <div className="bg-white border border-[var(--color-border)] rounded-[2.5rem] p-10 shadow-sm text-center">
            <div className={`${avatarBg} w-28 h-28 rounded-3xl mx-auto flex items-center justify-center text-white text-4xl font-extrabold shadow-lg mb-8`}>
              {initials}
            </div>
            <h2 className="text-2xl font-bold text-[var(--color-ink)] mb-2">{fullName || 'Adept Student'}</h2>
            <p className="text-sm font-medium text-[var(--color-muted)] mb-8">{user?.email}</p>

            <div className="flex justify-center gap-3 mb-10">
              <span className={`px-4 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${role === 'teacher' ? 'bg-blue-100 text-blue-600' : role === 'parent' ? 'bg-purple-100 text-purple-600' : 'bg-amber-100 text-amber-600'}`}>
                {role}
              </span>
              <span className="px-4 py-1.5 rounded-full bg-[var(--color-cream)] text-[10px] font-bold uppercase tracking-wider text-[var(--color-ink)]">
                Rank {level}
              </span>
            </div>

            <div className="space-y-6 text-left">
              <div className="space-y-2">
                <div className="flex justify-between text-[10px] font-bold uppercase tracking-widest text-[var(--color-muted)]">
                  <span>Exp Progress</span>
                  <span>{current}/{needed}</span>
                </div>
                <div className="h-2 bg-[var(--color-cream)] rounded-full overflow-hidden border border-[var(--color-border)]">
                  <div className="h-full bg-[var(--color-ink)] transition-all duration-1000" style={{ width: `${progress}%` }} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 rounded-2xl bg-[var(--color-cream)] border border-[var(--color-border)] text-center">
                  <p className="text-2xl font-extrabold text-[var(--color-ink)]">🔥 {stats?.streak_current || 0}</p>
                  <p className="text-[10px] font-bold uppercase text-[var(--color-muted)]">Streak</p>
                </div>
                <div className="p-4 rounded-2xl bg-[var(--color-cream)] border border-[var(--color-border)] text-center">
                  <p className="text-2xl font-extrabold text-[var(--color-teal)]">#{stats?.rank || '--'}</p>
                  <p className="text-[10px] font-bold uppercase text-[var(--color-muted)]">Rank</p>
                </div>
              </div>

              {daysToExam !== null && (
                <div className="p-5 rounded-2xl bg-red-50 border border-red-100 text-center">
                  <p className="text-3xl font-extrabold text-red-600">{daysToExam}</p>
                  <p className="text-[10px] font-bold uppercase text-red-500 tracking-widest">Days to {examTarget}</p>
                </div>
              )}
            </div>
          </div>

          <div className="space-y-3">
            <button onClick={() => { navigator.clipboard.writeText(`${window.location.origin}/share/${user?.id}`); alert('Public link copied to clipboard.') }}
              className="w-full h-14 bg-[var(--color-ink)] text-white rounded-2xl font-bold text-sm uppercase tracking-widest hover:opacity-90 transition-all">
              Share Profile
            </button>
            <a href="/certificate" className="flex items-center justify-center w-full h-14 border border-[var(--color-border)] rounded-2xl font-bold text-sm uppercase tracking-widest hover:bg-[var(--color-cream)] transition-all">
              View Credentials
            </a>
          </div>
        </div>

        {/* Navigation Grid Area */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {NAV_TILES.map(tile => (
            <Link key={tile.id} to={tile.link} className="group bg-white border border-[var(--color-border)] rounded-[2.5rem] p-10 shadow-sm hover:border-[var(--color-teal)] hover:shadow-xl transition-all flex flex-col items-start gap-6">
              <div className={`w-16 h-16 rounded-2xl flex items-center justify-center text-4xl shadow-inner ${tile.color === 'teal' ? 'bg-[var(--color-teal)]/10' :
                tile.color === 'gold' ? 'bg-[var(--color-gold)]/10' :
                  tile.color === 'purple' ? 'bg-indigo-50' :
                    'bg-[var(--color-cream)]'
                }`}>
                {tile.icon}
              </div>
              <div>
                <h3 className="text-2xl font-black text-[var(--color-ink)] group-hover:text-[var(--color-teal)] transition-colors mb-2 uppercase tracking-tight">{tile.label}</h3>
                <p className="text-sm text-[var(--color-muted)] font-medium leading-relaxed">{tile.desc}</p>
              </div>
              <div className="mt-auto pt-6 w-full flex items-center justify-between text-[11px] font-black uppercase tracking-widest text-[var(--color-ink)]">
                <span>Access Vault</span>
                <span className="opacity-0 group-hover:opacity-100 transition-all transform translate-x-0 group-hover:translate-x-2">➔</span>
              </div>
            </Link>
          ))}
        </div>

      </div>
    </div>
  )
}

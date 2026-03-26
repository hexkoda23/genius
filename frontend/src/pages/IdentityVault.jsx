import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'
import { getUserProfile, updateUserProfile } from '../services/api'

export default function IdentityVault() {
    const { user, profile, fetchProfile } = useAuth()
    const navigate = useNavigate()

    const [fullName, setFullName] = useState('')
    const [school, setSchool] = useState('')
    const [bio, setBio] = useState('')
    const [examTarget, setExamTarget] = useState('WAEC')
    const [examDate, setExamDate] = useState('')
    const [avatarColor, setAvatarColor] = useState('teal')
    const [role, setRole] = useState('student')
    const [targetScore, setTargetScore] = useState('')
    const [targetYear, setTargetYear] = useState('')
    const [studyGoalMins, setStudyGoalMins] = useState(30)

    const [saving, setSaving] = useState(false)
    const [saved, setSaved] = useState(false)

    const AVATAR_COLORS = [
        { id: 'teal', bg: 'bg-[var(--color-teal)]', label: 'Teal' },
        { id: 'ink', bg: 'bg-[var(--color-ink)]', label: 'Dark' },
        { id: 'gold', bg: 'bg-[var(--color-gold)]', label: 'Gold' },
        { id: 'purple', bg: 'bg-indigo-500', label: 'Indigo' },
        { id: 'pink', bg: 'bg-rose-500', label: 'Rose' },
        { id: 'green', bg: 'bg-emerald-500', label: 'Emerald' },
    ]

    const EXAM_TARGETS = ['WAEC', 'NECO', 'JAMB', 'WAEC & JAMB', 'NECO & JAMB', 'All']

    useEffect(() => {
        if (profile) {
            setFullName(profile.full_name || '')
            setSchool(profile.school || '')
            setBio(profile.bio || '')
            setExamTarget(profile.exam_target || 'WAEC')
            setExamDate(profile.exam_date || '')
            setAvatarColor(profile.avatar_color || 'teal')
            setRole(profile.role || 'student')
        }
    }, [profile])

    useEffect(() => {
        if (!user) return
        getUserProfile(user.id).then(p => {
            const prof = p?.data?.profile
            if (prof) {
                if (prof.target_score) setTargetScore(prof.target_score)
                if (prof.target_year) setTargetYear(prof.target_year)
                if (prof.study_goal_mins_per_day) setStudyGoalMins(prof.study_goal_mins_per_day)
            }
        })
    }, [user])

    const handleSave = async () => {
        setSaving(true)
        await supabase.from('profiles').update({
            full_name: fullName,
            school,
            bio,
            exam_target: examTarget,
            exam_date: examDate || null,
            avatar_color: avatarColor,
            role
        }).eq('id', user.id)

        try {
            await updateUserProfile(user.id, {
                target_exam: examTarget,
                target_score: targetScore ? parseInt(targetScore) : null,
                target_year: targetYear ? parseInt(targetYear) : null,
                study_goal_mins_per_day: parseInt(studyGoalMins) || 30
            })
        } catch { }

        await fetchProfile()
        setSaving(false)
        setSaved(true)
        setTimeout(() => setSaved(false), 2500)
    }

    return (
        <div className="max-w-5xl mx-auto px-6 py-12 space-y-16">
            {/* Header */}
            <div className="flex items-end justify-between border-b-4 border-[var(--color-ink)] pb-8">
                <div>
                    <p className="text-[11px] font-bold text-[var(--color-teal)] uppercase tracking-widest mb-2">Public Persona</p>
                    <h1 className="text-5xl lg:text-7xl font-black text-[var(--color-ink)] tracking-tight uppercase">
                        Identity <span className="text-[var(--color-teal)]">Vault.</span>
                    </h1>
                </div>
                <button onClick={() => navigate('/profile')}
                    className="flex items-center gap-2 px-6 py-3 rounded-2xl border border-[var(--color-border)] text-sm font-bold hover:bg-[var(--color-cream)] transition-all">
                    ← Back to Profile
                </button>
            </div>

            <div className="bg-white border border-[var(--color-border)] rounded-[2.5rem] p-10 lg:p-14 shadow-sm space-y-12">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-3">
                        <label className="text-[10px] font-bold uppercase tracking-widest text-[var(--color-muted)]">Full Legal Name</label>
                        <input type="text" value={fullName} onChange={e => setFullName(e.target.value)} className="w-full h-14 bg-[var(--color-cream)] border border-[var(--color-border)] rounded-2xl px-6 text-sm font-medium outline-none focus:border-[var(--color-teal)]" />
                    </div>
                    <div className="space-y-3">
                        <label className="text-[10px] font-bold uppercase tracking-widest text-[var(--color-muted)]">Institution ID</label>
                        <input type="text" value={school} onChange={e => setSchool(e.target.value)} className="w-full h-14 bg-[var(--color-cream)] border border-[var(--color-border)] rounded-2xl px-6 text-sm font-medium outline-none focus:border-[var(--color-teal)]" />
                    </div>
                </div>

                <div className="space-y-3">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-[var(--color-muted)]">Biographic Manifesto</label>
                    <textarea value={bio} onChange={e => setBio(e.target.value)} rows={4} className="w-full bg-[var(--color-cream)] border border-[var(--color-border)] rounded-[2.5rem] p-8 text-sm font-medium outline-none focus:border-[var(--color-teal)]" />
                </div>

                <div className="space-y-8 pt-8 border-t border-[var(--color-border)]">
                    <div className="space-y-4">
                        <label className="text-[10px] font-bold uppercase tracking-widest text-[var(--color-muted)]">Target Academic Schema</label>
                        <div className="flex flex-wrap gap-2">
                            {EXAM_TARGETS.map(et => (
                                <button key={et} onClick={() => setExamTarget(et)}
                                    className={`px-6 py-3 rounded-xl border text-[11px] font-bold transition-all ${examTarget === et ? 'bg-[var(--color-ink)] text-white border-[var(--color-ink)]' : 'bg-white text-[var(--color-ink)] border-[var(--color-border)] hover:border-[var(--color-ink)]'}`}>
                                    {et}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="space-y-3">
                            <label className="text-[10px] font-bold uppercase tracking-widest text-[var(--color-muted)]">Projected Exam Date</label>
                            <input type="date" value={examDate} onChange={e => setExamDate(e.target.value)} className="w-full h-14 bg-[var(--color-cream)] border border-[var(--color-border)] rounded-2xl px-6 text-sm outline-none" />
                        </div>
                        <div className="space-y-3">
                            <label className="text-[10px] font-bold uppercase tracking-widest text-[var(--color-muted)]">Visual Identity Color</label>
                            <div className="flex gap-3 h-14 items-center">
                                {AVATAR_COLORS.map(c => (
                                    <button key={c.id} onClick={() => setAvatarColor(c.id)} className={`w-8 h-8 rounded-full ${c.bg} border-2 transition-all ${avatarColor === c.id ? 'border-[var(--color-ink)] scale-125' : 'border-transparent opacity-50'}`} />
                                ))}
                            </div>
                        </div>
                    </div>
                </div>

                <div className="pt-8 border-t border-[var(--color-border)]">
                    <button onClick={handleSave} disabled={saving} className="w-full h-16 bg-[var(--color-teal)] text-white rounded-2xl font-bold text-sm uppercase tracking-widest hover:shadow-xl transition-all disabled:opacity-50">
                        {saving ? 'Synchronizing...' : saved ? 'Vault Updated Successfully' : 'Commit Changes to Archive'}
                    </button>
                </div>
            </div>
        </div>
    )
}

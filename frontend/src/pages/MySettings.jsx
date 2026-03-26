import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useTheme } from '../context/ThemeContext'
import { supabase } from '../lib/supabase'

export default function MySettings() {
    const { user, profile, fetchProfile } = useAuth()
    const { isDark, toggleTheme } = useTheme()
    const navigate = useNavigate()

    const [parentEmail, setParentEmail] = useState('')
    const [emailAlertsOn, setEmailAlertsOn] = useState(true)
    const [alertThreshold, setAlertThreshold] = useState(50)
    const [saving, setSaving] = useState(false)
    const [saved, setSaved] = useState(false)

    useEffect(() => {
        if (profile) {
            setParentEmail(profile.parent_email || '')
            setEmailAlertsOn(profile.email_alerts_enabled !== false)
            setAlertThreshold(profile.alert_threshold || 50)
        }
    }, [profile])

    const handleSave = async () => {
        setSaving(true)
        const { error } = await supabase
            .from('profiles')
            .update({
                parent_email: parentEmail || null,
                email_alerts_enabled: emailAlertsOn,
                alert_threshold: alertThreshold
            })
            .eq('id', user.id)

        if (!error) {
            await fetchProfile()
            setSaved(true)
            setTimeout(() => setSaved(false), 2500)
        }
        setSaving(false)
    }

    return (
        <div className="max-w-4xl mx-auto px-6 py-12 space-y-16">
            {/* Header */}
            <div className="flex items-end justify-between border-b-4 border-[var(--color-ink)] pb-8">
                <div>
                    <p className="text-[11px] font-bold text-[var(--color-ink)] uppercase tracking-widest mb-2">System Preferences</p>
                    <h1 className="text-5xl lg:text-7xl font-black text-[var(--color-ink)] tracking-tight uppercase">
                        Settings <span className="text-[var(--color-teal)]">Vault.</span>
                    </h1>
                </div>
                <button onClick={() => navigate('/profile')}
                    className="flex items-center gap-2 px-6 py-3 rounded-2xl border border-[var(--color-border)] text-sm font-bold hover:bg-[var(--color-cream)] transition-all">
                    ← Back to Profile
                </button>
            </div>

            <div className="space-y-12">
                {/* Appearance */}
                <section className="space-y-6">
                    <h2 className="text-xs font-bold uppercase tracking-widest text-[var(--color-muted)]">Engine Preferences</h2>
                    <div className="flex items-center justify-between p-10 rounded-[2rem] bg-[var(--color-cream)] border border-[var(--color-border)]">
                        <div className="space-y-1">
                            <p className="text-lg font-bold text-[var(--color-ink)]">Aesthetic Mode</p>
                            <p className="text-sm text-[var(--color-muted)] font-medium">Toggle between light and dark visual themes</p>
                        </div>
                        <button onClick={toggleTheme} className={`w-16 h-9 rounded-full border-2 border-[var(--color-ink)] transition-all relative ${isDark ? 'bg-[var(--color-ink)]' : 'bg-white'}`}>
                            <div className={`absolute top-1.5 w-4.5 h-4.5 rounded-full bg-[var(--color-teal)] transition-all ${isDark ? 'left-9' : 'left-1.5'}`} />
                        </button>
                    </div>
                </section>

                {/* Guardian / Notifications */}
                <section className="space-y-8 pt-10 border-t border-[var(--color-border)]">
                    <h2 className="text-xs font-bold uppercase tracking-widest text-[var(--color-muted)]">Guardian Supervision</h2>
                    <div className="bg-white border border-[var(--color-border)] rounded-[2.5rem] p-10 space-y-8">
                        <div className="space-y-3">
                            <label className="text-[10px] font-bold uppercase text-[var(--color-muted)]">Guardian Email Context</label>
                            <input
                                type="email"
                                value={parentEmail}
                                onChange={e => setParentEmail(e.target.value)}
                                placeholder="parent@example.com"
                                className="w-full h-14 bg-[var(--color-cream)] border border-[var(--color-border)] rounded-2xl px-6 text-sm font-medium outline-none focus:border-[var(--color-teal)]"
                            />
                            <p className="text-[10px] text-[var(--color-muted)]">Weekly reports and performance alerts will be sent here.</p>
                        </div>

                        <div className="flex items-center justify-between pt-6 border-t border-[var(--color-border)]">
                            <div className="space-y-1">
                                <span className="text-xs font-bold text-[var(--color-ink)]">Alert Threshold</span>
                                <p className="text-[10px] text-[var(--color-muted)] font-medium">Notify guardian if score falls below this level.</p>
                            </div>
                            <select
                                value={alertThreshold}
                                onChange={e => setAlertThreshold(Number(e.target.value))}
                                className="bg-transparent text-sm font-bold border-b-2 border-[var(--color-teal)] outline-none px-2 py-1"
                            >
                                {[30, 40, 50, 60, 70].map(v => <option key={v} value={v}>{v}% Score</option>)}
                            </select>
                        </div>

                        <div className="flex items-center justify-between pt-6 border-t border-[var(--color-border)]">
                            <div className="space-y-1">
                                <span className="text-xs font-bold text-[var(--color-ink)]">Email Alerts</span>
                                <p className="text-[10px] text-[var(--color-muted)] font-medium">Enable/Disable all automated guardian emails.</p>
                            </div>
                            <button
                                onClick={() => setEmailAlertsOn(!emailAlertsOn)}
                                className={`w-12 h-6 rounded-full transition-all relative ${emailAlertsOn ? 'bg-[var(--color-teal)]' : 'bg-[var(--color-muted)]'}`}
                            >
                                <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${emailAlertsOn ? 'left-7' : 'left-1'}`} />
                            </button>
                        </div>

                        <button
                            onClick={handleSave}
                            disabled={saving}
                            className="w-full h-16 bg-[var(--color-ink)] text-white rounded-2xl font-bold text-sm uppercase tracking-widest shadow-lg hover:shadow-xl transition-all disabled:opacity-50"
                        >
                            {saving ? 'Synchronizing...' : saved ? 'Settings Updated Successfully' : 'Update Guardian Link'}
                        </button>
                    </div>
                </section>
            </div>
        </div>
    )
}

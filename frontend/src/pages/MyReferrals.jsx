import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { getReferralCode, getReferralStats, getReferralLink, applyReferralCode } from '../lib/referrals'
import { createNotification } from '../lib/notifications'

export default function MyReferrals() {
    const { user } = useAuth()
    const navigate = useNavigate()

    const [refCode, setRefCode] = useState('')
    const [referralStats, setReferralStats] = useState(null)
    const [refInput, setRefInput] = useState('')
    const [refMsg, setRefMsg] = useState(null)
    const [copied, setCopied] = useState(false)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        if (!user) return
        Promise.all([
            getReferralCode(user.id),
            getReferralStats(user.id)
        ]).then(([code, stats]) => {
            setRefCode(code?.referral_code || '')
            setReferralStats(stats)
            setLoading(false)
        }).catch(() => setLoading(false))
    }, [user])

    const handleCopyLink = () => {
        const link = getReferralLink(refCode)
        navigator.clipboard.writeText(link)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
    }

    const handleApplyCode = async () => {
        if (!refInput.trim()) return
        const result = await applyReferralCode(user.id, refInput.trim())
        if (result.success) {
            setRefMsg({ type: 'success', text: '✅ Code applied! +50 XP added.' })
            await createNotification(user.id, {
                type: 'referral',
                title: 'Referral Applied!',
                message: 'You earned 50 XP for joining via referral.',
                icon: '🎁',
                link: '/mastery'
            })
        } else {
            setRefMsg({ type: 'error', text: `❌ ${result.error}` })
        }
        setTimeout(() => setRefMsg(null), 4000)
    }

    if (loading) {
        return (
            <div className="min-h-screen bg-[var(--color-paper)] flex items-center justify-center">
                <div className="w-16 h-16 border-4 border-[var(--color-teal)] border-t-transparent rounded-full animate-spin" />
            </div>
        )
    }

    return (
        <div className="max-w-4xl mx-auto px-6 py-12 space-y-16">
            {/* Header */}
            <div className="flex items-end justify-between border-b-4 border-[var(--color-ink)] pb-8">
                <div>
                    <p className="text-[11px] font-bold text-indigo-500 uppercase tracking-widest mb-2">Growth Propagation</p>
                    <h1 className="text-5xl lg:text-7xl font-black text-[var(--color-ink)] tracking-tight uppercase">
                        Peers <span className="text-indigo-500">Program.</span>
                    </h1>
                </div>
                <button onClick={() => navigate('/profile')}
                    className="flex items-center gap-2 px-6 py-3 rounded-2xl border border-[var(--color-border)] text-sm font-bold hover:bg-[var(--color-cream)] transition-all">
                    ← Back to Profile
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-[1.2fr_0.8fr] gap-12">
                {/* Left: Stats & Link */}
                <div className="space-y-10">
                    <section className="space-y-6">
                        <h2 className="text-xs font-bold uppercase tracking-widest text-[var(--color-muted)]">Your Referral Link</h2>
                        <div className="bg-white border border-[var(--color-border)] rounded-[2.5rem] p-10 shadow-sm space-y-6">
                            <p className="text-sm text-[var(--color-muted)] font-medium">Invite your friends to MathGenius and both of you will receive <span className="font-bold text-[var(--color-ink)]">+100 XP</span> when they sign up.</p>

                            <div className="bg-[var(--color-cream)] border border-[var(--color-border)] rounded-2xl p-6 text-sm font-bold text-[var(--color-ink)] break-all select-all">
                                {refCode ? getReferralLink(refCode) : 'Generating Link...'}
                            </div>

                            <button
                                onClick={handleCopyLink}
                                className="w-full h-16 bg-[var(--color-ink)] text-white rounded-2xl font-bold text-sm uppercase tracking-widest shadow-lg hover:shadow-xl transition-all"
                            >
                                {copied ? 'Link Cached successfully' : 'Copy Connection Link'}
                            </button>
                        </div>
                    </section>

                    <section className="space-y-6">
                        <h2 className="text-xs font-bold uppercase tracking-widest text-[var(--color-muted)]">Propagation dividends</h2>
                        <div className="grid grid-cols-2 gap-6">
                            <div className="p-10 rounded-[2.5rem] bg-[var(--color-cream)] border border-[var(--color-border)] text-center">
                                <p className="text-6xl font-black text-[var(--color-ink)]">{referralStats?.count || 0}</p>
                                <p className="text-[10px] font-bold uppercase text-[var(--color-muted)] mt-2">Peers Invited</p>
                            </div>
                            <div className="p-10 rounded-[2.5rem] bg-indigo-50 border border-indigo-100 text-center">
                                <p className="text-6xl font-black text-indigo-600">{(referralStats?.count || 0) * 100}</p>
                                <p className="text-[10px] font-bold uppercase text-indigo-400 mt-2">XP Dividends</p>
                            </div>
                        </div>
                    </section>
                </div>

                {/* Right: Apply Code */}
                <div className="space-y-10">
                    <section className="space-y-6">
                        <h2 className="text-xs font-bold uppercase tracking-widest text-[var(--color-muted)]">Join via Peer</h2>
                        <div className="bg-white border border-[var(--color-border)] rounded-[2.5rem] p-10 shadow-sm space-y-6">
                            <p className="text-sm text-[var(--color-muted)] font-medium">Were you invited by someone? Enter their referral code here to get <span className="font-bold text-[var(--color-ink)]">+50 XP</span> instantly.</p>

                            <input
                                type="text"
                                value={refInput}
                                onChange={e => setRefInput(e.target.value)}
                                placeholder="ENTER_CODE"
                                className="w-full h-14 bg-[var(--color-cream)] border border-[var(--color-border)] rounded-2xl px-6 text-center text-lg font-black tracking-widest outline-none focus:border-indigo-500 uppercase"
                            />

                            {refMsg && (
                                <p className={`text-xs font-bold text-center ${refMsg.type === 'success' ? 'text-green-600' : 'text-red-500'}`}>
                                    {refMsg.text}
                                </p>
                            )}

                            <button
                                onClick={handleApplyCode}
                                className="w-full h-14 border border-[var(--color-border)] rounded-2xl font-bold text-xs uppercase tracking-widest hover:bg-[var(--color-cream)] transition-all"
                            >
                                Apply Invite Code
                            </button>
                        </div>
                    </section>

                    <section className="p-10 rounded-[2.5rem] bg-amber-50 border border-amber-100 space-y-4">
                        <h3 className="text-lg font-bold text-amber-900 flex items-center gap-2">
                            <span>💡</span> Referral Tip
                        </h3>
                        <p className="text-xs text-amber-800 leading-relaxed font-medium">
                            Sharing your referral link in study groups or with classmates is the fastest way to level up and reach the top of the leaderboard without answering a single question!
                        </p>
                    </section>
                </div>
            </div>
        </div>
    )
}

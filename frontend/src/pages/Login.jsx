import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { useNavigate, Link } from 'react-router-dom'
import { useReveal } from '../hooks/useReveal'

function EyeIcon({ open }) {
  return open ? (
    <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></svg>
  ) : (
    <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94" /><path d="M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19" /><line x1="1" y1="1" x2="23" y2="23" /></svg>
  )
}

function InputField({ label, value, onChange, placeholder, type = 'text', required = true, isPassword = false }) {
  const [show, setShow] = useState(false)
  return (
    <div className="space-y-2">
      <label className="text-[11px] font-bold uppercase tracking-widest text-[var(--color-muted)]">{label}</label>
      <div className="relative">
        <input type={isPassword ? (show ? 'text' : 'password') : type} value={value} onChange={onChange} placeholder={placeholder} required={required} className="w-full bg-white border border-[var(--color-border)] rounded-xl px-5 py-3.5 text-sm outline-none focus:border-[var(--color-teal)] transition-all placeholder:text-[var(--color-muted)]/40" />
        {isPassword && (
          <button type="button" onClick={() => setShow(!show)} className="absolute right-4 top-1/2 -translate-y-1/2 text-[var(--color-muted)] hover:text-[var(--color-ink)] transition-colors">
            <EyeIcon open={show} />
          </button>
        )}
      </div>
    </div>
  )
}

export default function Login({ defaultTab = 'login' }) {
  const navigate = useNavigate(); const revealRef = useReveal(); const [tab, setTab] = useState(defaultTab)
  const [loginEmail, setLoginEmail] = useState(''); const [loginPassword, setLoginPassword] = useState('')
  const [firstName, setFirstName] = useState(''); const [surname, setSurname] = useState(''); const [grade, setGrade] = useState('')
  const [signupEmail, setSignupEmail] = useState(''); const [signupPassword, setSignupPassword] = useState(''); const [verifyPassword, setVerifyPassword] = useState('')
  const [loading, setLoading] = useState(false); const [error, setError] = useState(''); const [success, setSuccess] = useState('')

  const handleLogin = async (e) => {
    e.preventDefault(); setLoading(true); setError(''); const { error } = await supabase.auth.signInWithPassword({ email: loginEmail.trim(), password: loginPassword })
    if (error) setError(error.message); else navigate('/dashboard'); setLoading(false)
  }

  const handleSignup = async (e) => {
    e.preventDefault(); setError(''); setSuccess('')
    if (!grade) return setError('Please select your grade.')
    if (signupPassword !== verifyPassword) return setError('Passwords do not match.')
    setLoading(true); const { error } = await supabase.auth.signUp({ email: signupEmail.trim(), password: signupPassword, options: { data: { full_name: `${firstName} ${surname}`.trim(), level: grade } } })
    if (error) setError(error.message); else navigate('/dashboard'); setLoading(false)
  }

  return (
    <div className="min-h-screen flex flex-col justify-center items-center bg-[var(--color-cream)] p-6 relative overflow-hidden" ref={revealRef}>
      <div className="absolute top-0 right-0 w-[50rem] h-[50rem] bg-[var(--color-teal)] rounded-full blur-[200px] opacity-[0.03] -z-10 translate-x-1/2 -translate-y-1/2" />
      <div className="absolute bottom-0 left-0 w-[50rem] h-[50rem] bg-[var(--color-gold)] rounded-full blur-[200px] opacity-[0.03] -z-10 -translate-x-1/2 translate-y-1/2" />

      <Link to="/" className="mb-12 group transition-transform hover:scale-105">
        <h2 className="text-3xl font-extrabold tracking-tight text-[var(--color-ink)]">Math<span className="text-[var(--color-teal)]">Genius</span></h2>
      </Link>

      <div className="max-w-md w-full bg-white border border-[var(--color-border)] rounded-[2.5rem] p-10 shadow-2xl animate-fade-in relative">
        <div className="flex bg-[var(--color-cream)] p-1.5 rounded-2xl mb-12 border border-[var(--color-border)]">
          {['login', 'signup'].map(t => (
            <button key={t} onClick={() => { setTab(t); setError(''); setSuccess('') }}
              className={`flex-1 py-3 rounded-xl text-xs font-bold uppercase tracking-widest transition-all ${tab === t ? 'bg-white text-[var(--color-ink)] shadow-md' : 'text-[var(--color-muted)] hover:text-[var(--color-ink)]'}`}>
              {t === 'login' ? 'Sign In' : 'Join Elite'}
            </button>
          ))}
        </div>

        <div className="space-y-8">
          <button onClick={() => supabase.auth.signInWithOAuth({ provider: 'google' })}
            className="w-full h-14 border border-[var(--color-border)] rounded-2xl bg-white flex items-center justify-center gap-3 text-sm font-bold hover:bg-[var(--color-cream)] transition-all group">
            <svg className="w-5 h-5" viewBox="0 0 18 18"><path fill="#4285F4" d="M16.51 8H8.98v3h4.3c-.18 1-.74 1.48-1.6 2.04v2.01h2.6a7.8 7.8 0 002.38-5.88c0-.57-.05-.66-.15-1.18z" /><path fill="#34A853" d="M8.98 17c2.16 0 3.97-.72 5.3-1.94l-2.6-2a4.8 4.8 0 01-7.18-2.54H1.83v2.07A8 8 0 008.98 17z" /><path fill="#FBBC05" d="M4.5 10.52a4.8 4.8 0 010-3.04V5.41H1.83a8 8 0 000 7.18l2.67-2.07z" /><path fill="#EA4335" d="M8.98 4.18c1.17 0 2.23.4 3.06 1.2l2.3-2.3A8 8 0 001.83 5.4L4.5 7.49a4.77 4.77 0 014.48-3.31z" /></svg>
            Continue with Google
          </button>

          <div className="relative flex items-center gap-4">
            <div className="h-px flex-1 bg-[var(--color-border)]"></div>
            <span className="text-[9px] font-bold text-[var(--color-muted)] uppercase tracking-widest">or manual uplink</span>
            <div className="h-px flex-1 bg-[var(--color-border)]"></div>
          </div>

          <form onSubmit={tab === 'login' ? handleLogin : handleSignup} className="space-y-6 animate-slide-up">
            {tab === 'signup' && (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <InputField label="First Name" value={firstName} onChange={e => setFirstName(e.target.value)} placeholder="Ada" />
                  <InputField label="Surname" value={surname} onChange={e => setSurname(e.target.value)} placeholder="Johnson" />
                </div>
                <div className="space-y-3">
                  <label className="text-[11px] font-bold uppercase tracking-widest text-[var(--color-muted)]">Academic Tier</label>
                  <div className="flex bg-[var(--color-cream)] p-1.5 rounded-xl border border-[var(--color-border)]">
                    {['secondary', 'university', 'graduate'].map(opt => (
                      <button key={opt} type="button" onClick={() => setGrade(opt)}
                        className={`flex-1 py-2 rounded-lg text-[9px] font-bold uppercase tracking-widest transition-all ${grade === opt ? 'bg-white text-[var(--color-teal)] shadow-sm' : 'text-[var(--color-muted)] hover:text-[var(--color-ink)]'}`}>
                        {opt}
                      </button>
                    ))}
                  </div>
                </div>
              </>
            )}

            <InputField label="Email Address" type="email" value={tab === 'login' ? loginEmail : signupEmail} onChange={e => tab === 'login' ? setLoginEmail(e.target.value) : setSignupEmail(e.target.value)} placeholder="alias@node.com" />
            <InputField label="Password" isPassword={true} value={tab === 'login' ? loginPassword : signupPassword} onChange={e => tab === 'login' ? setLoginPassword(e.target.value) : setSignupPassword(e.target.value)} placeholder="••••••••" />

            {tab === 'signup' && (
              <InputField label="Confirm Password" isPassword={true} value={verifyPassword} onChange={e => setVerifyPassword(e.target.value)} placeholder="••••••••" />
            )}

            {tab === 'login' && (
              <div className="flex justify-end">
                <Link to="/forgot-password" className="text-[10px] font-bold uppercase tracking-widest text-[var(--color-teal)] hover:opacity-70">Reset Access Key</Link>
              </div>
            )}

            {error && <div className="text-xs font-bold text-red-500 bg-red-500/10 p-4 rounded-xl border border-red-500/20">{error}</div>}
            {success && <div className="text-xs font-bold text-green-600 bg-green-500/10 p-4 rounded-xl border border-green-500/20">{success}</div>}

            <button type="submit" disabled={loading} className="w-full bg-[var(--color-ink)] text-white h-14 rounded-2xl font-bold text-sm uppercase tracking-widest hover:opacity-90 disabled:opacity-50 transition-all shadow-xl shadow-[var(--color-teal)]/10">
              {loading ? 'Initializing...' : (tab === 'login' ? 'Establish Connection ➔' : 'Generate Identity ➔')}
            </button>
          </form>
        </div>
      </div>

      <div className="mt-12 text-center text-[10px] font-bold text-[var(--color-muted)] uppercase tracking-[0.4em] italic opacity-40">
        © MMXXV MathGenius Archive // Engineering Dominance
      </div>
    </div>
  )
}
import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { useNavigate } from 'react-router-dom'
import { useReveal } from '../hooks/useReveal'

function EyeIcon({ open }) {
  return open ? (
    <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></svg>
  ) : (
    <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94" /><path d="M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19" /><line x1="1" y1="1" x2="23" y2="23" /></svg>
  )
}

export default function ResetPassword() {
  const navigate = useNavigate(); const [password, setPassword] = useState(''); const [confirm, setConfirm] = useState(''); const [showPass, setShowPass] = useState(false); const [loading, setLoading] = useState(false); const [error, setError] = useState(''); const [success, setSuccess] = useState(false); const revealRef = useReveal()
  const handleSubmit = async (e) => {
    e.preventDefault(); setError(''); if (password !== confirm) { setError('NODES_MISMATCH: PASSWORDS_DO_NOT_ALIGN.'); return }; if (password.length < 5) { setError('PROTOCOL_FAILURE: INSUFFICIENT_COMPLEXITY.'); return }
    setLoading(true); const { error } = await supabase.auth.updateUser({ password })
    if (error) setError(error.message); else { setSuccess(true); setTimeout(() => navigate('/teach'), 2500) }
    setLoading(false)
  }

  return (
    <div ref={revealRef} className="min-h-screen bg-[var(--color-paper)] flex items-center justify-center px-6 md:px-12 relative overflow-hidden">
      <div className="grain pointer-events-none" />
      <div className="w-full max-w-4xl relative z-10">
        <div className="mb-24 text-center">
          <p className="eyebrow justify-center mb-4 text-[var(--color-gold)]">AUTHORITY_RESToration_v4.5</p>
          <h1 className="font-serif font-black text-6xl md:text-[8rem] tracking-tighter uppercase leading-[0.8] italic">RESET <br /><span className="text-[var(--color-gold)] not-italic">PASSWORD.</span></h1>
        </div>

        <div className="border-8 border-[var(--color-ink)] bg-white p-12 md:p-24 shadow-[64px_64px_0_var(--color-cream)]">
          {success ? (
            <div className="text-center animate-slide-up">
              <p className="eyebrow justify-center mb-12 text-[var(--color-teal)]">SYNCHRONIZATION_COMPLETE</p>
              <h2 className="font-serif font-black text-5xl md:text-7xl italic uppercase tracking-tighter leading-none mb-12 text-[var(--color-ink)]">PROTOCOL <br /><span className="text-[var(--color-gold)] not-italic">RESTORED.</span></h2>
              <p className="font-serif italic text-2xl text-[var(--color-muted)] max-w-xl mx-auto mb-24 uppercase tracking-tighter">Your credentials have been re-encrypted. Redirecting to mainframe console...</p>
              <div className="w-64 h-2 bg-[var(--color-ink)]/5 mx-auto border-2 border-[var(--color-ink)]"><div className="h-full bg-[var(--color-teal)] animate-progress" /></div>
            </div>
          ) : (
            <div className="animate-fade-in">
              <p className="eyebrow mb-12">DEFENSE_PARAMETER_RECONFIG</p>
              <form onSubmit={handleSubmit} className="space-y-12">
                {[{ label: 'NEW_AUTHORITY_KEY', value: password, set: setPassword }, { label: 'CONFIRM_AUTHORITY_KEY', value: confirm, set: setConfirm }].map(({ label, value, set }) => (
                  <div key={label}>
                    <label className="font-mono text-[9px] font-black uppercase text-[var(--color-gold)] mb-6 tracking-[0.4em] block">{label}</label>
                    <div className="relative">
                      <input type={showPass ? 'text' : 'password'} value={value} onChange={e => set(e.target.value)} placeholder="••••••••" required minLength={5} className="w-full bg-[var(--color-paper)] border-4 border-[var(--color-ink)] p-8 font-serif font-black text-3xl italic placeholder:opacity-10 uppercase tracking-tighter outline-none focus:bg-white transition-all shadow-[12px_12px_0_var(--color-cream)] pr-24" />
                      <button type="button" onClick={() => setShowPass(s => !s)} className="absolute right-8 top-1/2 -translate-y-1/2 text-[var(--color-ink)]/20 hover:text-[var(--color-ink)] transition-all"><EyeIcon open={showPass} /></button>
                    </div>
                  </div>
                ))}
                {error && <div className="border-2 border-red-600 p-4 font-mono text-[9px] font-black text-red-600 uppercase tracking-widest">{error}</div>}
                <button type="submit" disabled={loading} className="w-full bg-[var(--color-ink)] text-white py-12 font-serif font-black text-4xl uppercase tracking-tighter italic hover:bg-black transition-all shadow-[12px_12px_0_var(--color-gold)] disabled:opacity-20">{loading ? 'RE-ENCRYPTING...' : 'COMMIT_RECONFIGURATION ➔'}</button>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { Link } from 'react-router-dom'
import { useReveal } from '../hooks/useReveal'

export default function ForgotPassword() {
  const [email, setEmail] = useState(''); const [sent, setSent] = useState(false); const [loading, setLoading] = useState(false); const [error, setError] = useState(''); const revealRef = useReveal()
  const handleSubmit = async (e) => {
    e.preventDefault(); setLoading(true); setError('')
    const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${window.location.origin}/reset-password` })
    if (error) setError(error.message); else setSent(true); setLoading(false)
  }

  return (
    <div ref={revealRef} className="min-h-screen bg-[var(--color-paper)] flex items-center justify-center px-6 md:px-12 relative overflow-hidden">
      <div className="grain pointer-events-none" />
      <div className="w-full max-w-4xl relative z-10">
        <div className="mb-24 text-center">
          <Link to="/" className="inline-block group">
            <p className="eyebrow justify-center mb-4 group-hover:text-[var(--color-gold)] transition-all">MATH_GENIUS_MAINFRAME</p>
            <h1 className="font-serif font-black text-6xl md:text-[8rem] tracking-tighter uppercase leading-[0.8] italic group-hover:scale-105 transition-all duration-700">MATH<span className="text-[var(--color-gold)] not-italic">GENIUS.</span></h1>
          </Link>
        </div>

        <div className="border-8 border-[var(--color-ink)] bg-white p-12 md:p-24 shadow-[64px_64px_0_var(--color-cream)]">
          {sent ? (
            <div className="text-center animate-slide-up">
              <p className="eyebrow justify-center mb-12 text-[var(--color-teal)]">TRANSMISSION_SUCCESSFUL</p>
              <h2 className="font-serif font-black text-6xl md:text-8xl italic uppercase tracking-tighter leading-none mb-12 text-[var(--color-ink)]">UPLINK <br /><span className="text-[var(--color-gold)] not-italic">SENT.</span></h2>
              <p className="font-serif italic text-2xl text-[var(--color-muted)] max-w-xl mx-auto mb-24 uppercase tracking-tighter">A secure restoration packet has been dispatched to {email}. Synchronize via the provided link to regain mainframe authority.</p>
              <Link to="/login" className="bg-[var(--color-ink)] text-white px-16 py-8 font-serif font-black text-3xl uppercase tracking-tighter italic hover:bg-black transition-all shadow-[12px_12px_0_var(--color-gold)]">RETURN_TO_UPLINK ➔</Link>
            </div>
          ) : (
            <div className="animate-fade-in">
              <p className="eyebrow mb-12">SECURITY_PROTOCOL_RECOVERY_v4.2</p>
              <h2 className="font-serif font-black text-5xl md:text-7xl italic uppercase tracking-tighter leading-none mb-12 text-[var(--color-ink)]">RECOVERY <br /><span className="text-[var(--color-gold)] not-italic">REQUEST.</span></h2>
              <form onSubmit={handleSubmit} className="space-y-12">
                <div>
                  <label className="font-mono text-[9px] font-black uppercase text-[var(--color-gold)] mb-6 tracking-[0.4em] block">UPLINK_IDENTIFIER (EMAIL)</label>
                  <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="ENTER_MAINFRAME_EMAIL..." required className="w-full bg-[var(--color-paper)] border-4 border-[var(--color-ink)] p-8 font-serif font-black text-3xl italic placeholder:opacity-10 uppercase tracking-tighter outline-none focus:bg-white transition-all shadow-[12px_12px_0_var(--color-cream)]" />
                </div>
                {error && <div className="border-2 border-red-600 p-4 font-mono text-[9px] font-black text-red-600 uppercase tracking-widest">{error}</div>}
                <button type="submit" disabled={loading} className="w-full bg-[var(--color-ink)] text-white py-12 font-serif font-black text-4xl uppercase tracking-tighter italic hover:bg-black transition-all shadow-[12px_12px_0_var(--color-gold)] disabled:opacity-20">{loading ? 'TRANSMITTING...' : 'DISPATCH_RESTORATION_PACKET ➔'}</button>
                <div className="text-center">
                  <Link to="/login" className="font-mono text-[9px] font-black uppercase text-[var(--color-muted)] hover:text-[var(--color-ink)] transition-all tracking-[0.4em]">REMEMBERED_PROTOCOL? SIGN_IN_➔</Link>
                </div>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
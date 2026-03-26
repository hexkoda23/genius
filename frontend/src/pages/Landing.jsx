import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useEffect, useState, useRef } from 'react'
import { askTutor, getApprovedTestimonials } from '../services/api'
import { ExplanationBody } from '../utils/RenderMath'
import ThemeToggle from '../components/common/ThemeToggle'

const FEATURES = [
  { icon: '🎯', title: 'Calculated Mastery', desc: 'Precision-guided learning tailored to the Nigerian curriculum (WAEC, NECO, JAMB).' },
  { icon: '🤖', title: 'AI-Powered Tutoring', desc: 'Meet Euler, your 24/7 personal mathematics tutor available for any concept clarification.' },
  { icon: '📝', title: 'Exam Simulations', desc: 'Real-world CBT practice environments with thousands of verified past questions.' },
  { icon: '📈', title: 'Progress Analytics', desc: 'Deep insights into your performance, identifying exactly where to focus your effort.' },
  { icon: '📅', title: 'Study Planning', desc: 'Automated 7-day schedules built around your goals and available time.' },
  { icon: '📚', title: 'Formula Registry', desc: 'A comprehensive, searchable library of every critical formula you need to succeed.' },
]

function LandingChat() {
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const bottomRef = useRef(null)

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages])

  const handleSend = async (text) => {
    const msg = (text || input).trim()
    if (!msg || loading) return
    setInput('')
    setMessages(prev => [...prev, { role: 'user', content: msg }, { role: 'assistant', loading: true }])
    setLoading(true)
    try {
      const res = await askTutor(msg, 'General Mathematics', 'secondary', [])
      setMessages(prev => [...prev.filter(m => !m.loading), { role: 'assistant', content: res.data.response }])
    } catch {
      setMessages(prev => [...prev.filter(m => !m.loading), { role: 'assistant', content: 'Could not connect to the tutor.' }])
    }
    setLoading(false)
  }

  return (
    <div className="bg-[var(--color-paper)] border border-[var(--color-border)] rounded-3xl shadow-xl overflow-hidden flex flex-col h-[600px] animate-fade-in mb-32">
      <div className="p-6 border-b border-[var(--color-border)] bg-[var(--color-cream)] flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-[var(--color-teal)] flex items-center justify-center text-white font-bold">E</div>
          <span className="text-sm font-bold text-[var(--color-ink)]">Euler AI Tutor</span>
        </div>
        <span className="text-[10px] font-bold text-[var(--color-teal)] bg-[var(--color-teal)]/10 px-3 py-1 rounded-full uppercase tracking-wider">Demo Session</span>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-6 no-scrollbar">
        {messages.length === 0 && (
          <div className="h-full flex flex-col justify-center items-center text-center space-y-8 px-4">
            <h3 className="text-2xl font-extrabold text-[var(--color-ink)]">What are we learning today?</h3>
            <div className="flex flex-wrap gap-3 justify-center">
              {['Quadratic Formula', 'Calculus basics', 'Circle Geometry'].map(q => (
                <button key={q} onClick={() => handleSend(q)} className="px-5 py-2.5 rounded-full border border-[var(--color-border)] text-sm font-semibold hover:border-[var(--color-teal)] hover:text-[var(--color-teal)] transition-all bg-[var(--color-surface)]">{q}</button>
              ))}
            </div>
          </div>
        )}
        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[85%] p-5 rounded-2xl text-sm leading-relaxed ${msg.role === 'user' ? 'bg-[var(--color-teal)] text-white' : 'bg-[var(--color-cream)] text-[var(--color-ink)] border border-[var(--color-border)]'}`}>
              {msg.loading ? <div className="flex gap-1 py-1"><div className="w-1.5 h-1.5 bg-current rounded-full animate-bounce" /><div className="w-1.5 h-1.5 bg-current rounded-full animate-bounce [animation-delay:0.2s]" /><div className="w-1.5 h-1.5 bg-current rounded-full animate-bounce [animation-delay:0.4s]" /></div> : <ExplanationBody text={msg.content} />}
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      <div className="p-4 border-t border-[var(--color-border)] bg-[var(--color-surface)]">
        <div className="flex gap-3">
          <input value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSend()}
            placeholder="Ask anything about mathematics..." className="flex-1 px-4 py-3 rounded-xl bg-[var(--color-cream)] border border-transparent focus:border-[var(--color-teal)] outline-none text-sm transition-all" />
          <button onClick={() => handleSend()} className="p-3 bg-[var(--color-ink)] text-white rounded-xl hover:opacity-90 transition-opacity">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
          </button>
        </div>
      </div>
    </div>
  )
}

export function Landing() {
  const { user } = useAuth(); const navigate = useNavigate(); const [testimonials, setTestimonials] = useState([])
  useEffect(() => { getApprovedTestimonials().then(res => setTestimonials(res.data || [])) }, [])

  return (
    <div className="min-h-screen bg-[var(--color-paper)]">
      {/* Hero Section */}
      <section className="relative px-6 pt-32 pb-24 lg:pt-48 lg:pb-40 overflow-hidden">
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-16 items-center relative z-10">
          <div className="space-y-10 animate-slide-up">
            <div className="inline-flex items-center gap-3 px-4 py-2 rounded-full bg-[var(--color-teal)]/10 text-[var(--color-teal)] border border-[var(--color-teal)]/20">
              <span className="w-2 h-2 rounded-full bg-[var(--color-teal)] animate-pulse" />
              <span className="text-xs font-bold uppercase tracking-widest">Nigeria's #1 Learning Mainframe</span>
            </div>

            <h1 className="text-5xl lg:text-7xl font-extrabold text-[var(--color-ink)] tracking-tight leading-[1.05]">
              Master Mathematics <br />
              <span className="text-[var(--color-teal)]">With Precision.</span>
            </h1>

            <p className="text-lg lg:text-xl text-[var(--color-muted)] max-w-xl leading-relaxed">
              Experience a sophisticated educational engine built for students who demand excellence. From real-world CBT practice to instant AI tutoring, dominance starts here.
            </p>

            <div className="flex flex-wrap gap-6 pt-4 items-center">
              <button onClick={() => navigate('/signup')} className="px-10 py-5 bg-[var(--color-ink)] text-white rounded-2xl font-bold text-lg hover:shadow-2xl transition-all hover:scale-[1.02]">Access Mainframe</button>
            </div>

            <div className="flex items-center gap-12 pt-8 border-t border-[var(--color-border)]">
              <div>
                <p className="text-3xl font-extrabold text-[var(--color-ink)]">99.2%</p>
                <p className="text-[10px] uppercase tracking-widest font-bold text-[var(--color-muted)]">Accuracy Rate</p>
              </div>
              <div className="h-10 w-px bg-[var(--color-border)]" />
              <div>
                <p className="text-3xl font-extrabold text-[var(--color-ink)]">50K+</p>
                <p className="text-[10px] uppercase tracking-widest font-bold text-[var(--color-muted)]">Students Online</p>
              </div>
            </div>
          </div>

          <div className="relative">
            <LandingChat />
            <div className="absolute -top-12 -right-12 w-64 h-64 bg-[var(--color-gold)] rounded-full blur-[100px] opacity-20 -z-10" />
            <div className="absolute -bottom-12 -left-12 w-64 h-64 bg-[var(--color-teal)] rounded-full blur-[100px] opacity-10 -z-10" />
          </div>
        </div>
      </section>

      {/* Benefits Grid */}
      <section className="py-32 px-6 bg-[var(--color-cream)] border-y border-[var(--color-border)]">
        <div className="max-w-7xl mx-auto space-y-20">
          <div className="text-center space-y-6 max-w-3xl mx-auto">
            <h2 className="text-4xl lg:text-5xl font-extrabold text-[var(--color-ink)] tracking-tight">Structured for Success.</h2>
            <p className="text-md text-[var(--color-muted)] font-medium leading-relaxed">We provide the architectural framework for academic transcendence. You provide the ambition.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {FEATURES.map((f, i) => (
              <div key={i} className="p-10 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-3xl hover:border-[var(--color-teal)] transition-all group">
                <div className="text-4xl mb-8 group-hover:scale-110 transition-transform inline-block">{f.icon}</div>
                <h3 className="text-xl font-extrabold text-[var(--color-ink)] mb-4">{f.title}</h3>
                <p className="text-sm leading-loose text-[var(--color-muted)] font-medium">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-32 px-6 bg-[var(--color-paper)]">
        <div className="max-w-7xl mx-auto">
          <div className="mb-16 flex flex-col md:flex-row md:items-end md:justify-between gap-8">
            <div className="space-y-4">
              <span className="text-xs font-extrabold text-[var(--color-teal)] uppercase tracking-widest">Legacy Ledger</span>
              <h2 className="text-4xl font-extrabold text-[var(--color-ink)]">Voices of Excellence.</h2>
            </div>
            <Link to="/signup" className="text-sm font-bold text-[var(--color-teal)] flex items-center gap-2 group">
              Join the elite cohort <span className="group-hover:translate-x-1 transition-transform">→</span>
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {testimonials.slice(0, 3).map((t, i) => (
              <div key={i} className="p-10 border border-[var(--color-border)] rounded-3xl relative overflow-hidden bg-[var(--color-cream)] h-full flex flex-col justify-between">
                <p className="text-xl font-bold text-[var(--color-ink)] leading-relaxed italic">"{t.body}"</p>
                <div className="mt-8 pt-8 border-t border-[var(--color-border)]">
                  <p className="font-extrabold text-[var(--color-ink)]">{t.full_name}</p>
                  <p className="text-[10px] uppercase font-bold text-[var(--color-muted)] tracking-widest mt-1">{t.school || 'Verified Student'}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-32 px-6">
        <div className="max-w-7xl mx-auto rounded-[3rem] bg-[var(--color-ink)] p-12 lg:p-24 text-center space-y-12 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-96 h-96 bg-[var(--color-teal)] rounded-full blur-[150px] opacity-20" />
          <div className="absolute bottom-0 left-0 w-96 h-96 bg-[var(--color-gold)] rounded-full blur-[150px] opacity-10" />

          <div className="space-y-6 relative z-10">
            <h2 className="text-5xl lg:text-7xl font-extrabold text-white tracking-tighter">Your Transformation Starts Now.</h2>
            <p className="text-xl text-white/50 max-w-2xl mx-auto">Stop guessing. Start dominating. Join the thousands of Nigerian students already using MathGenius Archive.</p>
          </div>

          <div className="relative z-10">
            <button onClick={() => navigate('/signup')} className="px-16 py-6 bg-[var(--color-gold)] text-[var(--color-ink)] rounded-2xl font-extrabold text-xl hover:scale-105 transition-all shadow-xl">Engage Mainframe ➔</button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-24 px-6 border-t border-[var(--color-border)] bg-[var(--color-cream)]">
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-16">
          <div className="space-y-8">
            <h2 className="text-2xl font-extrabold text-[var(--color-ink)] tracking-tighter">Math<span className="text-[var(--color-teal)]">Genius</span></h2>
            <p className="text-sm text-[var(--color-muted)] leading-relaxed font-medium">The established architectural standard for mathematics education in Nigeria. Engineering academic dominance since 2018.</p>
          </div>
          <div className="lg:col-span-2 grid grid-cols-2 md:grid-cols-4 gap-12">
            {[
              { title: 'Learning', links: ['Solver', 'Tutor', 'CBT', 'Practice'] },
              { title: 'Platform', links: ['Dashboard', 'Profile', 'Leaderboard', 'Archive'] },
              { title: 'Support', links: ['Help Center', 'Safety', 'Privacy', 'Terms'] },
              { title: 'Connect', links: ['Instagram', 'Twitter', 'Facebook', 'Discord'] },
            ].map(col => (
              <div key={col.title} className="space-y-6">
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--color-ink)]">{col.title}</p>
                <ul className="space-y-4">
                  {col.links.map(l => (
                    <li key={l}><Link to="#" className="text-xs font-semibold text-[var(--color-muted)] hover:text-[var(--color-teal)] transition-colors">{l}</Link></li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
        <div className="max-w-7xl mx-auto mt-24 pt-12 border-t border-[var(--color-border)] text-center">
          <p className="text-[10px] font-bold text-[var(--color-muted)] uppercase tracking-widest">© MMXXV MathGenius Archive // Engineering Dominance</p>
        </div>
      </footer>
    </div>
  )
}

export default Landing
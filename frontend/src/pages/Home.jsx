import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import WelcomeBanner from '../components/WelcomeBanner'
import { useReveal } from '../hooks/useReveal'

const ACTIONS = [
  {
    title: 'Equation Solver',
    desc: 'Input complex mathematical expressions and get step-by-step verified resolutions.',
    path: '/solve',
    icon: '⚡',
    color: 'var(--color-teal)'
  },
  {
    title: 'Euler AI Tutor',
    desc: 'Consult our generative tutor for deep conceptual clarity across current curricula.',
    path: '/teach',
    icon: '🤖',
    color: 'var(--color-gold)'
  },
  {
    title: 'Practice Hub',
    desc: 'Access thousands of past questions from WAEC, NECO, and JAMB archives.',
    path: '/practice',
    icon: '🎯',
    color: 'var(--color-ink)'
  }
]

export default function Home() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const revealRef = useReveal()

  return (
    <div className="max-w-7xl mx-auto px-6 py-12 lg:py-24 space-y-16" ref={revealRef}>
      {/* Welcome Banner Integration */}
      {user && <div className="animate-fade-in"><WelcomeBanner compact /></div>}

      {/* Modern Hero Section */}
      <section className="relative p-10 lg:p-20 bg-[var(--color-ink)] rounded-[3rem] text-white overflow-hidden shadow-2xl">
        <div className="absolute top-0 right-0 w-96 h-96 bg-[var(--color-teal)] rounded-full blur-[150px] opacity-20" />
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-[var(--color-gold)] rounded-full blur-[150px] opacity-10" />

        <div className="relative z-10 max-w-3xl space-y-8 animate-slide-up">
          <p className="text-[10px] font-bold uppercase tracking-[0.4em] text-[var(--color-gold)] mb-4">Sovereign Command v4.2</p>
          <h1 className="text-5xl lg:text-7xl font-extrabold tracking-tight leading-[1.1]">
            Cognitive <span className="text-[var(--color-gold)]">Supremacy.</span>
          </h1>
          <p className="text-lg lg:text-xl text-white/60 leading-relaxed font-medium">
            Deconstruct theorems, consult Euler for conceptual clarity, and dominate your academic trajectory with clinical precision.
          </p>
          <div className="flex flex-wrap gap-4 pt-4">
            <button onClick={() => navigate('/solve')} className="px-10 py-5 bg-white text-[var(--color-ink)] rounded-2xl font-bold hover:scale-105 transition-all">Engage Solver ➔</button>
            <button onClick={() => navigate('/teach')} className="px-10 py-5 border border-white/20 rounded-2xl font-bold hover:bg-white/10 transition-all">Consult Tutor</button>
          </div>
        </div>
      </section>

      {/* Institutional Action Grid */}
      <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {ACTIONS.map((action, i) => (
          <div key={i} onClick={() => navigate(action.path)} className="bg-white border border-[var(--color-border)] p-10 rounded-[2.5rem] hover:border-[var(--color-teal)] transition-all cursor-pointer group shadow-sm">
            <div className="w-14 h-14 rounded-2xl bg-[var(--color-cream)] flex items-center justify-center text-3xl mb-8 group-hover:scale-110 transition-transform">{action.icon}</div>
            <h3 className="text-2xl font-extrabold text-[var(--color-ink)] mb-4">{action.title}</h3>
            <p className="text-sm font-medium text-[var(--color-muted)] leading-loose">{action.desc}</p>
            <div className="mt-8 pt-8 border-t border-[var(--color-border)] flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-widest text-[var(--color-teal)]">Initialize Protocol</span>
              <span className="text-lg group-hover:translate-x-2 transition-transform">→</span>
            </div>
          </div>
        ))}
      </section>

      {/* Logic Visualization Section */}
      <section className="bg-[var(--color-cream)] border border-[var(--color-border)] rounded-[3rem] p-10 lg:p-20 grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
        <div className="space-y-8">
          <h2 className="text-4xl lg:text-6xl font-extrabold text-[var(--color-ink)] tracking-tight">Logic <br /> <span className="text-[var(--color-teal)] underline decoration-4 underline-offset-8">Architected.</span></h2>
          <p className="text-lg text-[var(--color-muted)] font-medium leading-relaxed">The MathGenius engine is architected to eliminate ambiguity. Every problem solved, every concept explained, contributes to a unified data profile of your strengths.</p>
          <div className="grid grid-cols-2 gap-8 border-t border-[var(--color-border)] pt-8">
            <div>
              <p className="text-4xl font-extrabold text-[var(--color-ink)]">2K+</p>
              <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--color-muted)]">Verified Proved</p>
            </div>
            <div>
              <p className="text-4xl font-extrabold text-[var(--color-teal)]">99.9%</p>
              <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--color-muted)]">Uptime Reliability</p>
            </div>
          </div>
        </div>
        <div className="bg-[var(--color-ink)] p-10 rounded-[2rem] shadow-2xl relative group overflow-hidden">
          <div className="absolute inset-0 opacity-5 font-mono text-[8px] leading-loose whitespace-pre pointer-events-none">{Array(40).fill('∫_Σ_Δ_θ_ ').join('\n')}</div>
          <div className="relative z-10 space-y-6">
            <div className="flex justify-between items-center border-b border-white/10 pb-4 mb-4">
              <p className="text-[10px] font-bold uppercase tracking-widest text-white/40">Core_Resolver_v4.2</p>
              <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            </div>
            <p className="text-xl italic text-white leading-relaxed">"Find the derivative of f(x) = x³ + 4x² - 7"</p>
            <div className="h-1 bg-white/10 rounded-full overflow-hidden">
              <div className="h-full bg-[var(--color-teal)] w-3/4" />
            </div>
            <div className="p-4 bg-white/5 rounded-xl border border-white/10">
              <p className="text-xs font-bold text-[var(--color-gold)] uppercase tracking-widest mb-1">Resulting Function</p>
              <p className="text-lg font-bold text-white font-serif">f'(x) = 3x² + 8x</p>
            </div>
          </div>
        </div>
      </section>

      {/* Security/Access Footer */}
      <div className="text-center py-12">
        <p className="text-[10px] font-bold uppercase tracking-[0.5em] text-[var(--color-muted)] italic opacity-40">AUTHORIZED_PERSONNEL_ONLY // COGNITIVE_DATA_ENCRYPTION_ACTIVE</p>
      </div>
    </div>
  )
}
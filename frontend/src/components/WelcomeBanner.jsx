import { useAuth } from '../context/AuthContext'
import {
  getDailyNugget, getFormattedDate, getGreeting,
  getFormattedTime, useLiveClock
} from '../lib/nugget'
import { useReveal } from '../hooks/useReveal'

export default function WelcomeBanner({ compact = false }) {
  const { profile } = useAuth()
  const now = useLiveClock()
  const revealRef = useReveal()
  const firstName = profile?.full_name?.split(' ')[0] || 'Student'
  const greeting = getGreeting()
  const date = getFormattedDate()
  const time = getFormattedTime(now)
  const nugget = getDailyNugget()

  if (compact) {
    return (
      <div className="bg-[var(--color-ink)] px-8 py-8 rounded-[2rem] flex flex-wrap items-center justify-between gap-6 overflow-hidden relative shadow-lg" ref={revealRef}>
        <div className="absolute -right-4 -bottom-4 font-serif font-black text-6xl text-white/5 italic select-none">M.G</div>
        <div className="relative z-10">
          <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-[var(--color-gold)] mb-1">{date}</p>
          <h2 className="text-3xl font-extrabold text-white tracking-tight">{greeting}, {firstName}.</h2>
        </div>
        <div className="text-right relative z-10">
          <p className="text-4xl font-black text-[var(--color-gold)] tabular-nums">{time}</p>
        </div>
      </div>
    )
  }

  return (
    <section className="bg-white border border-[var(--color-border)] rounded-[3rem] overflow-hidden shadow-sm lg:grid lg:grid-cols-[1fr_420px]" ref={revealRef}>
      {/* Left Aspect: Greeting */}
      <div className="p-10 lg:p-20 border-b lg:border-b-0 lg:border-r border-[var(--color-border)] relative overflow-hidden">
        <div className="absolute left-[-2%] top-[-5%] text-[15rem] font-black text-[var(--color-ink)] opacity-[0.02] rotate-[-12deg] select-none">Σ</div>

        <div className="space-y-10 relative z-10">
          <div className="flex items-center gap-4">
            <span className="w-8 h-px bg-[var(--color-teal)]" />
            <p className="text-[10px] font-bold uppercase tracking-[0.4em] text-[var(--color-muted)]">{date} // System Online</p>
          </div>

          <h1 className="text-5xl lg:text-7xl font-extrabold text-[var(--color-ink)] tracking-tight leading-[1.1]">
            {greeting}, <br />
            <span className="text-[var(--color-teal)]">{firstName}.</span>
          </h1>

          <div className="max-w-md pt-4">
            <p className="text-lg font-medium text-[var(--color-muted)] border-l-4 border-[var(--color-teal)] pl-6 leading-relaxed italic">
              "Your mathematical potential is an infinite series. Today, we converge on mastery."
            </p>
          </div>
        </div>
      </div>

      {/* Right Aspect: Temporal & Nugget */}
      <div className="bg-[var(--color-ink)] p-10 lg:p-20 flex flex-col justify-between text-white relative">
        <div className="space-y-4">
          <p className="text-[10px] font-bold uppercase tracking-[0.4em] text-white/30">Temporal Marker</p>
          <p className="text-7xl font-black tracking-tighter italic tabular-nums text-white">
            {time.split(':')[0]}<span className="text-[var(--color-teal)]">:</span>{time.split(':')[1]}
          </p>
        </div>

        <div className="mt-16 space-y-6">
          <div className="flex items-center justify-between border-b border-white/10 pb-4">
            <p className="text-[10px] font-bold uppercase tracking-widest text-white/40">Daily Nugget</p>
            <div className="w-2 h-2 rounded-full bg-[var(--color-teal)] animate-pulse" />
          </div>
          <p className="text-xl font-bold italic leading-relaxed text-white/90">
            — "{nugget}"
          </p>
          <p className="text-[9px] font-bold uppercase tracking-[0.5em] text-white/20 pt-4">Realtime Dialectic Streaming</p>
        </div>
      </div>
    </section>
  )
}
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useReveal } from '../hooks/useReveal'

const STEPS = [
  { id: 'welcome', title: 'WELCOME_TO\nTHE_ARCHIVE.', subtitle: 'INITIALIZATION_SEQUENCE_01', content: 'MathGenius is an elite, AI-driven mathematics engine designed to transform your academic potential. Welcome to the future of learning.', icon: 'Σ' },
  { id: 'level', title: 'DEFINE_YOUR\nINTELLECT._', subtitle: 'CLASSIFICATION_STEP_02', content: 'Personalization is the key to mastery. Select your current academic tier for calibrated instructions.', icon: 'Ω' },
  { id: 'tour', title: 'CAPABILITIES\nOVERVIEW.', subtitle: 'SYSTEM_MANIFESTO_03', content: 'Review the modules available within the MathGenius architecture.', icon: 'Δ' },
  { id: 'ready', title: 'PROTOCOL\nESTABLISHED._', subtitle: 'FINAL_READY_STATE_04', content: 'The engine is primed. Your intellectual evolution begins now. Proceed to the main interface.', icon: 'Ξ' },
]

const FEATURES = [
  { icon: '01', title: 'Neural Solver', desc: 'Step-by-step resolution of complex symbolic math.' },
  { icon: '02', title: 'AI Tutor', desc: 'Socratic teaching methodology for deep conceptual understanding.' },
  { icon: '03', title: 'Predictive Stats', desc: 'Real-time telemetry on exam readiness and grade forecasting.' },
  { icon: '04', title: 'Drill Engine', desc: 'High-frequency practice calibrated to your weak points.' },
]

export default function Onboarding() {
  const navigate = useNavigate(); const revealRef = useReveal()
  const { user, updateProfile } = useAuth()
  const [step, setStep] = useState(0); const [level, setLevel] = useState('')
  const handleNext = async () => {
    if (step === 1 && level) sessionStorage.setItem('onboarding_level', level)
    if (step < STEPS.length - 1) setStep(s => s + 1)
    else {
      localStorage.setItem('mg_onboarding_done', '1')
      try {
        if (user) {
          await updateProfile({ onboarded: true })
          navigate('/dashboard', { replace: true })
          return
        }
      } catch { /* ignore */ }
      navigate('/signup', { replace: true })
    }
  }
  const current = STEPS[step]; const progress = ((step + 1) / STEPS.length) * 100

  return (
    <div className="min-h-screen bg-[var(--color-ink)] text-white flex flex-col items-center justify-center p-6 md:p-24 relative overflow-hidden" ref={revealRef}>
      <div className="grain pointer-events-none opacity-20" />

      {/* Background Graphic */}
      <div className="absolute inset-0 pointer-events-none opacity-5 flex items-center justify-center">
        <div className="text-[600px] font-serif font-black italic select-none leading-none animate-pulse-slow">{current.icon}</div>
      </div>

      <div className="w-full max-w-6xl relative z-10">
        {/* Progress Bar */}
        <div className="mb-32 flex items-center gap-12">
          <div className="font-mono text-[9px] font-black tracking-[0.5em] text-white/30">STEP_0{step + 1}</div>
          <div className="h-2 flex-1 bg-white/5 relative border border-white/10">
            <div className="absolute top-0 left-0 h-full bg-[var(--color-gold)] transition-all duration-1000 shadow-[0_0_20px_var(--color-gold)]" style={{ width: `${progress}%` }}></div>
          </div>
          <div className="font-mono text-[9px] font-black tracking-[0.5em] text-white/30">TOTAL_PROCEDURE_04</div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-32 items-center">
          <div className="animate-slide-up">
            <p className="font-mono text-[10px] uppercase tracking-[0.5em] text-[var(--color-gold)] mb-12 font-black border-l-4 border-[var(--color-gold)] pl-8">{current.subtitle}</p>
            <h1 className="font-serif font-black text-6xl md:text-9xl leading-[0.8] tracking-tighter whitespace-pre-line mb-16 italic uppercase">
              {current.title}
            </h1>
            <p className="font-serif italic text-2xl text-white/40 leading-tight uppercase tracking-tighter max-w-md">
              {current.content}
            </p>
          </div>

          <div className="bg-white/5 border-4 border-white/10 p-12 md:p-16 backdrop-blur-xl shadow-[48px_48px_0_rgba(0,0,0,0.5)] relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-32 h-32 border-b-4 border-l-4 border-white/5" />

            {step === 0 && (
              <div className="space-y-16 py-12">
                <div className="aspect-square border-4 border-white/10 flex items-center justify-center relative">
                  <div className="w-48 h-48 border-8 border-[var(--color-gold)] animate-spin-slow opacity-20"></div>
                  <div className="absolute w-32 h-32 border-4 border-white/40 animate-reverse-spin"></div>
                  <div className="absolute font-serif font-black text-6xl italic">MG</div>
                </div>
                <div className="grid grid-cols-2 gap-6">
                  {['SYLLABUS_V9.2', 'NEURAL_ACTIVE', 'CORE_STABLE', 'INTEL_READY'].map(s => (
                    <div key={s} className="border-2 border-white/10 px-6 py-4 font-mono text-[9px] font-black tracking-widest text-center text-white/40 italic">{s}</div>
                  ))}
                </div>
              </div>
            )}

            {step === 1 && (
              <div className="space-y-6">
                {[
                  { value: 'secondary', label: 'SECONDARY_SCHOOL', desc: 'JSS1 to SS3 Modules // JAMB & WAEC Calibration' },
                  { value: 'university', label: 'UNDERGRADUATE', desc: 'University Level Calculus // Linear Heuristics' },
                  { value: 'graduate', label: 'GRADUATE_MASTER', desc: 'Post-Academic Research // Specialized Logic Models' },
                ].map(opt => (
                  <button key={opt.value} onClick={() => setLevel(opt.value)} className={`w-full text-left p-10 border-4 transition-all duration-500 relative overflow-hidden group/opt ${level === opt.value ? 'bg-[var(--color-gold)] border-[var(--color-gold)] text-[var(--color-ink)]' : 'bg-transparent border-white/10 text-white/60 hover:border-white/40'}`}>
                    <div className="relative z-10">
                      <p className="font-mono text-[10px] uppercase tracking-widest font-black mb-4">{opt.label}</p>
                      <p className="text-sm opacity-60 font-serif italic uppercase tracking-tighter">{opt.desc}</p>
                    </div>
                    <div className="absolute right-8 top-1/2 -translate-y-1/2 text-4xl opacity-10 font-serif font-black italic transition-all group-hover/opt:scale-125">{opt.label[0]}</div>
                  </button>
                ))}
              </div>
            )}

            {step === 2 && (
              <div className="grid grid-cols-1 gap-10">
                {FEATURES.map(f => (
                  <div key={f.title} className="flex gap-10 border-b-2 border-white/5 pb-10 last:border-0 last:pb-0 group/f transition-all hover:bg-white/5 p-4 -m-4">
                    <span className="font-serif italic font-black text-4xl text-[var(--color-gold)] group-hover/f:scale-125 transition-all">{f.icon}</span>
                    <div>
                      <p className="font-mono text-[10px] uppercase tracking-[0.4em] font-black text-[var(--color-gold)] mb-2">{f.title}_PROTOCOL</p>
                      <p className="text-sm text-white/40 font-serif italic uppercase tracking-tighter leading-tight">{f.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {step === 3 && (
              <div className="space-y-12 text-center py-20 animate-fade-in">
                <div className="w-32 h-32 mx-auto border-4 border-[var(--color-gold)] rounded-full flex items-center justify-center shadow-[0_0_50px_var(--color-gold)]">
                  <span className="text-6xl font-serif font-black italic">!</span>
                </div>
                <h3 className="font-serif text-5xl font-black italic uppercase tracking-tighter">PROTOCOL_LOADED.</h3>
                <p className="font-mono text-[9px] font-black tracking-[0.5em] text-white/30 uppercase border-t border-white/10 pt-8">Awaiting final user deployment confirmation</p>
              </div>
            )}

            <div className="mt-16 flex gap-6">
              {step > 0 && <button onClick={() => setStep(step - 1)} className="px-12 py-8 border-4 border-white/20 font-serif font-black text-2xl uppercase italic tracking-tighter hover:bg-white/10 transition-all">BACK</button>}
              <button onClick={handleNext} disabled={step === 1 && !level} className="flex-1 bg-white text-[var(--color-ink)] py-8 font-serif text-3xl font-black uppercase italic tracking-tighter hover:bg-[var(--color-gold)] transition-all disabled:opacity-30 shadow-[4px_4px_0_rgba(0,0,0,0.5)] group/btn relative overflow-hidden">
                <span className="relative z-10">{step === STEPS.length - 1 ? 'DEPLOY_ENGINE ➔' : 'CONTINUE_PROTOCOL ➔'}</span>
                <div className="absolute inset-0 bg-[var(--color-gold)] -translate-x-full group-hover/btn:translate-x-0 transition-transform duration-500" />
              </button>
            </div>
          </div>
        </div>
      </div>

      <button
        onClick={() => {
          if (user) {
            updateProfile({ onboarded: true }).finally(() =>
              navigate('/dashboard', { replace: true })
            )
          } else {
            navigate('/signup', { replace: true })
          }
        }}
        className="absolute bottom-16 text-white/10 hover:text-[var(--color-gold)] font-mono text-[9px] font-black uppercase tracking-[0.5em] transition-all border-b border-transparent hover:border-[var(--color-gold)] pb-1"
      >
        TERMINATE_CALIBRATION_FLOW
      </button>
    </div>
  )
}

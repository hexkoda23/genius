import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'

const STORAGE_KEY = 'mg_testimonial_submitted'

/** Small inline banner that triggers the modal */
export function TestimonialPrompt() {
  const [open, setOpen] = useState(false)
  const [dismissed, setDismissed] = useState(
    () => !!localStorage.getItem(STORAGE_KEY)
  )

  if (dismissed) return null

  return (
    <>
      <div className="mt-4 flex items-center justify-between gap-3
                      bg-amber-50 border border-amber-200 rounded-2xl px-5 py-3">
        <p className="text-sm text-amber-800 font-medium">
          ⭐ Enjoying MathGenius? Share your result — it helps other students!
        </p>
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => setOpen(true)}
            className="text-xs font-bold px-4 py-2 rounded-xl
                       bg-amber-500 text-white hover:bg-amber-600 transition-colors">
            Share Result
          </button>
          <button
            onClick={() => { localStorage.setItem(STORAGE_KEY, '1'); setDismissed(true) }}
            className="text-amber-600 hover:text-amber-800 text-lg leading-none"
            title="Dismiss">×</button>
        </div>
      </div>

      {open && (
        <TestimonialModal onClose={() => {
          setOpen(false)
          setDismissed(true)
        }} />
      )}
    </>
  )
}

/** Full testimonial submission modal */
export default function TestimonialModal({ onClose }) {
  const { user, profile } = useAuth()
  const [rating, setRating]   = useState(0)
  const [hovered, setHovered] = useState(0)
  const [body, setBody]       = useState('')
  const [school, setSchool]   = useState('')
  const [loading, setLoading] = useState(false)
  const [done, setDone]       = useState(false)
  const [error, setError]     = useState('')

  const displayName = profile?.full_name || user?.email?.split('@')[0] || 'Student'
  const charCount   = body.length
  const valid       = rating > 0 && charCount >= 20 && charCount <= 300

  const handleSubmit = async () => {
    if (!valid || loading) return
    setLoading(true)
    setError('')
    const { error: err } = await supabase.from('testimonials').insert({
      user_id:   user.id,
      full_name: displayName,
      school:    school.trim() || null,
      rating,
      body:      body.trim(),
    })
    setLoading(false)
    if (err) {
      setError('Something went wrong. Please try again.')
    } else {
      localStorage.setItem(STORAGE_KEY, '1')
      setDone(true)
    }
  }

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/50">
      <div className="bg-[var(--color-paper)] border-2 border-[var(--color-ink)]
                      rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">

        {/* Header */}
        <div className="bg-[var(--color-ink)] px-6 py-4 flex items-center justify-between">
          <p className="font-serif font-bold text-white text-lg">Share Your Result</p>
          <button onClick={onClose}
            className="text-white/60 hover:text-white text-2xl leading-none">×</button>
        </div>

        {done ? (
          /* ── Success state ── */
          <div className="p-8 text-center space-y-4">
            <div className="text-6xl">🎉</div>
            <h3 className="font-serif font-black text-2xl text-[var(--color-ink)]">
              Thank you!
            </h3>
            <p className="text-[var(--color-muted)] text-sm">
              Your review will appear on the landing page after a quick check.
              We really appreciate you helping other students find MathGenius!
            </p>
            <button onClick={onClose}
              className="btn-primary px-6 py-2.5 text-sm justify-center">
              Close
            </button>
          </div>
        ) : (
          /* ── Form ── */
          <div className="p-6 space-y-5">

            {/* Reviewer name (read-only) */}
            <div>
              <p className="font-mono text-[10px] uppercase tracking-widest
                            text-[var(--color-muted)] mb-1">Your name</p>
              <p className="text-sm font-semibold text-[var(--color-ink)]">{displayName}</p>
            </div>

            {/* School / State (optional) */}
            <div>
              <label className="font-mono text-[10px] uppercase tracking-widest
                                text-[var(--color-muted)] block mb-1">
                School / State <span className="normal-case">(optional)</span>
              </label>
              <input
                type="text"
                value={school}
                onChange={e => setSchool(e.target.value)}
                placeholder="e.g. Lagos State, Federal Government College…"
                maxLength={60}
                className="w-full border-2 border-[var(--color-border)] rounded-xl
                           px-3 py-2 text-sm focus:border-[var(--color-teal)]
                           bg-[var(--color-paper)] transition-colors"
              />
            </div>

            {/* Star rating */}
            <div>
              <p className="font-mono text-[10px] uppercase tracking-widest
                            text-[var(--color-muted)] mb-2">Your rating</p>
              <div className="flex gap-1">
                {[1,2,3,4,5].map(star => (
                  <button key={star}
                    onMouseEnter={() => setHovered(star)}
                    onMouseLeave={() => setHovered(0)}
                    onClick={() => setRating(star)}
                    className="text-3xl transition-transform hover:scale-110">
                    {star <= (hovered || rating) ? '⭐' : '☆'}
                  </button>
                ))}
              </div>
            </div>

            {/* Review text */}
            <div>
              <label className="font-mono text-[10px] uppercase tracking-widest
                                text-[var(--color-muted)] block mb-1">
                Your review
              </label>
              <textarea
                value={body}
                onChange={e => setBody(e.target.value)}
                placeholder="Tell students how MathGenius helped you prepare — be specific about your results!"
                rows={4}
                maxLength={300}
                className="w-full border-2 border-[var(--color-border)] rounded-xl
                           px-3 py-2 text-sm resize-none focus:border-[var(--color-teal)]
                           bg-[var(--color-paper)] transition-colors"
              />
              <p className={`text-right text-xs mt-1 font-mono
                ${charCount < 20 ? 'text-red-400' : charCount > 270 ? 'text-amber-500' : 'text-[var(--color-muted)]'}`}>
                {charCount}/300 {charCount < 20 && `(${20 - charCount} more needed)`}
              </p>
            </div>

            {error && (
              <p className="text-red-500 text-sm">{error}</p>
            )}

            <button
              onClick={handleSubmit}
              disabled={!valid || loading}
              className="w-full py-3 rounded-xl text-white font-bold text-sm
                         bg-[var(--color-teal)] hover:bg-[var(--color-ink)]
                         disabled:opacity-40 transition-colors flex items-center
                         justify-center gap-2">
              {loading
                ? <><span className="w-4 h-4 border-2 border-white/30 border-t-white
                                     rounded-full animate-spin" /> Submitting...</>
                : '⭐ Submit Review'
              }
            </button>

            <p className="text-xs text-center text-[var(--color-muted)]">
              Reviews appear on our landing page after approval.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

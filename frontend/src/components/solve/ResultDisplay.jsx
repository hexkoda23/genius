import { useState } from 'react'
import { BlockMath } from 'react-katex'
import { RenderMath, ExplanationBody } from '../../utils/RenderMath'
import { useAuth } from '../../context/AuthContext'
import { saveBookmark } from '../../lib/bookmarks'

export default function ResultDisplay({ result, onExplain, explaining, explanation }) {
  const { user } = useAuth()
  const [bookmarked, setBookmarked] = useState(false)
  const [bookmarkingExpl, setBookmarkingExpl] = useState(false)

  if (!result) return null

  const handleBookmarkResult = async () => {
    if (!user || bookmarked) return
    await saveBookmark({
      userId:     user.id,
      type:       'solution',
      title:      result.input || 'Solved Expression',
      content:    result.steps || result.result || '',
      expression: result.latex || result.result || '',
      result:     String(result.solution || result.simplified || ''),
      topic:      'Solve Module',
    })
    setBookmarked(true)
    setTimeout(() => setBookmarked(false), 3000)
  }

  const handleBookmarkExplanation = async () => {
    if (!user || bookmarkingExpl) return
    setBookmarkingExpl(true)
    await saveBookmark({
      userId:  user.id,
      type:    'explanation',
      title:   `Explanation: ${result.input || 'Expression'}`,
      content: explanation,
      topic:   'Solve Module',
    })
    setTimeout(() => setBookmarkingExpl(false), 3000)
  }

  return (
    <div className="card mt-0">
      {/* Header */}
      <div className="bg-[var(--color-teal)] px-6 py-3 flex items-center justify-between">
        <span className="font-serif text-white font-semibold text-lg">Result</span>
        <div className="flex items-center gap-2">
          {user && (
            <button
              onClick={handleBookmarkResult}
              title="Save to bookmarks"
              className={`text-sm font-medium px-3 py-1.5 rounded-lg transition-all
                ${bookmarked
                  ? 'bg-yellow-400 text-[var(--color-ink)]'
                  : 'bg-white/20 hover:bg-white/30 text-white'
                }`}
            >
              {bookmarked ? '🔖 Saved!' : '🔖 Save'}
            </button>
          )}
          <button
            onClick={onExplain}
            disabled={explaining}
            className="text-sm font-medium bg-white/20 hover:bg-white/30 text-white
                       px-4 py-1.5 rounded-lg transition-all disabled:opacity-50"
          >
            {explaining ? '⏳ Loading...' : '💡 Show All Methods'}
          </button>
        </div>
      </div>

      {/* Result body */}
      <div className="bg-white p-6">
        {result.type === 'error' ? (
          <p className="text-red-500 font-mono text-sm">{result.error}</p>
        ) : (
          <div className="space-y-4">
            <div className="bg-[var(--color-paper)] border border-[var(--color-border)]
                            rounded-xl p-6 text-center overflow-x-auto text-xl">
              <BlockMath math={result.latex || result.result || result.simplified || ''} />
            </div>
            {result.numerical !== null && result.numerical !== undefined && (
              <div className="flex items-center gap-3 px-1">
                <span className="font-mono text-xs uppercase tracking-widest
                                  text-[var(--color-muted)]">
                  Numerical value:
                </span>
                <span className="font-mono font-semibold text-[var(--color-teal)] text-lg">
                  {result.numerical}
                </span>
              </div>
            )}
            {result.steps && (
              <div className="bg-[var(--color-cream)] rounded-xl p-4">
                <p className="font-mono text-[10px] uppercase tracking-widest
                               text-[var(--color-muted)] mb-2">Working</p>
                <p className="font-mono text-sm text-[var(--color-ink)]">
                  {result.steps}
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Loading skeleton */}
      {explaining && (
        <div className="border-t-2 border-[var(--color-ink)] bg-[var(--color-paper)] p-6">
          <p className="font-mono text-[10px] uppercase tracking-widest
                         text-[var(--color-muted)] mb-3">
            ⏳ Euler is preparing all methods...
          </p>
          <div className="space-y-2">
            {[...Array(5)].map((_, i) => (
              <div key={i} className={`h-3 bg-[var(--color-border)] rounded animate-pulse
                ${i === 4 ? 'w-2/3' : 'w-full'}`} />
            ))}
          </div>
        </div>
      )}

      {/* Explanation */}
      {explanation && !explaining && (
        <div className="border-t-2 border-[var(--color-ink)] bg-[var(--color-paper)] p-6">
          <div className="flex items-center justify-between mb-4">
            <p className="font-mono text-[10px] uppercase tracking-widest
                           text-[var(--color-muted)] flex items-center gap-2">
              <span>🧠</span> All Methods — Euler
            </p>
            {user && (
              <button
                onClick={handleBookmarkExplanation}
                className={`text-xs px-3 py-1.5 rounded-lg border transition-all font-medium
                  ${bookmarkingExpl
                    ? 'bg-yellow-50 border-yellow-300 text-yellow-700'
                    : 'bg-white border-[var(--color-border)] hover:border-[var(--color-ink)]'
                  }`}
              >
                {bookmarkingExpl ? '🔖 Saved!' : '🔖 Save Explanation'}
              </button>
            )}
          </div>
          <ExplanationBody text={explanation} />
        </div>
      )}
    </div>
  )
}
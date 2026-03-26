// src/components/teach/MessageBubble.jsx
import { useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import { saveBookmark } from '../../lib/bookmarks'
import { ExplanationBody } from '../../utils/RenderMath'

export default function MessageBubble({ msg, topic, level, lastUserQuestion, onFeedbackSent, submitFeedback }) {
  const { user } = useAuth()
  const [rating, setRating] = useState(msg.rating || null)
  const [copied, setCopied] = useState(false)
  const [bookmarked, setBookmarked] = useState(false)
  const [bookmarking, setBookmarking] = useState(false)

  const isUser = msg.role === 'user'
  const isStreaming = msg.streaming === true

  const handleThumb = async (thumb) => {
    if (rating) return
    setRating(thumb)
    await submitFeedback({
      messageId: msg.id,
      userId: user?.id || 'anonymous',
      topic,
      level,
      question: lastUserQuestion,
      responsePreview: msg.content.slice(0, 300),
      rating: thumb,
      comment: '',
    })
    onFeedbackSent?.()
  }

  const handleCopy = () => {
    navigator.clipboard.writeText(msg.content).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  const handleBookmark = async () => {
    if (bookmarked || bookmarking || !user) return
    setBookmarking(true)
    try {
      await saveBookmark({
        userId: user.id,
        type: 'explanation',
        title: lastUserQuestion ? lastUserQuestion.slice(0, 80) : (topic || 'Teach note'),
        content: msg.content,
        topic: topic || '',
      })
      setBookmarked(true)
    } catch { /* silent */ }
    finally { setBookmarking(false) }
  }

  if (isUser) {
    return (
      <div className="flex justify-end mb-8 animate-in fade-in slide-in-from-right-4 duration-500">
        <div className="max-w-[80%] px-8 py-5 bg-[var(--color-ink)] text-white shadow-[12px_12px_0_var(--color-cream)]">
          <p className="font-serif italic text-lg leading-relaxed">{msg.content}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col mb-12 animate-in fade-in slide-in-from-left-4 duration-700">
      <div className="flex items-center gap-4 mb-4">
        <div className="w-8 h-8 bg-[var(--color-gold)] flex items-center justify-center font-serif font-black text-black italic">E</div>
        <p className="font-mono text-[10px] font-black tracking-[0.3em] text-[var(--color-ink)] uppercase">Euler Tutor</p>
      </div>

      <div className="pl-12 space-y-6">
        <div className="relative">
          <ExplanationBody text={msg.content} />
          {isStreaming && (
            <span className="inline-block w-2 h-5 bg-[var(--color-gold)] ml-2 animate-pulse align-middle" />
          )}
        </div>

        {!isStreaming && msg.content && (
          <div className="flex items-center gap-6 pt-4 border-t border-[var(--color-ink)]/5">
            <div className="flex items-center gap-2">
              <button onClick={() => handleThumb('up')} disabled={!!rating} className={`p-2 transition-all ${rating === 'up' ? 'text-emerald-600' : 'text-[var(--color-muted)] hover:text-emerald-500'}`}>
                {rating === 'up' ? '●' : '○'} <span className="font-mono text-[9px] font-black ml-1 uppercase">Helpful</span>
              </button>
              <button onClick={() => handleThumb('down')} disabled={!!rating} className={`p-2 transition-all ${rating === 'down' ? 'text-red-600' : 'text-[var(--color-muted)] hover:text-red-500'}`}>
                {rating === 'down' ? '●' : '○'} <span className="font-mono text-[9px] font-black ml-1 uppercase">Sub-optimal</span>
              </button>
            </div>

            <div className="ml-auto flex items-center gap-4">
              <button onClick={handleCopy} className="font-mono text-[9px] font-black text-[var(--color-muted)] hover:text-[var(--color-ink)] uppercase tracking-widest">{copied ? 'COPIED' : 'CLONE_TEXT'}</button>
              <button onClick={handleBookmark} disabled={bookmarked} className="font-mono text-[9px] font-black text-[var(--color-muted)] hover:text-[var(--color-gold)] uppercase tracking-widest">{bookmarked ? 'ARCHIVED' : 'SAVE_TO_VAULT'}</button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

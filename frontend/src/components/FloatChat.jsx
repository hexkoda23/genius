import { useState, useRef, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { useNavigate } from 'react-router-dom'
import { ExplanationBody } from '../utils/RenderMath'
import { askTutor } from '../services/api'
import { createConversation, saveMessage } from '../lib/conversations'

const QUICK_TOPICS = [
  'Quadratic Equations', 'Differentiation', 'Integration',
  'Probability', 'Trigonometry', 'Matrices', 'Logarithms',
]

export default function FloatChat() {
  const { user, profile } = useAuth()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [convId, setConvId] = useState(null)
  const [topic, setTopic] = useState('General Mathematics')
  const bottomRef = useRef(null)
  const inputRef = useRef(null)

  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 100)
    }
  }, [open])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const firstName = profile?.full_name?.split(' ')[0] || 'there'

  const initConversation = async (topicName) => {
    if (!user) return null
    const { data } = await createConversation(user.id, topicName, 'secondary')
    return data?.id || null
  }

  const handleSend = async (text) => {
    const msg = text || input.trim()
    if (!msg || loading) return
    setInput('')

    const userMsg = { role: 'user', content: msg }
    setMessages(prev => [...prev, userMsg])
    setLoading(true)

    // Create conversation if needed
    let cId = convId
    if (!cId) {
      cId = await initConversation(topic)
      setConvId(cId)
    }

    if (cId) await saveMessage(cId, 'user', msg)

    // Loading bubble
    setMessages(prev => [...prev, { role: 'assistant', content: '', loading: true }])

    try {
      const history = messages.slice(-6).map(m => ({
        role: m.role, content: m.content
      }))

      const res = await askTutor(msg, topic, 'secondary', history)
      const reply = res.data.answer || res.data.response || res.data.explanation || ''

      setMessages(prev => [
        ...prev.filter(m => !m.loading),
        { role: 'assistant', content: reply }
      ])

      if (cId) await saveMessage(cId, 'assistant', reply)
    } catch {
      setMessages(prev => [
        ...prev.filter(m => !m.loading),
        { role: 'assistant', content: '⚠️ Could not connect. Is the backend running?' }
      ])
    }
    setLoading(false)
  }

  const handleTopicClick = (t) => {
    setTopic(t)
    setMessages([])
    setConvId(null)
    setTimeout(() => {
      handleSend(`Hi Euler! Can you teach me about ${t}?`)
    }, 50)
  }

  const openFullTeach = () => {
    setOpen(false)
    navigate('/teach')
  }

  if (!user) return null

  return (
    <>
      {/* Floating button */}
      <button
        onClick={() => setOpen(o => !o)}
        className={`fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full
                    shadow-2xl flex items-center justify-center text-2xl
                    transition-all duration-300 border-2
          ${open
            ? 'bg-[var(--color-ink)] border-[var(--color-ink)] text-white'
            : 'bg-[var(--color-teal)] border-[var(--color-teal)] text-white'
          }`}
      >
        {open ? '✕' : '🧮'}
      </button>

      {/* Chat window */}
      {open && (
        <div
          className="fixed bottom-24 right-6 z-50
                     w-80 sm:w-96
                     bg-white border-2 border-[var(--color-ink)]
                     rounded-2xl shadow-2xl flex flex-col overflow-hidden"
          style={{ height: 'min(520px, calc(100vh - 128px))' }}>

          {/* Header */}
          <div className="bg-[var(--color-teal)] px-4 py-3 flex items-center
                          justify-between shrink-0">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-white/20 flex items-center
                              justify-center font-bold text-white text-sm">
                E
              </div>
              <div>
                <p className="font-serif font-bold text-white text-sm">Euler</p>
                <p className="text-white/70 text-[10px]">
                  Hi {firstName}! Ask me anything 👋
                </p>
              </div>
            </div>
            <button
              onClick={openFullTeach}
              className="text-white/70 hover:text-white text-xs font-mono
                         uppercase tracking-widest transition-colors"
              title="Open full Teach module"
            >
              Full ↗
            </button>
          </div>

          {/* Topic chips */}
          <div className="px-3 py-2 flex gap-1.5 overflow-x-auto shrink-0
                          border-b border-[var(--color-border)]
                          scrollbar-none">
            {QUICK_TOPICS.map(t => (
              <button
                key={t}
                onClick={() => handleTopicClick(t)}
                className={`shrink-0 px-2.5 py-1 rounded-lg text-[10px]
                            font-semibold border transition-all
                  ${topic === t
                    ? 'border-[var(--color-teal)] bg-[#e8f4f4] text-[var(--color-teal)]'
                    : 'border-[var(--color-border)] text-[var(--color-muted)] hover:border-[var(--color-teal)]'
                  }`}
              >
                {t}
              </button>
            ))}
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-3 py-3 space-y-3">
            {messages.length === 0 && (
              <div className="text-center py-8">
                <div className="text-4xl mb-2">🧮</div>
                <p className="text-sm font-semibold text-[var(--color-ink)] mb-1">
                  Hi {firstName}! I'm Euler 👋
                </p>
                <p className="text-xs text-[var(--color-muted)] leading-relaxed max-w-[200px] mx-auto">
                  Pick a topic above or ask me any maths question — I track your progress as you learn!
                </p>
              </div>
            )}
            {messages.map((msg, i) => (
              <div key={i}
                className={`flex gap-2
                     ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                {msg.role === 'assistant' && (
                  <div className="w-6 h-6 rounded-full bg-[var(--color-teal)]
                                  flex items-center justify-center text-white
                                  text-xs font-bold shrink-0 mt-0.5">
                    E
                  </div>
                )}
                <div className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm
                  ${msg.role === 'user'
                    ? 'bg-[var(--color-ink)] text-white rounded-br-sm'
                    : 'bg-[var(--color-paper)] border border-[var(--color-border)] rounded-bl-sm'
                  }`}>
                  {msg.loading ? (
                    <div className="flex gap-1 py-1">
                      {[0, 1, 2].map(j => (
                        <span key={j}
                          className="w-1.5 h-1.5 rounded-full
                                         bg-[var(--color-teal)] animate-bounce"
                          style={{ animationDelay: `${j * 0.15}s` }} />
                      ))}
                    </div>
                  ) : msg.role === 'user' ? (
                    <p className="leading-snug">{msg.content}</p>
                  ) : (
                    <ExplanationBody text={msg.content} />
                  )}
                </div>
              </div>
            ))}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div className="px-3 py-2.5 border-t border-[var(--color-border)] shrink-0">
            <div className="flex gap-2">
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && !loading && handleSend()}
                placeholder={`Ask me about ${topic === 'General Mathematics' ? 'any maths topic' : topic}...`}
                className="flex-1 bg-[var(--color-paper)] border
                           border-[var(--color-border)]
                           focus:border-[var(--color-teal)] rounded-xl
                           px-3 py-2 text-sm
                           placeholder:text-[var(--color-muted)]
                           transition-colors"
              />
              <button
                onClick={() => handleSend()}
                disabled={!input.trim() || loading}
                className="w-9 h-9 rounded-xl bg-[var(--color-teal)] text-white
                           flex items-center justify-center disabled:opacity-40
                           hover:bg-[var(--color-ink)] transition-colors shrink-0"
              >
                ➤
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
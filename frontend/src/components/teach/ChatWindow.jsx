// src/components/teach/ChatWindow.jsx
import { useState, useRef, useEffect, useCallback } from 'react'
import { useAuth } from '../../context/AuthContext'
import { supabase } from '../../lib/supabase'
import MessageBubble from './MessageBubble'

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000'

// ── Streaming helper ──────────────────────────────────────────────────────────
async function streamTeach({ question, topic, level, history, userId, onToken, onDone, onError }) {
  try {
    const { data: { session } } = await supabase.auth.getSession()
    const res = await fetch(`${API_BASE}/teach/ask/stream`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
      },
      body: JSON.stringify({
        question,
        topic: topic || 'General Mathematics',
        level: level || 'sss',
        conversation_history: history,
        user_id: userId || null,
      }),
    })
    if (!res.ok) {
      if (res.status === 401) throw new Error('Please sign in to use the tutor.')
      throw new Error('Connection failed. Check your API URL.')
    }

    const reader = res.body.getReader()
    const decoder = new TextDecoder()
    let buffer = ''

    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n')
      buffer = lines.pop()
      for (const line of lines) {
        if (!line.startsWith('data: ')) continue
        const payload = line.slice(6).trim()
        if (payload === '[DONE]') { onDone(); return }
        try { onToken(JSON.parse(payload).token) } catch { }
      }
    }
    onDone()
  } catch (err) {
    onError(err.message || 'Could not connect to backend.')
  }
}

// ── Submit feedback ───────────────────────────────────────────────────────────
async function submitFeedback({ messageId, userId, topic, level, question, responsePreview, rating, comment }) {
  try {
    await fetch(`${API_BASE}/teach/feedback`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message_id: messageId,
        user_id: userId,
        topic,
        level,
        question,
        response_preview: responsePreview,
        rating,
        comment,
      }),
    })
  } catch { }
}

export default function ChatWindow({ topic, level, conversation, onConversationUpdate }) {
  const { user } = useAuth()
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [streaming, setStreaming] = useState(false)
  const [error, setError] = useState(null)
  const bottomRef = useRef()
  const textareaRef = useRef()
  const name = (user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Student')

  useEffect(() => {
    if (!conversation?.id) { setMessages([]); return }
    if (conversation?.messages?.length > 0) {
      setMessages(conversation.messages.map(m => ({ id: m.id || crypto.randomUUID(), role: m.role, content: m.content, rating: m.rating || null })))
    } else {
      supabase.from('messages').select('*').eq('conversation_id', conversation.id).order('created_at', { ascending: true })
        .then(({ data }) => { if (data?.length > 0) setMessages(data.map(m => ({ id: m.id, role: m.role, content: m.content }))) })
    }
  }, [conversation?.id])

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages])

  useEffect(() => {
    const el = textareaRef.current; if (!el) return
    el.style.height = 'auto'; el.style.height = Math.min(el.scrollHeight, 160) + 'px'
  }, [input])

  useEffect(() => {
    if (topic && messages.length === 0 && !streaming && user) sendMessage(`Give me an overview of ${topic}`)
  }, [topic, conversation?.id, user])

  const sendMessage = useCallback(async (text) => {
    const content = (text || input).trim(); if (!content || streaming) return
    if (!user) { setError('Please sign in to use the tutor.'); return }
    setInput(''); setError(null)
    const userMsg = { id: crypto.randomUUID(), role: 'user', content }
    setMessages(prev => [...prev, userMsg])
    const aiId = crypto.randomUUID()
    setMessages(prev => [...prev, { id: aiId, role: 'assistant', content: '', streaming: true }])
    setStreaming(true)
    const history = messages.map(m => ({ role: m.role, content: m.content }))

    await streamTeach({
      question: content, topic: topic || 'General Mathematics', level: level || 'sss', history, userId: user?.id,
      onToken: (token) => { setMessages(p => p.map(m => m.id === aiId ? { ...m, content: m.content + token } : m)) },
      onDone: async () => {
        setMessages(prev => {
          const updated = prev.map(m => m.id === aiId ? { ...m, streaming: false } : m)
          if (conversation?.id) {
            const lastPair = updated.slice(-2)
            lastPair.forEach(m => { supabase.from('messages').upsert({ id: m.id, conversation_id: conversation.id, role: m.role, content: m.content }, { onConflict: 'id' }).then(() => { }) })
          }
          return updated
        })
        setStreaming(false); onConversationUpdate?.()
      },
      onError: (err) => {
        setMessages(p => p.map(m => m.id === aiId ? { ...m, content: 'SYSTEM_ERROR: Neural uplink failed.', streaming: false } : m))
        setError(err); setStreaming(false)
      },
    })
  }, [input, streaming, messages, topic, level, user])

  const handleKeyDown = (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage() } }
  const lastUserQuestion = [...messages].reverse().find(m => m.role === 'user')?.content || ''

  if (!topic) {
    return (
      <div className="border-4 border-[var(--color-ink)] flex flex-col items-center justify-center min-h-[600px] text-center p-12 bg-[var(--color-paper)] shadow-[12px_12px_0_var(--color-cream)]">
        <p className="eyebrow self-center mb-8">Euler Tutor</p>
        <h2 className="font-serif font-black text-5xl md:text-6xl tracking-tight leading-[1] mb-6">Hi {name}! Ask me anything 👋</h2>
        <div className="w-16 h-px bg-[var(--color-ink)] mb-8" />
        <p className="font-serif italic text-lg text-[var(--color-muted)] max-w-sm">Pick a topic to start or just type your question.</p>
        <div className="mt-8 flex flex-wrap gap-2 justify-center">
          {['Quadratic Equations', 'Probability', 'Trigonometry', 'Matrices', 'Logarithms'].map(t => (
            <button key={t} onClick={() => sendMessage(`Give me an overview of ${t}`)} className="px-4 py-2 border border-[var(--color-ink)]/10 font-mono text-[9px] font-black uppercase tracking-widest text-[var(--color-muted)] hover:border-[var(--color-ink)] hover:text-[var(--color-ink)] transition-all">
              {t}
            </button>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col border-4 border-[var(--color-ink)] bg-white overflow-hidden shadow-[12px_12px_0_var(--color-cream)] min-h-[700px]">
      <div className="px-8 py-6 border-b-4 border-[var(--color-ink)] bg-[var(--color-paper)] flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-4 h-4 rounded-full bg-[var(--color-gold)] animate-pulse" />
          <div>
            <p className="font-mono text-[9px] font-black uppercase tracking-widest text-[var(--color-muted)]">Euler Tutor</p>
            <h3 className="font-serif font-black text-xl tracking-tight">Hi {name}! Ask me anything</h3>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="font-mono text-[8px] font-black uppercase text-[var(--color-ink)] px-2 py-0.5 border border-current">{level.toUpperCase()}</span>
          {streaming && <span className="font-mono text-[8px] font-black uppercase text-[var(--color-gold)] animate-pulse ml-4 tracking-widest">Typing...</span>}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-12 py-12 custom-scrollbar bg-white">
        {messages.map((msg) => (
          <MessageBubble key={msg.id} msg={msg} topic={topic} level={level} lastUserQuestion={lastUserQuestion} onFeedbackSent={onConversationUpdate} submitFeedback={submitFeedback} />
        ))}
        {error && (
          <div className="p-8 border-2 border-red-200 bg-red-50 font-mono text-xs text-red-600 mb-8 space-y-3">
            <div>⚠ {error}</div>
            <div className="flex gap-2">
              <button onClick={() => sendMessage(lastUserQuestion)} className="px-3 py-1 border border-red-300 bg-white text-red-600">Retry</button>
              <a href="/login" className="px-3 py-1 border border-red-300 bg-white text-red-600">Sign in</a>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      <div className="p-8 bg-[var(--color-paper)] border-t-4 border-[var(--color-ink)]">
        {messages.length <= 1 && (
          <div className="flex flex-wrap gap-2 mb-8">
            {['Show worked example', 'Key formulas', 'Mistakes to avoid', 'Practice question'].map(q => (
              <button key={q} onClick={() => sendMessage(q)} disabled={streaming} className="px-4 py-2 border border-[var(--color-ink)]/10 font-mono text-[9px] font-black uppercase tracking-widest text-[var(--color-muted)] hover:border-[var(--color-ink)] hover:text-[var(--color-ink)] transition-all">
                {q}
              </button>
            ))}
          </div>
        )}
        <div className="flex flex-wrap gap-2 mb-4">
          {['Quadratic Equations', 'Probability', 'Trigonometry'].map(t => (
            <button key={t} onClick={() => sendMessage(`Give me an overview of ${t}`)} disabled={streaming} className="px-3 py-1.5 border border-[var(--color-ink)]/10 font-mono text-[9px] font-black uppercase tracking-widest text-[var(--color-muted)] hover:border-[var(--color-ink)] hover:text-[var(--color-ink)] transition-all">
              {t}
            </button>
          ))}
        </div>
        <div className="relative group">
          <textarea ref={textareaRef} value={input} onChange={e => setInput(e.target.value)} onKeyDown={handleKeyDown} disabled={streaming} placeholder={streaming ? "Euler is typing..." : "Ask a question..."} rows={1} className="w-full bg-white border-2 border-[var(--color-ink)] p-6 font-serif italic text-xl outline-none focus:shadow-[8px_8px_0_var(--color-gold)] transition-all disabled:opacity-50" style={{ maxHeight: '160px' }} />
          <button onClick={() => sendMessage()} disabled={streaming || !input.trim()} className="absolute right-4 bottom-4 w-12 h-12 bg-[var(--color-ink)] text-white flex items-center justify-center font-serif font-black text-2xl hover:bg-black transition-all disabled:opacity-20 translate-y-[-2px]">➔</button>
        </div>
        <p className="font-mono text-[8px] text-[var(--color-muted)] mt-4 uppercase tracking-widest text-right">Enter to send · Shift+Enter for newline</p>
      </div>
    </div>
  )
}

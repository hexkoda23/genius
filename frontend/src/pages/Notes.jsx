import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { getNotes, createNote, updateNote, deleteNote, togglePin } from '../lib/notes'
import { useReveal } from '../hooks/useReveal'
import { ExplanationBody } from '../utils/RenderMath'

const COLORS = [
  { id: 'yellow', border: 'border-yellow-400', text: 'text-yellow-700', label: 'THEORY' },
  { id: 'teal', border: 'border-[var(--color-teal)]', text: 'text-[var(--color-teal)]', label: 'FORMULA' },
  { id: 'pink', border: 'border-pink-400', text: 'text-pink-700', label: 'URGENT' },
  { id: 'purple', border: 'border-purple-400', text: 'text-purple-700', label: 'RESEARCH' },
  { id: 'ink', border: 'border-[var(--color-ink)]', text: 'text-[var(--color-ink)]', label: 'STANDARD' },
]

function NoteCard({ note, onEdit, onDelete, onTogglePin, onPractice }) {
  const color = COLORS.find(c => c.id === note.color) || COLORS[4]
  return (
    <div className={`border-4 ${color.border} bg-white p-8 relative group transition-all shadow-[12px_12px_0_var(--color-cream)] hover:shadow-none min-h-[300px] flex flex-col`}>
      {note.pinned && <span className="absolute -top-3 -right-3 w-8 h-8 bg-[var(--color-ink)] text-white flex items-center justify-center font-serif italic font-black ring-4 ring-white">P</span>}
      <div className="mb-6 flex justify-between items-start">
        <div className="space-y-1">
          <p className="font-mono text-[9px] font-black uppercase tracking-widest text-[var(--color-gold)]">{color.label}</p>
          <h3 className="font-serif font-black text-2xl uppercase italic tracking-tighter leading-none">{note.title}</h3>
        </div>
        <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <button onClick={() => onPractice(note)} className="w-8 h-8 border-2 border-[var(--color-ink)] flex items-center justify-center hover:bg-[var(--color-ink)] hover:text-white transition-all">🤖</button>
          <button onClick={() => onEdit(note)} className="w-8 h-8 border-2 border-[var(--color-ink)] flex items-center justify-center hover:bg-[var(--color-ink)] hover:text-white transition-all">✏️</button>
          <button onClick={() => onDelete(note.id)} className="w-8 h-8 border-2 border-red-600 flex items-center justify-center hover:bg-red-600 hover:text-white transition-all">🗑️</button>
        </div>
      </div>
      <p className="font-serif italic text-lg text-[var(--color-ink)] opacity-70 leading-snug line-clamp-6 mb-8 flex-1">{note.content}</p>
      <div className="flex justify-between items-end border-t-2 border-[var(--color-ink)]/5 pt-6">
        <p className="font-mono text-[8px] font-black text-[var(--color-muted)] uppercase italic">{new Date(note.updated_at).toLocaleDateString()} // ID_SYNC_{note.id.slice(0, 4)}</p>
        <button onClick={() => onPractice(note)} className="font-mono text-[8px] font-black text-[var(--color-gold)] hover:underline uppercase tracking-[0.2em]">INITIALIZE_PRACTICE ➔</button>
      </div>
    </div>
  )
}

function NoteModal({ note, onSave, onClose }) {
  const [title, setTitle] = useState(note?.title || ''); const [content, setContent] = useState(note?.content || '')
  const [topic, setTopic] = useState(note?.topic || ''); const [color, setColor] = useState(note?.color || 'yellow')
  const [saving, setSaving] = useState(false)
  const handleSave = async () => { if (!title.trim() || !content.trim()) return; setSaving(true); await onSave({ title: title.trim(), content: content.trim(), topic: topic.trim(), color }); setSaving(false) }

  return (
    <div className="fixed inset-0 z-[100] bg-[var(--color-ink)]/90 backdrop-blur-xl flex items-center justify-center p-6">
      <div className="bg-white border-4 border-[var(--color-ink)] p-12 md:p-16 max-w-2xl w-full relative shadow-[32px_32px_0_var(--color-gold)]">
        <p className="eyebrow mb-12">NOTE_SCHEMA_EDITOR</p>
        <div className="space-y-8">
          <input type="text" value={title} onChange={e => setTitle(e.target.value)} placeholder="NOTE_TITLE..." className="w-full bg-[var(--color-paper)] border-4 border-[var(--color-ink)] p-6 font-serif font-black text-3xl italic placeholder:opacity-20 uppercase tracking-tighter outline-none focus:bg-white transition-all" />
          <input type="text" value={topic} onChange={e => setTopic(e.target.value)} placeholder="TOPIC_CONTEXT..." className="w-full bg-[var(--color-paper)] border-2 border-[var(--color-ink)] p-4 font-mono text-[11px] font-black uppercase tracking-widest outline-none focus:bg-white transition-all" />
          <textarea value={content} onChange={e => setContent(e.target.value)} placeholder="UPLINK_YOUR_CITATIONS..." rows={8} className="w-full bg-[var(--color-paper)] border-4 border-[var(--color-ink)] p-8 font-serif italic text-xl placeholder:opacity-20 uppercase tracking-tight outline-none focus:bg-white transition-all resize-none" />

          <div className="flex justify-between items-center">
            <div className="flex gap-2">
              {COLORS.map(c => (
                <button key={c.id} onClick={() => setColor(c.id)} className={`w-8 h-8 border-4 border-[var(--color-ink)] transition-all ${color === c.id ? `ring-4 ring-[var(--color-gold)] scale-110` : 'opacity-40'}`} style={{ backgroundColor: c.id === 'ink' ? '#1a1a1a' : c.id === 'teal' ? '#2d7a7a' : c.id === 'yellow' ? '#fbbf24' : c.id === 'pink' ? '#f472b6' : '#a78bfa' }} />
              ))}
            </div>
            <div className="flex gap-4">
              <button onClick={onClose} className="px-8 py-4 border-2 border-[var(--color-ink)] font-mono text-[9px] font-black uppercase italic tracking-widest hover:bg-[var(--color-cream)]">CANCEL</button>
              <button onClick={handleSave} disabled={saving} className="px-12 py-4 bg-[var(--color-ink)] text-white font-serif font-black text-xl uppercase italic tracking-tighter hover:bg-black transition-all shadow-[8px_8px_0_var(--color-gold)]">{saving ? 'SYNCING...' : 'COMMIT_NOTE ➔'}</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function PracticeModal({ note, onClose }) {
  const [questions, setQuestions] = useState([]); const [loading, setLoading] = useState(true); const [answers, setAnswers] = useState({})
  const [revealed, setRevealed] = useState(false)

  useEffect(() => {
    (async () => {
      setLoading(true)
      try {
        const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:8000'}/study-plan/generate-note-questions`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ title: note.title, content: note.content }),
        })
        const data = await res.json(); setQuestions(data.questions || [])
      } catch { setQuestions([]) } finally { setLoading(false) }
    })()
  }, [note])

  const score = questions.filter((q, i) => answers[i] === q.correct).length

  return (
    <div className="fixed inset-0 z-[120] bg-[var(--color-ink)]/95 backdrop-blur-2xl flex items-center justify-center p-6">
      <div className="bg-white border-4 border-[var(--color-ink)] p-12 md:p-24 max-w-4xl w-full relative shadow-[64px_64px_0_var(--color-gold)] max-h-[90vh] overflow-y-auto">
        <p className="eyebrow mx-auto justify-center mb-12">EULER_NODE_SIMULATION</p>
        <div className="mb-24 text-center">
          <h2 className="font-serif font-black text-6xl md:text-8xl italic uppercase tracking-tighter leading-none mb-6">Mastery <br /><span className="text-[var(--color-gold)] not-italic underline decoration-8">Assesment.</span></h2>
          <p className="font-mono text-[11px] font-black uppercase tracking-[0.4em] opacity-40 italic">SOURCE: {note.title}</p>
        </div>

        {loading ? (
          <div className="py-24 text-center space-y-8">
            <div className="w-16 h-16 border-4 border-[var(--color-ink)] border-t-[var(--color-gold)] animate-spin mx-auto" />
            <p className="font-serif italic text-2xl uppercase tracking-tighter opacity-40">Euler is synthesizing schemas from your records...</p>
          </div>
        ) : (
          <div className="space-y-16">
            {revealed && (
              <div className="border-4 border-[var(--color-ink)] p-12 text-center bg-[var(--color-cream)]">
                <p className="font-serif font-black text-8xl italic tracking-tighter uppercase leading-none mb-4">{score}/{questions.length}</p>
                <p className="font-mono text-[11px] font-black uppercase tracking-widest text-[var(--color-gold)]">{score === questions.length ? 'DOMAIN_MASTERY_ACHIEVED' : 'COGNITIVE_GAPS_DETECTED'}</p>
              </div>
            )}
            <div className="space-y-24">
              {questions.map((q, i) => (
                <div key={i} className="space-y-12">
                  <div className="space-y-6">
                    <p className="font-serif font-black text-2xl italic tracking-tighter uppercase text-[var(--color-ink)]/40">PROBLEM_0{i + 1}</p>
                    <p className="font-serif font-black text-4xl italic uppercase tracking-tighter leading-tight"><ExplanationBody body={q.question} /></p>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {Object.entries(q.options).map(([letter, text]) => (
                      <button key={letter} onClick={() => !revealed && setAnswers(a => ({ ...a, [i]: letter }))} disabled={revealed} className={`p-8 border-4 transition-all text-left font-serif font-black text-xl italic uppercase tracking-tighter leading-none flex items-center gap-6 ${revealed ? (letter === q.correct ? 'bg-green-600 border-green-600 text-white' : answers[i] === letter ? 'bg-red-600 border-red-600 text-white' : 'border-[var(--color-ink)] opacity-10') : (answers[i] === letter ? 'bg-[var(--color-ink)] text-white border-[var(--color-ink)]' : 'border-[var(--color-ink)] hover:bg-[var(--color-cream)]')}`}>
                        <span className="shrink-0 w-8 h-8 border-2 border-current flex items-center justify-center font-mono text-xs">{letter}</span>
                        {text}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            <div className="flex gap-8 pt-12 border-t-4 border-[var(--color-ink)]/5">
              {!revealed ? (
                <button onClick={() => setRevealed(true)} disabled={Object.keys(answers).length < questions.length} className="flex-1 bg-[var(--color-ink)] text-white py-10 font-serif font-black text-3xl uppercase tracking-tighter italic hover:bg-black transition-all shadow-[12px_12px_0_var(--color-gold)] disabled:opacity-20">COMMIT_ANSWERS ➔</button>
              ) : (
                <button onClick={() => window.location.reload()} className="flex-1 bg-[var(--color-gold)] text-black py-10 font-serif font-black text-3xl uppercase tracking-tighter italic hover:bg-[var(--color-ink)] hover:text-white transition-all shadow-[12px_12px_0_var(--color-ink)]">TERMINATE_SIMULATION ➔</button>
              )}
              <button onClick={onClose} className="px-12 py-10 border-4 border-[var(--color-ink)] font-mono text-[11px] font-black uppercase tracking-[0.4em] hover:bg-[var(--color-ink)] hover:text-white transition-all italic">ABORT_MODE</button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default function Notes() {
  const { user } = useAuth(); const revealRef = useReveal()
  const [notes, setNotes] = useState([]); const [loading, setLoading] = useState(true); const [showModal, setShowModal] = useState(false)
  const [editingNote, setEditingNote] = useState(null); const [practiceNote, setPracticeNote] = useState(null)
  const [search, setSearch] = useState(''); const [filterTopic, setFilterTopic] = useState('')

  useEffect(() => { if (user) loadNotes() }, [user])
  const loadNotes = async () => { const data = await getNotes(user.id); setNotes(data); setLoading(false) }

  const handleSave = async (fields) => {
    if (editingNote) { const updated = await updateNote(editingNote.id, fields); setNotes(prev => prev.map(n => n.id === editingNote.id ? updated : n)) }
    else { const created = await createNote(user.id, fields); setNotes(prev => [created, ...prev]) }
    setShowModal(false); setEditingNote(null)
  }

  const filtered = notes.filter(n => (!search || n.title.toLowerCase().includes(search.toLowerCase()) || n.content.toLowerCase().includes(search.toLowerCase())) && (!filterTopic || n.topic === filterTopic))
  const topics = [...new Set(notes.map(n => n.topic).filter(Boolean))]

  return (
    <div className="max-w-[1440px] mx-auto px-6 md:px-12 py-12 bg-[var(--color-paper)] min-h-screen relative" ref={revealRef}>
      <div className="grain pointer-events-none" />

      {(showModal || editingNote) && <NoteModal note={editingNote} onSave={handleSave} onClose={() => { setShowModal(false); setEditingNote(null) }} />}
      {practiceNote && <PracticeModal note={practiceNote} onClose={() => setPracticeNote(null)} />}

      <div className="mb-24 flex flex-col md:flex-row items-end justify-between gap-12 relative z-10">
        <div className="max-w-4xl">
          <p className="eyebrow">KNOWLEDGE_RESERVE_v3.1</p>
          <h1 className="font-serif font-black text-7xl md:text-[10rem] tracking-tighter uppercase leading-[0.8] italic">
            NOTES & <br /><span className="text-[var(--color-gold)] not-italic">CITATIONS.</span>
          </h1>
          <p className="font-serif italic text-2xl text-[var(--color-muted)] mt-12 border-l-4 border-[var(--color-gold)] pl-8 max-w-xl uppercase tracking-tighter">Your high-fidelity repository for mathematical concepts and derived axiom highlights.</p>
        </div>
        <button onClick={() => { setEditingNote(null); setShowModal(true) }} className="bg-[var(--color-ink)] text-white px-12 py-6 font-serif font-black text-2xl uppercase italic tracking-tighter hover:bg-black transition-all shadow-[12px_12px_0_var(--color-gold)]">
          INITIALIZE_NEW_RECORD ➔
        </button>
      </div>

      <div className="flex flex-col md:flex-row gap-8 mb-24 relative z-10">
        <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="QUERY_RECORDS..." className="flex-1 bg-white border-4 border-[var(--color-ink)] p-8 font-serif font-black text-2xl italic placeholder:opacity-20 uppercase tracking-tighter outline-none focus:bg-[var(--color-cream)] transition-all" />
        {topics.length > 0 && (
          <select value={filterTopic} onChange={e => setFilterTopic(e.target.value)} className="bg-white border-4 border-[var(--color-ink)] p-8 font-mono text-[11px] font-black uppercase tracking-widest outline-none focus:bg-[var(--color-cream)] transition-all">
            <option value="">ALL_SECTORS</option>
            {topics.map(t => <option key={t} value={t}>{t.toUpperCase()}</option>)}
          </select>
        )}
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-12">
          {[...Array(6)].map((_, i) => <div key={i} className="h-[400px] border-4 border-dashed border-[var(--color-ink)]/10 animate-pulse" />)}
        </div>
      ) : filtered.length ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-12 relative z-10">
          {filtered.map(note => <NoteCard key={note.id} note={note} onEdit={setEditingNote} onDelete={handleDelete} onTogglePin={handleTogglePin} onPractice={setPracticeNote} />)}
        </div>
      ) : (
        <div className="py-48 text-center border-4 border-dashed border-[var(--color-ink)]/20">
          <p className="font-serif italic font-black text-6xl opacity-20 uppercase tracking-tighter leading-none">NO_RECORDS_FOUND_IN_ARCHIVE.</p>
        </div>
      )}
    </div>
  )
}
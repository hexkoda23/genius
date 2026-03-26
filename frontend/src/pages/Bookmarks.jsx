import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { getBookmarks, deleteBookmark } from '../lib/bookmarks'
import { ExplanationBody } from '../utils/RenderMath'
import { BlockMath } from 'react-katex'
import { useReveal } from '../hooks/useReveal'

const TYPE_LABELS = {
  solution: { label: 'SCHEMA_SOLUTION', color: 'text-[var(--color-teal)]' },
  explanation: { label: 'COGNITIVE_LOGIC', color: 'text-[var(--color-gold)]' },
  message: { label: 'UPLINK_MESSAGE', color: 'text-purple-600' },
}

function BookmarkCard({ bookmark, onDelete }) {
  const [expanded, setExpanded] = useState(false); const [deleting, setDeleting] = useState(false)
  const meta = TYPE_LABELS[bookmark.type] || TYPE_LABELS.message
  const handleDelete = async () => { setDeleting(true); await onDelete(bookmark.id) }

  return (
    <div className={`border-4 border-[var(--color-ink)] bg-[var(--color-surface)] transition-all shadow-[12px_12px_0_var(--color-cream)] hover:shadow-none overflow-hidden group`}>
      <div className="p-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-8">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-4 mb-3">
            <p className={`font-mono text-[9px] font-black uppercase tracking-[0.4em] ${meta.color}`}>{meta.label}</p>
            <div className="w-1.5 h-1.5 rounded-full bg-[var(--color-ink)]/10" />
            <p className="font-mono text-[9px] font-black uppercase text-[var(--color-muted)] tracking-widest italic">{new Date(bookmark.created_at).toLocaleDateString()} // MG_VAULT_{bookmark.id.slice(0, 4)}</p>
          </div>
          <h3 className="font-serif font-black text-3xl uppercase italic tracking-tighter leading-none group-hover:text-[var(--color-gold)] transition-all cursor-pointer truncate" onClick={() => setExpanded(!expanded)}>{bookmark.title}</h3>
          {bookmark.topic && <p className="font-mono text-[8px] font-black uppercase text-[var(--color-ink)]/40 mt-2 tracking-widest">{bookmark.topic}</p>}
        </div>
        <div className="flex gap-4">
          <button onClick={() => setExpanded(!expanded)} className="px-8 py-3 border-2 border-[var(--color-ink)] font-mono text-[9px] font-black uppercase tracking-widest hover:bg-[var(--color-ink)] hover:text-white transition-all">{expanded ? 'COLLAPSE_NODE' : 'ACCESS_SCHEMA'}</button>
          <button onClick={handleDelete} disabled={deleting} className="w-12 h-12 border-2 border-red-600 flex items-center justify-center text-red-600 hover:bg-red-600 hover:text-white transition-all disabled:opacity-20">{deleting ? '...' : '🗑️'}</button>
        </div>
      </div>

      {expanded && (
        <div className="border-t-4 border-[var(--color-ink)] bg-[var(--color-paper)] p-12 md:p-24 relative overflow-hidden">
          <div className="absolute right-[-5%] bottom-[-5%] font-serif font-black text-[25rem] text-[var(--color-ink)] opacity-[0.03] italic select-none pointer-events-none -rotate-12">Ψ</div>
          {bookmark.expression && (
            <div className="mb-12 border-4 border-[var(--color-ink)]/5 bg-[var(--color-surface)] p-12 text-center shadow-[16px_16px_0_var(--color-cream)]">
              <BlockMath math={bookmark.expression} />
            </div>
          )}
          <div className="max-w-4xl relative z-10">
            <ExplanationBody text={bookmark.content} />
          </div>
        </div>
      )}
    </div>
  )
}

export default function Bookmarks() {
  const { user } = useAuth(); const revealRef = useReveal()
  const [bookmarks, setBookmarks] = useState([]); const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all'); const [search, setSearch] = useState('')

  useEffect(() => { if (user) loadBookmarks() }, [user])
  const loadBookmarks = async () => { setLoading(true); const { data } = await getBookmarks(user.id); setBookmarks(data || []); setLoading(false) }
  const handleDelete = async (id) => { await deleteBookmark(id); setBookmarks(prev => prev.filter(b => b.id !== id)) }

  const filtered = bookmarks.filter(b => (filter === 'all' || b.type === f) && (!search || b.title.toLowerCase().includes(search.toLowerCase()) || b.topic?.toLowerCase().includes(search.toLowerCase())))

  return (
    <div className="max-w-[1440px] mx-auto px-6 md:px-12 py-12 bg-[var(--color-paper)] min-h-screen relative" ref={revealRef}>
      <div className="grain pointer-events-none" />

      <div className="mb-24 flex flex-col md:flex-row items-end justify-between gap-12 relative z-10">
        <div className="max-w-4xl">
          <p className="eyebrow">INTEL_VAULT_v5.4</p>
          <h1 className="font-serif font-black text-7xl md:text-[10rem] tracking-tighter uppercase leading-[0.8] italic">
            SAVED <br /><span className="text-[var(--color-gold)] not-italic">ARCHIVES.</span>
          </h1>
          <p className="font-serif italic text-2xl text-[var(--color-muted)] mt-12 border-l-4 border-[var(--color-gold)] pl-8 max-w-xl uppercase tracking-tighter">High-fidelity retrieval nexus for solutions, cognitive logic, and pedagogical uplinks.</p>
        </div>
        <div className="flex gap-12 bg-[var(--color-surface)] border-4 border-[var(--color-ink)] p-8 shadow-[12px_12px_0_var(--color-cream)]">
          <div className="text-center px-8 border-r-2 border-[var(--color-ink)]/10">
            <p className="font-mono text-[9px] font-black uppercase text-[var(--color-muted)] mb-2">SECURE_RECORDS</p>
            <p className="font-serif font-black text-4xl leading-none italic">{bookmarks.length}</p>
          </div>
          <div className="text-center px-8">
            <p className="font-mono text-[9px] font-black uppercase text-[var(--color-muted)] mb-2">ENCRYPTION</p>
            <p className="font-serif font-black text-4xl leading-none italic text-[var(--color-teal)]">AES-256</p>
          </div>
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-8 mb-24 relative z-10">
        <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search bookmarks..." className="flex-1 bg-[var(--color-surface)] border-4 border-[var(--color-ink)] p-8 font-serif font-black text-2xl italic placeholder:opacity-20 uppercase tracking-tighter outline-none focus:bg-[var(--color-cream)] transition-all" />
        <div className="flex border-4 border-[var(--color-ink)] bg-[var(--color-surface)] overflow-hidden shrink-0">
          {['all', 'solution', 'explanation', 'message'].map(f => (
            <button key={f} onClick={() => setFilter(f)} className={`px-8 py-4 font-mono text-[9px] font-black uppercase tracking-[0.4em] transition-all border-r-2 last:border-r-0 border-[var(--color-ink)] ${filter === f ? 'bg-[var(--color-ink)] text-white' : 'hover:bg-[var(--color-cream)] text-[var(--color-muted)]'}`}>
              {f.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="space-y-12">
          {[...Array(4)].map((_, i) => <div key={i} className="h-32 border-4 border-dashed border-[var(--color-ink)]/10 animate-pulse" />)}
        </div>
      ) : filtered.length ? (
        <div className="space-y-12 relative z-10">
          {filtered.map(b => <BookmarkCard key={b.id} bookmark={b} onDelete={handleDelete} />)}
        </div>
      ) : (
        <div className="py-48 text-center border-4 border-dashed border-[var(--color-ink)]/20">
          <p className="font-serif italic font-black text-6xl opacity-20 uppercase tracking-tighter leading-none">AWAITING_RECORDS_INITIALIZATION.</p>
        </div>
      )}
    </div>
  )
}
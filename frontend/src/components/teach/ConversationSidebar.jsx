import { useState, useEffect } from 'react'
import { useAuth } from '../../context/AuthContext'
import {
  getConversations,
  createConversation,
  deleteConversation,
  renameConversation,
} from '../../lib/conversations'

function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000); const hours = Math.floor(diff / 3600000); const days = Math.floor(diff / 86400000)
  if (mins < 1) return 'JUST_NOW'; if (mins < 60) return `${mins}M`; if (hours < 24) return `${hours}H`; if (days < 7) return `${days}D`
  return new Date(dateStr).toLocaleDateString()
}

export default function ConversationSidebar({ currentConversationId, onSelectConversation, onNewConversation, topic, level }) {
  const { user } = useAuth(); const [conversations, setConversations] = useState([]); const [loading, setLoading] = useState(true)
  const [menuOpen, setMenuOpen] = useState(null); const [renaming, setRenaming] = useState(null); const [renameValue, setRenameValue] = useState('')

  useEffect(() => { if (user) loadConversations() }, [user])
  const loadConversations = async () => {
    setLoading(true); const { data } = await getConversations(user.id)
    setConversations(data || []); setLoading(false)
  }

  const handleNew = async () => {
    const { data } = await createConversation(user.id, topic, level)
    if (data) { setConversations(prev => [data, ...prev]); onNewConversation(data) }
  }

  const handleDelete = async (id) => {
    await deleteConversation(id); setConversations(prev => prev.filter(c => c.id !== id))
    setMenuOpen(null); if (currentConversationId === id) onNewConversation(null)
  }

  const handleRename = async (id) => {
    if (!renameValue.trim()) return
    const { data } = await renameConversation(id, renameValue.trim())
    if (data) setConversations(prev => prev.map(c => c.id === id ? data : c))
    setRenaming(null); setRenameValue(''); setMenuOpen(null)
  }

  return (
    <div className="bg-white border-4 border-[var(--color-ink)] flex flex-col h-[calc(100vh-140px)] sticky top-[100px] overflow-hidden shadow-[12px_12px_0_var(--color-cream)]">
      <div className="bg-[var(--color-ink)] px-6 py-4 flex items-center justify-between shrink-0">
        <span className="font-mono text-[9px] font-black tracking-[0.3em] text-[var(--color-paper)] uppercase">DIALOGUES_ARCHIVE</span>
        <button onClick={handleNew} className="w-8 h-8 bg-[var(--color-gold)] flex items-center justify-center font-black text-[var(--color-ink)] hover:bg-white transition-all">
          +
        </button>
      </div>

      <div className="overflow-y-auto flex-1 custom-scrollbar">
        {loading ? (
          <div className="p-6 space-y-4">
            {[...Array(6)].map((_, i) => <div key={i} className="h-16 border-2 border-[var(--color-ink)]/5 animate-pulse" />)}
          </div>
        ) : conversations.length === 0 ? (
          <div className="p-12 text-center space-y-4">
            <p className="font-serif italic text-sm text-[var(--color-muted)]">Archivum Silentium.</p>
            <button onClick={handleNew} className="font-mono text-[9px] font-black uppercase tracking-widest text-[var(--color-gold)] hover:underline">Start First Dialectic ➔</button>
          </div>
        ) : (
          <div className="divide-y divide-[var(--color-ink)]/5">
            {conversations.map(conv => (
              <div key={conv.id} className="relative group">
                {renaming === conv.id ? (
                  <div className="p-4 flex gap-2">
                    <input autoFocus value={renameValue} onChange={e => setRenameValue(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') handleRename(conv.id); if (e.key === 'Escape') { setRenaming(null); setRenameValue('') } }} className="flex-1 font-serif italic text-sm border-2 border-[var(--color-ink)] px-3 py-1 outline-none" />
                    <button onClick={() => handleRename(conv.id)} className="bg-[var(--color-ink)] text-white px-2 uppercase font-mono text-[8px] font-black">SAVE</button>
                  </div>
                ) : (
                  <div onClick={() => onSelectConversation(conv)} role="button" tabIndex={0} onKeyDown={e => e.key === 'Enter' && onSelectConversation(conv)} className={`w-full text-left px-6 py-5 transition-all cursor-pointer border-l-4 ${currentConversationId === conv.id ? 'bg-[var(--color-gold)]/5 border-[var(--color-gold)]' : 'border-transparent hover:bg-[var(--color-cream)] hover:border-[var(--color-ink)]/20'}`}>
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <p className={`font-serif italic text-sm truncate ${currentConversationId === conv.id ? 'font-black text-[var(--color-ink)]' : 'text-[var(--color-muted)]'}`}>{conv.title}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="font-mono text-[8px] font-black text-[var(--color-gold)] uppercase tracking-widest">{timeAgo(conv.updated_at)}</span>
                          <span className="w-1 h-1 rounded-full bg-[var(--color-ink)]/10" />
                          <span className="font-mono text-[8px] font-black text-[var(--color-muted)] uppercase truncate tracking-widest">{conv.topic || 'GENERAL'}</span>
                        </div>
                      </div>
                      <button onClick={e => { e.stopPropagation(); setMenuOpen(menuOpen === conv.id ? null : conv.id) }} className="opacity-0 group-hover:opacity-100 font-mono text-[10px] text-[var(--color-muted)] hover:text-black">•••</button>
                    </div>
                  </div>
                )}

                {menuOpen === conv.id && (
                  <div className="absolute right-6 top-12 z-50 bg-white border-2 border-[var(--color-ink)] shadow-[8px_8px_0_var(--color-cream)] overflow-hidden w-40">
                    <button onClick={() => { setRenaming(conv.id); setRenameValue(conv.title); setMenuOpen(null) }} className="w-full text-left px-4 py-3 font-mono text-[9px] font-black uppercase tracking-widest hover:bg-[var(--color-cream)] border-b border-[var(--color-ink)]/5">RENAME_LOG</button>
                    <button onClick={() => { onSelectConversation(conv); setMenuOpen(null) }} className="w-full text-left px-4 py-3 font-mono text-[9px] font-black uppercase tracking-widest hover:bg-[var(--color-cream)] border-b border-[var(--color-ink)]/5">OPEN_CONDUIT</button>
                    <button onClick={() => handleDelete(conv.id)} className="w-full text-left px-4 py-3 font-mono text-[9px] font-black uppercase tracking-widest text-red-500 hover:bg-red-50">PURGE_DATA</button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="shrink-0 p-6 bg-[var(--color-paper)] border-t border-[var(--color-ink)]/10">
        <button onClick={handleNew} className="w-full bg-[var(--color-ink)] text-white py-4 font-mono text-[9px] font-black uppercase tracking-[0.3em] hover:bg-black transition-all">INITIALIZE_CHAT_➔</button>
      </div>
    </div>
  )
}

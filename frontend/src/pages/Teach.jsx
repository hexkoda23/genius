import { useState, useEffect } from 'react'
import TopicSidebar from '../components/teach/TopicSidebar'
import ChatWindow from '../components/teach/ChatWindow'
import ConversationSidebar from '../components/teach/ConversationSidebar'
import { useAuth } from '../context/AuthContext'
import { createConversation } from '../lib/conversations'
import { supabase } from '../lib/supabase'
import { useReveal } from '../hooks/useReveal'

export default function Teach() {
  const { user, profile, updateProfile } = useAuth(); const revealRef = useReveal()
  const [selectedTopic, setSelectedTopic] = useState(null)
  const [selectedLevel, setSelectedLevel] = useState(() => { try { return localStorage.getItem('mathgenius_teach_level') || 'secondary' } catch { return 'secondary' } })
  const [currentConversation, setCurrentConversation] = useState(null); const [convRefreshKey, setConvRefreshKey] = useState(0)

  useEffect(() => {
    try { localStorage.setItem('mathgenius_teach_level', selectedLevel) } catch { }
    if (profile && profile.level !== selectedLevel) { updateProfile({ level: selectedLevel }).catch(() => { }) }
  }, [selectedLevel])

  useEffect(() => {
    if (!user) return
    supabase.from('conversations').select('*').eq('user_id', user.id).eq('is_deleted', false).order('updated_at', { ascending: false }).limit(1).single()
      .then(({ data }) => { if (data) { setCurrentConversation(data); if (data.topic) setSelectedTopic(data.topic) } })
  }, [user?.id])

  const handleTopicSelect = async (topic) => {
    setSelectedTopic(topic)
    if (user) { const { data } = await createConversation(user.id, topic, selectedLevel); if (data) setCurrentConversation(data) }
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  return (
    <div className="max-w-[1440px] mx-auto px-6 md:px-12 py-12 bg-[var(--color-paper)] min-h-screen relative" ref={revealRef}>
      <div className="grain pointer-events-none" />

      <div className="mb-24 flex flex-col md:flex-row items-end justify-between gap-12 relative z-10 border-b-4 border-[var(--color-ink)] pb-12">
        <div className="max-w-4xl">
          <p className="eyebrow">NEURAL_TUTOR_v9.2_AURORA</p>
          <h1 className="font-serif font-black text-7xl md:text-[10rem] tracking-tighter uppercase leading-[0.8] italic">
            AI <br /><span className="text-[var(--color-gold)] not-italic">TUTOR.</span>
          </h1>
        </div>
        <div className="max-w-md border-l-4 border-[var(--color-gold)] pl-8">
          <p className="font-serif italic text-2xl text-[var(--color-muted)] uppercase tracking-tighter leading-none mb-4">Personalized guidance across topics.</p>
          <p className="font-mono text-[8px] uppercase tracking-widest text-[var(--color-muted)] font-black">Select a topic and level to begin a session with Euler.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[320px_1fr_320px] gap-12 items-start relative z-10">
        <div className="space-y-8">
          <div className="border-4 border-[var(--color-ink)] bg-white shadow-[12px_12px_0_var(--color-cream)] sticky top-32">
            <div className="bg-[var(--color-ink)] px-6 py-3">
              <p className="font-mono text-[8px] font-black uppercase tracking-widest text-white/40">TOPIC_ARCHIVE</p>
            </div>
            <div className="p-6">
              <TopicSidebar selectedTopic={selectedTopic} selectedLevel={selectedLevel} onTopicSelect={handleTopicSelect} onLevelChange={(lvl) => { setSelectedLevel(lvl); setSelectedTopic(null) }} />
            </div>
          </div>
        </div>

        <div className="min-h-[800px]">
          <ChatWindow key={currentConversation?.id} topic={selectedTopic} level={selectedLevel} conversation={currentConversation} onConversationUpdate={() => setConvRefreshKey(k => k + 1)} />
        </div>

        <div className="lg:sticky lg:top-32 h-[calc(100vh-160px)] overflow-y-auto no-scrollbar">
          {user && <ConversationSidebar key={convRefreshKey} currentConversationId={currentConversation?.id} onSelectConversation={(c) => { setCurrentConversation(c); if (c.topic) setSelectedTopic(c.topic) }} onNewConversation={(c) => setCurrentConversation(c)} topic={selectedTopic} level={selectedLevel} />}
        </div>
      </div>
    </div>
  )
}

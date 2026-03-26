import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'
import { xpProgress } from '../lib/stats'
import { useReveal } from '../hooks/useReveal'

function randomCode(len = 6) {
    const chars = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'
    return Array.from({ length: len }, () => chars[Math.floor(Math.random() * chars.length)]).join('')
}

function MemberRow({ member, rank, isMe }) {
    const { level } = xpProgress(member.xp || 0)
    const rankColors = { 1: 'text-[var(--color-gold)]', 2: 'text-gray-400', 3: 'text-orange-400' }
    const rankColor = rankColors[rank] || 'text-[var(--color-muted)]'
    const rankIcon = rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : `#${rank}`

    return (
        <div className={`flex items-center gap-6 px-8 py-6 transition-all ${isMe ? 'bg-[var(--color-cream)] border-l-8 border-[var(--color-gold)]' : 'hover:bg-[var(--color-paper)] border-l-8 border-transparent'}`}>
            <span className={`w-12 text-center font-mono font-black text-xs ${rankColor} tracking-widest`}>{rankIcon}</span>
            <div className="w-12 h-12 border-2 border-[var(--color-ink)] bg-white flex items-center justify-center font-serif font-black text-[var(--color-ink)] text-lg shrink-0 shadow-[4px_4px_0_var(--color-ink)]">
                {(member.full_name || 'S')[0].toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
                <p className="font-serif font-black text-xl uppercase tracking-tighter text-[var(--color-ink)] truncate">
                    {member.full_name || 'Student'}
                    {isMe && <span className="ml-4 font-mono text-[9px] text-[var(--color-gold)] border border-[var(--color-gold)] px-2 py-0.5">YOU</span>}
                </p>
                <p className="font-mono text-[9px] font-black uppercase text-[var(--color-muted)] tracking-widest mt-1">LVL_{level} // {member.streak_current || 0}_STREAK</p>
            </div>
            <div className="text-right shrink-0">
                <p className="font-serif font-black text-2xl italic text-[var(--color-ink)] leading-none uppercase tracking-tighter">{(member.xp || 0).toLocaleString()}</p>
                <p className="font-mono text-[9px] font-black uppercase text-[var(--color-muted)] tracking-[0.2em] mt-1">XP_ACCUMULATED</p>
            </div>
        </div>
    )
}

function GroupView({ group, userId, onLeave }) {
    const [members, setMembers] = useState([]); const [loading, setLoading] = useState(true); const [copied, setCopied] = useState(false)
    useEffect(() => { loadMembers() }, [group.id])
    const loadMembers = async () => {
        setLoading(true); const { data: memberRows } = await supabase.from('group_members').select('user_id, joined_at').eq('group_id', group.id)
        if (!memberRows?.length) { setLoading(false); return }
        const ids = memberRows.map(m => m.user_id)
        const [{ data: profiles }, { data: statsRows }] = await Promise.all([supabase.from('profiles').select('id, full_name').in('id', ids), supabase.from('user_stats').select('user_id, xp, streak_current').in('user_id', ids)])
        const statsMap = Object.fromEntries((statsRows || []).map(s => [s.user_id, s])); const profileMap = Object.fromEntries((profiles || []).map(p => [p.id, p]))
        const combined = ids.map(id => ({ user_id: id, full_name: profileMap[id]?.full_name, xp: statsMap[id]?.xp || 0, streak_current: statsMap[id]?.streak_current || 0 }))
        combined.sort((a, b) => b.xp - a.xp); setMembers(combined); setLoading(false)
    }
    const copyCode = () => { navigator.clipboard.writeText(group.code); setCopied(true); setTimeout(() => setCopied(false), 2000) }
    const leave = async () => { if (!window.confirm('LEAVE_COLLECTIVE?')) return; await supabase.from('group_members').delete().eq('group_id', group.id).eq('user_id', userId); onLeave() }

    return (
        <div className="space-y-12">
            <div className="border-4 border-[var(--color-ink)] bg-white shadow-[32px_32px_0_var(--color-cream)] overflow-hidden">
                <div className="bg-[var(--color-ink)] px-12 py-8 flex flex-col md:flex-row items-center justify-between gap-8">
                    <div>
                        <p className="eyebrow mb-4 opacity-40">ACTIVE_COLLECTIVE_v4.2</p>
                        <h2 className="font-serif font-black text-white text-5xl uppercase italic tracking-tighter leading-none">{group.name}</h2>
                        <p className="font-mono text-[9px] font-black uppercase text-[var(--color-gold)] tracking-[0.4em] mt-4">{members.length}_SYNCHRONIZED_NODES</p>
                    </div>
                    <div className="text-center md:text-right border-4 border-white/10 p-6">
                        <p className="font-mono text-[9px] text-white/40 uppercase mb-4 tracking-widest">JOIN_PROTOCOL_KEY</p>
                        <button onClick={copyCode} className="font-serif font-black text-4xl text-white hover:text-[var(--color-gold)] transition-colors uppercase tracking-widest">{group.code}</button>
                        {copied && <p className="font-mono text-[9px] text-[var(--color-teal)] mt-2 uppercase tracking-widest animate-pulse">KEY_COPIED_TO_CLIPBOARD</p>}
                    </div>
                </div>
                <div className="bg-[var(--color-paper)] px-12 py-4 flex justify-between items-center border-t-4 border-[var(--color-ink)]">
                    <button onClick={loadMembers} className="font-mono text-[9px] font-black uppercase text-[var(--color-teal)] hover:opacity-50 transition-all">REFRESH_SYNC</button>
                    <button onClick={leave} className="font-mono text-[9px] font-black uppercase text-red-600 hover:opacity-50 transition-all underline">TERMINATE_ASSOCIATION</button>
                </div>
            </div>

            <div className="border-4 border-[var(--color-ink)] bg-white shadow-[48px_48px_0_var(--color-cream)] overflow-hidden">
                <div className="bg-[var(--color-ink)] px-12 py-4">
                    <p className="font-serif font-bold text-white uppercase italic text-lg tracking-widest">🏆 COLLECTIVE_LEADERBOARD</p>
                </div>
                <div className="divide-y-2 divide-[var(--color-ink)]/5">
                    {loading ? (
                        <div className="p-24 text-center animate-pulse"><p className="font-mono text-[10px] font-black text-[var(--color-teal)] uppercase tracking-widest">SYNCHRONIZING_MEMBER_STATS...</p></div>
                    ) : members.length === 0 ? (
                        <div className="p-24 text-center"><p className="font-serif italic text-2xl uppercase tracking-tighter text-[var(--color-muted)]">NO_NODES_FOUND. DISTRIBUTE_KEY_FOR_UPLINK.</p></div>
                    ) : members.map((m, i) => (
                        <MemberRow key={m.user_id} member={m} rank={i + 1} isMe={m.user_id === userId} />
                    ))}
                </div>
            </div>
        </div>
    )
}

export default function Groups() {
    const { user } = useAuth(); const revealRef = useReveal()
    const [myGroups, setMyGroups] = useState([]); const [active, setActive] = useState(null); const [view, setView] = useState('list')
    const [newName, setNewName] = useState(''); const [creating, setCreating] = useState(false)
    const [joinCode, setJoinCode] = useState(''); const [joining, setJoining] = useState(false); const [joinError, setJoinError] = useState(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => { if (user) load() }, [user])
    const load = async () => { setLoading(true); const { data } = await supabase.from('group_members').select('group_id, study_groups(id, name, code, created_by)').eq('user_id', user.id); setMyGroups((data || []).map(r => r.study_groups).filter(Boolean)); setLoading(false) }
    const handleCreate = async () => {
        if (!newName.trim() || creating) return; setCreating(true); const code = randomCode()
        const { data: g, error } = await supabase.from('study_groups').insert({ name: newName.trim(), code, created_by: user.id }).select().single()
        if (!error && g) { await supabase.from('group_members').insert({ group_id: g.id, user_id: user.id }); setNewName(''); setView('list'); await load(); setActive(g) }
        setCreating(false)
    }
    const handleJoin = async () => {
        if (!joinCode.trim() || joining) return; setJoining(true); setJoinError(null)
        const { data: groups } = await supabase.from('study_groups').select('*').eq('code', joinCode.trim().toUpperCase())
        if (!groups?.length) { setJoinError('PROTOCOL_KEY_V.404'); setJoining(false); return }
        const g = groups[0]; await supabase.from('group_members').upsert({ group_id: g.id, user_id: user.id }, { onConflict: 'group_id,user_id', ignoreDuplicates: true })
        setJoinCode(''); setView('list'); await load(); setActive(g); setJoining(false)
    }

    return (
        <div className="max-w-[1440px] mx-auto px-6 md:px-12 py-12 bg-[var(--color-paper)] min-h-screen relative" ref={revealRef}>
            <div className="grain pointer-events-none" />

            <div className="mb-24 flex flex-col md:flex-row items-end justify-between gap-12 relative z-10">
                <div className="max-w-4xl">
                    <p className="eyebrow">SOVEREIGN_COLLECTIVE_ARCHIVE</p>
                    <h1 className="font-serif font-black text-7xl md:text-[10rem] tracking-tighter uppercase leading-[0.8] italic">
                        STUDY <br /><span className="text-[var(--color-gold)] not-italic">GROUPS.</span>
                    </h1>
                    <p className="font-serif italic text-2xl text-[var(--color-muted)] mt-12 border-l-4 border-[var(--color-gold)] pl-8 max-w-xl uppercase tracking-tighter">Synchronized learning environments for elite mathematical collaboration and competitive progress.</p>
                </div>
                <div className="flex gap-4">
                    <button onClick={() => { setView('create'); setActive(null) }} className="bg-[var(--color-ink)] text-white px-12 py-6 font-serif font-black text-2xl uppercase tracking-tighter italic hover:bg-black transition-all shadow-[12px_12px_0_var(--color-gold)]">INITIALIZE_CELL ➔</button>
                    <button onClick={() => { setView('join'); setActive(null) }} className="border-4 border-[var(--color-ink)] px-12 py-6 font-serif font-black text-2xl uppercase tracking-tighter italic hover:bg-[var(--color-cream)] transition-all">JOIN_CELL ➔</button>
                </div>
            </div>

            {view === 'create' && (
                <div className="max-w-4xl mx-auto border-4 border-[var(--color-ink)] bg-white p-16 shadow-[48px_48px_0_var(--color-cream)] relative z-10 mb-24">
                    <p className="eyebrow mb-12">CREATE_CELL_PROTOCOL</p>
                    <input type="text" value={newName} onChange={e => setNewName(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleCreate()} placeholder="SPECIFY_COLLECTIVE_NAME... (E.G_JAMB_2026_ELITE)" className="w-full bg-[var(--color-paper)] border-4 border-[var(--color-ink)] p-8 font-serif font-black text-3xl italic placeholder:opacity-10 uppercase tracking-tighter outline-none focus:bg-white transition-all mb-12 shadow-[12px_12px_0_var(--color-cream)]" />
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <button onClick={handleCreate} disabled={!newName.trim() || creating} className="bg-[var(--color-ink)] text-white py-10 font-serif font-black text-3xl uppercase tracking-tighter italic hover:bg-black transition-all shadow-[12px_12px_0_var(--color-gold)] disabled:opacity-20">{creating ? 'PROVISIONING...' : 'COMMIT_CREATION ➔'}</button>
                        <button onClick={() => setView('list')} className="border-4 border-[var(--color-ink)] py-10 font-serif font-black text-3xl uppercase tracking-tighter italic hover:opacity-50 transition-all font-mono opacity-20">CANCEL</button>
                    </div>
                </div>
            )}

            {view === 'join' && (
                <div className="max-w-4xl mx-auto border-4 border-[var(--color-ink)] bg-[var(--color-ink)] p-16 shadow-[48px_48px_0_var(--color-cream)] relative z-10 mb-24">
                    <p className="eyebrow text-white/40 mb-12">UPLINK_PROTOCOL_KEY_REQUEST</p>
                    <input type="text" value={joinCode} onChange={e => setJoinCode(e.target.value.toUpperCase())} onKeyDown={e => e.key === 'Enter' && handleJoin()} placeholder="INPUT_6-DIGIT_KEY..." maxLength={6} className="w-full bg-white border-4 border-[var(--color-ink)] p-12 font-serif font-black text-6xl text-center italic placeholder:opacity-10 uppercase tracking-[0.5em] outline-none focus:bg-[var(--color-cream)] transition-all mb-12" />
                    {joinError && <p className="font-mono text-xs font-black uppercase text-red-500 mb-8 tracking-widest text-center">{joinError}</p>}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <button onClick={handleJoin} disabled={joinCode.length < 6 || joining} className="bg-[var(--color-gold)] text-white py-10 font-serif font-black text-3xl uppercase tracking-tighter italic hover:bg-amber-600 transition-all shadow-[12px_12px_0_black] disabled:opacity-20">{joining ? 'JOINING...' : 'EXECUTE_UPLINK ➔'}</button>
                        <button onClick={() => setView('list')} className="border-4 border-white/20 text-white/40 py-10 font-serif font-black text-3xl uppercase tracking-tighter italic hover:opacity-50 transition-all font-mono">CANCEL</button>
                    </div>
                </div>
            )}

            <div className="relative z-10">
                {active ? (
                    <div className="max-w-6xl mx-auto">
                        <button onClick={() => setActive(null)} className="font-mono text-[9px] font-black uppercase text-[var(--color-gold)] hover:opacity-50 transition-all mb-12 flex items-center gap-4"><span>❴</span> RETURN_TO_COLLECTIVE_INDEX <span>❵</span></button>
                        <GroupView group={active} userId={user.id} onLeave={() => { setActive(null); load() }} />
                    </div>
                ) : (
                    <div className="max-w-6xl mx-auto">
                        {loading ? (
                            <div className="h-96 flex items-center justify-center animate-pulse"><p className="font-mono text-[10px] font-black text-[var(--color-teal)] uppercase tracking-widest">SCANNING_COLLECTIVE_UPLINKS...</p></div>
                        ) : myGroups.length === 0 ? (
                            <div className="border-8 border-dashed border-[var(--color-ink)]/10 p-48 text-center">
                                <p className="font-serif italic font-black text-7xl opacity-10 uppercase tracking-tighter leading-none mb-12">ORPHANED_PROTOCOL.</p>
                                <p className="font-mono text-[10px] uppercase tracking-[0.4em] text-[var(--color-muted)] mb-24">NO_ACTIVE_COLLECTIVES_DETECTED_IN_YOUR_PERIMETER.</p>
                                <div className="flex gap-8 justify-center">
                                    <button onClick={() => setView('create')} className="bg-[var(--color-ink)] text-white px-12 py-8 font-serif font-black text-2xl uppercase tracking-tighter italic hover:bg-black transition-all shadow-[12px_12px_0_var(--color-gold)]">INITIALIZE_NEW_CELL</button>
                                    <button onClick={() => setView('join')} className="border-4 border-[var(--color-ink)] px-12 py-8 font-serif font-black text-2xl uppercase tracking-tighter italic hover:bg-[var(--color-cream)] transition-all">JOIN_EXTERNAL_CELL</button>
                                </div>
                            </div>
                        ) : (
                            <div className="space-y-12">
                                <p className="font-mono text-[10px] font-black uppercase tracking-[0.8em] text-[var(--color-gold)] mb-12">MY_COLLECTIVES // {myGroups.length}_NODES</p>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                                    {myGroups.map(g => (
                                        <button key={g.id} onClick={() => setActive(g)} className="border-4 border-[var(--color-ink)] bg-white p-12 text-left hover:shadow-[24px_24px_0_var(--color-cream)] transition-all group overflow-hidden relative">
                                            <div className="absolute top-0 right-0 p-4 border-l-2 border-b-2 border-[var(--color-ink)] font-mono text-[8px] font-black group-hover:bg-[var(--color-gold)] group-hover:text-white transition-all">KEY_{g.code}</div>
                                            <p className="font-serif font-black text-4xl uppercase italic leading-none tracking-tighter mb-4 group-hover:text-[var(--color-teal)] transition-all">{g.name}</p>
                                            <p className="font-mono text-[9px] font-black uppercase text-[var(--color-muted)] tracking-widest">ENTER_COLLECTIVE_INTERFACE ➔</p>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    )
}

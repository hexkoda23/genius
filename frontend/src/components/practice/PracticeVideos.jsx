import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'

export function VideoCard({ video, compact = false }) {
    const [playing, setPlaying] = useState(false)
    const thumb = `https://img.youtube.com/vi/${video.youtube_id}/mqdefault.jpg`

    const handlePlay = () => {
        setPlaying(true)
        supabase.rpc('increment_video_views', { video_id: video.id }).catch(() => { })
    }

    if (playing) {
        return (
            <div className="border-2 border-[var(--color-ink)] bg-white overflow-hidden">
                <div className="relative aspect-video">
                    <iframe className="absolute inset-0 w-full h-full" src={`https://www.youtube.com/embed/${video.youtube_id}?autoplay=1`} title={video.title} allow="autoplay; encrypted-media" allowFullScreen />
                </div>
                <div className="p-4 bg-[var(--color-ink)] text-white">
                    <p className="font-mono text-[9px] uppercase tracking-widest opacity-40">PLAYER_ACTIVE</p>
                    <p className="font-serif italic text-sm mt-1">{video.title}</p>
                </div>
            </div>
        )
    }

    return (
        <button onClick={handlePlay} className="group border-2 border-[var(--color-ink)] bg-white overflow-hidden text-left hover:shadow-[8px_8px_0_var(--color-gold)] transition-all">
            <div className="relative aspect-video bg-black overflow-hidden">
                <img src={thumb} alt={video.title} className="w-full h-full object-cover grayscale opacity-60 group-hover:opacity-100 group-hover:grayscale-0 transition-all scale-105 group-hover:scale-110" />
                <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-14 h-14 border-2 border-white/40 flex items-center justify-center group-hover:bg-white group-hover:border-white transition-all transform rotate-45 text-black">
                        <div className="w-0 h-0 border-t-[8px] border-t-transparent border-l-[12px] border-l-black border-b-[8px] border-b-transparent -rotate-45 ml-1"></div>
                    </div>
                </div>
            </div>
            <div className="p-4 space-y-2">
                <div className="flex items-center justify-between">
                    <p className="font-mono text-[8px] uppercase tracking-widest text-[var(--color-gold)] font-bold">{video.channel || 'EULER_COLLECTIVE'}</p>
                    {video.duration_mins && <span className="font-mono text-[9px] text-[var(--color-muted)]">{video.duration_mins}m</span>}
                </div>
                <p className="font-serif font-black text-sm text-[var(--color-ink)] leading-tight">{video.title}</p>
            </div>
        </button>
    )
}

export function VideoBrowser({ topicsByLevel, selectedLevel }) {
    const [allVideos, setAllVideos] = useState([]); const [loading, setLoading] = useState(true); const [search, setSearch] = useState('')
    const lvl = selectedLevel === 'secondary' ? 'sss' : (selectedLevel || 'sss')

    useEffect(() => {
        setLoading(true);
        supabase.from('topic_videos').select('*').eq('level', lvl).then(({ data }) => {
            setAllVideos(data || []);
            setLoading(false)
        })
    }, [lvl])

    const filtered = allVideos.filter(v => !search || v.title.toLowerCase().includes(search.toLowerCase()) || v.topic.toLowerCase().includes(search.toLowerCase()))

    return (
        <div className="space-y-12">
            <div className="relative border-2 border-[var(--color-ink)] bg-white">
                <input value={search} onChange={e => setSearch(e.target.value)} placeholder="SCAN_ARCHIVE_FOR_LECTURES..." className="w-full p-6 font-mono text-sm outline-none" />
            </div>
            {loading ? <div className="p-24 text-center font-mono text-xs animate-pulse">RECALLING_VIDEO_DATA...</div> : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {filtered.map(v => <VideoCard key={v.id} video={v} />)}
                </div>
            )}
        </div>
    )
}

export function VideoPanel({ topic, level }) {
    const [videos, setVideos] = useState([]); const [loading, setLoading] = useState(true); const [open, setOpen] = useState(false)
    const normalised = level === 'secondary' ? 'sss' : level

    useEffect(() => {
        supabase.from('topic_videos').select('*').ilike('topic', topic).eq('level', normalised).limit(3).then(({ data }) => {
            setVideos(data || []); setLoading(false)
        })
    }, [topic, normalised])

    if (loading || videos.length === 0) return null

    return (
        <div className="border-2 border-[var(--color-ink)] overflow-hidden">
            <button onClick={() => setOpen(!open)} className="w-full flex items-center justify-between px-6 py-4 bg-[var(--color-cream)] hover:bg-[var(--color-gold)] transition-colors group">
                <div className="flex items-center gap-3">
                    <span className="text-xl">📺</span>
                    <div className="text-left">
                        <p className="font-serif font-black text-sm uppercase tracking-tighter group-hover:text-black">Video_Assistance_Protocol</p>
                        <p className="font-mono text-[9px] uppercase tracking-widest opacity-60 group-hover:opacity-100">{videos.length} Lectures Found</p>
                    </div>
                </div>
                <span className={`font-mono text-xs transition-transform ${open ? 'rotate-180' : ''}`}>▼</span>
            </button>
            {open && (
                <div className="bg-white p-6 grid grid-cols-1 gap-4">
                    {videos.map(v => <VideoCard key={v.id} video={v} compact />)}
                </div>
            )}
        </div>
    )
}

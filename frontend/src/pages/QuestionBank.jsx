import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { searchPastQuestions, getPastQuestionMeta, getPastQuestionTopics } from '../services/api'
import { ExplanationBody } from '../utils/RenderMath'
import { useReveal } from '../hooks/useReveal'

const EXAM_THEMES = {
  WAEC: { border: 'border-green-600', text: 'text-green-600', label: 'WAEC_COORD' },
  JAMB: { border: 'border-blue-600', text: 'text-blue-600', label: 'JAMB_UTME' },
  NECO: { border: 'border-purple-600', text: 'text-purple-600', label: 'NECO_UPLINK' },
  BECE: { border: 'border-orange-600', text: 'text-orange-600', label: 'BECE_JUNIOR' },
  NABTEB: { border: 'border-pink-600', text: 'text-pink-600', label: 'NABTEB_TECH' },
  OTHER: { border: 'border-gray-600', text: 'text-gray-600', label: 'GEN_ARCHIVE' },
}

function OptionRow({ option, answer, revealed }) {
  const letter = option.trim()[0]; const isCorrect = answer && letter === answer.trim()[0]
  let border = 'border-[var(--color-ink)]'; let bg = 'bg-white'; let textColor = 'text-[var(--color-ink)]'
  if (revealed && isCorrect) { border = 'border-green-600'; bg = 'bg-green-50'; textColor = 'text-green-800' }
  else if (revealed) { border = 'border-[var(--color-ink)]/10'; bg = 'bg-white'; textColor = 'opacity-30' }

  return (
    <div className={`flex items-start gap-4 px-6 py-3 border-2 transition-all ${border} ${bg} ${textColor}`}>
      <span className={`shrink-0 w-6 h-6 border-2 border-current flex items-center justify-center font-mono text-[10px] font-black ${revealed && isCorrect ? 'bg-green-600 text-white border-green-600' : ''}`}>{letter}</span>
      <span className="font-serif italic text-lg leading-tight flex-1 uppercase tracking-tight">{option.slice(2).trim()}</span>
    </div>
  )
}

function QuestionCard({ q, onPractice }) {
  const [revealed, setRevealed] = useState(false); const [expanded, setExpanded] = useState(false)
  const theme = EXAM_THEMES[q.exam] || EXAM_THEMES.OTHER

  return (
    <div className="border-4 border-[var(--color-ink)] bg-white shadow-[24px_24px_0_var(--color-cream)] relative overflow-hidden transition-all hover:shadow-none group">
      <div className="bg-[var(--color-ink)] px-8 py-3 flex items-center justify-between">
        <p className="font-mono text-[9px] font-black uppercase text-white/40 tracking-[0.4em]">{theme.label} // {q.year} // Q{q.question_number}</p>
        <p className={`font-mono text-[9px] font-black uppercase tracking-[0.2em] ${theme.text}`}>{q.topic || 'GEN_CALCULUS'}</p>
      </div>
      <div className="p-12 md:p-16 border-b-4 border-[var(--color-ink)]/5">
        <p className={`font-serif italic text-3xl md:text-4xl uppercase tracking-tighter leading-tight text-[var(--color-ink)] ${!expanded && q.body.length > 400 ? 'line-clamp-4' : ''}`}>{q.body}</p>
        {q.body.length > 400 && <button onClick={() => setExpanded(e => !e)} className="font-mono text-[9px] font-black uppercase text-[var(--color-gold)] mt-8 underline">{expanded ? 'COLLAPSE_STREAM' : 'EXPAND_FULL_NODE'}</button>}
        {q.options && q.options.length > 0 && (
          <div className="mt-12 space-y-4">
            {q.options.map((opt, i) => <OptionRow key={i} option={opt} answer={q.answer} revealed={revealed} />)}
          </div>
        )}
        {revealed && q.question_type === 'theory' && q.answer && (
          <div className="mt-12 p-8 border-4 border-dashed border-[var(--color-ink)]/10 bg-[var(--color-paper)]">
            <p className="eyebrow mb-8">RESOLUTION_STRATEGY</p>
            <div className="font-serif italic text-2xl uppercase tracking-tight leading-relaxed"><ExplanationBody text={q.answer} /></div>
          </div>
        )}
      </div>
      <div className="p-8 flex items-center justify-between gap-4">
        <div className="flex gap-4">
          {q.answer && <button onClick={() => setRevealed(r => !r)} className={`px-8 py-4 border-4 font-mono text-[9px] font-black uppercase transition-all shadow-[8px_8px_0_var(--color-cream)] ${revealed ? 'bg-green-600 text-white border-green-600' : 'border-[var(--color-ink)] hover:bg-[var(--color-cream)]'}`}>{revealed ? 'HIDE_RESOLUTION' : 'REVEAL_RESOLUTION'}</button>}
        </div>
        <button onClick={() => onPractice(q)} className="bg-[var(--color-ink)] text-white px-8 py-4 font-serif font-black text-xl uppercase tracking-tighter italic hover:bg-black transition-all shadow-[8px_8px_0_var(--color-gold)]">INITIALIZE_PRACTICE ➔</button>
      </div>
    </div>
  )
}

export default function QuestionBank() {
  const navigate = useNavigate(); const revealRef = useReveal()
  const [meta, setMeta] = useState(null); const [topics, setTopics] = useState([]); const [metaLoading, setMetaLoading] = useState(true)
  const [query, setQuery] = useState(''); const [filterExam, setFilterExam] = useState(''); const [filterYear, setFilterYear] = useState(''); const [filterTopic, setFilterTopic] = useState(''); const [filterLevel, setFilterLevel] = useState(''); const [filterType, setFilterType] = useState('')
  const [questions, setQuestions] = useState([]); const [total, setTotal] = useState(0); const [pages, setPages] = useState(1); const [page, setPage] = useState(1); const [loading, setLoading] = useState(false); const [searched, setSearched] = useState(false)

  useEffect(() => { loadMeta() }, [])
  const loadMeta = async () => {
    setMetaLoading(true); try { const [metaRes, topicsRes] = await Promise.all([getPastQuestionMeta(), getPastQuestionTopics()]); setMeta(metaRes.data); setTopics(topicsRes.data?.topics || []) } catch (e) { console.error(e) } finally { setMetaLoading(false) }
  }
  const doSearch = useCallback(async (pg = 1) => {
    setLoading(true); setSearched(true); try { const res = await searchPastQuestions({ query: query || null, exam: filterExam || null, year: filterYear ? parseInt(filterYear) : null, topic: filterTopic || null, level: filterLevel || null, question_type: filterType || null, page: pg, page_size: 20 }); const d = res.data; setQuestions(d.questions || []); setTotal(d.total || 0); setPages(d.pages || 1); setPage(pg) } catch (e) { console.error(e) } finally { setLoading(false) }
  }, [query, filterExam, filterYear, filterTopic, filterLevel, filterType])
  const handlePractice = (q) => { navigate(`/practice?topic=${encodeURIComponent(q.topic || q.subject)}&level=${q.level}&auto=false`) }
  const clearFilters = () => { setQuery(''); setFilterExam(''); setFilterYear(''); setFilterTopic(''); setFilterLevel(''); setFilterType(''); setQuestions([]); setSearched(false) }
  const hasFilters = query || filterExam || filterYear || filterTopic || filterLevel || filterType

  return (
    <div className="max-w-[1440px] mx-auto px-6 md:px-12 py-12 bg-[var(--color-paper)] min-h-screen relative" ref={revealRef}>
      <div className="grain pointer-events-none" />

      <div className="mb-24 flex flex-col md:flex-row items-end justify-between gap-12 relative z-10">
        <div className="max-w-4xl">
          <p className="eyebrow">UNIVERSAL_ARCHIVE_v9.2</p>
          <h1 className="font-serif font-black text-6xl md:text-[8rem] tracking-tighter uppercase leading-[0.8] italic">
            QUESTION <br /><span className="text-[var(--color-gold)] not-italic">BANK.</span>
          </h1>
          <p className="font-serif italic text-2xl text-[var(--color-muted)] mt-12 border-l-4 border-[var(--color-gold)] pl-8 max-w-xl uppercase tracking-tighter">A comprehensive, multi-sector repository of historical standardized examinations.</p>
        </div>
        {!metaLoading && meta && (
          <div className="flex gap-12 border-l-4 border-[var(--color-ink)] pl-8 shrink-0">
            {meta.exams?.slice(0, 3).map(e => (
              <div key={e.exam}>
                <p className="font-mono text-[9px] font-black uppercase text-[var(--color-muted)] mb-1">{e.exam}</p>
                <p className="font-serif font-black text-4xl italic text-[var(--color-teal)]">{e.count.toLocaleString()}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="border-4 border-[var(--color-ink)] bg-white p-12 md:p-16 shadow-[32px_32px_0_var(--color-cream)] mb-24 relative z-10">
        <p className="eyebrow mb-12">ARCHIVE_QUERY_SUITE</p>
        <div className="space-y-12">
          <div className="relative">
            <input type="text" value={query} onChange={e => setQuery(e.target.value)} onKeyDown={e => e.key === 'Enter' && doSearch(1)} placeholder="INPUT_SEARCH_PARAMETER... (E.G_CIRCLE_THEOREMS)" className="w-full bg-[var(--color-paper)] border-4 border-[var(--color-ink)] p-8 font-serif font-black text-3xl italic placeholder:opacity-10 uppercase tracking-tighter outline-none focus:bg-white transition-all shadow-[12px_12px_0_var(--color-cream)]" />
            <button onClick={() => doSearch(1)} className="absolute right-4 top-4 bg-[var(--color-ink)] text-white px-8 py-4 font-serif font-black text-xl italic uppercase tracking-tighter hover:bg-black transition-all">EXECUTE_SEARCH</button>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-8">
            {[{ label: 'EXAM', val: filterExam, set: setFilterExam, opts: meta?.exams?.map(e => e.exam) || [] }, { label: 'YEAR', val: filterYear, set: setFilterYear, opts: meta?.years?.map(y => y.year) || [] }, { label: 'TOPIC', val: filterTopic, set: setFilterTopic, opts: topics.map(t => t.topic) }, { label: 'LEVEL', val: filterLevel, set: setFilterLevel, opts: ['jss', 'sss', 'university'] }, { label: 'TYPE', val: filterType, set: setFilterType, opts: ['mcq', 'theory'] }].map(f => (
              <div key={f.label}>
                <p className="font-mono text-[9px] font-black uppercase text-[var(--color-gold)] mb-4 tracking-[0.4em]">{f.label}_FILTER</p>
                <select value={f.val} onChange={e => f.set(e.target.value)} className="w-full bg-[var(--color-paper)] border-4 border-[var(--color-ink)] p-4 font-serif font-black text-xl italic uppercase tracking-tighter outline-none focus:bg-white appearance-none cursor-pointer">
                  <option value="">{f.label}_ALL</option>
                  {f.opts.map(o => <option key={o} value={o}>{String(o).toUpperCase()}</option>)}
                </select>
              </div>
            ))}
          </div>
          <div className="flex items-center justify-between pt-8 border-t-2 border-[var(--color-ink)]/5">
            <button onClick={() => doSearch(1)} disabled={loading} className="bg-[var(--color-ink)] text-white px-12 py-6 font-serif font-black text-3xl uppercase tracking-tighter italic hover:bg-black transition-all shadow-[12px_12px_0_var(--color-gold)] disabled:opacity-20">{loading ? 'SCANNING_ARCHIVE...' : 'INITIALIZE_EXTRACTION ➔'}</button>
            {hasFilters && <button onClick={clearFilters} className="font-mono text-[10px] font-black uppercase text-[var(--color-muted)] hover:text-red-600 transition-all underline decoration-2">RESET_ALL_FILTERS</button>}
          </div>
        </div>
      </div>

      <div className="space-y-16 relative z-10 max-w-6xl mx-auto">
        {loading ? (
          <div className="h-96 flex items-center justify-center animate-pulse"><p className="font-mono text-[10px] font-black text-[var(--color-teal)] uppercase tracking-widest">EXTRACTING_DATA_STRAND...</p></div>
        ) : !searched ? (
          <div className="border-8 border-[var(--color-ink)]/10 p-32 text-center">
            <p className="font-serif italic font-black text-6xl opacity-10 uppercase tracking-tighter leading-none">ARCHIVE_IDLE. INPUT_QUERY_TO_ENGAGE.</p>
          </div>
        ) : questions.length === 0 ? (
          <div className="border-8 border-[var(--color-ink)]/10 p-32 text-center">
            <p className="font-serif italic font-black text-6xl opacity-10 uppercase tracking-tighter leading-none">STREAM_DATA_EMPTY.</p>
          </div>
        ) : (
          <div className="space-y-12">
            <p className="font-mono text-[10px] font-black uppercase tracking-widest text-[var(--color-gold)]">{total.toLocaleString()}_MATCHES_IN_VAULT</p>
            {questions.map(q => <QuestionCard key={q.id} q={q} onPractice={handlePractice} />)}
            {pages > 1 && (
              <div className="flex items-center justify-center gap-4 pt-12 border-t-4 border-[var(--color-ink)]">
                <button onClick={() => doSearch(page - 1)} disabled={page <= 1} className="px-8 py-4 border-4 border-[var(--color-ink)] font-mono text-[10px] font-black uppercase disabled:opacity-20 hover:bg-[var(--color-cream)]">PREV_BLOCK</button>
                <div className="flex gap-2">
                  {Array.from({ length: Math.min(5, pages) }, (_, i) => {
                    let pg = i + 1; if (pages > 5) { if (page > 3) pg = page - 2 + i; if (page > pages - 2) pg = pages - 4 + i }
                    return <button key={pg} onClick={() => doSearch(pg)} className={`w-12 h-12 border-4 font-mono text-[10px] font-black flex items-center justify-center transition-all ${pg === page ? 'bg-[var(--color-gold)] text-white border-[var(--color-gold)]' : 'border-[var(--color-ink)] hover:bg-[var(--color-cream)]'}`}>{pg}</button>
                  })}
                </div>
                <button onClick={() => doSearch(page + 1)} disabled={page >= pages} className="px-8 py-4 border-4 border-[var(--color-ink)] font-mono text-[10px] font-black uppercase disabled:opacity-20 hover:bg-[var(--color-cream)]">NEXT_BLOCK</button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

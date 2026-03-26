import { useState, useRef, useEffect } from "react";
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { getTheoryQuestions, getTheoryTopics, getTheoryYears, getMarkingScheme } from '../lib/theory'
import { askTutor } from '../services/api'
import { ExplanationBody } from '../utils/RenderMath'
import { useReveal } from '../hooks/useReveal'

const EXAM_TYPES = ['All', 'WAEC', 'NECO', 'BECE', 'NABTEB']
const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:8000";

function ChartVisual({ configJson }) {
  const canvasRef = useRef(null); const chartRef = useRef(null);
  useEffect(() => {
    if (!canvasRef.current) return; let config;
    try { config = typeof configJson === "string" ? JSON.parse(configJson) : configJson; } catch { return; }
    const loadChart = async () => {
      if (!window.Chart) {
        await new Promise((resolve, reject) => {
          const script = document.createElement("script"); script.src = "https://cdn.jsdelivr.net/npm/chart.js@4/dist/chart.umd.min.js";
          script.onload = resolve; script.onerror = reject; document.head.appendChild(script);
        });
      }
      if (chartRef.current) chartRef.current.destroy(); chartRef.current = new window.Chart(canvasRef.current, config);
    };
    loadChart().catch(console.error); return () => { if (chartRef.current) chartRef.current.destroy(); };
  }, [configJson]);
  return (
    <div className="my-12 max-w-2xl mx-auto border-4 border-[var(--color-ink)] p-8 bg-white shadow-[12px_12px_0_var(--color-cream)]">
      <p className="eyebrow mb-8 uppercase tracking-widest text-[var(--color-teal)]">GRAPH_DATA_VISUAL</p>
      <canvas ref={canvasRef} />
    </div>
  );
}

function SvgVisual({ content }) {
  return (
    <div className="my-12 border-4 border-[var(--color-ink)] p-8 bg-white shadow-[12px_12px_0_var(--color-cream)]">
      <p className="eyebrow mb-8 uppercase tracking-widest text-[var(--color-teal)]">GEOMETRY_DIAGRAM</p>
      <div className="flex justify-center" dangerouslySetInnerHTML={{ __html: content }} />
    </div>
  );
}

function TableVisual({ content }) {
  return (
    <div className="my-12 overflow-x-auto border-4 border-[var(--color-ink)] p-8 bg-white shadow-[12px_12px_0_var(--color-cream)]">
      <p className="eyebrow mb-8 uppercase tracking-widest text-[var(--color-teal)]">TABULAR_GRID</p>
      <div dangerouslySetInnerHTML={{ __html: content }} />
    </div>
  );
}

function ScrapedImage({ path }) {
  const url = path.startsWith('http') ? path : `${API_BASE}/images/${path.replace(/^images\//, "")}`;
  return (
    <div className="my-8 flex justify-center">
      <img src={url} alt="Solution diagram" className="max-w-full max-h-[500px] border-4 border-[var(--color-ink)] grayscale hover:grayscale-0 transition-all shadow-[16px_16px_0_var(--color-cream)]" onError={e => { e.target.style.display = "none"; }} />
    </div>
  );
}

export function QuestionCard({ q, index }) {
  const { user } = useAuth(); const [mode, setMode] = useState(null); const [answer, setAnswer] = useState(''); const [feedback, setFeedback] = useState(null); const [solution, setSolution] = useState(null); const [loading, setLoading] = useState(false);
  const callEuler = async (prompt) => { setLoading(true); try { const res = await askTutor(prompt, q.topic || 'Mathematics', 'secondary', [], user?.id); return res.data.response || res.data.answer || ''; } catch { return 'DECONSTRUCTION_FAILURE.'; } finally { setLoading(false); } };
  const handleSubmitAnswer = async () => {
    if (!answer.trim()) return;
    const prompt = q.marking_scheme ? `You are a WAEC/NECO mathematics examiner. QUESTION: ${q.question_text} OFFICIAL MARKING SCHEME: ${q.marking_scheme} STUDENT'S ANSWER: ${answer} Compare the student's answer to the official marking scheme and: 1. Give a SCORE out of 10 2. List what they got right 3. List what was missing or wrong 4. Show the complete official solution 5. Give an encouraging comment` : `You are a WAEC/NECO mathematics examiner. QUESTION: ${q.question_text} STUDENT'S ANSWER: ${answer} Please mark with: SCORE, WHAT YOU GOT RIGHT, WHAT WAS MISSING, COMPLETE SOLUTION, EXAMINER'S COMMENT`;
    const reply = await callEuler(prompt); setFeedback(reply);
  };
  const handleViewSolution = async () => {
    if (solution) return; setLoading(true); try {
      const scheme = await getMarkingScheme(q.id, q.exam_type); const controller = new AbortController(); const timeout = setTimeout(() => controller.abort(), 30000);
      const res = await fetch(`${API_BASE}/api/solution`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ question: q.question_text, question_images: q.image_url ? [q.image_url] : [], marking_scheme: scheme, answer_images: q.answer_images || [], exam_type: q.exam_type?.toLowerCase() || "waec", year: String(q.year || "") }), signal: controller.signal });
      clearTimeout(timeout); if (!res.ok) throw new Error(`HTTP ${res.status}`); const data = await res.json(); setSolution({ text: data.solution_text, visual: data.visual });
    } catch (err) { setSolution({ text: "GEN_FAILURE. FALLBACK_ACTIVE.", visual: null }); } finally { setLoading(false); }
  };
  const reset = () => { setMode(null); setAnswer(''); setFeedback(null); setSolution(null); };

  return (
    <div className="border-4 border-[var(--color-ink)] bg-white shadow-[24px_24px_0_var(--color-cream)] relative overflow-hidden transition-all hover:shadow-none group">
      <div className="bg-[var(--color-ink)] px-8 py-3 flex items-center justify-between">
        <p className="font-mono text-[9px] font-black uppercase text-white/40 tracking-[0.4em]">NODE_0{index + 1} // {q.exam_type} {q.year}</p>
        <p className="font-mono text-[9px] font-black uppercase text-[var(--color-gold)] tracking-[0.2em]">{q.topic || 'GENERAL'}</p>
      </div>
      <div className="p-12 md:p-16 border-b-4 border-[var(--color-ink)]/5">
        <div className="font-serif italic text-3xl md:text-4xl uppercase tracking-tighter leading-tight text-[var(--color-ink)] space-y-6">
          {q.question_text.split(/(?=\b(?:a|b|c|d|e|f|i{1,3}|iv|v)\.\s|\n)/i).map((part, i) => (
            part.trim() && <p key={i}>{part.trim()}</p>
          ))}
        </div>
        {q.image_url && <img src={q.image_url} alt="Question diagram" className="mt-12 max-w-full max-h-96 border-4 border-[var(--color-ink)] grayscale hover:grayscale-0 transition-all shadow-[12px_12px_0_var(--color-cream)] mx-auto" onError={e => { e.target.style.display = 'none'; }} />}
      </div>

      {!mode && (
        <div className="p-8 flex gap-4">
          <button onClick={() => setMode('attempt')} className="flex-1 bg-[var(--color-ink)] text-white py-6 font-serif font-black text-2xl uppercase tracking-tighter italic hover:bg-black transition-all">INITIALIZE_ATTEMPT ➔</button>
          <button onClick={() => { setMode('solution'); handleViewSolution(); }} className="flex-1 border-4 border-[var(--color-ink)] py-6 font-serif font-black text-2xl uppercase tracking-tighter italic hover:bg-[var(--color-cream)] transition-all">FULL_DECONSTRUCTION ➔</button>
        </div>
      )}

      {mode === 'attempt' && !feedback && (
        <div className="p-12 md:p-16 bg-[var(--color-paper)] border-t-4 border-[var(--color-ink)]">
          <p className="eyebrow mb-8">NODE_INPUT_STREAM</p>
          <textarea value={answer} onChange={e => setAnswer(e.target.value)} placeholder="PROVIDE_FULL_COGNITIVE_RESOLUTION_WITH_WORKINGS..." rows={8} className="w-full bg-white border-4 border-[var(--color-ink)] p-8 font-serif font-black text-2xl italic placeholder:opacity-10 uppercase tracking-tighter outline-none focus:bg-[var(--color-cream)] transition-all mb-8 shadow-inner" />
          <div className="flex gap-4">
            <button onClick={handleSubmitAnswer} disabled={!answer.trim() || loading} className="flex-1 bg-[var(--color-ink)] text-white py-8 font-serif font-black text-2xl uppercase tracking-tighter italic hover:bg-black transition-all disabled:opacity-20">{loading ? 'EULER_MARKING...' : 'COMMIT_FOR_EVALUATION ➔'}</button>
            <button onClick={reset} className="px-8 font-mono text-[9px] font-black uppercase text-[var(--color-muted)] border-4 border-transparent hover:border-[var(--color-ink)] transition-all">TERMINATE</button>
          </div>
        </div>
      )}

      {mode === 'attempt' && feedback && (
        <div className="p-12 md:p-16 border-t-4 border-[var(--color-ink)]">
          <div className="bg-white border-4 border-[var(--color-ink)] p-12 shadow-[16px_16px_0_var(--color-cream)] mb-12">
            <p className="eyebrow mb-12 tracking-widest text-[var(--color-gold)]">EULER_EVALUATION_HEURISTICS</p>
            <div className="font-serif italic text-2xl md:text-3xl uppercase tracking-tight leading-relaxed"><ExplanationBody text={feedback} /></div>
          </div>
          <button onClick={reset} className="w-full bg-[var(--color-ink)] text-white py-8 font-serif font-black text-2xl uppercase tracking-tighter italic hover:bg-black transition-all shadow-[8px_8px_0_var(--color-gold)]">NEW_NODE_INITIALIZE ➔</button>
        </div>
      )}

      {mode === 'solution' && (
        <div className="p-12 md:p-16 border-t-4 border-[var(--color-ink)] bg-[var(--color-paper)]">
          {loading ? (
            <div className="h-64 flex items-center justify-center animate-pulse"><p className="font-mono text-[10px] font-black text-[var(--color-teal)] uppercase tracking-widest">SYNTHESIZING_DECONSTRUCTION...</p></div>
          ) : solution ? (
            <div>
              <div className="bg-white border-4 border-[var(--color-ink)] p-12 shadow-[24px_24px_0_var(--color-cream)] mb-12">
                <p className="eyebrow mb-12 tracking-widest text-[var(--color-gold)]">SOVEREIGN_RESOLUTION_STRATEGY</p>
                {(q.answer_images || []).map((img, i) => <ScrapedImage key={i} path={img} />)}
                <div className="font-serif italic text-2xl md:text-3xl uppercase tracking-tight leading-relaxed"><ExplanationBody text={solution.text.replace(/```json[\s\S]*?```/g, '').replace(/"visual"\s*:\s*\{[\s\S]*?\}\s*}/g, '').trim()} /></div>
                {solution.visual?.type === "chartjs" && solution.visual.content && <ChartVisual configJson={solution.visual.content} />}
                {solution.visual?.type === "svg" && solution.visual.content && <SvgVisual content={solution.visual.content} />}
                {solution.visual?.type === "table" && solution.visual.content && <TableVisual content={solution.visual.content} />}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <button onClick={() => { reset(); setMode('attempt'); }} className="bg-[var(--color-ink)] text-white py-6 font-serif font-black text-xl uppercase tracking-tighter italic hover:bg-black transition-all">ENGAGE_DRILL ➔</button>
                <button onClick={() => { setSolution(null); handleViewSolution(); }} className="border-4 border-[var(--color-ink)] py-6 font-serif font-black text-xl uppercase tracking-tighter italic hover:bg-[var(--color-cream)] transition-all">REGEN_NODE</button>
                <button onClick={reset} className="border-4 border-[var(--color-ink)] py-6 font-serif font-black text-xl uppercase tracking-tighter italic hover:opacity-50 transition-all font-mono opacity-20">CLOSE</button>
              </div>
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}

export default function TheoryPractice() {
  const navigate = useNavigate(); const { user } = useAuth(); const revealRef = useReveal()
  const [examType, setExamType] = useState('WAEC'); const [topic, setTopic] = useState(''); const [year, setYear] = useState('')
  const [questions, setQuestions] = useState([]); const [topics, setTopics] = useState([]); const [years, setYears] = useState([])
  const [loading, setLoading] = useState(false); const [total, setTotal] = useState(0)

  useEffect(() => { loadFilters() }, [examType]); useEffect(() => { loadQuestions() }, [examType, topic, year])

  const loadFilters = async () => {
    const [t, y] = await Promise.all([getTheoryTopics(examType === 'All' ? null : examType), getTheoryYears(examType === 'All' ? null : examType)]);
    setTopics(t); setYears(y)
  }
  const loadQuestions = async () => {
    setLoading(true); const { data } = await getTheoryQuestions({ examType: examType === 'All' ? null : examType, topic: topic || null, year: year ? parseInt(year) : null, limit: 50 });
    setQuestions(data); setTotal(data.length); setLoading(false)
  }

  return (
    <div className="max-w-[1440px] mx-auto px-6 md:px-12 py-12 bg-[var(--color-paper)] min-h-screen relative" ref={revealRef}>
      <div className="grain pointer-events-none" />

      <div className="mb-24 flex flex-col md:flex-row items-end justify-between gap-12 relative z-10">
        <div className="max-w-4xl">
          <p className="eyebrow">ONTOLOGICAL_DRILL_v3.2</p>
          <h1 className="font-serif font-black text-6xl md:text-[8rem] tracking-tighter uppercase leading-[0.8] italic">
            THEORY <br /><span className="text-[var(--color-gold)] not-italic">PRACTICE.</span>
          </h1>
          <p className="font-serif italic text-2xl text-[var(--color-muted)] mt-12 border-l-4 border-[var(--color-gold)] pl-8 max-w-xl uppercase tracking-tighter">Deep-workspace for the resolution of theoretical mathematics protocols for WAEC, NECO & BECE.</p>
        </div>
      </div>

      <div className="border-4 border-[var(--color-ink)] bg-white p-12 md:p-16 shadow-[48px_48px_0_var(--color-cream)] mb-24 relative z-10">
        <p className="eyebrow mb-12">FILTER_PROTOCOL_PARAMS</p>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-16 items-start">
          <div>
            <p className="font-mono text-[9px] font-black uppercase text-[var(--color-gold)] mb-4 tracking-[0.4em]">EXAM_SECTOR</p>
            <div className="flex flex-wrap gap-2">
              {EXAM_TYPES.map(et => (
                <button key={et} onClick={() => { setExamType(et); setTopic(''); setYear('') }} className={`px-6 py-3 font-mono text-[9px] font-black uppercase border-2 transition-all ${examType === et ? 'bg-[var(--color-ink)] text-white border-[var(--color-ink)]' : 'border-[var(--color-ink)] hover:bg-[var(--color-cream)]'}`}>{et}</button>
              ))}
            </div>
          </div>
          <div>
            <p className="font-mono text-[9px] font-black uppercase text-[var(--color-gold)] mb-4 tracking-[0.4em]">NODE_TOPIC</p>
            <select value={topic} onChange={e => setTopic(e.target.value)} className="w-full bg-[var(--color-paper)] border-4 border-[var(--color-ink)] p-4 font-serif font-black text-xl italic uppercase tracking-tighter outline-none focus:bg-white appearance-none cursor-pointer">
              <option value="">ALL_DOMAINS</option>
              {topics.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div>
            <p className="font-mono text-[9px] font-black uppercase text-[var(--color-gold)] mb-4 tracking-[0.4em]">TEMPORAL_INDEX</p>
            <select value={year} onChange={e => setYear(e.target.value)} className="w-full bg-[var(--color-paper)] border-4 border-[var(--color-ink)] p-4 font-serif font-black text-xl italic uppercase tracking-tighter outline-none focus:bg-white appearance-none cursor-pointer">
              <option value="">ALL_YEARS</option>
              {years.map(y => <option key={y} value={y}>{y}_SESSION</option>)}
            </select>
          </div>
        </div>
      </div>

      <div className="space-y-16 relative z-10 max-w-6xl mx-auto">
        <div className="flex items-center justify-between border-b-4 border-[var(--color-ink)] pb-4">
          <p className="font-mono text-[10px] font-black uppercase tracking-widest text-[var(--color-muted)]">RESULTS_STREAM</p>
          <p className="font-mono text-[10px] font-black uppercase text-[var(--color-gold)] tracking-widest">{total}_NODES_DETECTED</p>
        </div>
        {loading ? (
          <div className="h-96 flex items-center justify-center animate-pulse"><p className="font-mono text-[10px] font-black text-[var(--color-teal)] uppercase tracking-widest">SYNCHRONIZING_PROBLEM_NODES...</p></div>
        ) : questions.length === 0 ? (
          <div className="border-8 border-[var(--color-ink)]/10 p-32 text-center">
            <p className="font-serif italic font-black text-6xl opacity-10 uppercase tracking-tighter leading-none">STREAM_DATA_EMPTY.</p>
          </div>
        ) : (
          <div className="space-y-12">
            {questions.map((q, i) => <QuestionCard key={q.id} q={q} index={i} />)}
          </div>
        )}
      </div>
    </div>
  )
}

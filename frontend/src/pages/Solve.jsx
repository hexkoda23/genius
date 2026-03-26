import { useState, useEffect, useRef, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { saveBookmark } from '../lib/bookmarks'
import { useReveal } from '../hooks/useReveal'

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000'

const MODES = [
  { id: 'solve', label: 'Solve', icon: '=', hint: 'Equations & expressions' },
  { id: 'differentiate', label: 'Derivative', icon: 'd/dx', hint: 'Find the derivative' },
  { id: 'integrate', label: 'Integral', icon: '∫', hint: 'Find the integral' },
]

const SYMBOL_GROUPS = [
  { label: 'Common', symbols: [{ display: '√', insert: 'sqrt(' }, { display: 'xⁿ', insert: '^' }, { display: 'π', insert: 'pi' }, { display: 'e', insert: 'e' }, { display: '|x|', insert: 'Abs(' }, { display: 'n!', insert: 'factorial(' }] },
  { label: 'Trig', symbols: [{ display: 'sin', insert: 'sin(' }, { display: 'cos', insert: 'cos(' }, { display: 'tan', insert: 'tan(' }, { display: 'sin⁻¹', insert: 'asin(' }, { display: 'cos⁻¹', insert: 'acos(' }, { display: 'tan⁻¹', insert: 'atan(' }] },
  { label: 'Calculus', symbols: [{ display: 'd/dx', insert: 'diff(' }, { display: '∫', insert: 'integrate(' }, { display: 'lim', insert: 'limit(' }] },
  { label: 'Greek', symbols: [{ display: 'α', insert: 'alpha' }, { display: 'β', insert: 'beta' }, { display: 'θ', insert: 'theta' }, { display: 'λ', insert: 'lambda' }, { display: 'σ', insert: 'sigma' }, { display: 'Σ', insert: 'Sum(' }] },
]

const EXAMPLES = [
  { expr: 'x^2 + 5*x + 6 = 0', label: 'Quadratic Equation' },
  { expr: 'sin(pi/6)', label: 'Exact Trig Value' },
  { expr: 'integrate(x^2, x)', label: 'Indefinite Integral' },
  { expr: 'diff(x^3, x)', label: 'First Derivative' },
]

async function callSolve(expression, mode) {
  const res = await fetch(`${API_BASE}/solve/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ expression, mode }),
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json()
}

async function streamSSE(url, body, onToken) {
  const { data: { session } } = await supabase.auth.getSession()
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
    },
    body: JSON.stringify(body),
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  const reader = res.body.getReader(); const decoder = new TextDecoder()
  let buffer = '', full = ''
  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })
    const lines = buffer.split('\n'); buffer = lines.pop()
    for (const line of lines) {
      if (!line.startsWith('data: ')) continue
      const payload = line.slice(6).trim(); if (payload === '[DONE]') return full
      try { const { token } = JSON.parse(payload); full += token; onToken(token) } catch { }
    }
  }
}

function extractAnswer(data) {
  if (!data) return null; if (data.error) return { error: data.error }
  const toArr = (v) => Array.isArray(v) ? v : (v ? [String(v)] : [])
  if (data.numerical !== undefined && data.numerical !== null) return { value: String(data.numerical), steps: toArr(data.steps), solutions: toArr(data.solutions) }
  if (data.result !== undefined && data.result !== null) return { value: String(data.result), steps: toArr(data.steps), solutions: toArr(data.solutions) }
  if (data.derivative !== undefined) return { value: String(data.derivative), steps: toArr(data.steps), solutions: [] }
  if (data.integral !== undefined) return { value: String(data.integral), steps: toArr(data.steps), solutions: [] }
  if (data.simplified !== undefined) return { value: String(data.simplified), steps: toArr(data.steps), solutions: [] }
  const skip = new Set(['steps', 'solutions', 'success', 'type', 'input', 'expression', 'latex'])
  for (const k of Object.keys(data)) { if (!skip.has(k) && data[k] !== null && data[k] !== undefined) return { value: String(data[k]), steps: toArr(data.steps), solutions: toArr(data.solutions) } }
  return { error: 'Computation failed. Check syntax.' }
}

function BookmarkButton({ userId, title, content, expression, result, topic, type }) {
  const [saved, setSaved] = useState(false); const [saving, setSaving] = useState(false)
  const handleSave = async () => {
    if (saved || saving || !userId) return; setSaving(true)
    try { await saveBookmark({ userId, type, title, content, expression, result, topic }); setSaved(true) } catch { } finally { setSaving(false) }
  }
  return (
    <button onClick={handleSave} disabled={saved || saving} className={`text-[10px] font-bold uppercase tracking-widest px-4 py-2 rounded-lg border transition-all ${saved ? 'border-amber-400 text-amber-500 bg-amber-50' : 'border-white/20 hover:border-white hover:bg-white/10'}`}>
      {saving ? '...' : saved ? 'Saved' : 'Bookmark Target'}
    </button>
  )
}

function ResultPanel({ raw, mode, expression, onExplain, explaining, explanation, userId }) {
  const parsed = raw ? extractAnswer(raw) : null; if (!parsed) return null
  return (
    <div className="bg-white border border-[var(--color-border)] rounded-[2.5rem] overflow-hidden shadow-xl animate-fade-in">
      <div className="bg-[var(--color-ink)] px-8 py-6 flex items-center justify-between text-white">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-white/50 mb-1">{mode} Output</p>
          <h3 className="text-xl font-bold uppercase tracking-tight">Verified Resolution</h3>
        </div>
        <div className="flex gap-3">
          {!parsed.error && userId && <BookmarkButton userId={userId} title={expression} content={parsed.value} expression={expression} result={parsed.value} topic={mode} type="solution" />}
          <button onClick={onExplain} disabled={explaining || !!parsed.error} className="text-[10px] font-bold uppercase tracking-widest px-4 py-2 rounded-lg bg-[var(--color-teal)] text-white hover:opacity-90 disabled:opacity-50">
            {explaining ? 'Analyzing...' : 'Explain Logic'}
          </button>
        </div>
      </div>

      <div className="p-8 lg:p-12 space-y-12">
        {parsed.error ? (
          <div className="p-6 rounded-2xl bg-red-50 border border-red-100 text-red-600 text-sm font-bold">{parsed.error}</div>
        ) : (
          <div className="space-y-12">
            <div className="pb-8 border-b border-[var(--color-border)]">
              <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--color-muted)] mb-4">Core Result</p>
              <div className="text-5xl lg:text-7xl font-extrabold text-[var(--color-ink)] tracking-tighter break-all">{parsed.value}</div>
            </div>

            {parsed.solutions.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {parsed.solutions.map((s, i) => (
                  <div key={i} className="p-6 rounded-2xl bg-[var(--color-cream)] border border-[var(--color-border)]">
                    <p className="text-[10px] font-bold text-[var(--color-muted)] uppercase mb-2">Root {i + 1}</p>
                    <p className="text-2xl font-bold text-[var(--color-ink)]">x = <span className="text-[var(--color-teal)]">{String(s)}</span></p>
                  </div>
                ))}
              </div>
            )}

            {parsed.steps.length > 0 && (
              <div className="space-y-6">
                <p className="text-xs font-bold uppercase tracking-widest text-[var(--color-ink)]">Step-by-Step Breakdown</p>
                <div className="space-y-4">
                  {parsed.steps.map((step, i) => (
                    <div key={i} className="flex gap-6 group">
                      <span className="w-8 h-8 rounded-full bg-[var(--color-cream)] border border-[var(--color-border)] flex items-center justify-center text-xs font-bold text-[var(--color-teal)]">0{i + 1}</span>
                      <p className="text-sm font-medium text-[var(--color-ink)] pt-1 flex-1">{step}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {explanation && (
          <div className="mt-12 p-8 bg-[var(--color-cream)] rounded-3xl border border-[var(--color-teal)]/20 relative">
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--color-teal)] mb-4">Euler AI Insight</p>
            <div className="text-sm font-medium text-[var(--color-ink)] leading-relaxed whitespace-pre-wrap">
              {explanation}
              {explaining && <span className="inline-block w-2 h-4 bg-[var(--color-teal)] ml-2 animate-pulse" />}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function ImageTab() {
  const [image, setImage] = useState(null); const [preview, setPreview] = useState(null); const [instruction, setInstr] = useState(''); const [loading, setLoading] = useState(false); const [result, setResult] = useState(null); const [error, setError] = useState(null); const fileRef = useRef()
  const handleFile = (file) => {
    if (!file) return; const reader = new FileReader();
    reader.onload = (e) => {
      setPreview(e.target.result); const [header, data] = e.target.result.split(',')
      setImage({ base64: data, type: header.match(/:(.*?);/)?.[1] || 'image/jpeg' })
    }; reader.readAsDataURL(file)
  }
  const handleSolve = async () => {
    if (!image) return; setLoading(true); setError(null); setResult('')
    try { await streamSSE(`${API_BASE}/solve/image/stream`, { image_base64: image.base64, image_type: image.type, extra_instruction: instruction || undefined }, (t) => setResult(p => p + t)) }
    catch { setError('Failed to connect to the cognitive engine.') } finally { setLoading(false) }
  }
  return (
    <div className="space-y-12 max-w-4xl mx-auto">
      <div onClick={() => fileRef.current?.click()} onDrop={e => { e.preventDefault(); handleFile(e.dataTransfer.files[0]) }} onDragOver={e => e.preventDefault()}
        className={`border-2 border-dashed rounded-[3rem] py-24 flex flex-col items-center justify-center transition-all cursor-pointer relative overflow-hidden bg-white ${preview ? 'border-[var(--color-teal)]' : 'border-[var(--color-border)] hover:border-[var(--color-teal)] hover:shadow-xl'}`}>
        {preview ? <img src={preview} className="max-h-96 rounded-2xl object-contain relative z-10" /> : (
          <div className="text-center space-y-4">
            <span className="text-6xl grayscale">📸</span>
            <p className="text-sm font-bold text-[var(--color-ink)] uppercase tracking-widest">Upload Mathematical Data</p>
            <p className="text-xs text-[var(--color-muted)] font-medium max-w-xs mx-auto px-6">Support for textbooks, handwritten notes, and diagrams.</p>
          </div>
        )}
        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={e => handleFile(e.target.files[0])} />
      </div>
      <div className="space-y-4">
        <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--color-muted)]">Extra Context (Optional)</p>
        <input value={instruction} onChange={e => setInstr(e.target.value)} placeholder='e.g. "Explain the logic step by step"' className="w-full bg-white border border-[var(--color-border)] rounded-2xl p-6 text-sm font-medium focus:border-[var(--color-teal)] outline-none transition-all" />
      </div>
      <button onClick={handleSolve} disabled={!image || loading} className="w-full h-16 bg-[var(--color-ink)] text-white rounded-2xl font-bold text-sm uppercase tracking-widest hover:shadow-2xl transition-all disabled:opacity-30">
        {loading ? 'Processing Visual Data...' : 'Execute Vision Solver ➔'}
      </button>
      {result && (
        <div className="bg-white border border-[var(--color-border)] rounded-3xl overflow-hidden shadow-lg animate-fade-in">
          <div className="p-8 text-sm font-medium leading-relaxed whitespace-pre-wrap text-[var(--color-ink)]">
            {result}
            {loading && <span className="inline-block w-2 h-4 bg-[var(--color-teal)] ml-2 animate-pulse" />}
          </div>
        </div>
      )}
    </div>
  )
}

export default function Solve() {
  const [tab, setTab] = useState('type'); const [mode, setMode] = useState('solve'); const [expression, setExpression] = useState(''); const [result, setResult] = useState(null); const [loading, setLoading] = useState(false); const [error, setError] = useState(null); const [explanation, setExplanation] = useState(null); const [explaining, setExplaining] = useState(false)
  const inputRef = useRef(); const debounceRef = useRef(); const { user } = useAuth(); const revealRef = useReveal()

  const evaluate = useCallback(async (expr, evalMode) => {
    const clean = expr.trim(); if (!clean) { setResult(null); setError(null); return }
    setLoading(true); setError(null); setExplanation(null)
    try { const data = await callSolve(clean, evalMode); setResult(data) }
    catch { setError('Uplink failed.') } finally { setLoading(false) }
  }, [])

  const handleExpressionChange = (val) => {
    setExpression(val); setExplanation(null); clearTimeout(debounceRef.current)
    if (!val.trim()) { setResult(null); setError(null); return }
    debounceRef.current = setTimeout(() => evaluate(val, mode), 1200)
  }

  const handleExplain = async () => {
    if (!result || !expression) return; setExplaining(true); setExplanation('')
    try { await streamSSE(`${API_BASE}/solve/explain/stream`, { expression, result: JSON.stringify(result.data || result) }, (t) => setExplanation(p => p + t)) }
    catch { setExplanation('Failed to generate insight.') } finally { setExplaining(false) }
  }

  const insertAt = (text) => {
    const el = inputRef.current; if (!el) { handleExpressionChange(expression + text); return }
    const start = el.selectionStart, end = el.selectionStart, newVal = expression.slice(0, start) + text + expression.slice(end)
    handleExpressionChange(newVal); setTimeout(() => { el.focus(); el.setSelectionRange(start + text.length, start + text.length) }, 0)
  }

  return (
    <div className="max-w-7xl mx-auto px-6 py-12 lg:py-24" ref={revealRef}>
      {/* SaaS Header */}
      <div className="mb-20 flex flex-col md:flex-row items-end justify-between gap-8 border-b border-[var(--color-border)] pb-8">
        <div className="space-y-4">
          <p className="text-[11px] font-bold text-[var(--color-teal)] uppercase tracking-widest">Computational Engine</p>
          <h1 className="text-5xl lg:text-7xl font-extrabold text-[var(--color-ink)] tracking-tight">Neural <span className="text-[var(--color-teal)]">Solver.</span></h1>
        </div>
        <div className="flex bg-[var(--color-cream)] p-1 rounded-xl border border-[var(--color-border)]">
          {['type', 'image'].map(t => (
            <button key={t} onClick={() => setTab(t)} className={`px-6 py-2 rounded-lg text-xs font-bold uppercase tracking-widest transition-all ${tab === t ? 'bg-white text-[var(--color-ink)] shadow-md' : 'text-[var(--color-muted)] hover:text-[var(--color-ink)]'}`}>
              {t === 'type' ? 'Keyboard' : 'Vision'}
            </button>
          ))}
        </div>
      </div>

      {tab === 'image' ? <ImageTab /> : (
        <div className="grid grid-cols-1 xl:grid-cols-[1fr_400px] gap-12 items-start">
          <div className="space-y-8 animate-fade-in">
            {/* Expression Console */}
            <div className="bg-white border border-[var(--color-border)] rounded-[2.5rem] shadow-sm overflow-hidden focus-within:shadow-xl focus-within:border-[var(--color-teal)] transition-all">
              <div className="p-10 lg:p-14 bg-[var(--color-cream)]/50">
                <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--color-muted)] mb-6">Active Input Terminal</p>
                <div className="relative">
                  <input ref={inputRef} value={expression} onChange={e => handleExpressionChange(e.target.value)} onKeyDown={e => e.key === 'Enter' && evaluate(expression, mode)} placeholder="Input Expression..." className="w-full bg-transparent text-5xl lg:text-7xl font-bold text-[var(--color-ink)] outline-none placeholder:opacity-10" />
                  {loading && <div className="absolute right-0 top-1/2 -translate-y-1/2 w-8 h-8 border-4 border-[var(--color-teal)] border-t-transparent animate-spin rounded-full" />}
                </div>
              </div>

              {/* Symbol Interface */}
              <div className="grid grid-cols-2 md:grid-cols-4 border-t border-[var(--color-border)]">
                {SYMBOL_GROUPS.map(g => (
                  <div key={g.label} className="p-6 border-r border-b md:border-b-0 border-[var(--color-border)] last:border-r-0">
                    <p className="text-[9px] font-bold uppercase tracking-widest text-[var(--color-muted)] mb-4">{g.label}</p>
                    <div className="flex flex-wrap gap-2">
                      {g.symbols.map(s => <button key={s.display} onClick={() => insertAt(s.insert)} className="w-10 h-10 rounded-lg border border-[var(--color-border)] text-sm font-bold hover:bg-[var(--color-ink)] hover:text-white transition-all">{s.display}</button>)}
                    </div>
                  </div>
                ))}
              </div>

              {/* Function Control */}
              <div className="flex bg-[var(--color-ink)] p-1 border-t border-[var(--color-border)]">
                {MODES.map(m => (
                  <button key={m.id} onClick={() => { setMode(m.id); if (expression) evaluate(expression, m.id) }}
                    className={`flex-1 py-5 flex flex-col items-center gap-1 transition-all ${mode === m.id ? 'bg-white/10 text-white' : 'text-white/40 hover:text-white'}`}>
                    <span className="text-xl font-bold">{m.icon}</span>
                    <span className="text-[9px] font-bold uppercase tracking-widest">{m.label}</span>
                  </button>
                ))}
                <button onClick={() => { setExpression(''); setResult(null); setError(null) }} className="px-10 py-5 bg-red-500/10 text-red-500 font-bold text-xs uppercase tracking-widest hover:bg-red-500 hover:text-white transition-all">Clear</button>
              </div>

              <button onClick={() => evaluate(expression, mode)} className="w-full py-8 bg-[var(--color-teal)] text-white font-bold text-lg uppercase tracking-widest hover:opacity-90 transition-opacity">Execute Final Resolve ➔</button>
            </div>

            {/* Results Layer */}
            {result?.data ? (
              <ResultPanel raw={result.data} mode={mode} expression={expression} onExplain={handleExplain} explaining={explaining} explanation={explanation} userId={user?.id} />
            ) : (
              <div className="p-20 border-2 border-dashed border-[var(--color-border)] rounded-[3rem] text-center opacity-30 flex flex-col items-center justify-center">
                <span className="text-8xl grayscale mb-6">Σ</span>
                <p className="text-xs font-bold uppercase tracking-[0.4em]">Awaiting Instruction</p>
              </div>
            )}
          </div>

          {/* Sidebar Tools */}
          <div className="space-y-8 xl:sticky xl:top-32 animate-fade-in">
            <div className="bg-white border border-[var(--color-border)] rounded-[2.5rem] p-8 shadow-sm">
              <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--color-teal)] mb-8">Quick Examples</p>
              <div className="space-y-6">
                {EXAMPLES.map(ex => (
                  <button key={ex.expr} onClick={() => handleExpressionChange(ex.expr)} className="w-full text-left group border-b border-[var(--color-border)] pb-6 last:border-0 hover:border-[var(--color-teal)] transition-all">
                    <p className="text-sm font-bold text-[var(--color-ink)] mb-1">{ex.expr}</p>
                    <p className="text-[10px] font-bold text-[var(--color-muted)] uppercase tracking-widest opacity-60">{ex.label}</p>
                  </button>
                ))}
              </div>
            </div>

            <div className="p-8 bg-[var(--color-ink)] rounded-[2rem] text-white space-y-4">
              <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--color-gold)]">Engine Status</p>
              <div className="flex items-center justify-between text-xs font-medium">
                <span className="text-white/60">Computation Power</span>
                <span className="text-white">Neural S7.2</span>
              </div>
              <div className="flex items-center justify-between text-xs font-medium">
                <span className="text-white/60">Latency</span>
                <span className="text-green-400">12ms</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

import { useState, useEffect, useRef } from 'react'
import { useAuth } from '../context/AuthContext'
import { askExamQuestion, listExamPapers, ingestExamPaper } from '../services/api'
import { ExplanationBody } from '../utils/RenderMath'
import { saveBookmark } from '../lib/bookmarks'
import { useReveal } from '../hooks/useReveal'

const EXAM_TYPES = ['WAEC', 'NECO', 'JAMB', 'OTHER']
const YEARS = Array.from({ length: 25 }, (_, i) => 2024 - i)

const SAMPLE_QUESTIONS = {
  WAEC: [
    'Solve the equation 3x² - 7x + 2 = 0',
    'Find the area of a triangle with sides 5cm, 12cm and 13cm',
    'If log₂8 = x, find x',
    'A bag contains 4 red and 6 blue balls. Two balls are drawn without replacement. Find the probability that both are red.',
    'The bearing of B from A is 060°. Find the bearing of A from B.',
  ],
  NECO: [
    'Simplify (2√3 + √2)(2√3 - √2)',
    'Find the equation of a line passing through (2, 3) with gradient 4',
    'In triangle ABC, angle A = 60°, b = 8cm, c = 6cm. Find side a.',
    'Evaluate ∫(3x² + 2x - 1)dx',
    'Find the range of values of x for which 2x - 3 > 7',
  ],
  JAMB: [
    'If f(x) = 3x - 2 and g(x) = x², find f(g(2))',
    'Simplify (x² - 9)/(x² - x - 6)',
    'The sum of the first n terms of an AP is 3n² + 4n. Find the common difference.',
    'Find dy/dx if y = x³ - 6x² + 9x + 1',
    'A circle has equation x² + y² - 4x + 6y = 3. Find the centre and radius.',
  ],
}

function PaperCard({ paper }) {
  return (
    <div className="border-2 border-[var(--color-ink)] bg-white p-6 shadow-[12px_12px_0_var(--color-cream)] hover:shadow-none transition-all group">
      <div className="flex justify-between items-start mb-4">
        <span className="font-mono text-[9px] font-black uppercase text-[var(--color-gold)]">{paper.exam_type}</span>
        <span className="font-mono text-[8px] text-[var(--color-muted)] font-black italic">{paper.size_mb} MB</span>
      </div>
      <p className="font-serif italic font-black text-xl uppercase tracking-tighter leading-none group-hover:text-[var(--color-teal)]">{paper.name.replace(/_/g, ' ')}</p>
    </div>
  )
}

export default function PastQuestions() {
  const { user } = useAuth(); const fileRef = useRef(null); const revealRef = useReveal()
  const [examType, setExamType] = useState('WAEC'); const [year, setYear] = useState(2023)
  const [question, setQuestion] = useState(''); const [response, setResponse] = useState(''); const [loading, setLoading] = useState(false)
  const [bookmarked, setBookmarked] = useState(false); const [papers, setPapers] = useState([]); const [tab, setTab] = useState('practice')
  const [uploadTitle, setUploadTitle] = useState(''); const [uploadExamType, setUploadExamType] = useState('WAEC'); const [uploadYear, setUploadYear] = useState(2023)
  const [uploading, setUploading] = useState(false); const [uploadSuccess, setUploadSuccess] = useState(''); const [uploadError, setUploadError] = useState('')

  useEffect(() => { loadPapers() }, [])
  const loadPapers = async () => { try { const res = await listExamPapers(); setPapers(res.data.papers || []) } catch { setPapers([]) } }
  const handleAsk = async () => {
    if (!question.trim() || loading) return; setLoading(true); setResponse(''); setBookmarked(false)
    try { const res = await askExamQuestion(question, examType, year); setResponse(res.data.response) } catch { setResponse('⚠️ CORE_LINK_FAILURE: RE-INITIALIZE BACKEND.') } finally { setLoading(false) }
  }
  const handleBookmark = async () => {
    if (!user || bookmarked || !response) return; await saveBookmark({ userId: user.id, type: 'solution', title: `${examType} ${year}: ${question.slice(0, 50)}...`, content: response, topic: `${examType} Past Questions` })
    setBookmarked(true); setTimeout(() => setBookmarked(false), 3000)
  }
  const handleUpload = async (e) => {
    const file = e.target.files?.[0]; if (!file || !uploadTitle) return; setUploading(true); setUploadError(''); setUploadSuccess('')
    const reader = new FileReader(); reader.onload = async (ev) => {
      const base64 = ev.target.result.split(',')[1]
      try { await ingestExamPaper(base64, uploadTitle, uploadExamType, uploadYear); setUploadSuccess(`✅ UPLINK_SUCCESS: "${uploadTitle}"`); setUploadTitle(''); await loadPapers() } catch { setUploadError('❌ UPLINK_ERROR_712') } finally { setUploading(false) }
    }
    reader.readAsDataURL(file)
  }

  return (
    <div className="max-w-[1440px] mx-auto px-6 md:px-12 py-12" ref={revealRef}>
      <div className="grain pointer-events-none" />

      <div className="mb-24 flex flex-col md:flex-row items-end justify-between gap-12">
        <div className="max-w-4xl">
          <p className="eyebrow">Past Questions</p>
          <h1 className="font-serif font-black text-7xl md:text-[10rem] tracking-tighter uppercase leading-[0.8] italic">
            Archive <br /><span className="text-[var(--color-gold)] not-italic">Solutions.</span>
          </h1>
          <p className="font-serif italic text-2xl text-[var(--color-muted)] mt-12 border-l-4 border-[var(--color-gold)] pl-8 max-w-xl uppercase tracking-tighter">Practice WAEC, NECO and JAMB questions with clear, step-by-step solutions.</p>
        </div>
        <div className="flex border-4 border-[var(--color-ink)] bg-white shadow-[12px_12px_0_var(--color-gold)] overflow-hidden">
          {['practice', 'papers', 'upload'].map(t => (
            <button key={t} onClick={() => setTab(t)} className={`px-8 py-4 font-mono text-[9px] font-black uppercase tracking-[0.4em] transition-all border-r-2 last:border-r-0 border-[var(--color-ink)] ${tab === t ? 'bg-[var(--color-ink)] text-white' : 'hover:bg-[var(--color-cream)] text-[var(--color-muted)]'}`}>
              {t === 'practice' ? 'Practice' : t === 'papers' ? 'Papers' : 'Upload'}
            </button>
          ))}
        </div>
      </div>

      {tab === 'practice' && (
        <div className="grid grid-cols-1 xl:grid-cols-[1fr_400px] gap-24">
          <div className="space-y-16">
            <div className="border-4 border-[var(--color-ink)] bg-white p-12 shadow-[32px_32px_0_var(--color-cream)]">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-12 mb-12">
                <div className="space-y-4">
                  <p className="font-mono text-[9px] font-black uppercase tracking-[0.4em] text-[var(--color-gold)]">Exam Type</p>
                  <div className="flex border-2 border-[var(--color-ink)]">
                    {EXAM_TYPES.map(et => (
                      <button key={et} onClick={() => setExamType(et)} className={`flex-1 py-4 font-mono text-[9px] font-black uppercase border-r-2 last:border-r-0 border-[var(--color-ink)] transition-all ${examType === et ? 'bg-[var(--color-ink)] text-white' : 'hover:bg-[var(--color-cream)]'}`}>{et}</button>
                    ))}
                  </div>
                </div>
                <div className="space-y-4">
                  <p className="font-mono text-[9px] font-black uppercase tracking-[0.4em] text-[var(--color-gold)]">Year</p>
                  <select value={year} onChange={e => setYear(Number(e.target.value))} className="w-full bg-[var(--color-paper)] border-2 border-[var(--color-ink)] px-6 py-4 font-serif font-black italic text-xl uppercase outline-none focus:bg-white transition-all">
                    {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
                  </select>
                </div>
              </div>

              <div className="space-y-6">
                <p className="font-mono text-[9px] font-black uppercase tracking-[0.4em] text-[var(--color-gold)] mb-4">Question</p>
                <textarea value={question} onChange={e => setQuestion(e.target.value)} placeholder={`Enter ${examType} question...`} rows={6} className="w-full bg-[var(--color-paper)] border-4 border-[var(--color-ink)] p-8 font-serif font-black text-3xl italic placeholder:opacity-20 uppercase tracking-tighter outline-none focus:bg-white transition-all resize-none" />
                <button onClick={handleAsk} disabled={!question.trim() || loading} className="w-full bg-[var(--color-ink)] text-white py-10 font-serif font-black text-3xl uppercase tracking-tighter italic hover:bg-black transition-all shadow-[12px_12px_0_var(--color-gold)] disabled:opacity-20">
                  {loading ? 'Loading solution...' : 'Get Solution ➔'}
                </button>
              </div>
            </div>

            {response && !loading && (
              <div className="border-4 border-[var(--color-teal)] bg-white p-12 md:p-24 shadow-[48px_48px_0_var(--color-ink)]/5 relative overflow-hidden">
                <div className="absolute right-[-5%] top-[-5%] font-serif font-black text-[30rem] text-[var(--color-teal)] opacity-[0.03] italic select-none pointer-events-none">Σ</div>
                <div className="flex justify-between items-center mb-12 border-b-2 border-[var(--color-teal)]/20 pb-8">
                  <p className="font-mono text-[10px] font-black uppercase tracking-[0.4em] text-[var(--color-teal)]">Solution</p>
                  {user && (
                    <button onClick={handleBookmark} className={`px-6 py-3 font-mono text-[9px] font-black uppercase tracking-widest border-2 transition-all ${bookmarked ? 'bg-[var(--color-gold)] border-[var(--color-gold)] text-black' : 'border-[var(--color-teal)] text-[var(--color-teal)] hover:bg-[var(--color-teal)] hover:text-white'}`}>
                      {bookmarked ? 'Saved ✓' : 'Save'}
                    </button>
                  )}
                </div>
                <div className="max-w-4xl">
                  <ExplanationBody text={response} />
                </div>
              </div>
            )}
          </div>

          <div className="space-y-12">
            <div className="border-4 border-[var(--color-ink)] bg-white p-12 shadow-[20px_20px_0_var(--color-cream)] relative overflow-hidden">
              <p className="font-mono text-[10px] font-black uppercase tracking-[0.4em] text-[var(--color-gold)] mb-12">Examples</p>
              <div className="space-y-4">
                {(SAMPLE_QUESTIONS[examType] || SAMPLE_QUESTIONS.WAEC).map((q, i) => (
                  <button key={i} onClick={() => setQuestion(q)} className="w-full text-left p-6 border-2 border-[var(--color-ink)]/10 hover:border-[var(--color-ink)] transition-all font-serif italic text-lg uppercase tracking-tight group">
                    <span className="font-mono text-[var(--color-gold)] text-[9px] font-black block mb-2">Q {i + 1}</span>
                    {q}
                  </button>
                ))}
              </div>
            </div>

            <div className="border-4 border-[var(--color-ink)] bg-white p-12 shadow-[20px_20px_0_var(--color-cream)]">
              <p className="font-mono text-[10px] font-black uppercase tracking-[0.4em] text-[var(--color-gold)] mb-12">Study Tips</p>
              <div className="space-y-8">
                {[
                  'Check method marks in the question',
                  'Read twice, highlight key data',
                  'Circle given parameters and units',
                  'Verify answers with a quick sanity check',
                  'Skip and return if stuck — manage time',
                ].map((tip, i) => (
                  <div key={i} className="flex gap-4 items-center">
                    <span className="font-serif font-black italic text-2xl text-[var(--color-gold)]">0{i + 1}</span>
                    <p className="font-mono text-[9px] font-black uppercase tracking-widest leading-none">{tip}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {tab === 'papers' && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-12">
          {papers.length ? papers.map(p => <PaperCard key={p.filename} paper={p} />) : (
            <div className="col-span-full py-32 text-center border-4 border-dashed border-[var(--color-ink)]/20">
              <p className="font-serif italic font-black text-4xl opacity-20 uppercase tracking-tighter leading-none">AWAITING_ARCHIVE_UPLINK...</p>
            </div>
          )}
        </div>
      )}

      {tab === 'upload' && (
        <div className="max-w-3xl mx-auto border-4 border-[var(--color-ink)] bg-white p-16 shadow-[48px_48px_0_var(--color-cream)]">
          <p className="eyebrow mb-12">ARCHIVE_INGESTION_MODULE</p>
          <div className="space-y-12">
            <div className="space-y-4">
              <p className="font-mono text-[9px] font-black uppercase tracking-[0.4em] text-[var(--color-gold)]">PAPER_IDENTIFIER</p>
              <input type="text" value={uploadTitle} onChange={e => setUploadTitle(e.target.value)} placeholder="E.G_WAEC_MATH_2024_P1" className="w-full bg-[var(--color-paper)] border-4 border-[var(--color-ink)] p-8 font-serif font-black text-3xl italic placeholder:opacity-20 uppercase tracking-tighter outline-none focus:bg-white transition-all" />
            </div>

            <div className="grid grid-cols-2 gap-12">
              <div className="space-y-4">
                <p className="font-mono text-[9px] font-black uppercase tracking-[0.4em] text-[var(--color-gold)]">SECTOR</p>
                <div className="grid grid-cols-2 gap-0 border-2 border-[var(--color-ink)]">
                  {EXAM_TYPES.map(et => (
                    <button key={et} onClick={() => setUploadExamType(et)} className={`py-4 font-mono text-[9px] font-black uppercase border-r-2 last:border-r-0 border-[var(--color-ink)] transition-all ${uploadExamType === et ? 'bg-[var(--color-ink)] text-white' : 'hover:bg-[var(--color-cream)]'}`}>{et}</button>
                  ))}
                </div>
              </div>
              <div className="space-y-4">
                <p className="font-mono text-[9px] font-black uppercase tracking-[0.4em] text-[var(--color-gold)]">TEMPORAL_MARKER</p>
                <select value={uploadYear} onChange={e => setUploadYear(Number(e.target.value))} className="w-full bg-[var(--color-paper)] border-2 border-[var(--color-ink)] p-4 font-serif font-black italic text-xl uppercase outline-none focus:bg-white transition-all">
                  {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
                </select>
              </div>
            </div>

            <div onClick={() => fileRef.current?.click()} className="border-4 border-dashed border-[var(--color-ink)]/20 hover:border-[var(--color-gold)] p-24 text-center cursor-pointer transition-all group">
              <p className="font-serif italic font-black text-4xl opacity-20 group-hover:opacity-100 group-hover:text-[var(--color-gold)] uppercase tracking-tighter leading-none mb-4">SELECT_OBJECT_FILE</p>
              <p className="font-mono text-[10px] font-black uppercase tracking-widest opacity-20">PDF_MAX_50MB</p>
            </div>
            <input ref={fileRef} type="file" accept=".pdf" className="hidden" onChange={handleUpload} disabled={!uploadTitle || uploading} />

            {uploading && <p className="font-mono text-[10px] font-black text-[var(--color-teal)] animate-pulse uppercase tracking-widest text-center">INGESTING_RECORDS... 12%_34%_88%</p>}
            {uploadSuccess && <p className="font-mono text-[10px] font-black text-[var(--color-teal)] uppercase tracking-widest text-center">{uploadSuccess}</p>}
            {uploadError && <p className="font-mono text-[10px] font-black text-red-500 uppercase tracking-widest text-center">{uploadError}</p>}
          </div>
        </div>
      )}
    </div>
  )
}

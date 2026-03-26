import { useState, useRef } from 'react'
import { solveFromImage } from '../../services/api'
import { ExplanationBody } from '../../utils/RenderMath'

export default function ImageSolver() {
  const [image, setImage]             = useState(null)
  const [base64, setBase64]           = useState(null)
  const [imageType, setImageType]     = useState('image/jpeg')
  const [loading, setLoading]         = useState(false)
  const [result, setResult]           = useState(null)
  const [error, setError]             = useState('')
  const [instruction, setInstruction] = useState('')
  const [isDragging, setIsDragging]   = useState(false)
  const fileRef = useRef()

  const processFile = (file) => {
    if (!file) return
    if (!file.type.startsWith('image/')) {
      setError('Please upload an image file (JPG, PNG, WEBP, etc.)')
      return
    }
    setImageType(file.type)
    setError('')
    setResult(null)
    const reader = new FileReader()
    reader.onload = (e) => {
      const dataUrl = e.target.result
      setImage(dataUrl)
      setBase64(dataUrl.split(',')[1])
    }
    reader.readAsDataURL(file)
  }

  const handleFileChange = (e) => processFile(e.target.files[0])

  const handleDrop = (e) => {
    e.preventDefault()
    setIsDragging(false)
    processFile(e.dataTransfer.files[0])
  }

  const handleSolve = async () => {
    if (!base64) return
    setLoading(true)
    setResult(null)
    setError('')
    try {
      const res = await solveFromImage(base64, imageType, instruction || null)
      setResult(res.data.explanation)
    } catch {
      setError('Could not connect to backend. Make sure it is running on port 8000.')
    } finally {
      setLoading(false)
    }
  }

  const handleClear = () => {
    setImage(null)
    setBase64(null)
    setResult(null)
    setError('')
    setInstruction('')
    if (fileRef.current) fileRef.current.value = ''
  }

  return (
    <div className="space-y-5">
      {/* Drop zone */}
      {!image ? (
        <div
          onDragOver={(e) => { e.preventDefault(); setIsDragging(true) }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          onClick={() => fileRef.current.click()}
          className={`border-2 border-dashed rounded-2xl p-10 text-center transition-all duration-200
            ${isDragging
              ? 'border-[var(--color-teal)] bg-[#e8f4f4]'
              : 'border-[var(--color-border)] bg-[var(--color-cream)] hover:border-[var(--color-teal)] hover:bg-[#f0f9f9]'
            }`}
        >
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleFileChange}
          />
          <div className="text-5xl mb-4">📷</div>
          <p className="font-serif font-semibold text-xl text-[var(--color-ink)] mb-2">
            Upload or Drop Your Question
          </p>
          <p className="text-[var(--color-muted)] text-sm leading-relaxed">
            Take a photo of your textbook, worksheet, or handwritten question.<br />
            Supports JPG, PNG, WEBP — any image format.
          </p>
          <div className="mt-5 inline-block bg-[var(--color-ink)] text-[var(--color-paper)]
                          px-6 py-2.5 rounded-xl font-semibold text-sm">
            Choose Image
          </div>
        </div>
      ) : (
        <div className="card overflow-hidden">
          <div className="bg-[var(--color-ink)] px-5 py-3 flex items-center justify-between">
            <span className="font-serif text-white font-semibold">📷 Your Question</span>
            <button
              onClick={handleClear}
              className="text-white/60 hover:text-white text-sm transition-colors"
            >
              ✕ Clear
            </button>
          </div>
          <div className="bg-[var(--color-paper)] p-4">
            <img
              src={image}
              alt="Uploaded question"
              className="w-full max-h-72 object-contain rounded-xl border border-[var(--color-border)]"
            />
          </div>
        </div>
      )}

      {/* Optional instruction */}
      {image && (
        <div>
          <label className="font-mono text-[10px] uppercase tracking-widest text-[var(--color-muted)] block mb-2">
            Additional instruction (optional)
          </label>
          <input
            type="text"
            value={instruction}
            onChange={e => setInstruction(e.target.value)}
            placeholder='e.g. "Only show the graphical method" or "This is a bearings question"'
            className="w-full bg-white border-2 border-[var(--color-border)] focus:border-[var(--color-teal)]
                       rounded-xl px-4 py-3 text-sm text-[var(--color-ink)]
                       placeholder:text-[var(--color-muted)] transition-colors duration-150"
          />
        </div>
      )}

      {/* Solve button */}
      {image && (
        <button
          onClick={handleSolve}
          disabled={loading}
          className="w-full btn-primary py-4 text-base flex items-center justify-center gap-2 disabled:opacity-50"
        >
          {loading
            ? <><span className="animate-spin">⏳</span> Reading and Solving...</>
            : '🔍 Read & Solve This Question'
          }
        </button>
      )}

      {/* Error */}
      {error && (
        <div className="border-2 border-red-300 bg-red-50 rounded-2xl p-5 text-red-600 font-mono text-sm">
          ⚠️ {error}
        </div>
      )}

      {/* Result */}
      {result && (
        <div className="card">
          <div className="bg-[var(--color-teal)] px-6 py-3">
            <span className="font-serif text-white font-semibold text-lg">
              🧠 Euler's Solution
            </span>
          </div>
          <div className="bg-white p-6">
            <ExplanationBody text={result} />
          </div>
        </div>
      )}
    </div>
  )
}
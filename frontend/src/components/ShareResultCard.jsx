import { useRef, useEffect, useState } from 'react'

// ── Grade config ───────────────────────────────────────────────────
const GRADES = [
  { min: 80, grade: 'A1', label: 'Distinction',  accent: '#10b981', dark: '#064e3b' },
  { min: 70, grade: 'B2', label: 'Very Good',    accent: '#3b82f6', dark: '#1e3a5f' },
  { min: 65, grade: 'B3', label: 'Very Good',    accent: '#3b82f6', dark: '#1e3a5f' },
  { min: 60, grade: 'C4', label: 'Credit',       accent: '#f59e0b', dark: '#451a03' },
  { min: 55, grade: 'C5', label: 'Credit',       accent: '#f59e0b', dark: '#451a03' },
  { min: 50, grade: 'C6', label: 'Credit',       accent: '#f59e0b', dark: '#451a03' },
  { min: 45, grade: 'D7', label: 'Pass',         accent: '#f97316', dark: '#431407' },
  { min: 40, grade: 'E8', label: 'Pass',         accent: '#f97316', dark: '#431407' },
  { min: 0,  grade: 'F9', label: 'Fail',         accent: '#ef4444', dark: '#450a0a' },
]

function getGradeInfo(pct) {
  return GRADES.find(g => pct >= g.min) || GRADES[GRADES.length - 1]
}

// ── Motivational messages by score range ──────────────────────────
const MESSAGES = [
  { min: 90, lines: ['Absolute mastery!', 'You nailed every concept.']           },
  { min: 75, lines: ['Outstanding work!', 'You\'re exam-ready.']                  },
  { min: 60, lines: ['Solid performance!', 'Keep pushing higher.']               },
  { min: 45, lines: ['Good effort!', 'A bit more practice will get you there.']  },
  { min: 0,  lines: ['Keep going!', 'Every attempt makes you stronger.']         },
]

function getMessage(pct) {
  return MESSAGES.find(m => pct >= m.min) || MESSAGES[MESSAGES.length - 1]
}

// ── Canvas card renderer ───────────────────────────────────────────
function drawCard(canvas, data) {
  const { name, score, total, pct, examType, topic, streakDays, masteryLevel, date } = data
  const ctx = canvas.getContext('2d')
  const W = 900, H = 500
  canvas.width  = W
  canvas.height = H

  const gInfo = getGradeInfo(pct)
  const msg   = getMessage(pct)

  // ── Background: dark gradient with texture ─────────────────────
  const bg = ctx.createLinearGradient(0, 0, W, H)
  bg.addColorStop(0, '#0f1923')
  bg.addColorStop(1, gInfo.dark)
  ctx.fillStyle = bg
  ctx.fillRect(0, 0, W, H)

  // Diagonal accent stripe
  ctx.save()
  ctx.globalAlpha = 0.12
  ctx.fillStyle = gInfo.accent
  ctx.beginPath()
  ctx.moveTo(W * 0.55, 0)
  ctx.lineTo(W, 0)
  ctx.lineTo(W, H)
  ctx.lineTo(W * 0.42, H)
  ctx.closePath()
  ctx.fill()
  ctx.restore()

  // Subtle dot grid
  ctx.save()
  ctx.globalAlpha = 0.06
  ctx.fillStyle = '#ffffff'
  for (let x = 24; x < W; x += 28) {
    for (let y = 24; y < H; y += 28) {
      ctx.beginPath()
      ctx.arc(x, y, 1.5, 0, Math.PI * 2)
      ctx.fill()
    }
  }
  ctx.restore()

  // ── Left section: score ring ────────────────────────────────────
  const cx = 195, cy = H / 2, R = 120

  // Ring background
  ctx.save()
  ctx.strokeStyle = 'rgba(255,255,255,0.08)'
  ctx.lineWidth = 18
  ctx.beginPath()
  ctx.arc(cx, cy, R, 0, Math.PI * 2)
  ctx.stroke()
  ctx.restore()

  // Ring fill (progress arc)
  const startAngle = -Math.PI / 2
  const endAngle   = startAngle + (pct / 100) * Math.PI * 2
  const ringGrad   = ctx.createLinearGradient(cx - R, cy, cx + R, cy)
  ringGrad.addColorStop(0, gInfo.accent)
  ringGrad.addColorStop(1, gInfo.accent + 'aa')
  ctx.save()
  ctx.strokeStyle = ringGrad
  ctx.lineWidth   = 18
  ctx.lineCap     = 'round'
  ctx.beginPath()
  ctx.arc(cx, cy, R, startAngle, endAngle)
  ctx.stroke()
  ctx.restore()

  // Ring inner glow
  ctx.save()
  const innerGlow = ctx.createRadialGradient(cx, cy, 60, cx, cy, R - 10)
  innerGlow.addColorStop(0, gInfo.accent + '15')
  innerGlow.addColorStop(1, 'transparent')
  ctx.fillStyle = innerGlow
  ctx.beginPath()
  ctx.arc(cx, cy, R, 0, Math.PI * 2)
  ctx.fill()
  ctx.restore()

  // Percentage text
  ctx.save()
  ctx.fillStyle = '#ffffff'
  ctx.font      = `bold 54px Georgia, serif`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(`${pct}%`, cx, cy - 12)
  ctx.font      = `500 16px 'Courier New', monospace`
  ctx.fillStyle = 'rgba(255,255,255,0.55)'
  ctx.fillText(`${score} / ${total}`, cx, cy + 26)
  ctx.restore()

  // Grade badge
  ctx.save()
  const badgeY = cy + R + 28
  const bw = 72, bh = 32
  const bx = cx - bw / 2
  ctx.fillStyle = gInfo.accent
  roundRect(ctx, bx, badgeY, bw, bh, 8)
  ctx.fill()
  ctx.font      = `bold 15px 'Courier New', monospace`
  ctx.fillStyle = '#fff'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(gInfo.grade + ' · ' + gInfo.label, cx, badgeY + bh / 2)
  ctx.restore()

  // ── Right section: info ─────────────────────────────────────────
  const lx = 360

  // App watermark
  ctx.save()
  ctx.font      = `bold 13px 'Courier New', monospace`
  ctx.fillStyle = 'rgba(255,255,255,0.25)'
  ctx.textAlign = 'left'
  ctx.fillText('MATHGENIUS', lx, 48)
  ctx.restore()

  // Student name
  ctx.save()
  ctx.font = `bold 42px Georgia, serif`
  ctx.fillStyle = '#ffffff'
  ctx.textAlign = 'left'
  ctx.shadowColor = 'rgba(0,0,0,0.4)'
  ctx.shadowBlur  = 8
  ctx.fillText(name || 'Student', lx, 120)
  ctx.restore()

  // Exam + topic line
  ctx.save()
  ctx.font      = `500 17px 'Courier New', monospace`
  ctx.fillStyle = gInfo.accent
  ctx.textAlign = 'left'
  ctx.fillText(`${examType}  ·  ${topic || 'Mathematics'}`, lx, 162)
  ctx.restore()

  // Motivational message
  ctx.save()
  ctx.font      = `italic 22px Georgia, serif`
  ctx.fillStyle = 'rgba(255,255,255,0.82)'
  ctx.textAlign = 'left'
  ctx.fillText(`"${msg.lines[0]}"`, lx, 218)
  ctx.font      = `16px Georgia, serif`
  ctx.fillStyle = 'rgba(255,255,255,0.5)'
  ctx.fillText(msg.lines[1], lx, 248)
  ctx.restore()

  // Divider
  ctx.save()
  ctx.strokeStyle = 'rgba(255,255,255,0.1)'
  ctx.lineWidth   = 1
  ctx.beginPath()
  ctx.moveTo(lx, 272)
  ctx.lineTo(W - 48, 272)
  ctx.stroke()
  ctx.restore()

  // Stats row
  const stats = [
    { label: 'SCORE',   value: `${pct}%`           },
    { label: 'STREAK',  value: `${streakDays || 0}🍌` },
    { label: 'MASTERY', value: masteryLevel || '—'  },
  ]
  stats.forEach((s, i) => {
    const sx = lx + i * 165
    ctx.save()
    ctx.font      = `bold 26px Georgia, serif`
    ctx.fillStyle = '#ffffff'
    ctx.textAlign = 'left'
    ctx.fillText(s.value, sx, 318)
    ctx.font      = `11px 'Courier New', monospace`
    ctx.fillStyle = 'rgba(255,255,255,0.35)'
    ctx.fillText(s.label, sx, 340)
    ctx.restore()
  })

  // Date + bottom bar
  ctx.save()
  ctx.font      = `12px 'Courier New', monospace`
  ctx.fillStyle = 'rgba(255,255,255,0.3)'
  ctx.textAlign = 'left'
  ctx.fillText(date || new Date().toLocaleDateString('en-NG', { day:'numeric', month:'long', year:'numeric' }), lx, H - 36)
  ctx.textAlign = 'right'
  ctx.fillText('mathgenius.app', W - 48, H - 36)
  ctx.restore()

  // Accent bottom line
  ctx.save()
  const lineGrad = ctx.createLinearGradient(0, H - 6, W, H - 6)
  lineGrad.addColorStop(0, 'transparent')
  lineGrad.addColorStop(0.4, gInfo.accent)
  lineGrad.addColorStop(1, gInfo.accent + '55')
  ctx.strokeStyle = lineGrad
  ctx.lineWidth   = 5
  ctx.beginPath()
  ctx.moveTo(0, H - 3)
  ctx.lineTo(W, H - 3)
  ctx.stroke()
  ctx.restore()
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.lineTo(x + w - r, y)
  ctx.quadraticCurveTo(x + w, y, x + w, y + r)
  ctx.lineTo(x + w, y + h - r)
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h)
  ctx.lineTo(x + r, y + h)
  ctx.quadraticCurveTo(x, y + h, x, y + h - r)
  ctx.lineTo(x, y + r)
  ctx.quadraticCurveTo(x, y, x + r, y)
  ctx.closePath()
}

// ── Share helpers ──────────────────────────────────────────────────
async function shareOrDownload(canvas, data) {
  const blob   = await new Promise(res => canvas.toBlob(res, 'image/png'))
  const file   = new File([blob], `mathgenius-result-${data.pct}pct.png`, { type: 'image/png' })
  const msgTxt = `🎓 I just scored ${data.pct}% (${data.grade}) in ${data.examType} Maths on MathGenius!\nStudying smarter every day 📚 #MathGenius #WAEC #StudyGoals`

  if (navigator.share && navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ title: 'My MathGenius Result', text: msgTxt, files: [file] })
      return 'shared'
    } catch {}
  }
  // Fallback: download
  const url = URL.createObjectURL(blob)
  const a   = document.createElement('a')
  a.href  = url; a.download = file.name; a.click()
  URL.revokeObjectURL(url)
  return 'downloaded'
}

async function copyToClipboard(canvas) {
  try {
    const blob = await new Promise(res => canvas.toBlob(res, 'image/png'))
    await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })])
    return true
  } catch { return false }
}

// ── Main component ─────────────────────────────────────────────────
export default function ShareResultCard({
  // Required
  pct, score, total, examType,
  // Optional
  name, topic, streakDays, masteryLevel,
  // Layout control
  inline = false,        // true = render card inline (no modal)
  onClose,              // if provided, show close button
}) {
  const canvasRef   = useRef(null)
  const [status,    setStatus]   = useState(null) // 'shared' | 'downloaded' | 'copied'
  const [sharing,   setSharing]  = useState(false)

  const gInfo = getGradeInfo(pct)
  const displayName = name || 'You'
  const date = new Date().toLocaleDateString('en-NG', { day:'numeric', month:'long', year:'numeric' })

  const cardData = { name: displayName, score, total, pct, examType, topic, streakDays, masteryLevel, date, grade: gInfo.grade }

  useEffect(() => {
    if (canvasRef.current) drawCard(canvasRef.current, cardData)
  }, [pct, score, total, examType, name, topic, streakDays, masteryLevel])

  const handleShare = async () => {
    setSharing(true); setStatus(null)
    const result = await shareOrDownload(canvasRef.current, cardData)
    setStatus(result); setSharing(false)
    setTimeout(() => setStatus(null), 3000)
  }

  const handleCopy = async () => {
    const ok = await copyToClipboard(canvasRef.current)
    setStatus(ok ? 'copied' : 'copy_failed')
    setTimeout(() => setStatus(null), 3000)
  }

  const cardEl = (
    <div className="space-y-4">
      {/* Canvas preview */}
      <div className="rounded-2xl overflow-hidden shadow-2xl border border-white/10">
        <canvas ref={canvasRef}
          style={{ width: '100%', height: 'auto', display: 'block' }} />
      </div>

      {/* Action buttons */}
      <div className="grid grid-cols-3 gap-3">
        <button onClick={handleShare} disabled={sharing}
          className="flex flex-col items-center gap-1.5 py-3 px-2 rounded-2xl
                     text-white text-xs font-bold transition-all hover:opacity-90
                     disabled:opacity-50"
          style={{ backgroundColor: gInfo.accent }}>
          {sharing
            ? <span className="w-5 h-5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
            : <span className="text-xl">📲</span>
          }
          <span>Share / Save</span>
        </button>

        <button onClick={handleCopy}
          className="flex flex-col items-center gap-1.5 py-3 px-2 rounded-2xl
                     border-2 border-[var(--color-border)] hover:border-[var(--color-teal)]
                     text-xs font-bold transition-all">
          <span className="text-xl">{status === 'copied' ? '✅' : '📋'}</span>
          <span>{status === 'copied' ? 'Copied!' : 'Copy Image'}</span>
        </button>

        {/* WhatsApp shortcut */}
        <a href={`https://wa.me/?text=${encodeURIComponent(
            `🎓 I scored ${pct}% (${gInfo.grade}) in ${examType} Maths on MathGenius! 📚`
          )}`}
          target="_blank" rel="noopener noreferrer"
          className="flex flex-col items-center gap-1.5 py-3 px-2 rounded-2xl
                     bg-[#25D366] text-white text-xs font-bold
                     transition-all hover:opacity-90">
          <span className="text-xl">💬</span>
          <span>WhatsApp</span>
        </a>
      </div>

      {/* Status feedback */}
      {status && status !== 'copied' && (
        <p className="text-center text-xs font-medium text-[var(--color-teal)]">
          {status === 'shared'     ? '✅ Shared successfully!'
          : status === 'downloaded' ? '✅ Image saved to downloads!'
          : status === 'copy_failed' ? '⚠️ Copy not supported — use Share instead'
          : null}
        </p>
      )}

      {/* Close button */}
      {onClose && (
        <button onClick={onClose}
          className="w-full py-2.5 rounded-xl border-2 border-[var(--color-border)]
                     text-sm font-medium hover:border-[var(--color-teal)] transition-colors">
          Close
        </button>
      )}
    </div>
  )

  if (inline) return cardEl

  // Modal overlay
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
         style={{ backgroundColor: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(6px)' }}>
      <div className="w-full max-w-xl bg-[var(--color-paper)] rounded-3xl p-6 shadow-2xl">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="font-serif font-black text-2xl">Share Your Result</h2>
            <p className="text-xs text-[var(--color-muted)] mt-0.5">
              Your result card is ready — tap Share or save the image
            </p>
          </div>
          {onClose && (
            <button onClick={onClose}
              className="w-8 h-8 rounded-full border-2 border-[var(--color-border)]
                         flex items-center justify-center text-sm font-bold
                         hover:border-[var(--color-ink)] transition-colors">
              ✕
            </button>
          )}
        </div>
        {cardEl}
      </div>
    </div>
  )
}

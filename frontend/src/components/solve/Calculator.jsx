// import { useState } from 'react'
// import SymbolBar from './SymbolBar'

// const KEYS = [
//   { label: 'AC',  type: 'clear',  value: 'clear'  },
//   { label: '(',   type: 'symbol', value: '('      },
//   { label: ')',   type: 'symbol', value: ')'      },
//   { label: '%',   type: 'symbol', value: '%'      },
//   { label: '÷',   type: 'op',    value: '/'      },

//   { label: '7',   type: 'num',   value: '7'      },
//   { label: '8',   type: 'num',   value: '8'      },
//   { label: '9',   type: 'num',   value: '9'      },
//   { label: '⌫',  type: 'back',  value: 'back'   },
//   { label: '×',   type: 'op',   value: '*'       },

//   { label: '4',   type: 'num',   value: '4'      },
//   { label: '5',   type: 'num',   value: '5'      },
//   { label: '6',   type: 'num',   value: '6'      },
//   { label: 'xⁿ', type: 'symbol',value: '^'       },
//   { label: '−',   type: 'op',   value: '-'       },

//   { label: '1',   type: 'num',   value: '1'      },
//   { label: '2',   type: 'num',   value: '2'      },
//   { label: '3',   type: 'num',   value: '3'      },
//   { label: 'π',   type: 'symbol',value: 'pi'     },
//   { label: '+',   type: 'op',   value: '+'       },

//   { label: '0',   type: 'num',   value: '0', wide: true },
//   { label: '.',   type: 'num',   value: '.'      },
//   { label: 'x²',  type: 'symbol',value: '^2'     },
//   { label: '=',   type: 'equals',value: 'equals' },
// ]

// const KEY_STYLES = {
//   num:    'bg-white hover:bg-[var(--color-cream)] text-[var(--color-ink)]',
//   op:     'bg-white hover:bg-[var(--color-cream)] text-[var(--color-teal)] font-bold',
//   symbol: 'bg-[var(--color-cream)] hover:bg-[var(--color-border)] text-[var(--color-ink)] text-sm',
//   clear:  'bg-red-50 hover:bg-red-500 text-red-500 hover:text-white font-semibold',
//   back:   'bg-[var(--color-cream)] hover:bg-[var(--color-border)] text-[var(--color-ink)]',
//   equals: 'bg-[var(--color-gold)] hover:bg-amber-600 text-white font-bold text-xl col-span-1',
// }

// export default function Calculator({ onSolve, mode, onModeChange }) {
//   const [expr, setExpr] = useState('')
//   const [history, setHistory] = useState([])

//   const insert = (val) => setExpr(prev => prev + val)

//   const handleKey = (key) => {
//     if (key.value === 'clear')  { setExpr(''); return }
//     if (key.value === 'back')   { setExpr(prev => prev.slice(0, -1)); return }
//     if (key.value === 'equals') { handleSolve(); return }
//     insert(key.value)
//   }

//   const handleSolve = () => {
//     if (!expr.trim()) return
//     onSolve(expr, mode)
//     setHistory(prev => [expr, ...prev.slice(0, 4)])
//   }

//   return (
//     <div className="card">
//       {/* Display */}
//       <div className="bg-[var(--color-ink)] p-6 min-h-[110px] flex flex-col justify-end">
//         <p className="font-mono text-xs text-white/30 mb-1 min-h-[16px]">
//           {history[0] ? `Last: ${history[0]}` : 'Enter expression'}
//         </p>
//         <div className="font-mono text-3xl text-white flex items-center gap-1 break-all">
//           <span>{expr || '0'}</span>
//           <span className="inline-block w-0.5 h-7 bg-[var(--color-gold)] animate-[blink_1s_step-end_infinite]" />
//         </div>
//       </div>

//       {/* Mode selector */}
//       <div className="flex border-b-2 border-[var(--color-ink)]">
//         {['solve', 'differentiate', 'integrate'].map(m => (
//           <button
//             key={m}
//             onClick={() => onModeChange(m)}
//             className={`flex-1 py-2.5 text-sm font-semibold capitalize transition-all duration-150
//               ${mode === m
//                 ? 'bg-[var(--color-teal)] text-white'
//                 : 'bg-[var(--color-cream)] text-[var(--color-muted)] hover:text-[var(--color-ink)]'
//               }`}
//           >
//             {m === 'solve' ? '⚙️ Solve' : m === 'differentiate' ? 'd/dx Differentiate' : '∫ Integrate'}
//           </button>
//         ))}
//       </div>

//       {/* Symbol bar */}
//       <SymbolBar onInsert={insert} />

//       {/* Text input */}
//       <div className="px-4 py-3 bg-[var(--color-paper)] border-b border-[var(--color-border)]">
//         <input
//           type="text"
//           value={expr}
//           onChange={e => setExpr(e.target.value)}
//           onKeyDown={e => e.key === 'Enter' && handleSolve()}
//           placeholder="Type directly e.g.  x^2 + 5*x + 6 = 0"
//           className="w-full bg-white border-2 border-[var(--color-border)] focus:border-[var(--color-teal)]
//                      rounded-xl px-4 py-2.5 font-mono text-sm text-[var(--color-ink)]
//                      placeholder:text-[var(--color-muted)] transition-colors duration-150"
//         />
//       </div>

//       {/* Keys */}
//       <div className="grid grid-cols-5 gap-px bg-[var(--color-border)]">
//         {KEYS.map((key, i) => (
//           <button
//             key={i}
//             onClick={() => handleKey(key)}
//             className={`py-5 text-base flex items-center justify-center
//                         transition-all duration-100 active:scale-95
//                         ${key.wide ? 'col-span-2' : ''}
//                         ${KEY_STYLES[key.type]}`}
//           >
//             {key.label}
//           </button>
//         ))}
//       </div>

//       {/* History */}
//       {history.length > 0 && (
//         <div className="border-t-2 border-[var(--color-ink)] bg-white">
//           <p className="font-mono text-[9px] uppercase tracking-widest text-[var(--color-muted)] px-4 pt-3 pb-1">
//             Recent
//           </p>
//           {history.map((h, i) => (
//             <button
//               key={i}
//               onClick={() => setExpr(h)}
//               className="w-full text-left px-4 py-2 font-mono text-sm text-[var(--color-muted)]
//                          hover:bg-[var(--color-cream)] hover:text-[var(--color-ink)] transition-colors"
//             >
//               {h}
//             </button>
//           ))}
//         </div>
//       )}
//     </div>
//   )
// } 







import { useState, useRef } from 'react'
import SymbolBar from './SymbolBar'

const KEYS = [
  { label: 'AC',  type: 'clear',  value: 'clear'  },
  { label: '(',   type: 'symbol', value: '('      },
  { label: ')',   type: 'symbol', value: ')'      },
  { label: '%',   type: 'symbol', value: '%'      },
  { label: '÷',   type: 'op',    value: '/'      },

  { label: '7',   type: 'num',   value: '7'      },
  { label: '8',   type: 'num',   value: '8'      },
  { label: '9',   type: 'num',   value: '9'      },
  { label: '⌫',  type: 'back',  value: 'back'   },
  { label: '×',   type: 'op',   value: '*'       },

  { label: '4',   type: 'num',   value: '4'      },
  { label: '5',   type: 'num',   value: '5'      },
  { label: '6',   type: 'num',   value: '6'      },
  { label: 'xⁿ', type: 'symbol',value: '^'       },
  { label: '−',   type: 'op',   value: '-'       },

  { label: '1',   type: 'num',   value: '1'      },
  { label: '2',   type: 'num',   value: '2'      },
  { label: '3',   type: 'num',   value: '3'      },
  { label: 'π',   type: 'symbol',value: 'pi'     },
  { label: '+',   type: 'op',   value: '+'       },

  { label: '0',   type: 'num',   value: '0', wide: true },
  { label: '.',   type: 'num',   value: '.'      },
  { label: 'x²',  type: 'symbol',value: '^2'     },
  { label: '=',   type: 'equals',value: 'equals' },
]

const KEY_STYLES = {
  num:    'bg-white hover:bg-[var(--color-cream)] text-[var(--color-ink)]',
  op:     'bg-white hover:bg-[var(--color-cream)] text-[var(--color-teal)] font-bold',
  symbol: 'bg-[var(--color-cream)] hover:bg-[var(--color-border)] text-[var(--color-ink)] text-sm',
  clear:  'bg-red-50 hover:bg-red-500 text-red-500 hover:text-white font-semibold',
  back:   'bg-[var(--color-cream)] hover:bg-[var(--color-border)] text-[var(--color-ink)]',
  equals: 'bg-[var(--color-gold)] hover:bg-amber-600 text-white font-bold text-xl col-span-1',
}

const MODE_LABELS = {
  solve:         '⚙️ Solve',
  differentiate: 'd/dx Differentiate',
  integrate:     '∫ Integrate',
}

export default function Calculator({ onSolve, mode, onModeChange }) {
  const [expr, setExpr] = useState('')
  const [history, setHistory] = useState([])
  const inputRef = useRef()

  const insert = (val) => {
    setExpr(prev => {
      const el = inputRef.current
      if (el) {
        const start = el.selectionStart
        const end   = el.selectionEnd
        const next  = prev.slice(0, start) + val + prev.slice(end)
        // Restore cursor after state update
        setTimeout(() => {
          el.focus()
          el.setSelectionRange(start + val.length, start + val.length)
        }, 0)
        return next
      }
      return prev + val
    })
  }

  const handleKey = (key) => {
    if (key.value === 'clear')  { setExpr(''); return }
    if (key.value === 'back')   { setExpr(prev => prev.slice(0, -1)); return }
    if (key.value === 'equals') { handleSolve(expr, mode); return }
    insert(key.value)
  }

  const handleSolve = (currentExpr = expr, currentMode = mode) => {
    if (!currentExpr.trim()) return
    onSolve(currentExpr, currentMode)
    setHistory(prev => [currentExpr, ...prev.filter(h => h !== currentExpr).slice(0, 4)])
  }

  // ── When mode tab is clicked: switch mode AND re-evaluate if expr exists ──
  const handleModeChange = (newMode) => {
    onModeChange(newMode)
    if (expr.trim()) {
      onSolve(expr, newMode)   // ← re-evaluate with new mode immediately
    }
  }

  return (
    <div className="card">
      {/* Display */}
      <div className="bg-[var(--color-ink)] p-6 min-h-[110px] flex flex-col justify-end">
        <p className="font-mono text-xs text-white/30 mb-1 min-h-[16px]">
          {history[0] ? `Last: ${history[0]}` : 'Enter expression'}
        </p>
        <div className="font-mono text-3xl text-white flex items-center gap-1 break-all">
          <span>{expr || '0'}</span>
          <span className="inline-block w-0.5 h-7 bg-[var(--color-gold)]
                           animate-[blink_1s_step-end_infinite]" />
        </div>
      </div>

      {/* Mode selector */}
      <div className="flex border-b-2 border-[var(--color-ink)]">
        {['solve', 'differentiate', 'integrate'].map(m => (
          <button
            key={m}
            onClick={() => handleModeChange(m)}   // ← use new handler
            className={`flex-1 py-2.5 text-sm font-semibold capitalize transition-all duration-150
              ${mode === m
                ? 'bg-[var(--color-teal)] text-white'
                : 'bg-[var(--color-cream)] text-[var(--color-muted)] hover:text-[var(--color-ink)]'
              }`}
          >
            {MODE_LABELS[m]}
          </button>
        ))}
      </div>

      {/* Symbol bar */}
      <SymbolBar onInsert={insert} />

      {/* Text input */}
      <div className="px-4 py-3 bg-[var(--color-paper)] border-b border-[var(--color-border)]">
        <input
          ref={inputRef}
          type="text"
          value={expr}
          onChange={e => setExpr(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleSolve()}
          placeholder="Type directly e.g.  x^2 + 5*x + 6 = 0"
          className="w-full bg-white border-2 border-[var(--color-border)]
                     focus:border-[var(--color-teal)] rounded-xl px-4 py-2.5
                     font-mono text-sm text-[var(--color-ink)]
                     placeholder:text-[var(--color-muted)] transition-colors duration-150"
        />
      </div>

      {/* Keys */}
      <div className="grid grid-cols-5 gap-px bg-[var(--color-border)]">
        {KEYS.map((key, i) => (
          <button
            key={i}
            onClick={() => handleKey(key)}
            className={`py-5 text-base flex items-center justify-center
                        transition-all duration-100 active:scale-95
                        ${key.wide ? 'col-span-2' : ''}
                        ${KEY_STYLES[key.type]}`}
          >
            {key.label}
          </button>
        ))}
      </div>

      {/* History */}
      {history.length > 0 && (
        <div className="border-t-2 border-[var(--color-ink)] bg-white">
          <p className="font-mono text-[9px] uppercase tracking-widest
                         text-[var(--color-muted)] px-4 pt-3 pb-1">
            Recent
          </p>
          {history.map((h, i) => (
            <button
              key={i}
              onClick={() => { setExpr(h); handleSolve(h, mode) }}
              className="w-full text-left px-4 py-2 font-mono text-sm
                         text-[var(--color-muted)] hover:bg-[var(--color-cream)]
                         hover:text-[var(--color-ink)] transition-colors"
            >
              {h}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

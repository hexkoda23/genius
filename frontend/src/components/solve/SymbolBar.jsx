const SYMBOL_GROUPS = [
  {
    label: 'Common',
    symbols: [
      { display: '√',  insert: 'sqrt('   },
      { display: 'xⁿ', insert: '^'       },
      { display: 'π',  insert: 'pi'      },
      { display: 'e',  insert: 'e'       },
      { display: '∞',  insert: 'oo'      },
      { display: '|x|',insert: 'Abs('    },
      { display: 'n!', insert: 'factorial('},
    ]
  },
  {
    label: 'Trig',
    symbols: [
      { display: 'sin', insert: 'sin('  },
      { display: 'cos', insert: 'cos('  },
      { display: 'tan', insert: 'tan('  },
      { display: 'sin⁻¹', insert: 'asin(' },
      { display: 'cos⁻¹', insert: 'acos(' },
      { display: 'tan⁻¹', insert: 'atan(' },
    ]
  },
  {
    label: 'Log',
    symbols: [
      { display: 'log',   insert: 'log('  },
      { display: 'ln',    insert: 'ln('   },
      { display: 'log₂',  insert: 'log(2,' },
    ]
  },
  {
    label: 'Calculus',
    symbols: [
      { display: 'd/dx',  insert: 'diff('   },
      { display: '∫',     insert: 'integrate(' },
      { display: '∂',     insert: 'partial(' },
      { display: 'lim',   insert: 'limit('  },
    ]
  },
  {
    label: 'Symbols',
    symbols: [
      { display: 'α', insert: 'alpha' },
      { display: 'β', insert: 'beta'  },
      { display: 'θ', insert: 'theta' },
      { display: 'λ', insert: 'lambda'},
      { display: 'μ', insert: 'mu'    },
      { display: 'σ', insert: 'sigma' },
      { display: 'Σ', insert: 'Sum('  },
      { display: '∏', insert: 'Product(' },
    ]
  },
]

export default function SymbolBar({ onInsert }) {
  return (
    <div className="border-b-2 border-[var(--color-ink)] bg-[var(--color-cream)]">
      {SYMBOL_GROUPS.map(group => (
        <div key={group.label} className="flex items-center gap-1 px-3 py-1.5 border-b border-[var(--color-border)] last:border-b-0 flex-wrap">
          <span className="font-mono text-[9px] tracking-widest uppercase text-[var(--color-muted)] w-14 shrink-0">
            {group.label}
          </span>
          {group.symbols.map(sym => (
            <button
              key={sym.display}
              onClick={() => onInsert(sym.insert)}
              className="font-mono text-sm px-2.5 py-1 bg-white border border-[var(--color-border)]
                         rounded-md text-[var(--color-teal)] font-semibold
                         hover:bg-[var(--color-teal)] hover:text-white hover:border-[var(--color-teal)]
                         transition-all duration-100"
            >
              {sym.display}
            </button>
          ))}
        </div>
      ))}
    </div>
  )
}
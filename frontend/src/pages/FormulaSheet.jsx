import { useState } from 'react'
import { useReveal } from '../hooks/useReveal'

const FORMULAS = {
  'Algebra': [
    { name: 'Quadratic Formula', formula: 'x = (-b ± √(b²-4ac)) / 2a', note: 'For ax² + bx + c = 0' },
    { name: 'Difference of Two Squares', formula: 'a² - b² = (a+b)(a-b)', note: '' },
    { name: 'Perfect Square', formula: '(a+b)² = a² + 2ab + b²', note: '' },
    { name: 'Sum of Cubes', formula: 'a³ + b³ = (a+b)(a²-ab+b²)', note: '' },
    { name: 'Difference of Cubes', formula: 'a³ - b³ = (a-b)(a²+ab+b²)', note: '' },
    { name: 'Discriminant', formula: 'Δ = b² - 4ac', note: 'Δ>0: 2 roots, Δ=0: 1 root, Δ<0: no real roots' },
    { name: 'Index Laws', formula: 'aᵐ × aⁿ = aᵐ⁺ⁿ, aᵐ ÷ aⁿ = aᵐ⁻ⁿ, (aᵐ)ⁿ = aᵐⁿ', note: '' },
    { name: 'Partial Fractions', formula: 'A/(x+a) + B/(x+b)', note: 'Split rational expressions' },
  ],
  'Surds & Indices': [
    { name: 'Surd Simplification', formula: '√(ab) = √a × √b', note: '' },
    { name: 'Rationalising', formula: '1/√a = √a/a', note: 'Multiply top and bottom by √a' },
    { name: 'Conjugate Surd', formula: '1/(a+√b) = (a-√b)/(a²-b)', note: '' },
    { name: 'Negative Index', formula: 'a⁻ⁿ = 1/aⁿ', note: '' },
    { name: 'Fractional Index', formula: 'a^(m/n) = ⁿ√(aᵐ)', note: '' },
    { name: 'Zero Index', formula: 'a⁰ = 1 (a ≠ 0)', note: '' },
  ],
  'Logarithms': [
    { name: 'Definition', formula: 'logₐ(x) = y ⟺ aʸ = x', note: '' },
    { name: 'Product Rule', formula: 'logₐ(xy) = logₐx + logₐy', note: '' },
    { name: 'Quotient Rule', formula: 'logₐ(x/y) = logₐx - logₐy', note: '' },
    { name: 'Power Rule', formula: 'logₐ(xⁿ) = n logₐx', note: '' },
    { name: 'Change of Base', formula: 'logₐx = log x / log a', note: '' },
    { name: 'Natural Log', formula: 'ln x = logₑ x,  e ≈ 2.71828', note: '' },
    { name: 'Log of 1', formula: 'logₐ(1) = 0', note: '' },
    { name: 'Log of Base', formula: 'logₐ(a) = 1', note: '' },
  ],
  'Sequences & Series': [
    { name: 'AP nth term', formula: 'Tₙ = a + (n-1)d', note: 'a = first term, d = common difference' },
    { name: 'AP Sum', formula: 'Sₙ = n/2 (2a + (n-1)d)', note: '' },
    { name: 'GP nth term', formula: 'Tₙ = arⁿ⁻¹', note: 'r = common ratio' },
    { name: 'GP Sum (finite)', formula: 'Sₙ = a(1-rⁿ)/(1-r)', note: 'r ≠ 1' },
    { name: 'GP Sum (infinite)', formula: 'S∞ = a/(1-r)', note: '|r| < 1 only' },
    { name: 'Arithmetic Mean', formula: 'AM = (a+b)/2', note: '' },
    { name: 'Geometric Mean', formula: 'GM = √(ab)', note: '' },
  ],
  'Trigonometry': [
    { name: 'SOH-CAH-TOA', formula: 'sin θ = O/H,  cos θ = A/H,  tan θ = O/A', note: '' },
    { name: 'Pythagorean Identity', formula: 'sin²θ + cos²θ = 1', note: '' },
    { name: 'Sine Rule', formula: 'a/sinA = b/sinB = c/sinC', note: 'Any triangle' },
    { name: 'Cosine Rule', formula: 'a² = b² + c² - 2bc cosA', note: 'Any triangle' },
    { name: 'Area of Triangle', formula: 'Area = ½ab sinC', note: '' },
    { name: 'Double Angle sin', formula: 'sin 2θ = 2 sin θ cos θ', note: '' },
    { name: 'Double Angle cos', formula: 'cos 2θ = cos²θ - sin²θ', note: '' },
    { name: 'Radians', formula: 'π rad = 180°,  1 rad ≈ 57.3°', note: '' },
    { name: 'Arc Length', formula: 's = rθ', note: 'θ in radians' },
    { name: 'Sector Area', formula: 'A = ½r²θ', note: 'θ in radians' },
  ],
  'Calculus': [
    { name: 'Power Rule (diff)', formula: 'd/dx(xⁿ) = nxⁿ⁻¹', note: '' },
    { name: 'Chain Rule', formula: 'd/dx[f(g(x))] = f\'(g(x))·g\'(x)', note: '' },
    { name: 'Product Rule', formula: 'd/dx[uv] = u\'v + uv\'', note: '' },
    { name: 'Quotient Rule', formula: 'd/dx[u/v] = (u\'v - uv\')/v²', note: '' },
    { name: 'Power Rule (int)', formula: '∫xⁿ dx = xⁿ⁺¹/(n+1) + C', note: 'n ≠ -1' },
    { name: 'Integration by Parts', formula: '∫u dv = uv - ∫v du', note: '' },
    { name: 'Definite Integral', formula: '∫[a to b] f(x)dx = F(b) - F(a)', note: '' },
  ],
  'Statistics': [
    { name: 'Mean (ungrouped)', formula: 'x̄ = Σx / n', note: '' },
    { name: 'Mean (grouped)', formula: 'x̄ = Σfx / Σf', note: '' },
    { name: 'Standard Deviation', formula: 'σ = √(Σ(x-x̄)²/n)', note: '' },
    { name: 'Probability', formula: 'P(A) = n(A)/n(S)', note: 'n(S) = sample space' },
    { name: 'Addition Rule', formula: 'P(A∪B) = P(A)+P(B)-P(A∩B)', note: '' },
    { name: 'Permutation', formula: 'nPr = n!/(n-r)!', note: 'Order matters' },
    { name: 'Combination', formula: 'nCr = n!/r!(n-r)!', note: 'Order doesn\'t matter' },
  ],
  'Geometry': [
    { name: 'Distance', formula: 'd = √((x₂-x₁)² + (y₂-y₁)²)', note: '' },
    { name: 'Midpoint', formula: 'M = ((x₁+x₂)/2, (y₁+y₂)/2)', note: '' },
    { name: 'Gradient', formula: 'm = (y₂-y₁)/(x₂-x₁)', note: '' },
    { name: 'Circle Equation', formula: '(x-a)² + (y-b)² = r²', note: 'Centre (a,b), radius r' },
  ],
  'Mensuration': [
    { name: 'Area — Circle', formula: 'A = πr²', note: '' },
    { name: 'Volume — Cylinder', formula: 'V = πr²h', note: '' },
    { name: 'Volume — Cone', formula: 'V = ⅓πr²h', note: '' },
    { name: 'Volume — Sphere', formula: 'V = 4/3 πr³', note: '' },
  ],
}

export default function FormulaSheet() {
  const [activeCategory, setActiveCategory] = useState('Algebra'); const [search, setSearch] = useState(''); const [copied, setCopied] = useState(null); const revealRef = useReveal()
  const categories = Object.keys(FORMULAS)
  const displayFormulas = search ? Object.values(FORMULAS).flat().filter(f => f.name.toLowerCase().includes(search.toLowerCase()) || f.formula.toLowerCase().includes(search.toLowerCase())) : FORMULAS[activeCategory] || []
  const handleCopy = (formula, idx) => { navigator.clipboard.writeText(formula); setCopied(idx); setTimeout(() => setCopied(null), 1500) }

  return (
    <div className="max-w-[1440px] mx-auto px-6 md:px-12 py-12 bg-[var(--color-paper)] min-h-screen relative" ref={revealRef}>
      <div className="grain pointer-events-none" />

      <div className="mb-24 flex flex-col md:flex-row items-end justify-between gap-12 relative z-10">
        <div className="max-w-4xl">
          <p className="eyebrow">CONSTANTS_LIBRARY_v8.2</p>
          <h1 className="font-serif font-black text-7xl md:text-[10rem] tracking-tighter uppercase leading-[0.8] italic">
            FORMULA <br /><span className="text-[var(--color-gold)] not-italic">SHEET.</span>
          </h1>
          <p className="font-serif italic text-2xl text-[var(--color-muted)] mt-12 border-l-4 border-[var(--color-gold)] pl-8 max-w-xl uppercase tracking-tighter">A vaulted repository of mathematical laws and universal constants.</p>
        </div>
      </div>

      <div className="max-w-5xl mx-auto relative z-10">
        <div className="mb-16">
          <p className="eyebrow mb-4">SEARCH_VAULT</p>
          <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="INPUT_SEARCH_PARAMETER... (E.G_QUADRATIC)" className="w-full bg-white border-4 border-[var(--color-ink)] p-8 font-serif font-black text-3xl italic placeholder:opacity-10 uppercase tracking-tighter outline-none focus:bg-[var(--color-cream)] transition-all shadow-[12px_12px_0_var(--color-cream)]" />
        </div>

        {!search && (
          <div className="flex flex-wrap gap-4 mb-16">
            {categories.map(cat => (
              <button key={cat} onClick={() => setActiveCategory(cat)} className={`px-8 py-4 font-mono text-[9px] font-black uppercase tracking-widest border-4 transition-all ${activeCategory === cat ? 'bg-[var(--color-ink)] text-white border-[var(--color-ink)] shadow-[8px_8px_0_var(--color-gold)]' : 'border-[var(--color-ink)] text-[var(--color-ink)] hover:bg-[var(--color-cream)]'}`}>
                {cat.toUpperCase()}_PROTOCOL
              </button>
            ))}
          </div>
        )}

        <div className="border-4 border-[var(--color-ink)] bg-white shadow-[48px_48px_0_var(--color-cream)] overflow-hidden">
          {!search && (
            <div className="bg-[var(--color-ink)] px-12 py-6 flex items-center justify-between">
              <p className="font-serif font-bold text-white uppercase italic text-2xl tracking-tighter">{activeCategory}</p>
              <p className="font-mono text-[9px] font-black uppercase text-white/40 tracking-[0.2em]">{displayFormulas.length}_NODES_DETECTED</p>
            </div>
          )}

          {search && (
            <div className="bg-[var(--color-teal)] px-12 py-6 flex items-center justify-between">
              <p className="font-serif font-bold text-white uppercase italic text-2xl tracking-tighter">SEARCH_RESULTS // "{search}"</p>
              <p className="font-mono text-[9px] font-black uppercase text-white/40 tracking-[0.2em]">{displayFormulas.length}_MATCHES</p>
            </div>
          )}

          {displayFormulas.length === 0 ? (
            <div className="p-24 text-center">
              <p className="font-serif italic font-black text-4xl opacity-10 uppercase tracking-tighter leading-none">NO_CONSTANTS_FOUND.</p>
            </div>
          ) : (
            <div className="divide-y-4 divide-[var(--color-ink)]/5">
              {displayFormulas.map((f, i) => (
                <div key={i} className="p-12 flex flex-col md:flex-row items-start md:items-center justify-between gap-8 hover:bg-[var(--color-paper)] transition-all group relative overflow-hidden">
                  <div className="absolute left-0 top-0 w-1 h-full bg-[var(--color-gold)] opacity-0 group-hover:opacity-100 transition-all" />
                  <div className="flex-1">
                    <p className="font-mono text-[9px] font-black uppercase text-[var(--color-gold)] mb-2 tracking-[0.4em]">{f.name}</p>
                    <div className="font-serif font-black text-4xl md:text-5xl italic uppercase tracking-tighter leading-none mb-4 text-[var(--color-ink)]">
                      {f.formula}
                    </div>
                    {f.note && (
                      <p className="font-serif italic text-xl text-[var(--color-muted)] uppercase tracking-tight">{f.note}</p>
                    )}
                  </div>
                  <button onClick={() => handleCopy(f.formula, i)} className="shrink-0 border-4 border-[var(--color-ink)] p-4 font-mono text-[9px] font-black uppercase hover:bg-[var(--color-ink)] hover:text-white transition-all shadow-[4px_4px_0_var(--color-cream)]">
                    {copied === i ? 'SYSC_COPIED' : 'COPY_NODE'}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
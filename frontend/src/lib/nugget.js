import { useState, useEffect } from 'react'

const NUGGETS = [
  "Every complex problem can be broken into simpler steps. Start with what you know.",
  "The equals sign (=) was invented by Robert Recorde in 1557 because he was tired of writing 'is equal to'.",
  "π (pi) has been calculated to over 100 trillion digits — and it never repeats.",
  "Zero was formally introduced to mathematics by Brahmagupta in 628 AD.",
  "A prime number has exactly two factors: 1 and itself. There are infinitely many primes.",
  "The Fibonacci sequence appears in sunflower seeds, pinecones, and seashells.",
  "Euler's identity e^(iπ) + 1 = 0 links five fundamental mathematical constants.",
  "The word 'algebra' comes from the Arabic 'al-jabr', meaning 'reunion of broken parts'.",
  "There are more possible chess games than atoms in the observable universe.",
  "A googol is 10^100. A googolplex is 10^(googol). Both are finite — infinity is neither.",
  "The sum of all angles in any triangle is always 180° on a flat surface.",
  "Negative numbers were called 'absurd' by European mathematicians until the 17th century.",
  "Calculus was independently invented by Newton and Leibniz in the same century.",
  "The Pythagorean theorem was known in Babylon over 1,000 years before Pythagoras.",
  "If you shuffle a deck of cards, the exact order has almost certainly never existed before.",
  "The number 1 is neither prime nor composite — it is called a unit.",
  "Matrix multiplication is not commutative: AB ≠ BA in general.",
  "Integration finds area under a curve; differentiation finds the slope at a point.",
  "In a room of just 23 people, there is a 50% chance two share a birthday.",
  "The harmonic series 1 + 1/2 + 1/3 + ... diverges — it grows without bound.",
  "Logarithms were invented in 1614 by John Napier to turn multiplication into addition.",
  "A quadratic equation ax²+bx+c=0 has discriminant b²-4ac. If negative, no real roots.",
  "Sine and cosine repeat every 2π radians — they are called periodic functions.",
  "Standard deviation tells you how spread out your data is from the mean.",
  "Vectors have both magnitude and direction. Scalars have magnitude only.",
  "De Morgan's Laws: NOT(A AND B) = (NOT A) OR (NOT B).",
  "A matrix is singular (non-invertible) when its determinant is exactly zero.",
  "The Fundamental Theorem of Calculus proves differentiation and integration are inverses.",
  "The natural log ln(x) uses base e ≈ 2.71828, discovered by Jacob Bernoulli.",
  "Independent events satisfy P(A and B) = P(A) × P(B).",
  "A perfect number equals the sum of its proper divisors. 6 = 1+2+3 is the smallest.",
  "There are exactly five Platonic solids — tetrahedron, cube, octahedron, dodecahedron, icosahedron.",
  "The golden ratio φ ≈ 1.618 appears in art, architecture, and nature.",
  "A fractal is a shape that looks the same at every level of zoom.",
  "The sum of the first n odd numbers is always n². So 1+3+5+7 = 4² = 16.",
  "Every even number greater than 2 is believed to be the sum of two primes — Goldbach's Conjecture.",
  "There are exactly 43 quintillion possible positions in a Rubik's Cube.",
  "An asymptote is a line that a curve approaches but never actually touches.",
  "The imaginary number i = √(-1). Squaring it gives -1.",
  "The complex plane plots real numbers on the x-axis and imaginary on the y-axis.",
  "sin²θ + cos²θ = 1 for any angle θ — the Pythagorean identity.",
  "The modulus of a complex number a+bi is √(a²+b²) — its distance from the origin.",
  "A function is one-to-one (injective) if different inputs always give different outputs.",
  "Pascal's Triangle contains every binomial coefficient (n choose r).",
  "The number of ways to arrange n items is n! (n factorial). 5! = 120.",
  "Combination C(n,r) = n! / (r!(n-r)!) counts selections where order doesn't matter.",
  "A geometric series a + ar + ar² + ... converges only when |r| < 1.",
  "The angle in a semicircle is always 90° — Thales' theorem.",
  "Two tangents drawn from an external point to a circle are always equal in length.",
  "The exterior angle of a triangle equals the sum of the two non-adjacent interior angles.",
  "A diagonal of a rectangle bisects it into two congruent right-angled triangles.",
  "The locus of points equidistant from two fixed points is the perpendicular bisector.",
  "Completing the square turns ax²+bx+c into a(x+p)²+q form for easy solving.",
  "Indices rule: a^m × a^n = a^(m+n). Division: a^m ÷ a^n = a^(m-n).",
  "Surds are irrational roots like √2 ≈ 1.414 that cannot be simplified to fractions.",
  "To rationalize √2 in a denominator, multiply top and bottom by √2.",
  "In direct proportion y = kx. In inverse proportion y = k/x.",
  "The gradient (slope) between two points = (y₂-y₁)/(x₂-x₁).",
  "Parallel lines have equal gradients. Perpendicular lines have gradients that multiply to -1.",
  "The equation of a circle with centre (a,b) and radius r is (x-a)²+(y-b)²=r².",
  "A bearing is measured clockwise from North and written as three digits, e.g. 045°.",
  "The sine rule: a/sinA = b/sinB = c/sinC — works for any triangle.",
  "The cosine rule: a² = b² + c² - 2bc cosA — extends Pythagoras to non-right triangles.",
  "Area of a triangle = ½ab sinC when two sides and the included angle are known.",
  "Radians and degrees: π radians = 180°. One radian ≈ 57.3°.",
  "Arc length = rθ where r is radius and θ is angle in radians.",
  "Area of a sector = ½r²θ with θ in radians.",
  "Speed = Distance ÷ Time. Acceleration = Change in velocity ÷ Time.",
  "Integration by substitution is the reverse of the chain rule.",
  "Integration by parts: ∫u dv = uv - ∫v du.",
  "The chain rule: d/dx[f(g(x))] = f'(g(x)) × g'(x).",
  "The product rule: d/dx[uv] = u'v + uv'.",
  "The quotient rule: d/dx[u/v] = (u'v - uv') / v².",
  "A stationary point has gradient zero. It can be a maximum, minimum, or inflection.",
  "The second derivative test: if f''(x) > 0 at a stationary point, it's a minimum.",
  "Exponential growth follows y = ae^(kx). Exponential decay has k < 0.",
  "log_a(xy) = log_a(x) + log_a(y) — logarithm product rule.",
  "log_a(x/y) = log_a(x) - log_a(y) — logarithm quotient rule.",
  "log_a(x^n) = n·log_a(x) — logarithm power rule.",
  "Change of base: log_a(x) = log(x)/log(a) = ln(x)/ln(a).",
  "A matrix determinant 2×2: |A| = ad - bc for [[a,b],[c,d]].",
  "The inverse of a 2×2 matrix A = [[a,b],[c,d]] is (1/|A|)[[d,-b],[-c,a]].",
  "Cramer's rule solves simultaneous equations using determinants.",
  "A normal distribution is bell-shaped, symmetric, mean = median = mode.",
  "68% of data falls within 1 standard deviation of the mean in a normal distribution.",
  "Pearson's correlation r ranges from -1 (perfect negative) to +1 (perfect positive).",
  "Bayes' theorem: P(A|B) = P(B|A)·P(A) / P(B).",
  "The expected value E(X) = Σ x·P(x) for a discrete random variable.",
  "Variance Var(X) = E(X²) - [E(X)]².",
  "A Laplace transform converts a time-domain function into a complex frequency domain.",
  "L{e^(at)} = 1/(s-a) is a fundamental Laplace transform pair.",
  "A differential equation involves a function and its derivatives.",
  "First order separable ODEs can be solved by separating variables and integrating both sides.",
  "The integrating factor method solves linear first-order ODEs of the form dy/dx + Py = Q.",
  "The number e was first described by Jacob Bernoulli studying compound interest in 1683.",
  "Compound interest formula: A = P(1 + r/n)^(nt).",
  "Simple interest: I = PRT/100 where P=principal, R=rate, T=time in years.",
  "Profit % = (Profit / Cost Price) × 100.",
  "Discount % = (Discount / Marked Price) × 100.",
  "The mode is the most frequent value. The median is the middle value when sorted.",
  "For grouped data, modal class is the class with the highest frequency.",
  "Cumulative frequency curves (ogives) are used to find medians and quartiles graphically.",
  "Interquartile range IQR = Q3 - Q1 and measures the spread of the middle 50% of data.",
  "A set is a collection of distinct objects. The empty set ∅ has no elements.",
  "Union A∪B contains elements in A or B. Intersection A∩B contains elements in both.",
  "The complement A' contains all elements not in A (within the universal set).",
  "De Morgan for sets: (A∪B)' = A'∩B'. And (A∩B)' = A'∪B'.",
  "n(A∪B) = n(A) + n(B) - n(A∩B) — the inclusion-exclusion principle.",
  "A function maps each input to exactly one output. A relation may map to many.",
  "The domain is the set of allowed inputs. The range is the set of actual outputs.",
  "The inverse function f⁻¹ undoes f. If f(2)=5, then f⁻¹(5)=2.",
  "Composite function fg(x) means apply g first, then f: f(g(x)).",
  "The modulus function |x| = x if x≥0, and -x if x<0.",
]

export function getDailyNugget() {
  const day   = new Date().getDay() + new Date().getDate() + new Date().getMonth()
  return NUGGETS[day % NUGGETS.length]
}

export function getFormattedDate() {
  return new Date().toLocaleDateString('en-GB', {
    weekday: 'long',
    day:     'numeric',
    month:   'long',
    year:    'numeric',
  })
}

export function getGreeting() {
  const hour = new Date().getHours()
  if (hour < 12) return 'Good morning'
  if (hour < 17) return 'Good afternoon'
  return 'Good evening'
}

export function getFormattedTime(date) {
  return date.toLocaleTimeString('en-GB', {
    hour:   '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true,
  })
}

// Live clock — updates every second
export function useLiveClock() {
  const [now, setNow] = useState(new Date())
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(id)
  }, [])
  return now
}

// Rotating nugget — cycles every 2 minutes
export function useRotatingNugget() {
  const getIndex = () => {
    const base = new Date().getDay() + new Date().getDate() + new Date().getMonth()
    const slot = Math.floor(Date.now() / (2 * 60 * 1000)) // changes every 2 mins
    return (base + slot) % NUGGETS.length
  }

  const [index, setIndex] = useState(getIndex)

  useEffect(() => {
    // Sync to next 2-minute boundary
    const msUntilNext = (2 * 60 * 1000) - (Date.now() % (2 * 60 * 1000))
    const timeout = setTimeout(() => {
      setIndex(getIndex())
      const id = setInterval(() => setIndex(getIndex()), 2 * 60 * 1000)
      return () => clearInterval(id)
    }, msUntilNext)
    return () => clearTimeout(timeout)
  }, [])

  return NUGGETS[index]
}
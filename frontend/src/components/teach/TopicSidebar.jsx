import { useState } from 'react'

const LEVEL_TOPICS = {
  primary: {
    'Number & Numeration': [
      'Counting and Place Value',
      'Addition and Subtraction',
      'Multiplication and Division',
      'Fractions (Half, Quarter, Third)',
      'Decimals and Money',
      'Percentages',
      'Factors and Multiples',
      'HCF and LCM',
      'Prime Numbers',
      'Roman Numerals',
    ],
    'Basic Geometry': [
      '2D Shapes (Triangle, Rectangle, Circle, Square)',
      '3D Shapes (Cube, Cuboid, Sphere, Cylinder)',
      'Angles (Right Angle, Acute, Obtuse)',
      'Lines (Parallel, Perpendicular)',
      'Symmetry',
      'Perimeter and Area',
    ],
    'Measurement': [
      'Length, Mass and Capacity',
      'Time and Calendars',
      'Temperature',
      'Money and Currency',
    ],
    'Data & Statistics': [
      'Pictograms and Bar Charts',
      'Simple Tables and Tally Charts',
      'Reading Data from Graphs',
    ],
  },

  jss: {
    'Number & Numeration': [
      'Whole Numbers and Place Value',
      'Fractions: Proper, Improper, Mixed Numbers',
      'Decimals and Decimal Places',
      'Percentages and Applications',
      'Ratio and Proportion',
      'HCF and LCM',
      'Prime Numbers and Factorisation',
      'Number Bases (Base 2, 8, 10)',
      'Approximation and Significant Figures',
      'Directed Numbers (Positive and Negative)',
      'Standard Form (Introduction)',
    ],
    'Basic Operations': [
      'Order of Operations (BODMAS/BIDMAS)',
      'Word Problems — Basic Operations',
      'Estimation and Rounding',
    ],
    'Algebra': [
      'Algebraic Expressions and Simplification',
      'Simple Equations in One Variable',
      'Simple Inequalities',
      'Substitution into Formulae',
      'Word Problems Leading to Equations',
      'Factorisation — Common Factors',
      'Expansion of Brackets',
      'Introduction to Simultaneous Equations',
    ],
    'Geometry': [
      'Types of Angles: Acute, Obtuse, Reflex, Right',
      'Angles on a Straight Line and at a Point',
      'Vertically Opposite Angles',
      'Angles in a Triangle',
      'Types of Triangles: Equilateral, Isosceles, Scalene',
      'Quadrilaterals: Square, Rectangle, Parallelogram, Rhombus, Trapezium',
      'Circles: Radius, Diameter, Circumference, Chord, Arc',
      'Construction: Bisecting Lines and Angles',
      'Symmetry: Line and Rotational',
      'Bearings (Introduction)',
    ],
    'Mensuration': [
      'Perimeter of Plane Shapes',
      'Area of Rectangles, Triangles, Circles, Trapeziums',
      'Volume of Cuboids and Cylinders',
      'Surface Area of Cuboids',
      'Units of Measurement and Conversion',
    ],
    'Statistics': [
      'Data Collection and Presentation',
      'Bar Charts, Pie Charts, Pictograms',
      'Frequency Tables',
      'Mean, Median, Mode for Ungrouped Data',
      'Range',
    ],
    'Everyday Mathematics': [
      'Profit and Loss',
      'Simple Interest',
      'Hire Purchase (Introduction)',
      'Rates, Taxes and Bills',
      'Foreign Exchange (Introduction)',
      'Venn Diagrams with Two Sets',
    ],
  },

  secondary: {
    'Number & Numeration': [
      'Number Bases (Binary, Octal, Hexadecimal)',
      'Fractions, Decimals and Percentages',
      'Approximation and Significant Figures',
      'Standard Form (Scientific Notation)',
      'Indices and Laws of Indices',
      'Surds and Simplification of Surds',
      'Rational and Irrational Numbers',
      'Ratios, Proportions and Rates',
      'Logarithms and Laws of Logarithms',
    ],
    'Algebra': [
      'Algebraic Expressions and Simplification',
      'Linear Equations',
      'Simultaneous Linear Equations',
      'Quadratic Equations',
      'Polynomials and Remainder Theorem',
      'Factor Theorem',
      'Variation (Direct, Inverse, Joint, Partial)',
      'Inequalities and Number Lines',
      'Sequences and Series (AP and GP)',
      'Binomial Expansion',
      'Functions and Mappings',
      'Partial Fractions',
    ],
    'Geometry & Mensuration': [
      'Angles and Parallel Lines',
      'Triangles (Congruency, Similarity)',
      'Quadrilaterals and Polygons',
      'Circle Theorems (Chords, Tangents, Arcs)',
      'Mensuration (Perimeter, Area, Volume)',
      'Surface Area and Volume of Solids',
      'Plane Geometry and Proofs',
      'Construction and Loci',
      'Transformation (Translation, Reflection, Rotation, Enlargement)',
    ],
    'Trigonometry': [
      'Trigonometric Ratios (sin, cos, tan)',
      'Right-Angled Triangles',
      'Angles of Elevation and Depression',
      'Bearings and Distances',
      'Sine Rule and Cosine Rule',
      'Area of Triangle using Trigonometry',
      'Trigonometric Identities',
      'Graphs of Trigonometric Functions',
      'Solving Trigonometric Equations',
    ],
    'Earth Geometry': [
      'Longitude and Latitude',
      'Great Circles and Small Circles',
      'Distance Along a Great Circle',
      'Distance Along a Circle of Latitude',
      'Time Zones and Local Time',
    ],
    'Coordinate Geometry': [
      'Cartesian Plane and Plotting Points',
      'Distance Between Two Points',
      'Midpoint of a Line Segment',
      'Gradient (Slope) of a Line',
      'Equation of a Straight Line',
      'Parallel and Perpendicular Lines',
      'Equation of a Circle',
    ],
    'Statistics & Probability': [
      'Data Collection and Presentation',
      'Frequency Tables and Histograms',
      'Mean, Median, Mode',
      'Range, Variance and Standard Deviation',
      'Cumulative Frequency and Ogive',
      'Box and Whisker Plots',
      'Probability (Basic, Addition, Multiplication Rule)',
      'Permutations and Combinations',
    ],
    'Vectors & Matrices': [
      'Vector Notation and Representation',
      'Addition and Subtraction of Vectors',
      'Position Vectors and Magnitude',
      'Matrix Notation and Operations',
      'Determinant and Inverse of a 2×2 Matrix',
      'Solving Simultaneous Equations using Matrices',
      'Transformation Matrices',
    ],
    'Introductory Calculus': [
      'Limits and Continuity',
      'Differentiation from First Principles',
      'Rules of Differentiation',
      'Differentiation of Trig Functions',
      'Tangent and Normal to a Curve',
      'Maximum and Minimum Values',
      'Integration as Reverse Differentiation',
      'Definite and Indefinite Integrals',
      'Area Under a Curve',
    ],
  },

  university: {
    'Algebra & Pre-Calculus': [
      'Sets, Relations and Functions',
      'Complex Numbers and Argand Diagram',
      'Polar Form and De Moivre\'s Theorem',
      'Exponential and Logarithmic Functions',
      'Hyperbolic Functions',
      'Partial Fractions (All cases)',
      'Mathematical Induction',
      'Binomial Theorem (General term)',
    ],
    'Calculus I': [
      'Limits and L\'Hôpital\'s Rule',
      'Continuity and Differentiability',
      'Differentiation — All Rules',
      'Implicit and Parametric Differentiation',
      'Higher Order Derivatives',
      'Taylor and Maclaurin Series',
      'Curve Sketching and Optimisation',
      'Integration by Substitution',
      'Integration by Parts',
      'Integration by Partial Fractions',
      'Trigonometric Substitution',
      'Reduction Formulae',
      'Improper Integrals',
    ],
    'Calculus II': [
      'Area Between Curves',
      'Volumes of Revolution',
      'Arc Length and Surface Area',
      'Sequences and Series (Convergence Tests)',
      'Power Series and Radius of Convergence',
      'Fourier Series',
    ],
    'Multivariable Calculus': [
      'Partial Derivatives',
      'Gradient, Divergence and Curl',
      'Directional Derivatives',
      'Double and Triple Integrals',
      'Change of Variables (Jacobian)',
      'Line Integrals and Surface Integrals',
      'Green\'s Theorem',
      'Stokes\' Theorem',
      'Divergence Theorem',
    ],
    'Differential Equations': [
      'First Order ODEs (Separable, Linear, Exact)',
      'Integrating Factor Method',
      'Bernoulli\'s Equation',
      'Second Order ODEs',
      'Method of Undetermined Coefficients',
      'Variation of Parameters',
      'Laplace Transforms',
      'Inverse Laplace Transforms',
      'Systems of Differential Equations',
      'Partial Differential Equations (Intro)',
    ],
    'Linear Algebra': [
      'Vectors in 2D and 3D',
      'Dot Product and Cross Product',
      'Lines and Planes in 3D',
      'Matrix Operations and Types',
      'Determinants (Any Order)',
      'Matrix Inverse (Gauss-Jordan)',
      'Systems of Linear Equations',
      'Eigenvalues and Eigenvectors',
      'Diagonalisation',
      'Linear Transformations',
    ],
    'Numerical Methods': [
      'Errors in Numerical Computation',
      'Bisection Method',
      'Newton-Raphson Method',
      'Lagrange Interpolation',
      'Trapezoidal Rule',
      'Simpson\'s Rule',
      'Euler\'s Method',
      'Runge-Kutta Methods',
    ],
    'Statistics & Probability': [
      'Conditional Probability and Bayes\' Theorem',
      'Discrete Random Variables',
      'Binomial and Poisson Distributions',
      'Normal Distribution',
      't-Distribution and Chi-Square',
      'Sampling Theory and Central Limit Theorem',
      'Hypothesis Testing',
      'Regression and Correlation',
      'Analysis of Variance (ANOVA)',
    ],
    'Engineering Mathematics': [
      'Laplace Transforms (Full — K.A. Stroud)',
      'Z-Transforms',
      'Fourier Transforms',
      'Vector Analysis',
      'Complex Analysis',
      'Cauchy\'s Integral Theorem',
      'Residues and Poles',
    ],
  },
}

// ── Level tab config ──────────────────────────────────────────────────
const LEVELS = [
  { value: 'primary', label: 'PRIMARY' },
  { value: 'jss', label: 'JUNIOR' },
  { value: 'secondary', label: 'SENIOR' },
  { value: 'university', label: 'ACADEMIC' },
]

export default function TopicSidebar({ selectedTopic, selectedLevel, onTopicSelect, onLevelChange }) {
  const [openGroups, setOpenGroups] = useState({ 'Algebra': true })

  const toggleGroup = (group) => {
    setOpenGroups(prev => ({ ...prev, [group]: !prev[group] }))
  }

  const topics = LEVEL_TOPICS[selectedLevel] || LEVEL_TOPICS['secondary']

  return (
    <div className="bg-white border-2 border-[var(--color-ink)] flex flex-col h-[calc(100vh-140px)] sticky top-[100px] overflow-hidden shadow-[8px_8px_0_var(--color-cream)]">

      {/* Header */}
      <div className="bg-[var(--color-ink)] px-6 py-4 shrink-0 flex items-center justify-between">
        <p className="font-mono text-[9px] font-black text-[var(--color-gold)] tracking-[0.3em] uppercase">SYLLABUS_ARCHIVE</p>
        <div className="w-2 h-2 rounded-full bg-[var(--color-gold)] animate-pulse" />
      </div>

      {/* Level Switcher */}
      <div className="grid grid-cols-2 bg-[var(--color-cream)] shrink-0">
        {LEVELS.map(lvl => (
          <button
            key={lvl.value}
            onClick={() => {
              onLevelChange(lvl.value)
              setOpenGroups({})
            }}
            className={`py-4 text-[9px] font-black tracking-widest transition-all border-b border-r last:border-r-0 border-[var(--color-ink)]/10
              ${selectedLevel === lvl.value
                ? 'bg-[var(--color-ink)] text-white'
                : 'text-[var(--color-muted)] hover:bg-white hover:text-[var(--color-ink)]'
              }`}
          >
            {lvl.label}
          </button>
        ))}
      </div>

      {/* Scrollable topic list */}
      <div className="overflow-y-auto flex-1 custom-scrollbar">
        {Object.entries(topics).map(([group, items]) => (
          <div key={group} className="border-b border-[var(--color-ink)]/10 last:border-0">
            {/* Group header */}
            <button
              onClick={() => toggleGroup(group)}
              className="w-full flex items-center justify-between px-6 py-4 hover:bg-[var(--color-cream)] transition-all group"
            >
              <span className="font-mono text-[10px] tracking-[0.2em] uppercase text-[var(--color-ink)] font-black">
                {group}
              </span>
              <span className={`font-mono text-[8px] transition-transform duration-300 ${openGroups[group] ? 'rotate-180' : ''}`}>
                ▼
              </span>
            </button>

            {/* Topic items */}
            {openGroups[group] && (
              <div className="bg-white pb-2">
                {items.map(topic => (
                  <button
                    key={topic}
                    onClick={() => onTopicSelect(topic)}
                    className={`w-full text-left px-8 py-2.5 text-xs transition-all border-l-4 leading-relaxed
                      ${selectedTopic === topic
                        ? 'border-[var(--color-gold)] bg-[var(--color-gold)]/5 text-[var(--color-ink)] font-black'
                        : 'border-transparent text-[var(--color-muted)] hover:text-[var(--color-ink)] hover:border-[var(--color-ink)]/20'
                      }`}
                  >
                    {topic}
                  </button>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

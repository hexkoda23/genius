import asyncio
import os
import json
import httpx
from datetime import datetime
from fastapi import APIRouter, Depends, Request
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field
from app.services.groq_service import ask_groq, ask_groq_stream
from app.dependencies import require_auth

router = APIRouter(prefix="/teach", tags=["Teach"])

SUPABASE_URL         = os.environ.get("SUPABASE_URL", "").rstrip("/")
SUPABASE_SERVICE_KEY = os.environ.get("SUPABASE_SERVICE_KEY", "")

_SB_HEADERS = {
    "apikey":        SUPABASE_SERVICE_KEY,
    "Authorization": f"Bearer {SUPABASE_SERVICE_KEY}",
    "Content-Type":  "application/json",
    "Prefer":        "return=minimal",
}


# ── Internal teach-log helper ──────────────────────────────────────────
# Replaces the broken asyncio.create_task(log_teach_interaction(...)) pattern.
# This is a plain coroutine — safe to fire-and-forget with asyncio.create_task.

async def _log_teach(user_id: str, topic: str, question: str,
                     response_length: int, level: str):
    """Write one row to teach_sessions via Supabase REST. Non-fatal."""
    if not SUPABASE_URL or not SUPABASE_SERVICE_KEY:
        return
    payload = {
        "user_id":         user_id,
        "topic":           topic,
        "question":        question[:500],
        "response_length": response_length,
        "level":           level,
        "created_at":      datetime.utcnow().isoformat(),
    }
    try:
        async with httpx.AsyncClient(timeout=8) as client:
            await client.post(
                f"{SUPABASE_URL}/rest/v1/teach_sessions",
                headers=_SB_HEADERS,
                json=payload,
            )
    except Exception:
        pass  # logging is non-critical — never break the teaching flow


class TeachRequest(BaseModel):
    question: str = Field(..., max_length=2000)
    topic: str    = Field("General Mathematics", max_length=200)
    level: str    = Field("sss", max_length=50)
    conversation_history: list = []
    user_id: str = None


class TopicRequest(BaseModel):
    topic: str
    level: str = "sss"


class FeedbackRequest(BaseModel):
    message_id: str
    topic: str
    level: str
    question: str
    response_preview: str
    rating: str        # "up" or "down"
    comment: str = ""


# ── Level helpers ─────────────────────────────────────────────────────

def get_level_description(level: str) -> str:
    descriptions = {
        "primary":    "primary school student (Primary 1–6, ages 6–12). Use very simple language, relatable real-life examples, and avoid jargon.",
        "jss":        "junior secondary school student (JSS 1–3, ages 11–15). Use clear simple explanations, build on primary knowledge, and introduce new concepts step by step with plenty of examples.",
        "sss":        "senior secondary school student (SSS 1–3, ages 15–18) preparing for WAEC, NECO, or JAMB. Use proper mathematical notation, show full working, and reference exam-relevant techniques.",
        "secondary":  "senior secondary school student preparing for WAEC, NECO, or JAMB. Use proper mathematical notation, show full working, and reference exam-relevant techniques.",
        "university": "university student. Use advanced mathematical concepts, rigorous notation where appropriate, and academic-level explanations.",
    }
    return descriptions.get(level, descriptions["sss"])


def get_textbook(level: str) -> str:
    books = {
        "primary":    "New General Mathematics for Primary Schools",
        "jss":        "New General Mathematics for Junior Secondary Schools (Books 1–3)",
        "sss":        "New General Mathematics for Senior Secondary Schools (Books 1–3)",
        "secondary":  "New General Mathematics for Senior Secondary Schools (Books 1–3)",
        "university": "relevant university mathematics textbooks",
    }
    return books.get(level, books["sss"])


# ── Endpoints ──────────────────────────────────────────────────────────

@router.post("/ask")
async def ask_tutor(request: TeachRequest, http_request: Request, user=Depends(require_auth)):
    level_desc = get_level_description(request.level)
    prompt = f"""You are Euler, an expert Nigerian mathematics tutor.
You are teaching a {level_desc}.
Textbook reference: {get_textbook(request.level)}

Topic: {request.topic}
Student's question: {request.question}

Please explain thoroughly with step-by-step working.
Use LaTeX for all mathematical expressions (e.g. \\(x^2\\) inline, $$....$$ for display).
Be encouraging and patient."""

    response = await ask_groq(prompt, request.conversation_history)

    asyncio.create_task(_log_teach(
        user_id=user.id,
        topic=request.topic,
        question=request.question,
        response_length=len(response),
        level=request.level,
    ))

    return {"success": True, "response": response, "topic": request.topic}


@router.post("/ask/stream")
async def ask_tutor_stream(request: TeachRequest, http_request: Request, user=Depends(require_auth)):
    """Streaming version of /teach/ask — sends tokens one by one via SSE."""
    level_desc = get_level_description(request.level)
    textbook   = get_textbook(request.level)

    system_content = (
        f"You are Euler, an expert Nigerian mathematics tutor.\n"
        f"You are teaching a {level_desc}.\n"
        f"Textbook reference: {textbook}\n\n"
        f"Topic: {request.topic}\n\n"
        "Explain thoroughly with step-by-step working. "
        "Use LaTeX for all mathematical expressions "
        "(inline: \\(...\\), display: $$...$$). "
        "Be encouraging and patient."
    )

    # Build the conversation history with the system message prepended
    history_with_system = [{"role": "system", "content": system_content}]
    for turn in request.conversation_history:
        role    = turn.get("role", "user")
        content = turn.get("content", "")
        if role in ("user", "assistant") and content:
            history_with_system.append({"role": role, "content": content})

    # Fire-and-forget logging (response_length=0 for streaming — we don't buffer)
    asyncio.create_task(_log_teach(
        user_id=user.id,
        topic=request.topic,
        question=request.question,
        response_length=0,
        level=request.level,
    ))

    async def _event_stream():
        try:
            async for token in ask_groq_stream(
                user_message=request.question,
                conversation_history=history_with_system,
            ):
                yield f"data: {json.dumps({'token': token})}\n\n"
        except Exception as exc:
            yield f"data: {json.dumps({'token': f'[ERROR] {exc}'})}\n\n"
        yield "data: [DONE]\n\n"

    return StreamingResponse(
        _event_stream(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )


@router.post("/overview")
async def topic_overview(request: TopicRequest, user=Depends(require_auth)):
    level_desc = get_level_description(request.level)
    prompt = f"""Give a clear structured overview of '{request.topic}' for a {level_desc}.
Include:
1. Simple plain-English definition
2. Real-world use or application
3. Key formulas in LaTeX
4. One fully worked example
5. Common mistakes to avoid"""
    response = await ask_groq(prompt)
    return {"success": True, "overview": response, "topic": request.topic}


@router.get("/topics")
async def get_topics():
    topics = {
        "primary": {
            "Number & Numeration": ["Counting and Place Value","Addition and Subtraction","Multiplication and Division","Fractions (Half, Quarter, Third)","Decimals and Money","Percentages","Factors and Multiples","HCF and LCM","Prime Numbers","Roman Numerals"],
            "Basic Geometry": ["2D Shapes (Triangle, Rectangle, Circle, Square)","3D Shapes (Cube, Cuboid, Sphere, Cylinder)","Angles (Right Angle, Acute, Obtuse)","Lines (Parallel, Perpendicular)","Symmetry","Perimeter and Area"],
            "Measurement": ["Length (cm, m, km)","Mass (g, kg)","Capacity (ml, l)","Time (Hours, Minutes, Seconds)","Temperature","Money and Change"],
            "Data Handling": ["Pictograms and Bar Charts","Tally Charts","Simple Tables","Reading Graphs"],
            "Everyday Maths": ["Buying and Selling","Profit and Loss (Introduction)","Simple Interest (Introduction)","Distance, Speed and Time (Basic)"],
        },
        "jss": {
            "Number & Numeration": ["Whole Numbers and Place Value","Fractions: Proper, Improper, Mixed Numbers","Decimals and Decimal Places","Percentages and Applications","Ratio and Proportion","HCF and LCM","Prime Numbers and Factorisation","Number Bases (Base 2, 8, 10)","Approximation and Significant Figures","Directed Numbers (Positive and Negative)","Standard Form (Introduction)"],
            "Basic Operations": ["Order of Operations (BODMAS/BIDMAS)","Word Problems — Basic Operations","Estimation and Rounding"],
            "Algebra": ["Algebraic Expressions and Simplification","Simple Equations in One Variable","Simple Inequalities","Substitution into Formulae","Word Problems Leading to Equations","Factorisation — Common Factors","Expansion of Brackets","Introduction to Simultaneous Equations"],
            "Geometry": ["Types of Angles: Acute, Obtuse, Reflex, Right","Angles on a Straight Line and at a Point","Vertically Opposite Angles","Angles in a Triangle","Types of Triangles: Equilateral, Isosceles, Scalene","Quadrilaterals: Square, Rectangle, Parallelogram, Rhombus, Trapezium","Circles: Radius, Diameter, Circumference, Chord, Arc","Construction: Bisecting Lines and Angles","Symmetry: Line and Rotational","Bearings (Introduction)"],
            "Mensuration": ["Perimeter of Plane Shapes","Area of Rectangles, Triangles, Circles, Trapeziums","Volume of Cuboids and Cylinders","Surface Area of Cuboids","Units of Measurement and Conversion"],
            "Statistics": ["Data Collection and Presentation","Bar Charts, Pie Charts, Pictograms","Frequency Tables","Mean, Median, Mode for Ungrouped Data","Range"],
            "Everyday Mathematics": ["Profit and Loss","Simple Interest","Hire Purchase (Introduction)","Rates, Taxes and Bills","Foreign Exchange (Introduction)","Venn Diagrams with Two Sets"],
        },
        "sss": {
            "Number & Numeration": ["Number Bases (Binary, Octal, Hexadecimal)","Fractions, Decimals and Percentages","Approximation and Significant Figures","Standard Form (Scientific Notation)","Indices and Laws of Indices","Surds and Simplification of Surds","Rational and Irrational Numbers","Ratios, Proportions and Rates","Logarithms and Laws of Logarithms"],
            "Algebra": ["Algebraic Expressions and Simplification","Linear Equations","Simultaneous Linear Equations","Quadratic Equations","Polynomials and Remainder Theorem","Factor Theorem","Variation (Direct, Inverse, Joint, Partial)","Inequalities and Number Lines","Sequences and Series (AP and GP)","Binomial Expansion","Functions and Mappings","Partial Fractions"],
            "Geometry & Mensuration": ["Angles and Parallel Lines","Triangles (Congruency, Similarity)","Quadrilaterals and Polygons","Circle Theorems (Chords, Tangents, Arcs)","Mensuration (Perimeter, Area, Volume)","Surface Area and Volume of Solids","Plane Geometry and Proofs","Construction and Loci","Transformation (Translation, Reflection, Rotation, Enlargement)"],
            "Trigonometry": ["Trigonometric Ratios (sin, cos, tan)","Right-Angled Triangles","Angles of Elevation and Depression","Bearings and Distances","Sine Rule and Cosine Rule","Area of Triangle using Trigonometry","Trigonometric Identities","Graphs of Trigonometric Functions","Solving Trigonometric Equations"],
            "Earth Geometry": ["Longitude and Latitude","Great Circles and Small Circles","Distance Along a Great Circle","Distance Along a Circle of Latitude","Time Zones and Local Time"],
            "Coordinate Geometry": ["Cartesian Plane and Plotting Points","Distance Between Two Points","Midpoint of a Line Segment","Gradient (Slope) of a Line","Equation of a Straight Line","Parallel and Perpendicular Lines","Equation of a Circle"],
            "Statistics & Probability": ["Data Collection and Presentation","Frequency Tables and Histograms","Mean, Median, Mode","Range, Variance and Standard Deviation","Cumulative Frequency and Ogive","Box and Whisker Plots","Probability (Basic, Addition, Multiplication Rule)","Permutations and Combinations"],
            "Vectors & Matrices": ["Vector Notation and Representation","Addition and Subtraction of Vectors","Position Vectors and Magnitude","Matrix Notation and Operations","Determinant and Inverse of a 2×2 Matrix","Solving Simultaneous Equations using Matrices","Transformation Matrices"],
            "Introductory Calculus": ["Limits and Continuity","Differentiation from First Principles","Rules of Differentiation","Differentiation of Trig Functions","Tangent and Normal to a Curve","Maximum and Minimum Values","Integration as Reverse Differentiation","Definite and Indefinite Integrals","Area Under a Curve"],
        },
        "secondary": None,
        "university": {
            "Algebra & Pre-Calculus": ["Sets, Relations and Functions","Complex Numbers and Argand Diagram","Polar Form and De Moivre's Theorem","Polynomial Division and Rational Functions","Exponential and Logarithmic Functions","Hyperbolic Functions","Partial Fractions (All cases)","Mathematical Induction","Binomial Theorem (General term)"],
            "Calculus I": ["Limits and L'Hôpital's Rule","Continuity and Differentiability","Differentiation — All Rules","Implicit and Parametric Differentiation","Higher Order Derivatives","Taylor and Maclaurin Series","Curve Sketching and Optimisation","Integration by Substitution","Integration by Parts","Integration by Partial Fractions","Trigonometric Substitution","Reduction Formulae","Improper Integrals"],
            "Calculus II": ["Area Between Curves","Volumes of Revolution","Arc Length and Surface Area","Sequences and Series (Convergence Tests)","Power Series and Radius of Convergence","Fourier Series"],
            "Multivariable Calculus": ["Partial Derivatives","Gradient, Divergence and Curl","Directional Derivatives","Double and Triple Integrals","Change of Variables (Jacobian)","Line Integrals and Surface Integrals","Green's Theorem","Stokes' Theorem","Divergence Theorem"],
            "Differential Equations": ["First Order ODEs (Separable, Linear, Exact)","Integrating Factor Method","Bernoulli's Equation","Second Order ODEs","Method of Undetermined Coefficients","Variation of Parameters","Laplace Transforms","Inverse Laplace Transforms","Systems of Differential Equations","Partial Differential Equations (Intro)"],
            "Linear Algebra": ["Vectors in 2D and 3D","Dot Product and Cross Product","Lines and Planes in 3D","Matrix Operations and Types","Determinants (Any Order)","Matrix Inverse (Gauss-Jordan)","Systems of Linear Equations","Vector Spaces and Subspaces","Eigenvalues and Eigenvectors","Diagonalisation","Linear Transformations"],
            "Numerical Methods": ["Errors in Numerical Computation","Bisection Method","Newton-Raphson Method","Lagrange Interpolation","Newton's Divided Differences","Trapezoidal Rule","Simpson's Rule","Euler's Method","Runge-Kutta Methods","Gauss-Seidel Iteration"],
            "Statistics & Probability": ["Conditional Probability and Bayes' Theorem","Discrete Random Variables","Binomial and Poisson Distributions","Normal Distribution","t-Distribution and Chi-Square","Sampling Theory and Central Limit Theorem","Hypothesis Testing","Regression and Correlation","Analysis of Variance (ANOVA)"],
            "Engineering Mathematics": ["Laplace Transforms (Full — K.A. Stroud)","Z-Transforms","Fourier Transforms","Vector Analysis","Calculus of Variations","Optimisation Methods","Complex Analysis","Cauchy's Integral Theorem","Residues and Poles"],
        },
    }
    topics["secondary"] = topics["sss"]
    return {"success": True, "topics": topics}


@router.get("/wiki/{topic}")
async def get_topic_wiki(topic: str, level: str = "sss"):
    level_desc = get_level_description(level)
    prompt = f"""Create concise study notes on: {topic}
Target student: {level_desc}

Use clear markdown with these exact sections:

## Overview
Brief plain-English explanation (2–3 sentences max).

## Key Concepts
- Bullet list of the most important ideas

## Core Formulas
List each formula with a short label. Use LaTeX (e.g. $$x = \\frac{{-b \\pm \\sqrt{{b^2-4ac}}}}{{2a}}$$).

## Worked Example
One clear step-by-step worked example with a final boxed answer.

## Common Exam Mistakes
- 2–3 mistakes students commonly make

Keep each section brief and exam-focused."""

    content = await ask_groq(prompt, [])
    return {"topic": topic, "content": content}


@router.post("/feedback")
async def submit_feedback(request: FeedbackRequest, user=Depends(require_auth)):
    """Store thumbs up/down feedback in Supabase."""
    from supabase import create_client
    url = os.environ.get("SUPABASE_URL")
    key = os.environ.get("SUPABASE_SERVICE_KEY")

    if not url or not key:
        return {"success": False, "error": "Supabase not configured"}

    sb  = create_client(url, key)
    row = {
        "message_id":       request.message_id,
        "user_id":          user.id,          # verified — never trust client-sent user_id
        "topic":            request.topic,
        "level":            request.level,
        "question":         request.question,
        "response_preview": request.response_preview[:300],
        "rating":           request.rating,
        "comment":          request.comment,
    }
    result = sb.table("teach_feedback").insert(row).execute()
    return {"success": True, "id": result.data[0]["id"] if result.data else None}
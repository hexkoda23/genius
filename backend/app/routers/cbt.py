from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel
from typing import Optional, List
from app.services.groq_service import ask_groq
import os, json, re, httpx, time, hashlib
from datetime import date

router = APIRouter(prefix="/cbt", tags=["CBT"])

# ── In-memory explanation cache ───────────────────────────────────────────
# Prevents the same CBT explanation being regenerated for every user who
# expands the same question (very common in popular past-paper questions).
_EXPL_CACHE: dict = {}          # key: hash of question → (timestamp, text)
_EXPL_TTL   = 60 * 60 * 24     # cache entries live for 24 hours
_EXPL_MAX   = 500               # max entries before oldest are dropped

def _expl_key(req_data: dict) -> str:
    """Stable hash of the question fields so identical questions share a cache entry."""
    blob = json.dumps({
        "q": req_data.get("question_text", ""),
        "a": req_data.get("correct_answer", ""),
        "t": req_data.get("topic", ""),
    }, sort_keys=True)
    return hashlib.md5(blob.encode()).hexdigest()

def _expl_get(key: str):
    entry = _EXPL_CACHE.get(key)
    if entry and time.time() - entry[0] < _EXPL_TTL:
        return entry[1]
    return None

def _expl_set(key: str, value: str):
    if len(_EXPL_CACHE) >= _EXPL_MAX:
        # Drop the oldest quarter of entries to make room
        oldest = sorted(_EXPL_CACHE, key=lambda k: _EXPL_CACHE[k][0])
        for k in oldest[:_EXPL_MAX // 4]:
            del _EXPL_CACHE[k]
    _EXPL_CACHE[key] = (time.time(), value)


class ParseQuestionsRequest(BaseModel):
    markdown_content: str
    exam_type: str = "JAMB"
    year: Optional[int] = None
    subject: str = "Mathematics"


class ExplainRequest(BaseModel):
    question_text: str
    option_a: str
    option_b: str
    option_c: str
    option_d: str
    correct_answer: str
    student_answer: str
    topic: Optional[str] = None


class CBTReportRequest(BaseModel):
    questions: list
    score: int
    total: int
    time_taken_secs: int
    exam_type: str
    topic: Optional[str] = None


class MCQRequest(BaseModel):
    topic: str
    difficulty: str = "medium"
    level: str = "secondary"


def parse_option(text: str, letter: str) -> str:
    """Extract option text from a line like 'A. some text'"""
    prefix = f"{letter}."
    if prefix in text:
        return text.split(prefix, 1)[1].strip()
    return text.strip()


def detect_correct_answer(options: dict, lines: list) -> Optional[str]:
    """
    Try to detect correct answer if marked in source.
    Returns A/B/C/D or None.
    """
    for line in lines:
        l = line.strip().upper()
        for letter in ['A', 'B', 'C', 'D']:
            if l.startswith(f"ANSWER: {letter}") or l.startswith(f"CORRECT: {letter}"):
                return letter
    return None


@router.post("/parse")
async def parse_questions(request: ParseQuestionsRequest):
    prompt = f"""You are given a raw markdown file containing {request.exam_type} past exam questions.

Parse EVERY question and return a JSON array. Each object must have:
- question_no: integer
- question_text: the full question (clean, no escape characters)
- option_a: text of option A only (no "A." prefix)
- option_b: text of option B only
- option_c: text of option C only
- option_d: text of option D only
- correct_answer: "A", "B", "C", or "D" — if marked, use it; otherwise use null
- topic: guess the math topic (e.g. "Quadratic Equations", "Probability", "Trigonometry")
- difficulty: guess "easy", "medium", or "hard"

Rules:
- Clean up any OCR artifacts like repeated text or broken fractions
- If a question references a diagram you cannot see, still include it
- Return ONLY the raw JSON array, no markdown, no explanation

Here is the content:
---
{request.markdown_content[:8000]}
---"""

    response = await ask_groq(prompt)   # ← was missing await

    # Strip markdown fences
    clean = response.strip()
    if clean.startswith("```"):
        parts = clean.split("```")
        clean = parts[1] if len(parts) > 1 else clean
        if clean.startswith("json"):
            clean = clean[4:]
    clean = clean.strip().rstrip("```").strip()

    # Remove control characters that break JSON parsing
    clean = re.sub(r'[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]', '', clean)
    clean = clean.replace('\t', ' ')

    try:
        questions = json.loads(clean)
        return {
            "success":   True,
            "questions": questions,
            "count":     len(questions),
        }
    except json.JSONDecodeError:
        # Try extracting just the array
        match = re.search(r'\[.*\]', clean, re.DOTALL)
        if match:
            try:
                questions = json.loads(match.group())
                return {
                    "success":   True,
                    "questions": questions,
                    "count":     len(questions),
                }
            except Exception:
                pass
        return {
            "success": False,
            "error":   "Could not parse JSON",
            "raw":     clean[:500],
        }


@router.post("/explain")
async def explain_answer(request: ExplainRequest):
    """Euler explains why the correct answer is right and others are wrong."""
    topic_str = f" (Topic: {request.topic})" if request.topic else ""
    wrong      = request.student_answer != request.correct_answer

    prompt = f"""A student answered a multiple choice mathematics question{topic_str}.

Question: {request.question_text}

Options:
A. {request.option_a}
B. {request.option_b}
C. {request.option_c}
D. {request.option_d}

Correct Answer: {request.correct_answer}
Student chose: {request.student_answer}
{"The student got it WRONG." if wrong else "The student got it CORRECT."}

{"Explain clearly why " + request.correct_answer + " is correct and why " + request.student_answer + " is wrong." if wrong else "Confirm why " + request.correct_answer + " is correct with a brief explanation."}

Also briefly explain why each wrong option is incorrect.
Be warm, encouraging and concise. Show any working needed."""

    explanation = await ask_groq(prompt)   # ← was missing await
    return {"success": True, "explanation": explanation}


@router.post("/report-summary")
async def generate_report_summary(request: CBTReportRequest):
    """Generate an AI motivational summary for the CBT report."""
    correct   = request.score
    total     = request.total
    pct       = round((correct / total) * 100) if total > 0 else 0
    mins      = request.time_taken_secs // 60
    secs      = request.time_taken_secs % 60

    wrong_topics = list(set([
        q.get('topic', 'Unknown')
        for q in request.questions
        if not q.get('is_correct') and q.get('topic')
    ]))

    prompt = f"""A student just completed a {request.exam_type} Mathematics CBT exam.

Results:
- Score: {correct}/{total} ({pct}%)
- Time taken: {mins} minutes {secs} seconds
- Topics they got wrong: {', '.join(wrong_topics) if wrong_topics else 'None'}

Write a short (3-4 sentence) personalised report:
1. Congratulate or encourage based on score
2. Mention specific weak topics if any
3. Give one actionable tip to improve
4. End with a motivational line

Be warm, specific and encouraging like a caring Nigerian teacher."""

    summary = await ask_groq(prompt)   # ← was missing await — THIS was the 500 error
    return {"success": True, "summary": summary, "percentage": pct}


class ClassifyDifficultyRequest(BaseModel):
    questions: list  # list of { id, question_text, option_a, option_b, option_c, option_d }
    batch_size: int = 10


@router.post("/classify-difficulty")
async def classify_difficulty(request: ClassifyDifficultyRequest):
    """
    Use Groq to classify questions as easy / medium / hard.
    Processes in batches and returns { id: difficulty } map.
    """
    results = {}
    questions = request.questions
    batch_size = min(request.batch_size, 20)

    for i in range(0, len(questions), batch_size):
        batch = questions[i:i + batch_size]

        formatted = "\n\n".join([
            f"Q{j+1} [id:{q['id']}]\n"
            f"Question: {q['question_text']}\n"
            f"A. {q.get('option_a','')}\n"
            f"B. {q.get('option_b','')}\n"
            f"C. {q.get('option_c','')}\n"
            f"D. {q.get('option_d','')}"
            for j, q in enumerate(batch)
        ])

        prompt = f"""You are a Nigerian mathematics examiner classifying WAEC/NECO/JAMB questions by difficulty.

Classify each question as exactly one of: easy, medium, hard

Criteria:
- easy: straightforward recall, single-step, basic arithmetic or definitions
- medium: requires 2-3 steps, moderate application of formula or concept  
- hard: multi-step reasoning, complex algebra, unfamiliar setup, or tricky options

Questions:
{formatted}

Return ONLY a valid JSON object mapping each id to its difficulty. Example:
{{"abc-123": "easy", "def-456": "hard"}}

No explanation. No markdown. Just the JSON object."""

        response = await ask_groq(prompt)   # ← was missing await

        # Clean and parse
        clean = response.strip()
        if clean.startswith("```"):
            parts = clean.split("```")
            for part in parts:
                part = part.strip()
                if part.startswith("json"):
                    part = part[4:].strip()
                if part.startswith("{"):
                    clean = part
                    break
        clean = clean.strip().rstrip("```").strip()

        try:
            batch_results = json.loads(clean)
            results.update(batch_results)
        except Exception:
            # Fallback: assign medium to all in failed batch
            for q in batch:
                results[q['id']] = 'medium'

    return {"success": True, "classifications": results, "total": len(results)}


@router.post("/verify-answers")
async def verify_answers(request: Request):
    body = await request.json()
    questions = body.get("questions", [])  # list of {id, question_text, option_a..d, correct_answer}

    sb_url = os.getenv("SUPABASE_URL", "")
    sb_key = os.getenv("SUPABASE_SERVICE_KEY", "")

    verified = []
    for q in questions[:20]:  # batch max 20
        prompt = f"""You are a Nigerian mathematics expert checking WAEC/JAMB/NECO answers.

Question: {q['question_text']}
A) {q['option_a']}
B) {q['option_b']}  
C) {q['option_c']}
D) {q['option_d']}

Stored answer: {q['correct_answer']}

Is the stored answer correct? Reply ONLY with this JSON:
{{"correct": true/false, "actual_answer": "A/B/C/D", "confidence": "high/medium/low"}}"""

        try:
            response = await ask_groq(prompt)   # ← use ask_groq consistently
            result = json.loads(response)
            verified.append({
                "id":             q["id"],
                "stored_answer":  q["correct_answer"],
                "ai_answer":      result.get("actual_answer"),
                "match":          result.get("correct"),
                "confidence":     result.get("confidence"),
            })
        except Exception:
            verified.append({"id": q["id"], "error": "parse_failed"})

    return {"verified": verified}


# ── Daily Challenge ───────────────────────────────────────────
@router.get("/daily-challenge")
async def get_daily_challenge(exam_type: str = "JAMB"):
    """Return today's deterministic daily challenge question."""
    sb_url = os.getenv("SUPABASE_URL", "")
    sb_key = os.getenv("SUPABASE_SERVICE_KEY", "")
    hdrs   = {"apikey": sb_key, "Authorization": f"Bearer {sb_key}"}

    res = httpx.get(
        f"{sb_url}/rest/v1/exam_questions",
        params={
            "select": "*",
            "exam_type": f"eq.{exam_type}",
            "option_a": "not.is.null",
            "correct_answer": "not.is.null",
            "order": "id",
            "limit": "500",
        },
        headers=hdrs,
        timeout=15,
    )
    questions = res.json()
    if not questions:
        raise HTTPException(status_code=404, detail="No questions available")

    day_num  = (date.today() - date(2024, 1, 1)).days
    today_q  = questions[day_num % len(questions)]
    return {"question": today_q, "date": date.today().isoformat()}


# ── AI MCQ Generator ──────────────────────────────────────────
@router.post("/generate-mcq")
async def generate_mcq(request: MCQRequest):
    """Use Groq to generate a multiple-choice question on any topic."""
    prompt = f"""Generate one multiple-choice mathematics question for a Nigerian {request.level} school student.
Topic: {request.topic}
Difficulty: {request.difficulty}

Return ONLY valid JSON (no markdown, no extra text):
{{
  "question_text": "...",
  "option_a": "...",
  "option_b": "...",
  "option_c": "...",
  "option_d": "...",
  "correct_answer": "A",
  "explanation": "Step-by-step working showing how to arrive at the answer..."
}}"""

    text = await ask_groq(prompt, [])   # ← was missing await
    m    = re.search(r'\{[\s\S]*\}', text)
    if not m:
        raise HTTPException(status_code=500, detail="AI did not return valid JSON")
    try:
        return json.loads(m.group())
    except json.JSONDecodeError:
        raise HTTPException(status_code=500, detail="Could not parse AI response")
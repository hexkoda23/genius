import os
import json
from fastapi import APIRouter, Depends, Request
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field
from typing import Optional
from groq import Groq
from app.services.math_service import solve_expression, differentiate, integrate_expr
from app.services.groq_service import ask_groq
from app.dependencies import require_auth

router = APIRouter(prefix="/solve", tags=["Solve"])


class SolveRequest(BaseModel):
    expression: str = Field(..., max_length=1000)
    mode: str = "solve"

class ExplainRequest(BaseModel):
    expression: str = Field(..., max_length=1000)
    result: str     = Field(..., max_length=2000)

class ImageSolveRequest(BaseModel):
    image_base64: str
    image_type: str = "image/jpeg"
    extra_instruction: Optional[str] = None

class PracticeRequest(BaseModel):
    topic: str
    level: str = "secondary"
    difficulty: str = "easy"
    question_number: int = 1
    previous_questions: list = []   # tracks what was already asked this session
    exam_context: str = ""          # e.g. "WAEC exam style" for predicted mode

class WorkedExampleRequest(BaseModel):
    topic: str
    level: str = "secondary"
    difficulty: str = "easy"

class HintsRequest(BaseModel):
    topic: str
    question: str
    answer: str          # used to craft progressive hints without giving it away

class RetryQuestionRequest(BaseModel):
    topic: str
    level: str = "secondary"
    original_question: str
    student_wrong_answer: str

class GradeRequest(BaseModel):
    topic: str
    question: str
    correct_answer: str
    student_answer: str


@router.post("/")
async def solve(request: SolveRequest):
    if request.mode == "differentiate":
        result = differentiate(request.expression)
    elif request.mode == "integrate":
        result = integrate_expr(request.expression)
    else:
        result = solve_expression(request.expression)
    return {"success": True, "data": result}


@router.post("/explain")
async def explain_solution(request: ExplainRequest, user=Depends(require_auth)):
    prompt = f"""A student solved '{request.expression}' and got '{request.result}'.
Show ALL methods for solving this problem step-by-step with full working.
Make it very clear, warm and easy for a student to understand."""
    explanation = await ask_groq(prompt)   # ← was missing await
    return {"success": True, "explanation": explanation}


@router.post("/image")
async def solve_from_image(request: ImageSolveRequest, http_request: Request, user=Depends(require_auth)):
    instruction = (
        request.extra_instruction or
        (
            "This image contains a mathematics exam paper or question sheet. "
            "Identify and solve EVERY numbered question you can see in the image, one by one. "
            "For each question:\n"
            "- State the question number clearly (e.g. Question 1, Question 2, ...)\n"
            "- Show full step-by-step working\n"
            "- State the final answer and which option (A/B/C/D) is correct if it is MCQ\n\n"
            "Work through ALL questions from top to bottom. Do not skip any."
        )
    )
    response = await ask_groq(          # ← was missing await
        user_message=instruction,
        image_base64=request.image_base64,
        image_type=request.image_type
    )
    return {"success": True, "explanation": response}


@router.post("/practice/question")
async def generate_question(request: PracticeRequest, user=Depends(require_auth)):
    # Build the avoid-repeats block from session history
    avoid_block = ""
    if request.previous_questions:
        avoid_block = "\n\nDo NOT repeat or closely resemble any of these questions already asked this session:\n"
        for i, q in enumerate(request.previous_questions, 1):
            avoid_block += f"  {i}. {q}\n"
        avoid_block += "Generate a COMPLETELY DIFFERENT question covering a distinct aspect of the topic."

    exam_block = f"\n\nIMPORTANT: {request.exam_context}" if request.exam_context else ""

    prompt = f"""Generate question {request.question_number} of 5 for a {request.level} student.
Topic: {request.topic}
Difficulty: {request.difficulty}

Difficulty guide:
- easy: single-step, direct application of one rule or formula
- medium: 2-3 step problem requiring method selection
- hard: multi-step problem requiring deep understanding and synthesis
{avoid_block}{exam_block}

CRITICAL FORMAT — respond using EXACTLY these three markers on their own lines, with all content after the colon:
QUESTION: [Write the full, self-contained question here. Include all numbers, units, and context needed.]
ANSWER: [Write the complete step-by-step worked solution here. Show every step. End with "Therefore, the answer is X."]
HINT1: [Tiny nudge — just remind the student which concept or formula applies. Do NOT show any working.]
HINT2: [Show the first step only — set up the problem but don't solve it.]
HINT3: [Show the method clearly up to the second-to-last step, leaving only the final calculation.]

Do not add any text before QUESTION: or after the HINT: line."""

    response = await ask_groq(prompt)

    # Multi-line-safe parser: capture everything between section markers
    import re
    question, answer, hint = "", "", ""

    import re as _re
    q_match  = _re.search(r"QUESTION:\s*(.+?)(?=\nANSWER:|\Z)",  response, _re.DOTALL)
    a_match  = _re.search(r"ANSWER:\s*(.+?)(?=\nHINT1:|\Z)",     response, _re.DOTALL)
    h1_match = _re.search(r"HINT1:\s*(.+?)(?=\nHINT2:|\Z)",      response, _re.DOTALL)
    h2_match = _re.search(r"HINT2:\s*(.+?)(?=\nHINT3:|\Z)",      response, _re.DOTALL)
    h3_match = _re.search(r"HINT3:\s*(.+?)\Z",                    response, _re.DOTALL)

    question = q_match.group(1).strip()  if q_match  else response.strip()
    answer   = a_match.group(1).strip()  if a_match  else ""
    hint1    = h1_match.group(1).strip() if h1_match else ""
    hint2    = h2_match.group(1).strip() if h2_match else ""
    hint3    = h3_match.group(1).strip() if h3_match else ""

    if not answer:
        parts = response.split("ANSWER:")
        if len(parts) > 1:
            answer = parts[1].split("HINT1:")[0].strip()

    return {
        "success":  True,
        "question": question,
        "answer":   answer,
        "hints":    [h for h in [hint1, hint2, hint3] if h],
    }


@router.post("/practice/worked-example")
async def get_worked_example(request: WorkedExampleRequest, user=Depends(require_auth)):
    """Return a fully solved example before the session starts."""
    prompt = f"""Create a worked example for a {request.level} student studying {request.topic}.
Difficulty: {request.difficulty}

Write ONE clear example problem with a complete step-by-step solution.
This is shown BEFORE the student attempts questions, so make it instructive and clear.

Use EXACTLY this format:
EXAMPLE: [A specific, concrete example problem]
SOLUTION: [Full step-by-step working. Number each step. End with "Therefore, the answer is X."]
TAKEAWAY: [One key insight or tip the student should remember from this example]"""

    response = await ask_groq(prompt)
    import re as _re
    ex_match = _re.search(r"EXAMPLE:\s*(.+?)(?=\nSOLUTION:|\Z)",  response, _re.DOTALL)
    so_match = _re.search(r"SOLUTION:\s*(.+?)(?=\nTAKEAWAY:|\Z)", response, _re.DOTALL)
    ta_match = _re.search(r"TAKEAWAY:\s*(.+?)\Z",                   response, _re.DOTALL)

    return {
        "success":   True,
        "example":   ex_match.group(1).strip() if ex_match else "",
        "solution":  so_match.group(1).strip() if so_match else "",
        "takeaway":  ta_match.group(1).strip() if ta_match else "",
    }


@router.post("/practice/retry-question")
async def get_retry_question(request: RetryQuestionRequest, user=Depends(require_auth)):
    """Generate a simpler version of a question the student got wrong."""
    prompt = f"""A student got this question wrong. Generate a SIMPLER version to help them understand the concept.

Topic: {request.topic} ({request.level})
Original question: {request.original_question}
Student's wrong answer: {request.student_wrong_answer}

Rules:
- Make it simpler (smaller numbers, more scaffolded, fewer steps)
- Cover the SAME concept so they can build confidence
- This is a remedial question, not a penalty — be encouraging

CRITICAL FORMAT:
QUESTION: [The simpler remedial question]
ANSWER: [Full step-by-step solution]
HINT1: [Gentle first nudge — which concept applies]
HINT2: [First step of the working]
HINT3: [Almost complete working, one step left]"""

    response = await ask_groq(prompt)
    import re as _re
    q_match  = _re.search(r"QUESTION:\s*(.+?)(?=\nANSWER:|\Z)",  response, _re.DOTALL)
    a_match  = _re.search(r"ANSWER:\s*(.+?)(?=\nHINT1:|\Z)",     response, _re.DOTALL)
    h1_match = _re.search(r"HINT1:\s*(.+?)(?=\nHINT2:|\Z)",      response, _re.DOTALL)
    h2_match = _re.search(r"HINT2:\s*(.+?)(?=\nHINT3:|\Z)",      response, _re.DOTALL)
    h3_match = _re.search(r"HINT3:\s*(.+?)\Z",                    response, _re.DOTALL)

    return {
        "success":  True,
        "question": q_match.group(1).strip()  if q_match  else "",
        "answer":   a_match.group(1).strip()  if a_match  else "",
        "hints":    [h.group(1).strip() for h in [h1_match, h2_match, h3_match] if h],
        "is_retry": True,
    }


@router.post("/practice/grade")
async def grade_answer(request: GradeRequest, user=Depends(require_auth)):
    prompt = f"""A student answered a mathematics question. Grade their answer.

Topic: {request.topic}
Question: {request.question}
Correct Answer: {request.correct_answer}
Student Answer: {request.student_answer}

Assess if the student's answer is correct or partially correct.
Be generous — if the method is right but there is a small arithmetic error, say partially correct.

Respond in this exact format:
RESULT: [CORRECT or INCORRECT or PARTIAL]
SCORE: [0, 50, or 100]
FEEDBACK: [2-3 encouraging sentences explaining what they got right/wrong and how to improve]
MOTIVATION: [one short motivational sentence]"""

    response   = await ask_groq(prompt)   # ← was missing await
    result     = 'INCORRECT'
    score      = 0
    feedback   = response
    motivation = "Keep practising!"

    for line in response.split('\n'):
        if line.startswith('RESULT:'):
            result = line.replace('RESULT:', '').strip()
        elif line.startswith('SCORE:'):
            try:
                score = int(line.replace('SCORE:', '').strip())
            except Exception:
                score = 0
        elif line.startswith('FEEDBACK:'):
            feedback = line.replace('FEEDBACK:', '').strip()
        elif line.startswith('MOTIVATION:'):
            motivation = line.replace('MOTIVATION:', '').strip()

    return {
        "success":    True,
        "result":     result,
        "score":      score,
        "feedback":   feedback,
        "motivation": motivation,
        "is_correct": result == 'CORRECT',
    }


# ─────────────────────────────────────────────────────────────────────────
# SOCIAL v2 — Battle questions, Question bank review
# ─────────────────────────────────────────────────────────────────────────

class BattleQuestionsRequest(BaseModel):
    topic: str
    level: str = "secondary"
    difficulty: str = "medium"

class ReviewQuestionRequest(BaseModel):
    topic: str
    level: str
    question_text: str
    answer_text: str
    hint: str = ""


@router.post("/battle/questions")
async def generate_battle_questions(request: BattleQuestionsRequest, user=Depends(require_auth)):
    """Generate all 5 questions for a battle room up-front so both players get the same set."""
    import re as _re, asyncio

    async def gen_one(n):
        prompt = f"""Generate question {n} of 5 for a {request.level} student.
Topic: {request.topic}
Difficulty: {request.difficulty}

CRITICAL FORMAT:
QUESTION: [Clear, self-contained question with all numbers/units]
ANSWER: [Full step-by-step solution ending with "Therefore, the answer is X."]
HINT1: [Concept/formula nudge only]
HINT2: [First step setup]
HINT3: [Working up to second-to-last step]

Do not add text before QUESTION: or after the final HINT3: line."""
        resp  = await ask_groq(prompt)
        q_m   = _re.search(r"QUESTION:\s*(.+?)(?=\nANSWER:|\Z)",  resp, _re.DOTALL)
        a_m   = _re.search(r"ANSWER:\s*(.+?)(?=\nHINT1:|\Z)",    resp, _re.DOTALL)
        h1_m  = _re.search(r"HINT1:\s*(.+?)(?=\nHINT2:|\Z)",     resp, _re.DOTALL)
        h2_m  = _re.search(r"HINT2:\s*(.+?)(?=\nHINT3:|\Z)",     resp, _re.DOTALL)
        h3_m  = _re.search(r"HINT3:\s*(.+?)\Z",                  resp, _re.DOTALL)
        return {
            "question": q_m.group(1).strip()  if q_m  else resp.strip(),
            "answer":   a_m.group(1).strip()  if a_m  else "",
            "hints":    [h.group(1).strip() for h in [h1_m, h2_m, h3_m] if h],
        }

    questions = await asyncio.gather(*[gen_one(n) for n in range(1, 6)])
    return {"success": True, "questions": list(questions)}


@router.post("/battle/grade")
async def grade_battle_answer(request: GradeRequest, user=Depends(require_auth)):
    """Lightweight grader for battle — speed matters so we keep it brief."""
    prompt = f"""Grade this answer quickly.
Topic: {request.topic}
Question: {request.question}
Correct Answer: {request.correct_answer}
Student Answer: {request.student_answer}

RESULT: [CORRECT or INCORRECT or PARTIAL]
SCORE: [100, 50, or 0]
FEEDBACK: [One sentence]"""

    resp   = await ask_groq(prompt)
    result, score, feedback = "INCORRECT", 0, "Keep trying!"
    for line in resp.split("\n"):
        if line.startswith("RESULT:"):   result   = line[7:].strip()
        elif line.startswith("SCORE:"):
            try: score = int(line[6:].strip())
            except: score = 0
        elif line.startswith("FEEDBACK:"): feedback = line[9:].strip()
    return {"success": True, "result": result, "score": score,
            "feedback": feedback, "is_correct": result == "CORRECT"}


@router.post("/question-bank/review")
async def review_student_question(request: ReviewQuestionRequest, user=Depends(require_auth)):
    """Euler reviews a student-submitted question for quality and correctness."""
    prompt = f"""A student submitted a math question for a shared question bank. Review it.

Topic: {request.topic} ({request.level})
Question: {request.question_text}
Student's answer: {request.answer_text}
Hint: {request.hint or "none"}

Evaluate on:
1. Is the question mathematically correct and unambiguous?
2. Is the answer correct and well-explained?
3. Is it appropriate for the level?
4. Is it original and useful for other students?

Respond in EXACTLY this format:
QUALITY_SCORE: [0-100 integer]
VERDICT: [APPROVED or NEEDS_WORK or REJECTED]
FEEDBACK: [2-3 sentences of constructive feedback for the student]
CORRECTED_ANSWER: [If the answer needs fixing, write the correct solution. Otherwise write "Answer is correct."]"""

    resp  = await ask_groq(prompt)
    score, verdict, feedback, corrected = 50, "NEEDS_WORK", resp, ""
    for line in resp.split("\n"):
        if line.startswith("QUALITY_SCORE:"):
            try: score = int(line[14:].strip())
            except: pass
        elif line.startswith("VERDICT:"):    verdict   = line[8:].strip()
        elif line.startswith("FEEDBACK:"):   feedback  = line[9:].strip()
        elif line.startswith("CORRECTED_ANSWER:"): corrected = line[17:].strip()
    return {
        "success": True,
        "quality_score": score,
        "verdict": verdict,
        "feedback": feedback,
        "corrected_answer": corrected,
        "auto_approve": score >= 70,
    }


# ─────────────────────────────────────────────────────────────────────────
# TEACHER/PARENT TOOLS — Progress Report PDF generator
# ─────────────────────────────────────────────────────────────────────────

class ReportRequest(BaseModel):
    student_name:   str
    teacher_name:   str = "Teacher"
    period_label:   str = "Last 30 Days"
    sessions:       list = []   # [{topic, score, completed_at, difficulty}]
    mastery:        list = []   # [{topic, level, avg_score, sessions_done}]
    streak:         dict = {}   # {current_streak, longest_streak}
    weak_topics:    list = []   # [{topic, avg_score}]
    strong_topics:  list = []   # [{topic, avg_score}]
    accuracy:       int  = 0
    avg_score:      int  = 0


@router.post("/report/pdf")
async def generate_report_pdf(request: ReportRequest, user=Depends(require_auth)):
    """Generate a polished progress report PDF for a student."""
    from reportlab.lib.pagesizes import A4
    from reportlab.lib import colors
    from reportlab.lib.units import mm
    from reportlab.lib.styles import ParagraphStyle
    from reportlab.platypus import (
        SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle,
        HRFlowable, KeepTogether,
    )
    from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT
    from io import BytesIO
    import datetime

    buf = BytesIO()
    doc = SimpleDocTemplate(
        buf, pagesize=A4,
        leftMargin=18*mm, rightMargin=18*mm,
        topMargin=18*mm, bottomMargin=18*mm,
    )

    # ── Colour palette ───────────────────────────────────────────────
    TEAL    = colors.HexColor('#0d9488')
    GOLD    = colors.HexColor('#d97706')
    INK     = colors.HexColor('#1c1917')
    MUTED   = colors.HexColor('#78716c')
    PAPER   = colors.HexColor('#faf9f7')
    GREEN   = colors.HexColor('#10b981')
    RED     = colors.HexColor('#ef4444')
    AMBER   = colors.HexColor('#f59e0b')
    BORDER  = colors.HexColor('#e7e5e4')
    WHITE   = colors.white

    # ── Styles ───────────────────────────────────────────────────────
    def S(name, **kw):
        return ParagraphStyle(name, **kw)

    h1   = S('h1',  fontName='Helvetica-Bold', fontSize=22, textColor=TEAL,   spaceAfter=2)
    h2   = S('h2',  fontName='Helvetica-Bold', fontSize=13, textColor=INK,    spaceAfter=4, spaceBefore=10)
    h3   = S('h3',  fontName='Helvetica-Bold', fontSize=10, textColor=MUTED,  spaceAfter=2)
    body = S('body',fontName='Helvetica',      fontSize=9,  textColor=INK,    leading=14)
    mono = S('mono',fontName='Courier',        fontSize=8,  textColor=MUTED)
    tag  = S('tag', fontName='Helvetica-Bold', fontSize=8,  textColor=WHITE,  alignment=TA_CENTER)
    ctr  = S('ctr', fontName='Helvetica',      fontSize=9,  textColor=MUTED,  alignment=TA_CENTER)
    bold = S('bold',fontName='Helvetica-Bold', fontSize=9,  textColor=INK)

    story = []
    W = A4[0] - 36*mm   # usable width

    # ─── HEADER ──────────────────────────────────────────────────────
    today = datetime.date.today().strftime('%d %B %Y')
    header_data = [[
        Paragraph(f'<font color="#0d9488"><b>Math</b></font><font color="#d97706"><b>Genius</b></font>', h1),
        Paragraph(f'<font color="#78716c">Generated {today}</font>', ctr),
    ]]
    header_tbl = Table(header_data, colWidths=[W * 0.65, W * 0.35])
    header_tbl.setStyle(TableStyle([('VALIGN', (0,0), (-1,-1), 'BOTTOM')]))
    story.append(header_tbl)
    story.append(HRFlowable(width=W, thickness=2, color=TEAL, spaceAfter=6))

    story.append(Paragraph(f'Student Progress Report', S('rpt', fontName='Helvetica-Bold', fontSize=16, textColor=INK, spaceAfter=2)))
    story.append(Paragraph(f'<b>{request.student_name}</b> &nbsp;·&nbsp; {request.period_label} &nbsp;·&nbsp; Prepared by {request.teacher_name}',
                            S('sub', fontName='Helvetica', fontSize=9, textColor=MUTED, spaceAfter=12)))

    # ─── SUMMARY STATS ROW ───────────────────────────────────────────
    def stat_cell(label, value, color=TEAL):
        return [
            Paragraph(f'<font color="{color.hexval() if hasattr(color,"hexval") else "#0d9488"}"><b>{value}</b></font>',
                      S(f's{label}', fontName='Helvetica-Bold', fontSize=20, textColor=color, alignment=TA_CENTER)),
            Paragraph(label, S(f'sl{label}', fontName='Helvetica', fontSize=8, textColor=MUTED, alignment=TA_CENTER, spaceAfter=0)),
        ]

    sessions_count = len(request.sessions)
    streak_val     = request.streak.get('current_streak', 0)
    longest_streak = request.streak.get('longest_streak', 0)
    topics_studied = len(request.mastery)

    stat_color = lambda v, lo, hi: GREEN if v >= hi else (AMBER if v >= lo else RED)

    stats_data = [[
        stat_cell('Sessions',     str(sessions_count)),
        stat_cell('Avg Score',    f'{request.avg_score}%',   stat_color(request.avg_score, 50, 70)),
        stat_cell('Accuracy',     f'{request.accuracy}%',    stat_color(request.accuracy, 50, 70)),
        stat_cell('Day Streak',   str(streak_val)),
        stat_cell('Topics',       str(topics_studied)),
    ]]
    # Flatten: each stat is 2 rows internally — use nested table
    def stat_box(label, value, vc=TEAL):
        inner = Table(
            [[Paragraph(f'<b>{value}</b>', S('sv', fontName='Helvetica-Bold', fontSize=18, textColor=vc, alignment=TA_CENTER))],
             [Paragraph(label, S('sl', fontName='Helvetica', fontSize=7, textColor=MUTED, alignment=TA_CENTER))]],
            colWidths=[W/5 - 4*mm]
        )
        inner.setStyle(TableStyle([
            ('BACKGROUND',  (0,0), (-1,-1), PAPER),
            ('BOX',         (0,0), (-1,-1), 0.5, BORDER),
            ('ROUNDEDCORNERS', [4]),
            ('TOPPADDING',  (0,0), (-1,-1), 6),
            ('BOTTOMPADDING',(0,0),(-1,-1), 6),
        ]))
        return inner

    stat_boxes = [[
        stat_box('Sessions Done',  str(sessions_count)),
        stat_box('Avg Score',      f'{request.avg_score}%',  stat_color(request.avg_score, 50, 70)),
        stat_box('Accuracy',       f'{request.accuracy}%',   stat_color(request.accuracy, 50, 70)),
        stat_box('Day Streak',     str(streak_val)),
        stat_box('Topics Studied', str(topics_studied)),
    ]]
    stat_tbl = Table(stat_boxes, colWidths=[W/5]*5, hAlign='LEFT')
    stat_tbl.setStyle(TableStyle([
        ('LEFTPADDING',  (0,0), (-1,-1), 2),
        ('RIGHTPADDING', (0,0), (-1,-1), 2),
        ('VALIGN',       (0,0), (-1,-1), 'TOP'),
    ]))
    story.append(stat_tbl)
    story.append(Spacer(1, 10))

    # ─── TOPIC MASTERY TABLE ─────────────────────────────────────────
    if request.mastery:
        story.append(Paragraph('Topic Mastery', h2))
        MASTERY_COLORS = {'master': GREEN, 'proficient': colors.HexColor('#3b82f6'),
                          'developing': AMBER, 'beginner': MUTED}
        mdata = [['Topic', 'Level', 'Mastery', 'Avg Score', 'Sessions']]
        for m in request.mastery[:15]:
            lvl   = (m.get('mastery_level') or 'beginner').capitalize()
            mc    = MASTERY_COLORS.get(m.get('mastery_level','beginner'), MUTED)
            score = m.get('avg_score', 0)
            sc    = stat_color(score, 50, 70)
            mdata.append([
                Paragraph(m.get('topic',''), body),
                Paragraph(m.get('level','').capitalize(), mono),
                Paragraph(f'<b>{lvl}</b>', S(f'm{lvl}', fontName='Helvetica-Bold', fontSize=9, textColor=mc)),
                Paragraph(f'<b>{score}%</b>', S(f'sc{score}', fontName='Helvetica-Bold', fontSize=9, textColor=sc)),
                Paragraph(str(m.get('sessions_done', 0)), mono),
            ])
        mt = Table(mdata, colWidths=[W*0.38, W*0.13, W*0.17, W*0.17, W*0.15])
        mt.setStyle(TableStyle([
            ('BACKGROUND',    (0,0), (-1,0),  TEAL),
            ('TEXTCOLOR',     (0,0), (-1,0),  WHITE),
            ('FONTNAME',      (0,0), (-1,0),  'Helvetica-Bold'),
            ('FONTSIZE',      (0,0), (-1,0),  9),
            ('ROWBACKGROUNDS',(0,1), (-1,-1), [WHITE, PAPER]),
            ('GRID',          (0,0), (-1,-1), 0.3, BORDER),
            ('TOPPADDING',    (0,0), (-1,-1), 5),
            ('BOTTOMPADDING', (0,0), (-1,-1), 5),
            ('LEFTPADDING',   (0,0), (-1,-1), 6),
        ]))
        story.append(mt)
        story.append(Spacer(1, 8))

    # ─── WEAK / STRONG TOPICS ────────────────────────────────────────
    if request.weak_topics or request.strong_topics:
        col_w = (W - 6*mm) / 2
        left_rows  = [[Paragraph('Areas Needing Work', S('wh', fontName='Helvetica-Bold', fontSize=10, textColor=RED))]]
        right_rows = [[Paragraph('Strong Areas', S('sh', fontName='Helvetica-Bold', fontSize=10, textColor=GREEN))]]
        for w in request.weak_topics[:5]:
            left_rows.append([Paragraph(f'• {w["topic"]} ({w.get("avg_score",0)}%)', body)])
        for s in request.strong_topics[:5]:
            right_rows.append([Paragraph(f'• {s["topic"]} ({s.get("avg_score",0)}%)', body)])

        lt = Table(left_rows,  colWidths=[col_w])
        rt = Table(right_rows, colWidths=[col_w])
        for t, bg in [(lt, colors.HexColor('#fef2f2')), (rt, colors.HexColor('#f0fdf4'))]:
            t.setStyle(TableStyle([
                ('BACKGROUND', (0,0), (-1,-1), bg),
                ('BOX',        (0,0), (-1,-1), 0.5, BORDER),
                ('TOPPADDING', (0,0),(-1,-1), 5),
                ('BOTTOMPADDING',(0,0),(-1,-1),5),
                ('LEFTPADDING',(0,0),(-1,-1), 8),
            ]))
        two_col = Table([[lt, Spacer(6*mm, 1), rt]], colWidths=[col_w, 6*mm, col_w])
        two_col.setStyle(TableStyle([('VALIGN',(0,0),(-1,-1),'TOP')]))
        story.append(two_col)
        story.append(Spacer(1, 8))

    # ─── RECENT SESSIONS ─────────────────────────────────────────────
    if request.sessions:
        story.append(Paragraph('Recent Practice Sessions', h2))
        sdata = [['Date', 'Topic', 'Difficulty', 'Score']]
        for sess in request.sessions[:10]:
            dt    = sess.get('completed_at','')[:10] if sess.get('completed_at') else '—'
            score = sess.get('score', 0) or 0
            sc    = stat_color(score, 50, 70)
            sdata.append([
                Paragraph(dt, mono),
                Paragraph(sess.get('topic',''), body),
                Paragraph((sess.get('difficulty') or '').capitalize(), mono),
                Paragraph(f'<b>{score}%</b>', S(f'ss{score}', fontName='Helvetica-Bold', fontSize=9, textColor=sc)),
            ])
        st = Table(sdata, colWidths=[W*0.18, W*0.48, W*0.18, W*0.16])
        st.setStyle(TableStyle([
            ('BACKGROUND',    (0,0), (-1,0),  colors.HexColor('#1c1917')),
            ('TEXTCOLOR',     (0,0), (-1,0),  WHITE),
            ('FONTNAME',      (0,0), (-1,0),  'Helvetica-Bold'),
            ('FONTSIZE',      (0,0), (-1,0),  9),
            ('ROWBACKGROUNDS',(0,1), (-1,-1), [WHITE, PAPER]),
            ('GRID',          (0,0), (-1,-1), 0.3, BORDER),
            ('TOPPADDING',    (0,0), (-1,-1), 5),
            ('BOTTOMPADDING', (0,0), (-1,-1), 5),
            ('LEFTPADDING',   (0,0), (-1,-1), 6),
        ]))
        story.append(st)
        story.append(Spacer(1, 8))

    # ─── FOOTER ──────────────────────────────────────────────────────
    story.append(Spacer(1, 6))
    story.append(HRFlowable(width=W, thickness=0.5, color=BORDER))
    story.append(Spacer(1, 4))
    story.append(Paragraph(
        f'MathGenius Progress Report · {request.student_name} · {today} · Confidential',
        S('footer', fontName='Helvetica', fontSize=7, textColor=MUTED, alignment=TA_CENTER)
    ))

    doc.build(story)
    buf.seek(0)

    from fastapi.responses import Response
    safe_name = request.student_name.replace(' ', '_')
    return Response(
        content=buf.read(),
        media_type='application/pdf',
        headers={'Content-Disposition': f'attachment; filename="MathGenius_Report_{safe_name}.pdf"'}
    )


# ── Streaming endpoints ───────────────────────────────────────────────

class ExplainStreamRequest(BaseModel):
    expression: str = Field(..., max_length=1000)
    result: str     = Field(..., max_length=2000)

class ImageStreamRequest(BaseModel):
    image_base64: str
    image_type: str = "image/jpeg"
    extra_instruction: Optional[str] = None


def _groq_stream_sse(messages: list, system_msg: str = None):
    """Shared SSE generator — yields tokens one by one."""
    client = Groq(api_key=os.environ.get("MathsGenius"))
    msgs = []
    if system_msg:
        msgs.append({"role": "system", "content": system_msg})
    msgs.extend(messages)
    completion = client.chat.completions.create(
        model="llama-3.3-70b-versatile",
        messages=msgs,
        stream=True,
        max_completion_tokens=8192,
        temperature=1,
        top_p=1,
    )
    for chunk in completion:
        delta = chunk.choices[0].delta
        if delta and delta.content:
            yield f"data: {json.dumps({'token': delta.content})}\n\n"
    yield "data: [DONE]\n\n"


@router.post("/explain/stream")
async def explain_solution_stream(request: ExplainStreamRequest, user=Depends(require_auth)):
    """Streaming version of /solve/explain — used by Explain Steps button and Ask Euler."""
    system = (
        "You are Euler, a friendly Nigerian maths tutor. "
        "Explain mathematical solutions clearly, step by step, "
        "using simple language a secondary school student can follow. "
        "Use numbered steps and short paragraphs."
    )
    messages = [{
        "role": "user",
        "content": (
            f"A student solved '{request.expression}' and got '{request.result}'.\n"
            "Show ALL methods for solving this problem step-by-step with full working.\n"
            "Make it very clear, warm and easy for a student to understand."
        ),
    }]
    return StreamingResponse(
        _groq_stream_sse(messages, system),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )


@router.post("/image/stream")
async def solve_from_image_stream(request: ImageStreamRequest, http_request: Request, user=Depends(require_auth)):
    """Streaming version of /solve/image — used by Image Upload and Camera Snap tabs."""
    instruction = (
        request.extra_instruction or
        (
            "This image contains a mathematics exam paper or question sheet. "
            "Identify and solve EVERY numbered question you can see in the image, one by one. "
            "For each question:\n"
            "- State the question number clearly (e.g. Question 1, Question 2, ...)\n"
            "- Show full step-by-step working\n"
            "- State the final answer and which option (A/B/C/D) is correct if it is MCQ\n\n"
            "Work through ALL questions from top to bottom. Do not skip any."
        )
    )
    client = Groq(api_key=os.environ.get("MathsGenius"))
    messages = [{
        "role": "user",
        "content": [
            {
                "type": "image_url",
                "image_url": {"url": f"data:{request.image_type};base64,{request.image_base64}"},
            },
            {"type": "text", "text": instruction},
        ],
    }]

    def _vision_sse():
        completion = client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=messages,
            stream=True,
            max_completion_tokens=8192,
            temperature=1,
            top_p=1,
        )
        for chunk in completion:
            delta = chunk.choices[0].delta
            if delta and delta.content:
                yield f"data: {json.dumps({'token': delta.content})}\n\n"
        yield "data: [DONE]\n\n"

    return StreamingResponse(
        _vision_sse(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )
# backend/app/routers/study_plan.py
#
# AI Study Plan router
# POST /study-plan/generate  — generates a personalised day-by-day plan
# GET  /study-plan/{user_id} — returns saved plan for a user
#
# Uses topic_progress mastery data + exam_target + days_until_exam
# to ask Groq to produce a structured JSON study plan.

import json
import os
from datetime import date, timedelta

from fastapi          import APIRouter, HTTPException, Depends
from fastapi.responses import StreamingResponse
from pydantic         import BaseModel
from groq             import Groq
from supabase         import create_client
from dotenv           import load_dotenv
from app.dependencies import require_auth

load_dotenv()

router = APIRouter(prefix="/study-plan", tags=["study-plan"])

groq_client = Groq(api_key=os.environ.get("MathsGenius"))


def get_supabase():
    return create_client(
        os.environ.get("SUPABASE_URL", ""),
        os.environ.get("SUPABASE_SERVICE_KEY", ""),
    )


# ── Request / Response models ─────────────────────────────────────

class GeneratePlanRequest(BaseModel):
    user_id:     str
    exam_target: str = "WAEC"
    exam_date:   str | None = None   # ISO date string e.g. "2025-05-15"
    days_until:  int | None = None   # fallback if no exam_date


# ── Helpers ───────────────────────────────────────────────────────

def _calc_days(exam_date: str | None, days_until: int | None) -> int:
    if exam_date:
        try:
            target = date.fromisoformat(exam_date)
            diff   = (target - date.today()).days
            return max(diff, 1)
        except ValueError:
            pass
    return max(days_until or 30, 1)


def _get_weak_topics(user_id: str) -> list[dict]:
    """Fetch topics where mastery_level is beginner or avg_score < 60."""
    res = (
        get_supabase().table("topic_progress")
        .select("topic, mastery_level, avg_score, sessions_done")
        .eq("user_id", user_id)
        .order("avg_score", desc=False)
        .limit(20)
        .execute()
    )
    rows = res.data or []

    weak = [
        r for r in rows
        if r.get("mastery_level") in ("beginner", "intermediate")
        or (r.get("avg_score") or 0) < 60
    ]

    # If no tracked progress yet, return empty (LLM will make a general plan)
    return weak


def _build_prompt(
    exam_target: str,
    days: int,
    weak_topics: list[dict],
    today_str: str,
) -> str:
    if weak_topics:
        topics_text = "\n".join(
            f"- {r['topic']} (avg score: {r.get('avg_score', 0):.0f}%, "
            f"mastery: {r.get('mastery_level', 'beginner')})"
            for r in weak_topics
        )
    else:
        topics_text = "No tracked topics yet — generate a balanced general plan."

    cap = min(days, 60)  # cap at 60 days to keep response size sane

    return f"""You are an expert {exam_target} mathematics tutor creating a personalised study plan.

Student profile:
- Exam: {exam_target}
- Days until exam: {days} (plan for {cap} days)
- Today's date: {today_str}

Weak topics (lowest scores first):
{topics_text}

Generate a day-by-day study plan as a JSON object with this EXACT structure:
{{
  "summary": "One sentence describing the overall strategy",
  "total_days": {cap},
  "days": [
    {{
      "day": 1,
      "date": "YYYY-MM-DD",
      "topic": "Topic Name",
      "focus": "One sentence on what to focus on today",
      "tasks": [
        "Task description 1",
        "Task description 2",
        "Task description 3"
      ],
      "duration_mins": 45
    }}
  ]
}}

Rules:
- Prioritise weak topics but rotate so students don't burn out
- Include revision days every 7 days
- Final 3 days should be full revision / past paper practice
- Keep tasks concrete and actionable (e.g. "Solve 10 quadratic equations", not "study algebra")
- duration_mins should be 30–60 minutes per day
- Return ONLY valid JSON, no markdown, no explanation"""


# ── Routes ────────────────────────────────────────────────────────

@router.post("/generate")
async def generate_study_plan(
    req: GeneratePlanRequest,
    user=Depends(require_auth),
):
    days        = _calc_days(req.exam_date, req.days_until)
    weak_topics = _get_weak_topics(req.user_id)
    today_str   = date.today().isoformat()

    prompt = _build_prompt(req.exam_target, days, weak_topics, today_str)

    # ── Stream from Groq ──────────────────────────────────────────
    async def stream_and_save():
        full_text = ""

        try:
            stream = groq_client.chat.completions.create(
                model="llama3-8b-8192",
                messages=[{"role": "user", "content": prompt}],
                stream=True,
                max_completion_tokens=8192,
                temperature=1,
                top_p=1,
                reasoning_effort="medium",
            )

            for chunk in stream:
                delta = chunk.choices[0].delta.content or ""
                full_text += delta
                yield delta

        except Exception as e:
            yield f'\n{{"error": "{str(e)}"}}'
            return

        # ── Save to Supabase once complete ────────────────────────
        try:
            # Strip any accidental markdown fences
            clean = full_text.strip()
            if clean.startswith("```"):
                clean = clean.split("```")[1]
                if clean.startswith("json"):
                    clean = clean[4:]
            clean = clean.strip()

            plan_json = json.loads(clean)

            get_supabase().table("study_plans").upsert({
                "user_id":      req.user_id,
                "exam_target":  req.exam_target,
                "exam_date":    req.exam_date,
                "days_until":   days,
                "weak_topics":  [r["topic"] for r in weak_topics],
                "plan":         plan_json,
                "generated_at": date.today().isoformat(),
            }, on_conflict="user_id").execute()

        except (json.JSONDecodeError, Exception):
            # Still fine — frontend has the streamed text even if save fails
            pass

    return StreamingResponse(stream_and_save(), media_type="text/plain")


@router.get("/{user_id}")
async def get_study_plan(user_id: str, user=Depends(require_auth)):
    res = (
        get_supabase().table("study_plans")
        .select("*")
        .eq("user_id", user_id)
        .limit(1)
        .execute()
    )
    if not res.data or len(res.data) == 0:
        raise HTTPException(status_code=404, detail="No study plan found")
    return res.data[0]
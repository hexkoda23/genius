"""
app/routers/past_questions.py
─────────────────────────────
REST endpoints for the Past Questions Bank.
Registered in main.py as:
    from app.routers.past_questions import router as past_questions_router
    app.include_router(past_questions_router)
"""

from fastapi import APIRouter, Query, HTTPException
from pydantic import BaseModel
from typing import Optional
import os
from supabase import create_client, Client

router = APIRouter(prefix="/past-questions", tags=["Past Questions"])

# ── Supabase client (service role so RLS write policies pass) ──────────────
def get_supabase() -> Client:
    url = os.environ.get("SUPABASE_URL")
    key = os.environ.get("SUPABASE_SERVICE_KEY") or os.environ.get("SUPABASE_KEY")
    if not url or not key:
        raise RuntimeError("SUPABASE_URL / SUPABASE_SERVICE_KEY not set")
    return create_client(url, key)


# ── Request / Response models ──────────────────────────────────────────────

class SearchFilters(BaseModel):
    query:         Optional[str]  = None   # free-text search
    exam:          Optional[str]  = None   # WAEC | JAMB | NECO | BECE | NABTEB
    year:          Optional[int]  = None
    topic:         Optional[str]  = None
    level:         Optional[str]  = None   # jss | sss | university
    question_type: Optional[str]  = None   # mcq | theory
    subject:       Optional[str]  = None
    page:          int            = 1
    page_size:     int            = 20     # max 50


# ── GET /past-questions/topics ─────────────────────────────────────────────
@router.get("/topics")
async def get_topics():
    """Return all distinct topics that have past questions, with counts."""
    sb = get_supabase()
    res = sb.rpc("past_questions_topic_counts").execute()
    # Fallback: manual distinct query if RPC doesn't exist yet
    if res.data is None:
        raw = sb.table("past_questions") \
                .select("topic") \
                .not_.is_("topic", "null") \
                .execute()
        from collections import Counter
        counts = Counter(r["topic"] for r in (raw.data or []))
        data   = [{"topic": t, "count": c} for t, c in sorted(counts.items())]
    else:
        data = res.data
    return {"success": True, "topics": data}


# ── GET /past-questions/meta ───────────────────────────────────────────────
@router.get("/meta")
async def get_meta():
    """Return available exams, years, subjects and counts for filter dropdowns."""
    sb   = get_supabase()
    rows = sb.table("past_questions").select("exam, year, subject, level").execute()
    data = rows.data or []

    from collections import defaultdict, Counter
    exams    = Counter(r["exam"]    for r in data if r.get("exam"))
    years    = Counter(r["year"]    for r in data if r.get("year"))
    subjects = Counter(r["subject"] for r in data if r.get("subject"))
    levels   = Counter(r["level"]   for r in data if r.get("level"))

    return {
        "success":  True,
        "total":    len(data),
        "exams":    [{"exam": k,    "count": v} for k, v in sorted(exams.items())],
        "years":    [{"year": k,    "count": v} for k, v in sorted(years.items(), reverse=True)],
        "subjects": [{"subject": k, "count": v} for k, v in sorted(subjects.items())],
        "levels":   [{"level": k,   "count": v} for k, v in sorted(levels.items())],
    }


# ── POST /past-questions/search ────────────────────────────────────────────
@router.post("/search")
async def search_past_questions(filters: SearchFilters):
    """
    Filtered + paginated search.
    Full-text search on body + topic when `query` is provided.
    All other filters are exact-match.
    """
    if filters.page_size > 50:
        filters.page_size = 50

    sb    = get_supabase()
    start = (filters.page - 1) * filters.page_size
    end   = start + filters.page_size - 1

    q = sb.table("past_questions").select(
        "id, body, options, answer, image_url, question_type, "
        "exam, subject, topic, level, year, question_number, verified",
        count="exact"
    )

    # ── Filters ───────────────────────────────────────────────────────────
    if filters.exam:
        q = q.eq("exam", filters.exam.upper())
    if filters.year:
        q = q.eq("year", filters.year)
    if filters.topic:
        q = q.ilike("topic", f"%{filters.topic}%")
    if filters.level:
        # normalise legacy 'secondary' → 'sss'
        lvl = "sss" if filters.level == "secondary" else filters.level
        q   = q.eq("level", lvl)
    if filters.question_type:
        q = q.eq("question_type", filters.question_type)
    if filters.subject:
        q = q.ilike("subject", f"%{filters.subject}%")

    # Full-text search — filter by body ILIKE if query provided
    # (Supabase JS SDK doesn't expose textSearch easily so we use ilike as fallback)
    if filters.query:
        q = q.or_(
            f"body.ilike.%{filters.query}%,"
            f"topic.ilike.%{filters.query}%"
        )

    # ── Sort + paginate ───────────────────────────────────────────────────
    q = q.order("year", desc=True) \
         .order("question_number", desc=False) \
         .range(start, end)

    res = q.execute()
    return {
        "success":    True,
        "questions":  res.data or [],
        "total":      res.count or 0,
        "page":       filters.page,
        "page_size":  filters.page_size,
        "pages":      max(1, -(-( res.count or 0) // filters.page_size)),  # ceil division
    }


# ── GET /past-questions/{id} ───────────────────────────────────────────────
@router.get("/{question_id}")
async def get_past_question(question_id: str):
    """Return a single question with full solution."""
    sb  = get_supabase()
    res = sb.table("past_questions") \
            .select("*") \
            .eq("id", question_id) \
            .single() \
            .execute()
    if not res.data:
        raise HTTPException(status_code=404, detail="Question not found")
    return {"success": True, "question": res.data}


# ── GET /past-questions/random ─────────────────────────────────────────────
@router.get("/random/one")
async def get_random_question(
    exam:   Optional[str] = Query(None),
    topic:  Optional[str] = Query(None),
    level:  Optional[str] = Query(None),
):
    """Return one random question (used by Daily Challenge)."""
    sb = get_supabase()
    q  = sb.table("past_questions").select("*")
    if exam:
        q = q.eq("exam", exam.upper())
    if topic:
        q = q.ilike("topic", f"%{topic}%")
    if level:
        lvl = "sss" if level == "secondary" else level
        q   = q.eq("level", lvl)

    # Supabase doesn't have ORDER BY RANDOM() via SDK easily,
    # so fetch a small batch and pick randomly
    res = q.limit(100).execute()
    data = res.data or []
    if not data:
        raise HTTPException(status_code=404, detail="No questions match filters")

    import random
    return {"success": True, "question": random.choice(data)}
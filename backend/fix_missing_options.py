"""
fix_missing_options.py
──────────────────────
Finds questions in exam_questions table that have blank options
and uses Groq AI to generate proper A/B/C/D options + correct answer.

Usage:
  python fix_missing_options.py              # fix all
  python fix_missing_options.py --exam JAMB  # fix one exam type
  python fix_missing_options.py --dry-run    # preview only
"""

import os
import sys
import json
import httpx
import asyncio
import argparse
from dotenv import load_dotenv
from groq import Groq

load_dotenv()

SUPABASE_URL         = os.environ.get("SUPABASE_URL", "").rstrip("/")
SUPABASE_SERVICE_KEY = os.environ.get("SUPABASE_SERVICE_KEY", "")
GROQ_API_KEY         = os.environ.get("GROQ_API_KEY", "")

if not all([SUPABASE_URL, SUPABASE_SERVICE_KEY, GROQ_API_KEY]):
    print("❌ Missing env variables. Check .env file.")
    sys.exit(1)

HEADERS = {
    "apikey":        SUPABASE_SERVICE_KEY,
    "Authorization": f"Bearer {SUPABASE_SERVICE_KEY}",
    "Content-Type":  "application/json",
}

groq_client = Groq(api_key=GROQ_API_KEY)


# ── Fetch questions with missing options ─────────────────────────────

async def fetch_broken_questions(exam_type=None) -> list[dict]:
    async with httpx.AsyncClient(timeout=30) as client:
        params = {
            "select": "id,question_text,option_a,option_b,option_c,option_d,correct_answer,exam_type,year,topic",
            "or":     "(option_a.is.null,option_a.eq.,option_b.is.null,option_b.eq.)",
            "limit":  "500",
        }
        if exam_type:
            params["exam_type"] = f"eq.{exam_type}"

        resp = await client.get(
            f"{SUPABASE_URL}/rest/v1/exam_questions",
            headers=HEADERS,
            params=params,
        )
        data = resp.json()
        if isinstance(data, dict) and data.get("error"):
            print(f"❌ Fetch error: {data}")
            return []
        return data or []


# ── Ask Groq to generate options ─────────────────────────────────────

def generate_options(question_text: str, topic: str,
                     exam_type: str, year: str) -> dict | None:
    prompt = f"""You are a Nigerian mathematics exam question writer for {exam_type}.

The following question was scraped from a past paper but its multiple choice options are missing.
Generate 4 realistic multiple choice options (A, B, C, D) for this question,
and identify the correct answer.

Question: {question_text}
Topic: {topic or 'Mathematics'}
Exam: {exam_type} {year}

Rules:
- Options must be plausible and mathematically sound
- Only ONE option should be correct
- Wrong options should be common mistakes students make
- Keep options concise (numbers, expressions, short phrases)
- For calculation questions, work out the correct answer first

Respond ONLY with this exact JSON (no markdown, no extra text):
{{
  "option_a": "first option here",
  "option_b": "second option here",
  "option_c": "third option here",
  "option_d": "fourth option here",
  "correct_answer": "A",
  "confidence": "high"
}}"""

    try:
        response = groq_client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[{"role": "user", "content": prompt}],
            max_tokens=300,
            temperature=0.3,
        )
        raw  = response.choices[0].message.content.strip()
        raw  = raw.replace("```json", "").replace("```", "").strip()
        data = json.loads(raw)

        # Validate response
        required = ["option_a", "option_b", "option_c", "option_d", "correct_answer"]
        if not all(k in data for k in required):
            return None
        if data["correct_answer"] not in ["A", "B", "C", "D"]:
            return None

        return data

    except Exception as e:
        print(f"      ⚠ Groq error: {e}")
        return None


# ── Update question in Supabase ───────────────────────────────────────

async def update_question(question_id: str, options: dict) -> bool:
    async with httpx.AsyncClient(timeout=15) as client:
        resp = await client.patch(
            f"{SUPABASE_URL}/rest/v1/exam_questions",
            headers={**HEADERS, "Prefer": "return=minimal"},
            params={"id": f"eq.{question_id}"},
            content=json.dumps({
                "option_a":       options["option_a"],
                "option_b":       options["option_b"],
                "option_c":       options["option_c"],
                "option_d":       options["option_d"],
                "correct_answer": options["correct_answer"],
            }),
        )
        return resp.status_code in (200, 204)


# ── Main ──────────────────────────────────────────────────────────────

async def main(exam_type=None, dry_run=False):
    print(f"\n{'═'*55}")
    print(f"  Fix Missing Options")
    if exam_type:
        print(f"  Exam filter: {exam_type}")
    if dry_run:
        print(f"  DRY RUN — nothing will be saved")
    print(f"{'═'*55}\n")

    print("📥 Fetching questions with missing options...")
    questions = await fetch_broken_questions(exam_type)

    if not questions:
        print("✅ No questions with missing options found!")
        return

    print(f"⚠  Found {len(questions)} questions to fix\n")

    fixed   = 0
    failed  = 0
    skipped = 0

    for i, q in enumerate(questions, 1):
        qid   = q["id"]
        qtext = q["question_text"]
        topic = q.get("topic", "")
        etype = q.get("exam_type", "JAMB")
        year  = str(q.get("year", ""))

        print(f"  [{i}/{len(questions)}] {etype} {year} — {qtext[:60]}...")

        if not qtext or len(qtext.strip()) < 5:
            print(f"      ⏭ Skipping — question text too short")
            skipped += 1
            continue

        options = generate_options(qtext, topic, etype, year)

        if not options:
            print(f"      ❌ Could not generate options")
            failed += 1
            continue

        print(f"      A: {options['option_a']}")
        print(f"      B: {options['option_b']}")
        print(f"      C: {options['option_c']}")
        print(f"      D: {options['option_d']}")
        print(f"      ✓ Answer: {options['correct_answer']} "
              f"(confidence: {options.get('confidence', '?')})")

        if dry_run:
            print(f"      [DRY RUN — not saved]")
            fixed += 1
            continue

        ok = await update_question(qid, options)
        if ok:
            print(f"      ✅ Saved")
            fixed += 1
        else:
            print(f"      ❌ Save failed")
            failed += 1

        # Small delay to avoid Groq rate limits
        await asyncio.sleep(0.5)

    print(f"\n{'═'*55}")
    print(f"  ✅ Fixed   : {fixed}")
    print(f"  ❌ Failed  : {failed}")
    print(f"  ⏭  Skipped : {skipped}")
    print(f"{'═'*55}\n")


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--exam",    help="Filter by exam type: JAMB / WAEC / NECO")
    parser.add_argument("--dry-run", action="store_true",
                        help="Preview fixes without saving")
    args = parser.parse_args()

    asyncio.run(main(
        exam_type = args.exam,
        dry_run   = args.dry_run,
    ))
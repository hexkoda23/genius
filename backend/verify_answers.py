import asyncio
import json
import os
import httpx
from dotenv import load_dotenv

load_dotenv()

SUPABASE_URL = os.environ.get("SUPABASE_URL")
SUPABASE_KEY = os.environ.get("SUPABASE_SERVICE_KEY") or os.environ.get("SUPABASE_KEY") or os.environ.get("SUPABASE_ANON_KEY")
BACKEND_URL  = os.environ.get("BACKEND_URL", "http://localhost:8000")

if not SUPABASE_URL or not SUPABASE_KEY:
    print("❌ Missing SUPABASE_URL or SUPABASE_KEY in .env")
    exit(1)

async def fetch_questions(exam_type="JAMB", limit=100):
    async with httpx.AsyncClient() as client:
        resp = await client.get(
            f"{SUPABASE_URL}/rest/v1/exam_questions",
            headers={
                "apikey": SUPABASE_KEY,
                "Authorization": f"Bearer {SUPABASE_KEY}",
            },
            params={
                "exam_type": f"eq.{exam_type}",
                "select": "id,question_text,option_a,option_b,option_c,option_d,correct_answer",
                "limit": limit,
            }
        )
        return resp.json()

async def update_answer(question_id, new_answer):
    async with httpx.AsyncClient() as client:
        await client.patch(
            f"{SUPABASE_URL}/rest/v1/exam_questions",
            headers={
                "apikey": SUPABASE_KEY,
                "Authorization": f"Bearer {SUPABASE_KEY}",
                "Content-Type": "application/json",
                "Prefer": "return=minimal",
            },
            params={"id": f"eq.{question_id}"},
            json={"correct_answer": new_answer}
        )

async def verify_all(exam_type="JAMB", limit=1000):
    print(f"\n📥 Fetching {limit} {exam_type} questions from Supabase...")
    questions = await fetch_questions(exam_type, limit)

    if not questions or isinstance(questions, dict):
        print(f"❌ Failed to fetch questions: {questions}")
        return

    print(f"✅ Fetched {len(questions)} questions")
    print(f"🤖 Sending to backend for verification...\n")

    # Send in batches of 20
    all_results = []
    for i in range(0, len(questions), 100):
        batch = questions[i:i+100]
        async with httpx.AsyncClient(timeout=60) as client:
            try:
                resp = await client.post(
                    f"{BACKEND_URL}/cbt/verify-answers",
                    json={"questions": batch}
                )
                data = resp.json()
                all_results.extend(data.get("verified", []))
                print(f"  Batch {i//100 + 1} done — {len(batch)} questions checked")
            except Exception as e:
                print(f"  ❌ Batch {i//100 + 1} failed: {e}")

    # Analyse results
    mismatches  = [r for r in all_results if not r.get("match") and not r.get("error")]
    errors      = [r for r in all_results if r.get("error")]
    correct     = [r for r in all_results if r.get("match")]

    print(f"\n{'='*50}")
    print(f"📊 RESULTS FOR {exam_type}")
    print(f"{'='*50}")
    print(f"✅ Correct:          {len(correct)}")
    print(f"⚠️  Mismatches:      {len(mismatches)}")
    print(f"❓ Parse errors:     {len(errors)}")
    print(f"{'='*50}\n")

    if mismatches:
        print("⚠️  POTENTIAL WRONG ANSWERS:")
        for m in mismatches:
            conf = m.get('confidence', '?')
            print(f"  ID: {m['id'][:8]}... | Stored: {m['stored_answer']} | AI says: {m['ai_answer']} | Confidence: {conf}")

        fix = input("\n🔧 Auto-fix HIGH confidence mismatches? (y/n): ").strip().lower()
        if fix == 'y':
            fixed = 0
            for m in mismatches:
                if m.get("confidence") == "high" and m.get("ai_answer"):
                    await update_answer(m["id"], m["ai_answer"])
                    print(f"  Fixed {m['id'][:8]}...: {m['stored_answer']} → {m['ai_answer']}")
                    fixed += 1
            print(f"\n✅ Fixed {fixed} answers.")
        else:
            print("No changes made.")
    else:
        print("🎉 All answers look correct!")

if __name__ == "__main__":
    import sys
    exam_type = sys.argv[1] if len(sys.argv) > 1 else "JAMB"
    limit     = int(sys.argv[2]) if len(sys.argv) > 2 else 100
    asyncio.run(verify_all(exam_type, limit))
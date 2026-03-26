import os
import sys
import json
import requests
from dotenv import load_dotenv

load_dotenv()


def classify_all_questions(exam_type=None, dry_run=False):
    from supabase import create_client

    url = os.environ.get('SUPABASE_URL')
    key = os.environ.get('SUPABASE_SERVICE_KEY')
    supabase = create_client(url, key)

    # Fetch all questions (optionally filtered)
    query = supabase.table('exam_questions').select('id, question_text, option_a, option_b, option_c, option_d, difficulty')

    if exam_type:
        query = query.eq('exam_type', exam_type)

    result = query.execute()
    questions = result.data or []

    print(f"📊 Found {len(questions)} questions")

    if not questions:
        print("No questions found.")
        return

    # Call the classify endpoint
    print("🤖 Classifying with Groq AI...")
    res = requests.post(
        'http://localhost:8000/cbt/classify-difficulty',
        json={
            'questions':  questions,
            'batch_size': 10,
        },
        timeout=300,
    )

    if not res.ok:
        print(f"❌ Classification failed: {res.text}")
        return

    data         = res.json()
    classifications = data.get('classifications', {})

    print(f"✅ Classified {len(classifications)} questions")

    if dry_run:
        # Show sample
        counts = {'easy': 0, 'medium': 0, 'hard': 0}
        for d in classifications.values():
            counts[d] = counts.get(d, 0) + 1
        print(f"\nDry run results:")
        print(f"  Easy:   {counts['easy']}")
        print(f"  Medium: {counts['medium']}")
        print(f"  Hard:   {counts['hard']}")
        return

    # Update Supabase in batches
    updated = 0
    items   = list(classifications.items())

    for i in range(0, len(items), 50):
        batch = items[i:i+50]
        for qid, difficulty in batch:
            supabase.table('exam_questions') \
                .update({'difficulty': difficulty}) \
                .eq('id', qid) \
                .execute()
            updated += 1

        print(f"  Updated {updated}/{len(items)}...")

    print(f"\n🎉 Done! {updated} questions reclassified.")

    # Show final distribution
    counts = {'easy': 0, 'medium': 0, 'hard': 0}
    for d in classifications.values():
        counts[d] = counts.get(d, 0) + 1
    print(f"\nDifficulty distribution:")
    print(f"  🟢 Easy:   {counts.get('easy', 0)}")
    print(f"  🟡 Medium: {counts.get('medium', 0)}")
    print(f"  🔴 Hard:   {counts.get('hard', 0)}")


if __name__ == '__main__':
    exam_type = sys.argv[1].upper() if len(sys.argv) > 1 else None
    dry_run   = '--dry-run' in sys.argv

    if dry_run:
        print("🔍 DRY RUN — no changes will be saved\n")

    classify_all_questions(exam_type, dry_run)
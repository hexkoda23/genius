"""
upload_bece.py
──────────────
Uploads scraped BECE questions + images to Supabase.

- Objective (MCQ) → exam_questions table
- Theory          → theory_questions table
- Question images → Supabase storage: question-images/bece/{year}/objective/questions/
- Answer images   → Supabase storage: question-images/bece/{year}/objective/answers/
                                       question-images/bece/{year}/theory/questions/
                                       question-images/bece/{year}/theory/answers/

Usage:
    python upload_bece.py --objective bece_objective.json
    python upload_bece.py --theory bece_theory.json
    python upload_bece.py --objective bece_objective.json --theory bece_theory.json
    python upload_bece.py --objective bece_objective.json --theory bece_theory.json --replace
"""

import json
import os
import re
import argparse
from pathlib import Path
from dotenv import load_dotenv

load_dotenv()

from supabase import create_client

SUPABASE_URL   = os.environ.get('SUPABASE_URL', '')
SUPABASE_KEY   = os.environ.get('SUPABASE_SERVICE_KEY', '')
STORAGE_BUCKET = 'question-images'


def get_client():
    if not SUPABASE_URL or not SUPABASE_KEY:
        raise ValueError("SUPABASE_URL and SUPABASE_SERVICE_KEY not found in .env")
    return create_client(SUPABASE_URL, SUPABASE_KEY)


# ── Image uploader ────────────────────────────────────────────────────

def upload_image(supabase, local_path: str, storage_path: str) -> str | None:
    """
    Upload one image file to Supabase storage.
    storage_path: full path inside the bucket e.g. bece/1990/theory/answers/p5_img1.png
    Returns public URL or None on failure.
    """
    if not local_path or not Path(local_path).exists():
        return None

    try:
        with open(local_path, 'rb') as f:
            data = f.read()

        # Remove existing file if present (clean re-upload)
        try:
            supabase.storage.from_(STORAGE_BUCKET).remove([storage_path])
        except Exception:
            pass

        supabase.storage.from_(STORAGE_BUCKET).upload(
            path=storage_path,
            file=data,
            file_options={"content-type": "image/png"}
        )

        url = supabase.storage.from_(STORAGE_BUCKET).get_public_url(storage_path)
        return url

    except Exception as e:
        print(f"    WARNING: Upload failed for {local_path}: {e}")
        return None


def upload_image_list(supabase, paths: list, year: int,
                      section: str, subfolder: str) -> list:
    """
    Upload a list of local image paths.
    section:   'objective' or 'theory'
    subfolder: 'questions' or 'answers'
    Returns list of public URLs (skips failures).
    """
    urls = []
    for local_path in (paths or []):
        filename     = Path(local_path).name
        storage_path = f"bece/{year}/{section}/{subfolder}/{filename}"
        url          = upload_image(supabase, local_path, storage_path)
        if url:
            urls.append(url)
            print(f"      Uploaded: {storage_path}")
    return urls


# ── Batch DB uploader ─────────────────────────────────────────────────

def upload_batch(supabase, table: str, records: list, label: str):
    batch_size = 20
    total = len(records)
    ok = fail = 0
    for i in range(0, total, batch_size):
        batch = records[i:i + batch_size]
        try:
            supabase.table(table).insert(batch).execute()
            ok += len(batch)
            print(f"  Inserted {ok}/{total} {label}")
        except Exception as e:
            fail += len(batch)
            print(f"  ERROR batch {i // batch_size + 1}: {e}")
    return ok, fail


# ── Objective uploader ────────────────────────────────────────────────

def upload_objective(json_file: str, replace: bool = False):
    with open(json_file, encoding='utf-8') as f:
        questions = json.load(f)

    if not questions:
        print("No objective questions found.")
        return

    supabase = get_client()

    if replace:
        print("Deleting existing BECE objective questions...")
        supabase.table('exam_questions').delete().eq('exam_type', 'BECE').execute()

    records = []
    for q in questions:
        year = q.get('year')
        print(f"\n  Q{q.get('question_no')} ({year})")

        # Upload question diagrams
        q_urls = upload_image_list(
            supabase,
            q.get('image_paths', []),
            year, 'objective', 'questions'
        )

        # Upload answer/solution diagrams
        a_urls = upload_image_list(
            supabase,
            q.get('answer_image_paths', []),
            year, 'objective', 'answers'
        )

        records.append({
            'exam_type':      'BECE',
            'year':           year,
            'subject':        q.get('subject', 'Mathematics'),
            'question_no':    q.get('question_no'),
            'question_text':  q.get('question_text', q.get('question', '')).strip(),
            'option_a':       q.get('option_a'),
            'option_b':       q.get('option_b'),
            'option_c':       q.get('option_c'),
            'option_d':       q.get('option_d'),
            'correct_answer': q.get('correct_answer', q.get('answer')),
            'topic':          q.get('topic'),
            'difficulty':     'medium',
        })

    print()
    ok, fail = upload_batch(supabase, 'exam_questions', records, 'objective')
    print(f"\nObjective done — {ok} uploaded, {fail} failed")


# ── Theory uploader ───────────────────────────────────────────────────

def upload_theory(json_file: str, replace: bool = False):
    with open(json_file, encoding='utf-8') as f:
        questions = json.load(f)

    if not questions:
        print("No theory questions found.")
        return

    supabase = get_client()

    if replace:
        print("Deleting existing BECE theory questions...")
        supabase.table('theory_questions').delete().eq('exam_type', 'BECE').execute()

    records = []
    for q in questions:
        year   = q.get('year')
        q_text = q.get('question_text', '').strip()
        # Safety: strip any leaked marking scheme text
        q_text = re.sub(r'\*\*MARKING SCHEME:\*\*.*', '', q_text, flags=re.DOTALL).strip()

        print(f"\n  Q{q.get('question_no')} ({year})")

        # Upload question diagrams
        q_urls = upload_image_list(
            supabase,
            q.get('image_paths', []),
            year, 'theory', 'questions'
        )

        # Upload answer/solution diagrams
        a_urls = upload_image_list(
            supabase,
            q.get('answer_image_paths', []),
            year, 'theory', 'answers'
        )

        records.append({
            'exam_type':      'BECE',
            'year':           year,
            'subject':        q.get('subject', 'Mathematics'),
            'question_no':    q.get('question_no'),
            'question_text':  q_text,
            'marking_scheme': q.get('marking_scheme'),
            'topic':          q.get('topic'),
            # Question has a diagram?
            'has_image':      len(q_urls) > 0,
            # Primary question image
            'image_url':      q_urls[0] if q_urls else None,
            # Solution/answer diagrams
            'answer_images':  a_urls,
        })

    print()
    ok, fail = upload_batch(supabase, 'theory_questions', records, 'theory')
    print(f"\nTheory done — {ok} uploaded, {fail} failed")


# ── Entry point ───────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(description='Upload BECE questions to Supabase')
    parser.add_argument('--objective', help='Path to bece_objective.json')
    parser.add_argument('--theory',    help='Path to bece_theory.json')
    parser.add_argument('--replace',   action='store_true',
                        help='Delete existing BECE data before uploading')
    args = parser.parse_args()

    if not args.objective and not args.theory:
        print("Provide --objective and/or --theory")
        return

    if args.objective:
        print(f"\nUploading BECE objective from {args.objective}...")
        upload_objective(args.objective, args.replace)

    if args.theory:
        print(f"\nUploading BECE theory from {args.theory}...")
        upload_theory(args.theory, args.replace)


if __name__ == '__main__':
    main()
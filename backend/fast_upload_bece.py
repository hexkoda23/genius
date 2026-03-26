"""
fast_upload_bece.py
───────────────────
Bulk-inserts BECE questions into Supabase WITHOUT uploading images.
Images stored locally are referenced as-is; storage uploads are skipped.
This is much faster than upload_bece.py for the initial data load.

Usage:
    python fast_upload_bece.py --objective bece_objective.json
    python fast_upload_bece.py --theory bece_theory.json
    python fast_upload_bece.py --objective bece_objective.json --theory bece_theory.json --replace
"""

import json
import os
import re
import argparse
from pathlib import Path
from dotenv import load_dotenv

load_dotenv()

from supabase import create_client

SUPABASE_URL = os.environ.get('SUPABASE_URL', '')
SUPABASE_KEY = os.environ.get('SUPABASE_SERVICE_KEY', '')

BATCH_SIZE = 100   # Insert N rows at a time


def get_client():
    if not SUPABASE_URL or not SUPABASE_KEY:
        raise ValueError("SUPABASE_URL and SUPABASE_SERVICE_KEY not found in .env")
    return create_client(SUPABASE_URL, SUPABASE_KEY)


def upload_batch(supabase, table: str, records: list, label: str):
    total = len(records)
    ok = fail = 0
    for i in range(0, total, BATCH_SIZE):
        batch = records[i:i + BATCH_SIZE]
        try:
            supabase.table(table).insert(batch).execute()
            ok += len(batch)
            print(f"  [{label}] Inserted {ok}/{total}")
        except Exception as e:
            fail += len(batch)
            print(f"  [{label}] ERROR batch {i // BATCH_SIZE + 1}: {e}")
    return ok, fail


def upload_objective(json_file: str, replace: bool = False):
    with open(json_file, encoding='utf-8') as f:
        questions = json.load(f)

    if not questions:
        print("No objective questions found.")
        return

    supabase = get_client()

    if replace:
        print("Deleting existing BECE objective questions...")
        supabase.table('past_questions').delete().eq('exam_type', 'BECE').execute()
        print("  Deleted.")

    records = []
    for q in questions:
        year = q.get('year')
        records.append({
            'exam_type':       'BECE',
            'year':            year,
            'subject':         q.get('subject', 'Mathematics'),
            'question_no':     q.get('question_no'),
            'question':        q.get('question', '').strip(),
            'option_a':        q.get('option_a'),
            'option_b':        q.get('option_b'),
            'option_c':        q.get('option_c'),
            'option_d':        q.get('option_d'),
            'option_e':        q.get('option_e'),
            'answer':          q.get('answer'),
            'topic':           q.get('topic'),
            # No image uploads — leave these null
            'image_url':       None,
            'question_images': [],
            'answer_images':   [],
            'solution':        None,
        })

    print(f"\nUploading {len(records)} objective questions (no images)...")
    ok, fail = upload_batch(supabase, 'past_questions', records, 'Objective')
    print(f"\nObjective done — {ok} uploaded, {fail} failed")


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
        print("  Deleted.")

    records = []
    for q in questions:
        year = q.get('year')
        q_text = q.get('question_text', '').strip()
        # Strip any leaked marking scheme text
        q_text = re.sub(r'\*\*MARKING SCHEME:\*\*.*', '', q_text, flags=re.DOTALL).strip()

        records.append({
            'exam_type':      'BECE',
            'year':           year,
            'subject':        q.get('subject', 'Mathematics'),
            'question_no':    q.get('question_no'),
            'question_text':  q_text,
            'marking_scheme': q.get('marking_scheme'),
            'topic':          q.get('topic'),
            'has_image':      False,
            'image_url':      None,
            'question_images': [],
            'answer_images':   [],
        })

    print(f"\nUploading {len(records)} theory questions (no images)...")
    ok, fail = upload_batch(supabase, 'theory_questions', records, 'Theory')
    print(f"\nTheory done — {ok} uploaded, {fail} failed")


def main():
    parser = argparse.ArgumentParser(description='Fast bulk-upload BECE to Supabase (no image uploads)')
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

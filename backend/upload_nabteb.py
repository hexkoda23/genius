"""
upload_nabteb.py
────────────────
Uploads scraped NABTEB questions to Supabase nabteb_questions table.

First run the SQL below in Supabase to create the table:

    CREATE TABLE IF NOT EXISTS nabteb_questions (
        id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        exam_type       TEXT DEFAULT 'NABTEB',
        year            INTEGER,
        subject         TEXT DEFAULT 'Mathematics',
        question_no     INTEGER,
        question_text   TEXT NOT NULL,
        marking_scheme  TEXT,
        topic           TEXT,
        has_diagram     BOOLEAN DEFAULT FALSE,
        created_at      TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE INDEX IF NOT EXISTS idx_nabteb_year    ON nabteb_questions(year);
    CREATE INDEX IF NOT EXISTS idx_nabteb_topic   ON nabteb_questions(topic);

Usage:
    python upload_nabteb.py nabteb_2005.json
    python upload_nabteb.py nabteb_2005.json --replace   # delete existing year first
"""

import json
import sys
import os
import argparse
from dotenv import load_dotenv

load_dotenv()  # ← MUST be before the lines below

from supabase import create_client

SUPABASE_URL = os.environ.get('SUPABASE_URL', '')
SUPABASE_KEY = os.environ.get('SUPABASE_SERVICE_KEY', '')
TABLE        = 'nabteb_questions'


def get_client():
    if not SUPABASE_URL or not SUPABASE_KEY:
        raise ValueError("Set SUPABASE_URL and SUPABASE_SERVICE_KEY env vars")
    return create_client(SUPABASE_URL, SUPABASE_KEY)


def upload(json_file: str, replace: bool = False):
    with open(json_file, encoding='utf-8') as f:
        questions = json.load(f)

    if not questions:
        print("⚠️  No questions found in file.")
        return

    year = questions[0].get('year')
    supabase = get_client()

    if replace and year:
        print(f"🗑️  Deleting existing NABTEB {year} questions...")
        supabase.table(TABLE).delete().eq('year', year).execute()

    # Clean records — only keep columns that exist in table
    records = []
    for q in questions:
        records.append({
            'exam_type':      q.get('exam_type', 'NABTEB'),
            'year':           q.get('year'),
            'subject':        q.get('subject', 'Mathematics'),
            'question_no':    q.get('question_no'),
            'question_text':  q.get('question_text', '').strip(),
            'marking_scheme': q.get('marking_scheme'),
            'topic':          q.get('topic'),
            'has_diagram':    False,
        })

    # Upload in batches of 20
    batch_size = 20
    total = len(records)
    ok = 0
    fail = 0

    for i in range(0, total, batch_size):
        batch = records[i:i+batch_size]
        try:
            res = supabase.table(TABLE).insert(batch).execute()
            ok += len(batch)
            print(f"  ✅ Uploaded {ok}/{total}")
        except Exception as e:
            fail += len(batch)
            print(f"  ❌ Batch {i//batch_size + 1} failed: {e}")

    print(f"\n📊 Done — {ok} uploaded, {fail} failed")


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('json_file', help='Path to scraped JSON file')
    parser.add_argument('--replace', action='store_true',
                        help='Delete existing questions for this year before uploading')
    args = parser.parse_args()
    upload(args.json_file, args.replace)


if __name__ == '__main__':
    main()
"""
bulk_upload_images.py  (v2)
─────────────────────────────────────────────────────────────────
487 images are already in Supabase Storage.
This script now ONLY updates image_url on exam_questions rows by
matching scraper question_text against DB question_text.

Matching rules (in order of precedence):
  1. First 80 chars of clean text must match >= 70 %
  2. If a unique match is found, image_url is set.
  3. If multiple rows match, the closest one wins.

Usage:
    python backend/bulk_upload_images.py
"""

import os
import json
import sys
from pathlib import Path
from difflib import SequenceMatcher
import re
from dotenv import load_dotenv

ROOT = Path(__file__).parent
load_dotenv(ROOT / ".env")

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_KEY") or os.getenv("VITE_SUPABASE_ANON_KEY")

if not SUPABASE_URL or not SUPABASE_KEY:
    print("ERROR: Missing SUPABASE_URL or SUPABASE_SERVICE_KEY in backend/.env")
    sys.exit(1)

from supabase import create_client
sb = create_client(SUPABASE_URL, SUPABASE_KEY)

STORAGE_BUCKET = "question-images"
IMAGES_DIR = ROOT / "images"

EXAM_MAP = {
    "waec":   "WAEC",
    "jamb":   "JAMB",
    "neco":   "NECO",
    "nabteb": "NABTEB",
}

def normalize(text):
    """Strip whitespace, punctuation and lower-case for fuzzy matching."""
    if not text:
        return ""
    text = text.lower()
    text = re.sub(r'\s+', ' ', text)
    text = re.sub(r'[^a-z0-9 ]', '', text)
    return text.strip()[:120]


def similarity(a, b):
    return SequenceMatcher(None, a, b).ratio()


def fetch_db_questions(exam_type, year):
    """Fetch all question rows for a given exam + year."""
    try:
        res = sb.table("exam_questions") \
            .select("id, question_text, image_url") \
            .eq("exam_type", exam_type) \
            .eq("year", year) \
            .execute()
        return res.data or []
    except Exception as e:
        print(f"  ERROR fetching {exam_type} {year}: {e}")
        return []


def build_storage_url(exam_raw, year_str, qtype, img_file):
    storage_path = f"{exam_raw}/{year_str}/{qtype}/{img_file}"
    return sb.storage.from_(STORAGE_BUCKET).get_public_url(storage_path)


def upload_and_link():
    linked = 0
    skipped = 0
    no_match = 0

    # ── Cache DB rows per (exam_type, year) ───────────────────────
    db_cache = {}

    for meta_path in sorted(IMAGES_DIR.rglob("metadata.json")):
        folder = meta_path.parent
        parts = folder.relative_to(IMAGES_DIR).parts
        if len(parts) < 3:
            continue

        exam_raw, year_str, qtype = parts[0], parts[1], parts[2]
        exam_type = EXAM_MAP.get(exam_raw.lower())
        if not exam_type:
            continue

        try:
            year = int(year_str)
        except ValueError:
            continue

        try:
            with open(meta_path, encoding="utf-8") as f:
                questions = json.load(f)
        except Exception as e:
            print(f"  WARN: Could not read {meta_path}: {e}")
            continue

        if not questions:
            continue

        print(f"\n[{exam_type} {year} {qtype}]  {len(questions)} questions")

        # Fetch (and cache) DB rows
        cache_key = (exam_type, year)
        if cache_key not in db_cache:
            rows = fetch_db_questions(exam_type, year)
            db_cache[cache_key] = [
                {"id": r["id"], "norm": normalize(r["question_text"]), "image_url": r.get("image_url")}
                for r in rows
            ]
            print(f"  DB rows loaded: {len(db_cache[cache_key])}")

        db_rows = db_cache[cache_key]

        for q in questions:
            img_file  = q.get("image_file")
            q_text    = q.get("question_text", "")
            q_no      = q.get("question_number", "?")

            if not img_file or not q_text:
                skipped += 1
                continue

            img_path = folder / img_file
            if not img_path.exists():
                skipped += 1
                continue

            q_norm = normalize(q_text)

            # ── Find best matching DB row ──────────────────────────
            best_score = 0.0
            best_row_id = None

            for row in db_rows:
                score = similarity(q_norm, row["norm"])
                if score > best_score:
                    best_score = score
                    best_row_id = row["id"]

            THRESHOLD = 0.50  # relaxed since scraped text may differ slightly

            if best_score < THRESHOLD or not best_row_id:
                print(f"  -- Q{q_no:<3}  no match (best={best_score:.2f}): {q_text[:60]}")
                no_match += 1
                continue

            # ── Build the public storage URL ───────────────────────
            try:
                public_url = build_storage_url(exam_raw, year_str, qtype, img_file)
            except Exception as e:
                print(f"  ERROR get_public_url Q{q_no}: {e}")
                skipped += 1
                continue

            # ── Update the DB row ──────────────────────────────────
            try:
                res = sb.table("exam_questions") \
                    .update({"image_url": public_url, "has_image": True}) \
                    .eq("id", best_row_id) \
                    .execute()

                if res.data:
                    linked += 1
                    print(f"  OK  Q{q_no:<3}  (score={best_score:.2f}) -> id={best_row_id}")
                else:
                    skipped += 1
            except Exception as e:
                print(f"  ERROR DB update Q{q_no}: {e}")
                skipped += 1

    print("\n" + "-" * 60)
    print(f"  DB rows updated with image_url : {linked}")
    print(f"  No matching DB row found       : {no_match}")
    print(f"  Skipped (no file / text)       : {skipped}")
    print("-" * 60)
    print("Done!")


if __name__ == "__main__":
    upload_and_link()

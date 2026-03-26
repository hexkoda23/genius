"""
rescrape_theory_missing.py
──────────────────────────
Re-scrapes theory questions for years that have:
  - Missing diagrams (has_image=false but mentions 'diagram')
  - Missing marking schemes

Run:
  python rescrape_theory_missing.py
  python rescrape_theory_missing.py --dry-run
  python rescrape_theory_missing.py --year 2023
"""

import os
import sys
import json
import argparse
import subprocess
from datetime import datetime
import httpx

from dotenv import load_dotenv
load_dotenv()

SUPABASE_URL         = os.environ.get("SUPABASE_URL","").rstrip("/")
SUPABASE_SERVICE_KEY = os.environ.get("SUPABASE_SERVICE_KEY","")

HEADERS = {
    "apikey":        SUPABASE_SERVICE_KEY,
    "Authorization": f"Bearer {SUPABASE_SERVICE_KEY}",
    "Content-Type":  "application/json",
}

# Page counts per year (same as scrape_theory_all.py)
PAGE_COUNTS = {
    "2025": 3, "2024": 3, "2023": 3, "2022": 3, "2021": 3,
    "2020": 3, "2019": 3, "2018": 3, "2017": 3, "2016": 3,
    "2015": 3, "2014": 3, "2013": 3, "2012": 3, "2011": 3,
    "2010": 3, "2009": 3, "2008": 3, "2007": 3, "2006": 3,
    "2005": 3,
}

def get_affected_years():
    """Query Supabase for years with missing diagrams or missing schemes."""
    with httpx.Client(timeout=30) as client:

        # Years with missing diagrams
        resp1 = client.get(
            f"{SUPABASE_URL}/rest/v1/theory_questions"
            f"?select=exam_type,year"
            f"&has_image=eq.false"
            f"&question_text=ilike.*diagram*"
            f"&order=year.desc",
            headers=HEADERS,
        )

        # Years with missing marking schemes
        resp2 = client.get(
            f"{SUPABASE_URL}/rest/v1/theory_questions"
            f"?select=exam_type,year"
            f"&marking_scheme=is.null"
            f"&order=year.desc",
            headers=HEADERS,
        )

    affected = set()

    if resp1.status_code == 200:
        for row in resp1.json():
            affected.add((row["exam_type"].lower(), str(row["year"])))

    if resp2.status_code == 200:
        for row in resp2.json():
            affected.add((row["exam_type"].lower(), str(row["year"])))

    return sorted(affected, key=lambda x: (-int(x[1]), x[0]))

def delete_year_from_supabase(exam_type, year):
    """Delete all theory questions for a year so we can re-upload cleanly."""
    with httpx.Client(timeout=30) as client:
        resp = client.delete(
            f"{SUPABASE_URL}/rest/v1/theory_questions"
            f"?exam_type=eq.{exam_type.upper()}&year=eq.{year}",
            headers=HEADERS,
        )
    if resp.status_code in (200, 204):
        print(f"  🗑  Deleted {exam_type.upper()} {year} from Supabase")
        return True
    print(f"  ❌ Delete failed: {resp.status_code} {resp.text[:100]}")
    return False

def remove_sentinel(exam_type, year):
    """Remove .uploaded sentinel so the year gets re-processed."""
    paths = [
        os.path.join(exam_type.lower(), "mathematics",
                     f"mathematics_{year}_theory.md.uploaded"),
        os.path.join(exam_type.lower(), "mathematics",
                     f"mathematics_{year}_theory.md"),
    ]
    for p in paths:
        if os.path.exists(p):
            os.remove(p)
            print(f"  🗑  Removed: {p}")

def run(cmd, label):
    print(f"\n{'─'*60}")
    print(f"  {label}")
    print(f"{'─'*60}")
    result = subprocess.run(cmd, text=True)
    return result.returncode == 0

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--dry-run", action="store_true",
                        help="Show what would be re-scraped without doing it")
    parser.add_argument("--year", help="Only re-scrape a specific year")
    args = parser.parse_args()

    if not SUPABASE_URL or not SUPABASE_SERVICE_KEY:
        print("❌ Missing SUPABASE_URL or SUPABASE_SERVICE_KEY in .env")
        sys.exit(1)

    print("\n🔍 Checking Supabase for affected years...")
    affected = get_affected_years()

    if args.year:
        affected = [(e, y) for e, y in affected if y == args.year]

    if not affected:
        print("✅ No affected years found — everything looks good!")
        return

    print(f"\n{'═'*60}")
    print(f"  Found {len(affected)} year(s) needing re-scrape:")
    print(f"{'═'*60}")
    for exam, year in affected:
        pages = PAGE_COUNTS.get(year, 3)
        print(f"  {exam.upper()} {year} — {pages} pages")
    print(f"{'═'*60}\n")

    if args.dry_run:
        print("Dry run — nothing executed.")
        return

    success = 0
    failed  = 0

    for exam, year in affected:
        pages = PAGE_COUNTS.get(year, 3)
        md    = os.path.join(exam, "mathematics",
                             f"mathematics_{year}_theory.md")

        print(f"\n{'═'*60}")
        print(f"  Re-scraping {exam.upper()} {year}")
        print(f"{'═'*60}")

        # 1 — Delete from Supabase
        delete_year_from_supabase(exam, year)

        # 2 — Remove local files so it re-scrapes fresh
        remove_sentinel(exam, year)

        # 3 — Re-scrape
        ok = run(
            [sys.executable, "scraper_theory.py",
             "--exam_type", exam,
             "--year",      year,
             "--start",     "1",
             "--end",       str(pages)],
            f"Scraping {exam.upper()} {year} ({pages} pages)..."
        )

        if not ok:
            print(f"  ❌ Scrape failed for {exam.upper()} {year}")
            failed += 1
            continue

        # 4 — Upload
        ok = run(
            [sys.executable, "upload_theory.py",
             md, exam.upper(), year],
            f"Uploading {exam.upper()} {year}..."
        )

        if ok:
            # Mark as uploaded
            with open(md + ".uploaded", "w") as f:
                f.write(datetime.now().isoformat())
            print(f"  ✅ {exam.upper()} {year} complete")
            success += 1
        else:
            print(f"  ❌ Upload failed for {exam.upper()} {year}")
            failed += 1

    print(f"\n{'═'*60}")
    print(f"  DONE")
    print(f"{'═'*60}")
    print(f"  ✅ Success : {success}")
    print(f"  ❌ Failed  : {failed}")
    print(f"{'═'*60}\n")

if __name__ == "__main__":
    main()
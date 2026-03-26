"""
reupload_all_theory.py
──────────────────────
Deletes old WAEC theory rows from Supabase and re-uploads all years.
Skips 2025 (already done).

Usage:
  python reupload_all_theory.py
  python reupload_all_theory.py --start_year 1988 --end_year 2000
"""

import subprocess
import sys
import os
import argparse
from supabase import create_client
from dotenv import load_dotenv

load_dotenv()

YEARS = list(range(1988, 2025))  # 1988 to 2024 inclusive

def delete_year(sb, year):
    try:
        sb.table('theory_questions') \
          .delete() \
          .eq('exam_type', 'WAEC') \
          .eq('year', year) \
          .execute()
        print(f"  [DELETED] WAEC {year} from Supabase")
        return True
    except Exception as e:
        print(f"  [WARN] Could not delete {year}: {e}")
        return False

def upload_year(year):
    md_file = os.path.join("waec", "mathematics", f"mathematics_{year}_theory.md")
    if not os.path.exists(md_file):
        print(f"  [SKIP] {md_file} not found — run rescrape_all_theory.py first")
        return False

    print(f"  [UPLOADING] {md_file}")
    result = subprocess.run(
        [sys.executable, "upload_theory.py", md_file, "WAEC", str(year)],
        capture_output=False,
    )
    return result.returncode == 0

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--start_year", type=int, default=1988)
    parser.add_argument("--end_year",   type=int, default=2024)
    args = parser.parse_args()

    years = [y for y in YEARS if args.start_year <= y <= args.end_year]

    url = os.getenv('SUPABASE_URL')
    key = os.getenv('SUPABASE_SERVICE_KEY')
    sb  = create_client(url, key)

    print(f"Re-uploading {len(years)} years: {years[0]} to {years[-1]}")

    failed = []
    for year in years:
        print(f"\n{'='*50}")
        print(f"  WAEC {year}")
        print(f"{'='*50}")
        delete_year(sb, year)
        ok = upload_year(year)
        if not ok:
            failed.append(year)

    print(f"\n{'='*50}")
    print(f"[DONE] Uploaded {len(years) - len(failed)}/{len(years)} years")
    if failed:
        print(f"[WARN] Failed years: {failed}")
    print(f"{'='*50}")

if __name__ == "__main__":
    main()
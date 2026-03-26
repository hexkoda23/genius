"""
rescrape_all_theory.py
──────────────────────
Re-scrapes all WAEC theory years using the fixed scraper_theory.py.
Skips 2025 (already done).

Usage:
  python rescrape_all_theory.py
  python rescrape_all_theory.py --start_year 1988 --end_year 2000
"""

import subprocess
import sys
import argparse

YEARS = list(range(1988, 2025))  # 1988 to 2024 inclusive, skip 2025

# How many pages per year (myschool.ng has 3 pages for most years)
# The scraper handles missing pages gracefully so 3 is safe for all years
PAGES = 3

def scrape_year(year):
    print(f"\n{'='*50}")
    print(f"  Scraping WAEC {year}...")
    print(f"{'='*50}")
    result = subprocess.run(
        [
            sys.executable, "scraper_theory.py",
            "--exam_type", "waec",
            "--year", str(year),
            "--start", "1",
            "--end", str(PAGES),
        ],
        capture_output=False,  # show output live
    )
    if result.returncode != 0:
        print(f"  [WARN] Year {year} exited with code {result.returncode}")
    return result.returncode == 0

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--start_year", type=int, default=1988)
    parser.add_argument("--end_year",   type=int, default=2024)
    args = parser.parse_args()

    years = [y for y in YEARS if args.start_year <= y <= args.end_year]
    print(f"Re-scraping {len(years)} years: {years[0]} to {years[-1]}")

    failed = []
    for year in years:
        ok = scrape_year(year)
        if not ok:
            failed.append(year)

    print(f"\n{'='*50}")
    print(f"[DONE] Scraped {len(years) - len(failed)}/{len(years)} years")
    if failed:
        print(f"[WARN] Failed years: {failed}")
    print(f"{'='*50}")
    print(f"\nNext step:")
    print(f"  python reupload_all_theory.py")

if __name__ == "__main__":
    main()
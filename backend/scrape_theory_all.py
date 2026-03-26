"""
scrape_theory_all.py
────────────────────
Scrapes and uploads all WAEC and NECO theory questions.

Usage:
  python scrape_theory_all.py
  python scrape_theory_all.py --exam waec
  python scrape_theory_all.py --exam neco
  python scrape_theory_all.py --exam waec --year 2023
  python scrape_theory_all.py --dry-run
"""

import os
import sys
import time
import argparse
import subprocess
from datetime import datetime

JOBS = [
    # ── WAEC ─────────────────────────────────────────────
    { "exam": "waec", "year": "2025", "pages": 3 },
    { "exam": "waec", "year": "2024", "pages": 3 },
    { "exam": "waec", "year": "2023", "pages": 3 },
    { "exam": "waec", "year": "2022", "pages": 3 },
    { "exam": "waec", "year": "2021", "pages": 3 },
    { "exam": "waec", "year": "2020", "pages": 3 },
    { "exam": "waec", "year": "2019", "pages": 6 },
    { "exam": "waec", "year": "2018", "pages": 8 },
    { "exam": "waec", "year": "2017", "pages": 3 },
    { "exam": "waec", "year": "2016", "pages": 3 },
    { "exam": "waec", "year": "2015", "pages": 3 },
    { "exam": "waec", "year": "2014", "pages": 3 },
    { "exam": "waec", "year": "2013", "pages": 3 },
    { "exam": "waec", "year": "2012", "pages": 3 },
    { "exam": "waec", "year": "2011", "pages": 3 },
    { "exam": "waec", "year": "2010", "pages": 3 },
    { "exam": "waec", "year": "2009", "pages": 3 },
    { "exam": "waec", "year": "2008", "pages": 3 },
    { "exam": "waec", "year": "2007", "pages": 3 },
    { "exam": "waec", "year": "2006", "pages": 3 },
    { "exam": "waec", "year": "2005", "pages": 3 },
    { "exam": "waec", "year": "2004", "pages": 3 },
    { "exam": "waec", "year": "2003", "pages": 3 },
    { "exam": "waec", "year": "2002", "pages": 3 },
    { "exam": "waec", "year": "2001", "pages": 3 },
    { "exam": "waec", "year": "2000", "pages": 3 },
    { "exam": "waec", "year": "1999", "pages": 3 },
    { "exam": "waec", "year": "1998", "pages": 3 },
    { "exam": "waec", "year": "1997", "pages": 3 },
    { "exam": "waec", "year": "1996", "pages": 3 },
    { "exam": "waec", "year": "1995", "pages": 3 },
    { "exam": "waec", "year": "1994", "pages": 3 },
    { "exam": "waec", "year": "1993", "pages": 3 },
    { "exam": "waec", "year": "1992", "pages": 3 },
    { "exam": "waec", "year": "1991", "pages": 3 },
    { "exam": "waec", "year": "1990", "pages": 3 },
    { "exam": "waec", "year": "1989", "pages": 3 },
    { "exam": "waec", "year": "1988", "pages": 3 },
    








    # ── NECO ─────────────────────────────────────────────
    # { "exam": "neco", "year": "2008", "pages": 3 },
    # { "exam": "neco", "year": "2005", "pages": 3 },
    # { "exam": "neco", "year": "2004", "pages": 3 },
    # { "exam": "neco", "year": "2003", "pages": 2 },
    # { "exam": "neco", "year": "2002", "pages": 3 },
    # { "exam": "neco", "year": "2001", "pages": 3 },
]

def log(msg, symbol=""):
    ts = datetime.now().strftime("%H:%M:%S")
    print(f"[{ts}] {symbol}  {msg}" if symbol else f"[{ts}]  {msg}")

def md_path(job):
    return os.path.join(
        job["exam"], "mathematics",
        f"mathematics_{job['year']}_theory.md"
    )

def already_scraped(job):
    return os.path.exists(md_path(job))

def already_uploaded(job):
    return os.path.exists(md_path(job) + ".uploaded")

def mark_uploaded(job):
    with open(md_path(job) + ".uploaded", "w") as f:
        f.write(datetime.now().isoformat())

def run(cmd, label):
    print(f"\n{'─'*60}")
    log(label)
    print(f"{'─'*60}")
    result = subprocess.run(cmd, text=True)
    return result.returncode == 0

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--exam",        help="waec / neco")
    parser.add_argument("--year",        help="e.g. 2023")
    parser.add_argument("--upload-only", action="store_true")
    parser.add_argument("--dry-run",     action="store_true")
    parser.add_argument("--force",       action="store_true")
    args = parser.parse_args()

    jobs = JOBS
    if args.exam:
        jobs = [j for j in jobs if j["exam"] == args.exam]
    if args.year:
        jobs = [j for j in jobs if j["year"] == args.year]

    if not jobs:
        print("❌ No jobs match filters.")
        sys.exit(1)

    print(f"\n{'═'*60}")
    print(f"  Theory Scraper — {len(jobs)} job(s)")
    print(f"{'═'*60}")
    for j in jobs:
        status = ""
        if already_scraped(j)  and not args.force: status += " [scraped ✓]"
        if already_uploaded(j) and not args.force: status += " [uploaded ✓]"
        print(f"  {j['exam'].upper()} {j['year']} — {j['pages']} pages{status}")
    print(f"{'═'*60}\n")

    if args.dry_run:
        print("Dry run — nothing executed.")
        return

    scraped_ok = scraped_err = upload_ok = upload_err = skipped = 0
    total_start = time.time()

    for i, job in enumerate(jobs, 1):
        exam  = job["exam"]
        year  = job["year"]
        pages = job["pages"]
        out   = md_path(job)

        print(f"\n{'═'*60}")
        print(f"  Job {i}/{len(jobs)} — {exam.upper()} {year} Theory")
        print(f"{'═'*60}")

        # SCRAPE
        if args.upload_only:
            if not already_scraped(job):
                log(f"No file found — skipping {exam.upper()} {year}", "⏭")
                skipped += 1
                continue
        elif already_scraped(job) and not args.force:
            log(f"Already scraped — skipping", "⏭")
        else:
            ok = run(
                [sys.executable, "scraper_theory.py",
                 "--exam_type", exam, "--year", year,
                 "--start", "1", "--end", str(pages)],
                f"Scraping {exam.upper()} {year} theory ({pages} pages)..."
            )
            if ok:
                scraped_ok += 1
                log(f"Scrape complete → {out}", "✅")
            else:
                scraped_err += 1
                log(f"Scrape failed", "❌")
                continue

        # UPLOAD
        if already_uploaded(job) and not args.force:
            log(f"Already uploaded — skipping", "⏭")
            skipped += 1
            continue

        if not os.path.exists(out):
            log(f"No markdown file — cannot upload", "⚠")
            continue

        ok = run(
            [sys.executable, "upload_theory.py", out, exam.upper(), year],
            f"Uploading {exam.upper()} {year} theory..."
        )
        if ok:
            upload_ok += 1
            mark_uploaded(job)
            log(f"Upload complete", "✅")
        else:
            upload_err += 1
            log(f"Upload failed", "❌")

    elapsed = int(time.time() - total_start)
    mins, secs = divmod(elapsed, 60)

    print(f"\n{'═'*60}")
    print(f"  DONE — {mins}m {secs}s")
    print(f"{'═'*60}")
    print(f"  ✅ Scraped OK   : {scraped_ok}")
    print(f"  ❌ Scrape errors: {scraped_err}")
    print(f"  ✅ Uploaded OK  : {upload_ok}")
    print(f"  ❌ Upload errors: {upload_err}")
    print(f"  ⏭  Skipped      : {skipped}")
    print(f"{'═'*60}\n")

if __name__ == "__main__":
    main()
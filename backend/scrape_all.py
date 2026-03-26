"""
scrape_all.py
─────────────
Scrapes multiple years of JAMB, WAEC and NECO objective questions
then uploads them all to Supabase automatically.

Usage:
  python scrape_all.py                        # scrapes everything configured below
  python scrape_all.py --exam jamb            # only JAMB
  python scrape_all.py --exam waec            # only WAEC
  python scrape_all.py --exam neco            # only NECO
  python scrape_all.py --exam jamb --year 2023  # one specific year
  python scrape_all.py --upload-only          # skip scraping, just upload existing files
  python scrape_all.py --dry-run              # print what would be scraped, don't run
"""

import os
import sys
import time
import argparse
import subprocess
from datetime import datetime

# ════════════════════════════════════════════════════════════════════════
#  CONFIGURE WHAT TO SCRAPE HERE
# ════════════════════════════════════════════════════════════════════════

JOBS = [
    # ── JAMB ─────────────────────────────────────────────────────────
    { "exam": "jamb", "year": "2025", "pages": 11 },
    { "exam": "jamb", "year": "2024", "pages": 10 },
    { "exam": "jamb", "year": "2023", "pages": 16 },
    { "exam": "jamb", "year": "2022", "pages": 8 },
    { "exam": "jamb", "year": "2021", "pages": 8 },
    { "exam": "jamb", "year": "2020", "pages": 8 },
    { "exam": "jamb", "year": "2019", "pages": 16 },
    { "exam": "jamb", "year": "2018", "pages": 13 },
    { "exam": "jamb", "year": "2017", "pages": 9 },
    { "exam": "jamb", "year": "2016", "pages": 10 },
    { "exam": "jamb", "year": "2015", "pages": 13 },
    { "exam": "jamb", "year": "2014", "pages": 10 },
    { "exam": "jamb", "year": "2013", "pages": 10 },
    { "exam": "jamb", "year": "2012", "pages": 10 },
    { "exam": "jamb", "year": "2011", "pages": 10 },
    { "exam": "jamb", "year": "2010", "pages": 10 },
    { "exam": "jamb", "year": "2009", "pages": 10 },
    { "exam": "jamb", "year": "2008", "pages": 10 },
    { "exam": "jamb", "year": "2007", "pages": 10 },
    { "exam": "jamb", "year": "2006", "pages": 10 },
    { "exam": "jamb", "year": "2005", "pages": 10 },
    { "exam": "jamb", "year": "2004", "pages": 10 },
    { "exam": "jamb", "year": "2003", "pages": 9 },
    { "exam": "jamb", "year": "2002", "pages": 10 },
    { "exam": "jamb", "year": "2001", "pages": 10 },
    { "exam": "jamb", "year": "2000", "pages": 10 },
    { "exam": "jamb", "year": "1999", "pages": 9 },
    { "exam": "jamb", "year": "1998", "pages": 10 },
    { "exam": "jamb", "year": "1997", "pages": 9 },
    # { "exam": "jamb", "year": "1996", "pages": 10 },
    { "exam": "jamb", "year": "1995", "pages": 10 },
    { "exam": "jamb", "year": "1994", "pages": 10 },
    { "exam": "jamb", "year": "1993", "pages": 11 },
    { "exam": "jamb", "year": "1992", "pages": 10 },
    { "exam": "jamb", "year": "1991", "pages": 10 },
    { "exam": "jamb", "year": "1990", "pages": 9 },
    { "exam": "jamb", "year": "1989", "pages": 9 },
    { "exam": "jamb", "year": "1988", "pages": 10 },
    { "exam": "jamb", "year": "1987", "pages": 10 },
    { "exam": "jamb", "year": "1986", "pages": 10 },
    { "exam": "jamb", "year": "1985", "pages": 10 },
    { "exam": "jamb", "year": "1984", "pages": 9 },
    { "exam": "jamb", "year": "1983", "pages": 10 },
    { "exam": "jamb", "year": "1982", "pages": 10 },
    { "exam": "jamb", "year": "1981", "pages": 10 },
    { "exam": "jamb", "year": "1980", "pages": 10 },
    { "exam": "jamb", "year": "1979", "pages": 11 },
    { "exam": "jamb", "year": "1978", "pages": 10 },


    # ── WAEC ─────────────────────────────────────────────────────────
    { "exam": "waec", "year": "2025", "pages": 10 },
    { "exam": "waec", "year": "2024", "pages": 10 },
    { "exam": "waec", "year": "2023", "pages": 10 },
    { "exam": "waec", "year": "2022", "pages": 10 },
    { "exam": "waec", "year": "2021", "pages": 10 },
    { "exam": "waec", "year": "2020", "pages": 10 },
    { "exam": "waec", "year": "2019", "pages": 10 },
    { "exam": "waec", "year": "2018", "pages": 10 },
    { "exam": "waec", "year": "2017", "pages": 10 },
    { "exam": "waec", "year": "2016", "pages": 10 },
    { "exam": "waec", "year": "2015", "pages": 9 },
    { "exam": "waec", "year": "2014", "pages": 10 },
    { "exam": "waec", "year": "2013", "pages": 10 },
    { "exam": "waec", "year": "2012", "pages": 10 },
    { "exam": "waec", "year": "2011", "pages": 10 },
    { "exam": "waec", "year": "2010", "pages": 10 },
    { "exam": "waec", "year": "2009", "pages": 10 },
    { "exam": "waec", "year": "2008", "pages": 9 },
    { "exam": "waec", "year": "2007", "pages": 14 },
    { "exam": "waec", "year": "2006", "pages": 10 },
    { "exam": "waec", "year": "2005", "pages": 10 },
    { "exam": "waec", "year": "2004", "pages": 10 },
    { "exam": "waec", "year": "2003", "pages": 10 },
    { "exam": "waec", "year": "2002", "pages": 10 },
    { "exam": "waec", "year": "2001", "pages": 10 },
    { "exam": "waec", "year": "2000", "pages": 10 },
    { "exam": "waec", "year": "1999", "pages": 9 },
    { "exam": "waec", "year": "1998", "pages": 13 },
    { "exam": "waec", "year": "1997", "pages": 9 },
    { "exam": "waec", "year": "1996", "pages": 10 },
    { "exam": "waec", "year": "1995", "pages": 10 },
    { "exam": "waec", "year": "1994", "pages": 10 },
    { "exam": "waec", "year": "1993", "pages": 10 },
    { "exam": "waec", "year": "1992", "pages": 10 },
    { "exam": "waec", "year": "1991", "pages": 10 },
    { "exam": "waec", "year": "1990", "pages": 10 },
    { "exam": "waec", "year": "1989", "pages": 10 },
    { "exam": "waec", "year": "1988", "pages": 9 },
    

    # ── NECO ─────────────────────────────────────────────────────────
    { "exam": "neco", "year": "2008", "pages": 8 },
    # { "exam": "neco", "year": "2023", "pages": 10 },
    { "exam": "neco", "year": "2005", "pages": 8 },
    { "exam": "neco", "year": "2004", "pages": 7 },
    { "exam": "neco", "year": "2003", "pages": 1 },
    { "exam": "neco", "year": "2002", "pages": 7 },
    { "exam": "neco", "year": "2001", "pages": 7 },
]

SUBJECT = "mathematics"

# ════════════════════════════════════════════════════════════════════════
#  HELPERS
# ════════════════════════════════════════════════════════════════════════

def log(msg, symbol=""):
    ts = datetime.now().strftime("%H:%M:%S")
    print(f"[{ts}] {symbol}  {msg}" if symbol else f"[{ts}]  {msg}")

def md_path(job):
    """Expected markdown output path for a job."""
    return os.path.join(
        job["exam"],
        SUBJECT.replace("-", "_"),
        f"{SUBJECT}_{job['year']}_obj.md"
    )

def already_scraped(job):
    return os.path.exists(md_path(job))

def already_uploaded(job):
    """Simple check — look for a .uploaded sentinel file."""
    return os.path.exists(md_path(job) + ".uploaded")

def mark_uploaded(job):
    with open(md_path(job) + ".uploaded", "w") as f:
        f.write(datetime.now().isoformat())

def run(cmd: list[str], label: str) -> bool:
    """Run a subprocess, stream output, return True if successful."""
    print(f"\n{'─'*60}")
    log(label)
    print(f"{'─'*60}")
    result = subprocess.run(cmd, text=True)
    return result.returncode == 0

def filter_jobs(jobs, exam_filter=None, year_filter=None):
    filtered = jobs
    if exam_filter:
        filtered = [j for j in filtered if j["exam"] == exam_filter]
    if year_filter:
        filtered = [j for j in filtered if j["year"] == year_filter]
    return filtered

# ════════════════════════════════════════════════════════════════════════
#  MAIN
# ════════════════════════════════════════════════════════════════════════

def main():
    parser = argparse.ArgumentParser(description="Scrape + upload all past questions")
    parser.add_argument("--exam",        help="Filter by exam: jamb / waec / neco")
    parser.add_argument("--year",        help="Filter by year e.g. 2023")
    parser.add_argument("--upload-only", action="store_true",
                        help="Skip scraping — only upload already-scraped files")
    parser.add_argument("--dry-run",     action="store_true",
                        help="Print jobs without running them")
    parser.add_argument("--force",       action="store_true",
                        help="Re-scrape and re-upload even if already done")
    args = parser.parse_args()

    jobs = filter_jobs(JOBS, args.exam, args.year)

    if not jobs:
        print("❌ No jobs match your filters.")
        sys.exit(1)

    # ── Print plan ───────────────────────────────────────────────────
    print(f"\n{'═'*60}")
    print(f"  MathGenius Scraper — {len(jobs)} job(s) queued")
    print(f"{'═'*60}")
    for j in jobs:
        status = ""
        if already_scraped(j) and not args.force:
            status += " [scraped ✓]"
        if already_uploaded(j) and not args.force:
            status += " [uploaded ✓]"
        print(f"  {j['exam'].upper()} {j['year']}  —  {j['pages']} pages{status}")
    print(f"{'═'*60}\n")

    if args.dry_run:
        print("Dry run complete — nothing was executed.")
        return

    # ── Counters ─────────────────────────────────────────────────────
    scraped_ok  = 0
    scraped_err = 0
    upload_ok   = 0
    upload_err  = 0
    skipped     = 0

    total_start = time.time()

    for i, job in enumerate(jobs, 1):
        exam  = job["exam"]
        year  = job["year"]
        pages = job["pages"]
        out   = md_path(job)

        print(f"\n{'═'*60}")
        print(f"  Job {i}/{len(jobs)} — {exam.upper()} {year}")
        print(f"{'═'*60}")

        # ── SCRAPE ──────────────────────────────────────────────────
        if args.upload_only:
            if not already_scraped(job):
                log(f"No scraped file found — skipping upload for {exam.upper()} {year}", "⏭")
                skipped += 1
                continue
        elif already_scraped(job) and not args.force:
            log(f"Already scraped — skipping scrape for {exam.upper()} {year}", "⏭")
        else:
            ok = run(
                [
                    sys.executable, "scraper.py",
                    "--subject",   SUBJECT,
                    "--exam_type", exam,
                    "--year",      year,
                    "--start",     "1",
                    "--end",       str(pages),
                ],
                f"Scraping {exam.upper()} {year} ({pages} pages)..."
            )
            if ok:
                scraped_ok += 1
                log(f"Scrape complete → {out}", "✅")
            else:
                scraped_err += 1
                log(f"Scrape failed for {exam.upper()} {year}", "❌")
                continue   # don't try to upload if scrape failed

        # ── UPLOAD ──────────────────────────────────────────────────
        if already_uploaded(job) and not args.force:
            log(f"Already uploaded — skipping upload for {exam.upper()} {year}", "⏭")
            skipped += 1
            continue

        if not os.path.exists(out):
            log(f"Markdown file missing — cannot upload {exam.upper()} {year}", "⚠")
            continue

        ok = run(
            [sys.executable, "upload_questions.py", out, exam.upper(), year],
            f"Uploading {exam.upper()} {year} to Supabase..."
        )
        if ok:
            upload_ok += 1
            mark_uploaded(job)
            log(f"Upload complete for {exam.upper()} {year}", "✅")
        else:
            upload_err += 1
            log(f"Upload failed for {exam.upper()} {year}", "❌")

    # ── Final summary ────────────────────────────────────────────────
    elapsed = int(time.time() - total_start)
    mins, secs = divmod(elapsed, 60)

    print(f"\n{'═'*60}")
    print(f"  DONE — {mins}m {secs}s elapsed")
    print(f"{'═'*60}")
    print(f"  ✅ Scraped OK  : {scraped_ok}")
    print(f"  ❌ Scrape errors: {scraped_err}")
    print(f"  ✅ Uploaded OK : {upload_ok}")
    print(f"  ❌ Upload errors: {upload_err}")
    print(f"  ⏭  Skipped     : {skipped}")
    print(f"{'═'*60}\n")



    # ── Fix any missing options with AI ─────────────────────────────
    print(f"\n{'═'*60}")
    print(f"  Running AI option fixer...")
    print(f"{'═'*60}")
    run(
        [sys.executable, "fix_missing_options.py"],
        "Fixing questions with missing options..."
    )


if __name__ == "__main__":
    main()
"""
scrape_and_upload.py
────────────────────
Scrapes past questions from myschool.ng AND uploads them to Supabase
in one command. Combines scraper.py + upload_past_questions.py.

Usage:
  python scrape_and_upload.py --subject mathematics --exam waec --year 2025 --pages 10
  python scrape_and_upload.py --subject mathematics --exam jamb --year 2024 --pages 10
  python scrape_and_upload.py --subject mathematics --exam neco --year 2023 --pages 5

  # Scrape multiple years at once:
  python scrape_and_upload.py --subject mathematics --exam waec --years 2021 2022 2023 2024 2025 --pages 10

  # Dry run (scrape only, don't upload):
  python scrape_and_upload.py --subject mathematics --exam waec --year 2025 --pages 10 --dry-run
"""

import os
import re
import sys
import argparse
from pathlib import Path
from dotenv import load_dotenv

load_dotenv()

# ── Import scraper functions directly ─────────────────────────────────────
# scraper.py must be in the same folder
sys.path.insert(0, os.path.dirname(__file__))
from scraper import scrape, generate_markdown

# ── Supabase ───────────────────────────────────────────────────────────────
from supabase import create_client
SUPABASE_URL = os.environ.get("SUPABASE_URL", "")
SUPABASE_KEY = os.environ.get("SUPABASE_SERVICE_KEY") or os.environ.get("SUPABASE_KEY", "")


# ── Topic guesser ──────────────────────────────────────────────────────────
TOPIC_KEYWORDS = {
    "quadratic":               "Quadratic Equations",
    "simultaneous":            "Simultaneous Equations",
    "arithmetic progression":  "Sequences and Series",
    "geometric progression":   "Sequences and Series",
    "sequence":                "Sequences and Series",
    "series":                  "Sequences and Series",
    "logarithm":               "Logarithms",
    "indices":                 "Indices and Surds",
    "surd":                    "Indices and Surds",
    "trigonometr":             "Trigonometry",
    r"\bsin\b|\bcos\b|\btan\b": "Trigonometry",
    "circle":                  "Circle Geometry",
    "triangle":                "Plane Geometry",
    "polygon":                 "Plane Geometry",
    "matrix":                  "Matrices",
    "vector":                  "Vectors",
    "probability":             "Probability",
    "statistics":              "Statistics",
    r"\bmean\b|\bmedian\b|\bmode\b": "Statistics",
    "differentiat":            "Differentiation",
    "integrat":                "Integration",
    r"\bset\b":                "Sets",
    "fraction":                "Fractions",
    "percentage":              "Percentages",
    "ratio":                   "Ratio and Proportion",
    "profit|loss":             "Commercial Arithmetic",
    "interest":                "Commercial Arithmetic",
    "number base":             "Number Bases",
    "binary":                  "Number Bases",
    "venn":                    "Sets",
    "coordinate":              "Coordinate Geometry",
    "gradient":                "Coordinate Geometry",
    "bearing":                 "Bearings",
    "perimeter":               "Mensuration",
    r"\barea\b":               "Mensuration",
    "volume":                  "Mensuration",
    "surface area":            "Mensuration",
    "complex number":          "Complex Numbers",
    "permutation":             "Permutations and Combinations",
    "combination":             "Permutations and Combinations",
    "binomial":                "Binomial Theorem",
    r"\bfunction\b":           "Functions",
    "inequality":              "Inequalities",
    "linear":                  "Linear Equations",
    "modulo":                  "Modular Arithmetic",
    "locus":                   "Locus",
    "mapping":                 "Functions",
}

def guess_topic(text: str) -> str:
    text_lower = text.lower()
    for pattern, topic in TOPIC_KEYWORDS.items():
        if re.search(pattern, text_lower):
            return topic
    return None

def guess_level(exam: str) -> str:
    exam = exam.upper()
    if exam == "BECE":      return "jss"
    if exam == "JAMB":      return "sss"
    return "sss"   # WAEC, NECO, NABTEB


# ── Convert scraped question dicts → Supabase rows ─────────────────────────
def questions_to_rows(questions: list, exam: str, year: int, subject: str) -> list:
    rows = []
    level = guess_level(exam)
    for q in questions:
        body    = q.get("question", "").strip()
        options = q.get("options", [])
        answer  = q.get("answer")
        if answer == "?":
            answer = None

        # First image found in body or images list
        img_match = re.search(r"!\[diagram\]\((.+?)\)", body)
        image_url = img_match.group(1) if img_match else (
            q["images"][0] if q.get("images") else None
        )

        rows.append({
            "body":            body,
            "options":         options if options else None,
            "answer":          answer,
            "solution":        None,
            "image_url":       image_url,
            "question_type":   "mcq" if options else "theory",
            "exam":            exam.upper(),
            "subject":         subject,
            "topic":           guess_topic(body),
            "level":           level,
            "year":            year,
            "question_number": q.get("question_num"),
            "source_url":      None,
            "verified":        False,
        })
    return rows


# ── Upload to Supabase ─────────────────────────────────────────────────────
def upload(rows: list, dry_run: bool = False) -> dict:
    if dry_run:
        print(f"  [DRY RUN] Would upload {len(rows)} questions")
        return {"inserted": len(rows), "errors": 0}

    if not SUPABASE_URL or not SUPABASE_KEY:
        print("  [ERROR] SUPABASE_URL / SUPABASE_SERVICE_KEY not set in .env")
        return {"inserted": 0, "errors": len(rows)}

    sb         = create_client(SUPABASE_URL, SUPABASE_KEY)
    inserted   = 0
    errors     = 0
    batch_size = 50

    for i in range(0, len(rows), batch_size):
        batch = rows[i : i + batch_size]
        try:
            sb.table("past_questions").upsert(
                batch,
                on_conflict="exam,year,question_number"
            ).execute()
            inserted += len(batch)
            print(f"  [OK] Uploaded batch {i // batch_size + 1}: {len(batch)} questions")
        except Exception as e:
            print(f"  [ERROR] Batch {i // batch_size + 1}: {e}")
            errors += len(batch)

    return {"inserted": inserted, "errors": errors}


# ── Main ───────────────────────────────────────────────────────────────────
def run(subject: str, exam: str, year: int, pages: int,
        headless: bool = True, dry_run: bool = False, debug: bool = False):

    subject_title = subject.replace("-", " ").title()
    print(f"\n{'='*55}")
    print(f"  {exam.upper()} {year} — {subject_title} — {pages} pages")
    print(f"{'='*55}")

    # ── Step 1: Scrape ────────────────────────────────────────────────
    print(f"\n[STEP 1] Scraping myschool.ng...")
    questions, output_dir, images_dir = scrape(
        subject_slug = subject,
        exam_type    = exam,
        year         = str(year),
        start_page   = 1,
        end_page     = pages,
        headless     = headless,
        debug        = debug,
    )

    if not questions:
        print("[WARN] No questions scraped — skipping upload")
        return

    # ── Save markdown (keeps your existing file structure) ────────────
    md_content = generate_markdown(questions, subject_title, str(year), exam)
    md_path    = Path(output_dir) / f"{subject}_{year}_obj.md"
    md_path.parent.mkdir(parents=True, exist_ok=True)
    md_path.write_text(md_content, encoding="utf-8")
    print(f"\n[SAVED] {md_path}")

    # ── Step 2: Upload ────────────────────────────────────────────────
    print(f"\n[STEP 2] Uploading to Supabase...")
    rows  = questions_to_rows(questions, exam, year, subject_title)
    stats = upload(rows, dry_run=dry_run)

    with_answers = sum(1 for q in questions if q.get("answer") not in (None, "?"))
    with_images  = sum(1 for q in questions if q.get("images"))

    print(f"\n{'='*55}")
    print(f"  Scraped  : {len(questions)} questions")
    print(f"  Answers  : {with_answers}/{len(questions)}")
    print(f"  Images   : {with_images}")
    print(f"  Uploaded : {stats['inserted']}  Errors: {stats['errors']}")
    print(f"{'='*55}\n")


def main():
    parser = argparse.ArgumentParser(
        description="Scrape past questions and upload to Supabase in one step"
    )
    parser.add_argument("--subject", required=True,
                        help="Subject slug e.g. mathematics")
    parser.add_argument("--exam",    required=True,
                        help="Exam type: waec / jamb / neco / bece")
    parser.add_argument("--pages",   type=int, default=10,
                        help="Number of pages to scrape per year (default: 10 = ~50 questions)")

    # Single year or multiple years
    year_group = parser.add_mutually_exclusive_group(required=True)
    year_group.add_argument("--year",  type=int,
                            help="Single year e.g. 2025")
    year_group.add_argument("--years", type=int, nargs="+",
                            help="Multiple years e.g. 2021 2022 2023 2024 2025")

    parser.add_argument("--visible",  action="store_true",
                        help="Show browser window while scraping")
    parser.add_argument("--dry-run",  action="store_true",
                        help="Scrape but don't upload to Supabase")
    parser.add_argument("--debug",    action="store_true",
                        help="Print each question as it is parsed")
    args = parser.parse_args()

    years = args.years if args.years else [args.year]

    for year in years:
        run(
            subject  = args.subject,
            exam     = args.exam,
            year     = year,
            pages    = args.pages,
            headless = not args.visible,
            dry_run  = args.dry_run,
            debug    = args.debug,
        )

    print("[ALL DONE]")


if __name__ == "__main__":
    main()
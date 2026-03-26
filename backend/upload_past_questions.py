"""
upload_past_questions.py
────────────────────────
Reads the markdown files produced by scraper.py and uploads questions
to the Supabase `past_questions` table.

Usage:
  python upload_past_questions.py mathematics/jamb/mathematics_2024_obj.md JAMB 2024
  python upload_past_questions.py mathematics/waec/mathematics_2023_obj.md WAEC 2023
  python upload_past_questions.py --dir mathematics/waec WAEC            # bulk upload a folder

Requires:
  pip install supabase python-dotenv
  .env with SUPABASE_URL and SUPABASE_SERVICE_KEY
"""

import os
import re
import sys
import json
import argparse
from pathlib import Path
from dotenv import load_dotenv
from supabase import create_client

load_dotenv()

SUPABASE_URL = os.environ["SUPABASE_URL"]
SUPABASE_KEY = os.environ.get("SUPABASE_SERVICE_KEY") or os.environ["SUPABASE_KEY"]
sb = create_client(SUPABASE_URL, SUPABASE_KEY)

# ── Topic guesser ──────────────────────────────────────────────────────────
# Maps keywords in question text to topic labels.
# Extend this as you scrape more subjects.
TOPIC_KEYWORDS = {
    "quadratic":          "Quadratic Equations",
    "simultaneous":       "Simultaneous Equations",
    "arithmetic progression": "Sequences and Series",
    "geometric progression":  "Sequences and Series",
    "sequence":           "Sequences and Series",
    "series":             "Sequences and Series",
    "logarithm":          "Logarithms",
    "indices":            "Indices and Surds",
    "surd":               "Indices and Surds",
    "trigonometr":        "Trigonometry",
    "sin\b|cos\b|tan\b":  "Trigonometry",
    "circle":             "Circle Geometry",
    "triangle":           "Plane Geometry",
    "polygon":            "Plane Geometry",
    "matrix":             "Matrices",
    "vector":             "Vectors",
    "probability":        "Probability",
    "statistics":         "Statistics",
    "mean\b|median\b|mode\b": "Statistics",
    "differentiat":       "Differentiation",
    "integrat":           "Integration",
    "set\b":              "Sets",
    "fraction":           "Fractions",
    "percentage":         "Percentages",
    "ratio":              "Ratio and Proportion",
    "profit|loss":        "Commercial Arithmetic",
    "interest":           "Commercial Arithmetic",
    "equation":           "Equations",
    "factori":            "Factorisation",
    "expand":             "Expansion and Factorisation",
    "number base":        "Number Bases",
    "binary":             "Number Bases",
    "modulo":             "Modular Arithmetic",
    "venn diagram":       "Sets",
    "graph":              "Coordinate Geometry",
    "gradient":           "Coordinate Geometry",
    "locus":              "Locus",
    "bearing":            "Bearings",
    "perimeter":          "Mensuration",
    "area\b":             "Mensuration",
    "volume":             "Mensuration",
    "surface area":       "Mensuration",
    "complex number":     "Complex Numbers",
    "permutation":        "Permutations and Combinations",
    "combination":        "Permutations and Combinations",
    "binomial":           "Binomial Theorem",
    "function\b":         "Functions",
    "mapping":            "Functions",
    "inequality":         "Inequalities",
    "linear":             "Linear Equations",
}

def guess_topic(text: str) -> str | None:
    text_lower = text.lower()
    for pattern, topic in TOPIC_KEYWORDS.items():
        if re.search(pattern, text_lower):
            return topic
    return None


# ── Level guesser ──────────────────────────────────────────────────────────
def guess_level(exam: str) -> str:
    exam = exam.upper()
    if exam in ("BECE",):
        return "jss"
    if exam in ("WAEC", "NECO", "NABTEB"):
        return "sss"
    if exam == "JAMB":
        return "sss"   # JAMB is post-secondary entrance but SSS content
    return "sss"


# ── Markdown parser ────────────────────────────────────────────────────────
def parse_markdown(filepath: str, exam: str, year: int) -> list[dict]:
    """
    Parse a markdown file in the format produced by scraper.py:

    **1.** Question text here
    A. Option one
    B. Option two
    ...
    Answer: A
    ---
    """
    text    = Path(filepath).read_text(encoding="utf-8")
    subject = "Mathematics"
    level   = guess_level(exam)

    # Extract subject from header if present
    m = re.search(r"^Subject:\s*(.+)$", text, re.MULTILINE | re.IGNORECASE)
    if m:
        subject = m.group(1).strip()

    questions = []
    # Split on --- separators
    blocks = re.split(r"\n---+\n", text)

    for block in blocks:
        block = block.strip()
        if not block:
            continue

        # Question number + body
        q_match = re.match(r"\*\*(\d+)\.\*\*\s*(.+?)(?=\n[A-E]\.|$)", block, re.DOTALL)
        if not q_match:
            continue

        q_num  = int(q_match.group(1))
        q_body = q_match.group(2).strip()

        # Extract options A–E
        options = re.findall(r"^([A-E]\..+)$", block, re.MULTILINE)
        options = [o.strip() for o in options if len(o.strip()) > 3]

        # Extract answer
        ans_match = re.search(r"^Answer:\s*([A-E?])", block, re.MULTILINE)
        answer    = ans_match.group(1) if ans_match else None

        # Extract image URL (first one found)
        img_match = re.search(r"!\[diagram\]\((.+?)\)", q_body)
        image_url = img_match.group(1) if img_match else None

        topic = guess_topic(q_body)

        questions.append({
            "body":            q_body,
            "options":         options if options else None,
            "answer":          answer,
            "solution":        None,
            "image_url":       image_url,
            "question_type":   "mcq" if options else "theory",
            "exam":            exam.upper(),
            "subject":         subject,
            "topic":           topic,
            "level":           level,
            "year":            year,
            "question_number": q_num,
            "source_url":      None,
            "verified":        False,
        })

    return questions


# ── Uploader ───────────────────────────────────────────────────────────────
def upload_questions(questions: list[dict], dry_run: bool = False) -> dict:
    if not questions:
        return {"inserted": 0, "skipped": 0, "errors": 0}

    inserted = 0
    skipped  = 0
    errors   = 0
    batch_size = 50

    for i in range(0, len(questions), batch_size):
        batch = questions[i : i + batch_size]

        if dry_run:
            print(f"  [DRY RUN] Would insert {len(batch)} questions")
            inserted += len(batch)
            continue

        try:
            # upsert on (exam, year, question_number) to avoid duplicates
            res = sb.table("past_questions").upsert(
                batch,
                on_conflict="exam,year,question_number"
            ).execute()
            inserted += len(batch)
            print(f"  [OK] Batch {i//batch_size + 1}: inserted {len(batch)}")
        except Exception as e:
            print(f"  [ERROR] Batch {i//batch_size + 1}: {e}")
            errors += len(batch)

    return {"inserted": inserted, "skipped": skipped, "errors": errors}


# ── CLI ────────────────────────────────────────────────────────────────────
def main():
    parser = argparse.ArgumentParser(
        description="Upload scraped past questions markdown to Supabase"
    )
    group = parser.add_mutually_exclusive_group(required=True)
    group.add_argument("filepath", nargs="?",
                       help="Path to a single .md file")
    group.add_argument("--dir",
                       help="Directory of .md files to bulk upload")

    parser.add_argument("exam",  nargs="?", help="Exam type: WAEC | JAMB | NECO | BECE")
    parser.add_argument("year",  nargs="?", type=int, help="Year e.g. 2024")
    parser.add_argument("--dry-run", action="store_true",
                        help="Parse and print without uploading")
    args = parser.parse_args()

    files_to_process = []

    if args.dir:
        # Bulk mode — infer exam+year from filenames like mathematics_2024_obj.md
        for p in sorted(Path(args.dir).glob("**/*.md")):
            m = re.search(r"(\d{4})", p.stem)
            yr = int(m.group(1)) if m else None

            # Infer exam from directory path
            path_lower = str(p).lower()
            exam = "WAEC"
            for e in ["jamb", "waec", "neco", "bece", "nabteb"]:
                if e in path_lower:
                    exam = e.upper()
                    break

            if yr:
                files_to_process.append((str(p), exam, yr))
            else:
                print(f"[SKIP] Can't infer year from filename: {p.name}")

    else:
        if not args.exam or not args.year:
            parser.error("filepath mode requires exam and year arguments")
        files_to_process.append((args.filepath, args.exam.upper(), args.year))

    total_inserted = 0
    total_errors   = 0

    for filepath, exam, year in files_to_process:
        print(f"\n[FILE] {filepath}  ({exam} {year})")
        questions = parse_markdown(filepath, exam, year)
        print(f"  Parsed: {len(questions)} questions")

        # Preview first question
        if questions:
            q = questions[0]
            print(f"  Sample: [{q['topic'] or 'unknown topic'}] {q['body'][:80]}...")

        stats = upload_questions(questions, dry_run=args.dry_run)
        total_inserted += stats["inserted"]
        total_errors   += stats["errors"]
        print(f"  Result: inserted={stats['inserted']} errors={stats['errors']}")

    print(f"\n{'='*50}")
    print(f"[DONE] Total inserted : {total_inserted}")
    print(f"[DONE] Total errors   : {total_errors}")
    print(f"{'='*50}")


if __name__ == "__main__":
    main()
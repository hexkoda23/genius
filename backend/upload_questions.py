"""
upload_questions.py
───────────────────
Parses a scraped markdown file, uploads any question images to
Supabase Storage, then inserts questions into exam_questions table.

Usage:
  python upload_questions.py waec/mathematics/mathematics_2024_obj.md WAEC 2024
  python upload_questions.py jamb/mathematics/mathematics_2023_obj.md JAMB 2023
"""

import re
import os
import sys
import json
import httpx
import asyncio
from pathlib import Path
from dotenv import load_dotenv

load_dotenv()

SUPABASE_URL         = os.environ.get("SUPABASE_URL", "").rstrip("/")
SUPABASE_SERVICE_KEY = os.environ.get("SUPABASE_SERVICE_KEY", "")

if not SUPABASE_URL or not SUPABASE_SERVICE_KEY:
    print("❌ Missing SUPABASE_URL or SUPABASE_SERVICE_KEY in .env")
    sys.exit(1)

HEADERS = {
    "apikey":        SUPABASE_SERVICE_KEY,
    "Authorization": f"Bearer {SUPABASE_SERVICE_KEY}",
}

TOPIC_MAP = {
    "quadratic":        "Quadratic Equations",
    "logarithm":        "Logarithms",
    "indices":          "Indices",
    "surd":             "Surds",
    "sequence":         "Sequences & Series",
    "series":           "Sequences & Series",
    "arithmetic prog":  "Sequences & Series",
    "geometric prog":   "Sequences & Series",
    "matrix":           "Matrices",
    "matrices":         "Matrices",
    "differentiat":     "Calculus",
    "integrat":         "Calculus",
    "trigonometr":      "Trigonometry",
    "sine":             "Trigonometry",
    "cosine":           "Trigonometry",
    "circle":           "Circle Geometry",
    "triangle":         "Triangles",
    "probability":      "Probability",
    "permutation":      "Permutation & Combination",
    "combination":      "Permutation & Combination",
    "statistic":        "Statistics",
    "mean":             "Statistics",
    "median":           "Statistics",
    "bearing":          "Bearings",
    "vector":           "Vectors",
    "set":              "Set Theory",
    "function":         "Functions",
    "polynomial":       "Polynomials",
    "inequality":       "Inequalities",
    "coordinate":       "Coordinate Geometry",
    "straight line":    "Coordinate Geometry",
    "number base":      "Number Bases",
    "binary":           "Number Bases",
    "fraction":         "Fractions",
    "percentage":       "Percentages",
    "ratio":            "Ratio & Proportion",
    "profit":           "Commercial Arithmetic",
    "loss":             "Commercial Arithmetic",
    "interest":         "Commercial Arithmetic",
    "mensuration":      "Mensuration",
    "volume":           "Mensuration",
    "area":             "Mensuration",
    "perimeter":        "Mensuration",
    "locus":            "Locus",
    "construction":     "Construction",
    "graph":            "Graphs",
    "linear":           "Linear Equations",
    "simultaneous":     "Simultaneous Equations",
    "modulo":           "Modular Arithmetic",
    "variation":        "Variation",
    "map":              "Maps & Scale Drawing",
    "scale":            "Maps & Scale Drawing",
}

def guess_topic(text: str) -> str:
    lower = text.lower()
    for keyword, topic in TOPIC_MAP.items():
        if keyword in lower:
            return topic
    return "General Mathematics"


# ════════════════════════════════════════════════════════════════════════
#  MARKDOWN PARSER
# ════════════════════════════════════════════════════════════════════════

def parse_markdown(filepath: str) -> list[dict]:
    with open(filepath, "r", encoding="utf-8") as f:
        content = f.read()

    # raw_blocks = re.split(r'\n---\n', content)
    raw_blocks = re.split(r'\r?\n---\r?\n', content)
    questions  = []

    for block in raw_blocks[1:]:
        block = block.strip()
        if not block:
            continue

        # Question number + text
        q_match = re.match(r'\*\*(\d+)\.\*\*\s*(.+?)(?=\n[A-E]\.|$)', block, re.DOTALL)
        if not q_match:
            continue

        q_num  = int(q_match.group(1))
        q_text = q_match.group(2).strip()

        # Image reference
        img_match        = re.search(r'!\[diagram\]\((.+?)\)', block)
        image_local_path = img_match.group(1) if img_match else None

        # Remove image markdown from question text
        q_text = re.sub(r'!\[diagram\]\(.+?\)', '', q_text).strip()

        # Extract options A–E
        option_matches = re.findall(r'^([A-E])\.\s*(.+)$', block, re.MULTILINE)
        options = {letter: text.strip() for letter, text in option_matches}

        if len(options) < 4:
            continue

        # Correct answer
        ans_match = re.search(r'(?:✓\s*)?(?:\*\*?)?Answer:(?:\*\*?)?\s*([A-E])', block, re.IGNORECASE)
        correct   = ans_match.group(1).upper() if ans_match else None

        if not correct:
            continue

        questions.append({
            "num":              q_num,
            "question_text":    q_text,
            "option_a":         options.get("A", ""),
            "option_b":         options.get("B", ""),
            "option_c":         options.get("C", ""),
            "option_d":         options.get("D", ""),
            "option_e":         options.get("E", None),  # None if not present
            "correct_answer":   correct,
            "image_local_path": image_local_path,
            "topic":            guess_topic(q_text),
        })

    return questions


# ════════════════════════════════════════════════════════════════════════
#  IMAGE UPLOADER
# ════════════════════════════════════════════════════════════════════════

async def upload_image_to_supabase(
    client: httpx.AsyncClient,
    local_path: str,
    storage_path: str,
) -> str | None:
    if not os.path.exists(local_path):
        print(f"    ⚠ Image not found: {local_path}")
        return None

    ext = Path(local_path).suffix.lower()
    content_type_map = {
        ".png":  "image/png",
        ".jpg":  "image/jpeg",
        ".jpeg": "image/jpeg",
        ".gif":  "image/gif",
        ".webp": "image/webp",
        ".svg":  "image/svg+xml",
    }
    content_type = content_type_map.get(ext, "image/png")

    with open(local_path, "rb") as f:
        image_data = f.read()

    resp = await client.post(
        f"{SUPABASE_URL}/storage/v1/object/question-images/{storage_path}",
        content=image_data,
        headers={
            **HEADERS,
            "Content-Type": content_type,
            "x-upsert":     "true",
        }
    )

    if resp.status_code in (200, 201):
        public_url = (
            f"{SUPABASE_URL}/storage/v1/object/public/"
            f"question-images/{storage_path}"
        )
        print(f"    ✅ Uploaded image → {storage_path}")
        return public_url

    print(f"    ❌ Image upload failed ({resp.status_code}): {resp.text[:200]}")
    return None


# ════════════════════════════════════════════════════════════════════════
#  BATCH INSERT
# ════════════════════════════════════════════════════════════════════════

async def insert_questions(
    client: httpx.AsyncClient,
    rows: list[dict],
) -> tuple[int, int]:
    if not rows:
        return 0, 0

    resp = await client.post(
        f"{SUPABASE_URL}/rest/v1/exam_questions",
        headers={
            **HEADERS,
            "Content-Type": "application/json",
            "Prefer":       "resolution=ignore-duplicates,return=minimal",
        },
        content=json.dumps(rows),
    )

    if resp.status_code in (200, 201):
        return len(rows), 0

    print(f"  ❌ Insert failed ({resp.status_code}): {resp.text[:300]}")
    return 0, len(rows)


# ════════════════════════════════════════════════════════════════════════
#  MAIN
# ════════════════════════════════════════════════════════════════════════

async def main(md_filepath: str, exam_type: str, year: int):
    md_path  = Path(md_filepath)
    base_dir = md_path.parent

    print(f"\n📄 Parsing: {md_filepath}")
    questions = parse_markdown(md_filepath)
    print(f"✅ Found {len(questions)} valid questions\n")

    if not questions:
        print("No questions parsed — check markdown format.")
        return

    inserted_total  = 0
    failed_total    = 0
    images_uploaded = 0
    images_failed   = 0
    skipped_e       = 0

    async with httpx.AsyncClient(timeout=30) as client:
        batch = []

        for q in questions:

            # ── Skip if correct answer is E and no option_e column ───
            correct = q["correct_answer"]
            if correct == "E" and not q.get("option_e"):
                print(f"    ⏭ Q{q['num']} skipped — answer is E but no E option found")
                skipped_e += 1
                continue

            # ── Upload image ─────────────────────────────────────────
            image_url = None
            has_image = False

            if q["image_local_path"]:
                # New structure: images/exam_type/year/filename
                # image_local_path is stored as images/jamb/2025/q1_1.png
                local_path = q["image_local_path"].replace("\\", "/")
                # If path is relative, resolve from backend folder
                if not os.path.isabs(local_path):
                    local_path = os.path.join(
                        os.path.dirname(os.path.abspath(__file__)),
                        local_path
                    ).replace("\\", "/")

                filename     = Path(q["image_local_path"]).name
                storage_path = f"{exam_type.lower()}/{year}/{filename}"

                url = await upload_image_to_supabase(client, local_path, storage_path)
                if url:
                    image_url       = url
                    has_image       = True
                    images_uploaded += 1
                else:
                    images_failed += 1

            # ── Build row ────────────────────────────────────────────
            row = {
                "exam_type":      exam_type.upper(),
                "year":           year,
                "subject":        "Mathematics",
                "topic":          q["topic"],
                "question_text":  q["question_text"],
                "option_a":       q["option_a"],
                "option_b":       q["option_b"],
                "option_c":       q["option_c"],
                "option_d":       q["option_d"],
                "option_e":       q.get("option_e"),   # None if 4-option question
                "correct_answer": correct,
                "difficulty":     "medium",
                "image_url":      image_url,
                "has_image":      has_image,
            }
            batch.append(row)

            # ── Insert every 50 rows ─────────────────────────────────
            if len(batch) >= 50:
                ok, fail = await insert_questions(client, batch)
                inserted_total += ok
                failed_total   += fail
                print(f"  📤 Inserted batch — {inserted_total} total so far")
                batch = []

        # Insert remaining
        if batch:
            ok, fail = await insert_questions(client, batch)
            inserted_total += ok
            failed_total   += fail

    print(f"\n{'='*50}")
    print(f"✅ Questions inserted : {inserted_total}")
    print(f"❌ Questions failed   : {failed_total}")
    print(f"⏭  Skipped (E answer): {skipped_e}")
    print(f"🖼️  Images uploaded   : {images_uploaded}")
    print(f"⚠️  Images failed     : {images_failed}")
    print(f"{'='*50}\n")


if __name__ == "__main__":
    if len(sys.argv) < 4:
        print("Usage: python upload_questions.py <markdown_file> <EXAM_TYPE> <YEAR>")
        print("Example: python upload_questions.py waec/mathematics/mathematics_2024_obj.md WAEC 2024")
        sys.exit(1)

    md_file   = sys.argv[1]
    exam_type = sys.argv[2].upper()
    year      = int(sys.argv[3])

    asyncio.run(main(md_file, exam_type, year))
"""
upload_theory.py
────────────────
Parses a theory markdown file and uploads to theory_questions table.

Usage:
  python upload_theory.py waec/mathematics/mathematics_2023_theory.md WAEC 2023
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

SUPABASE_URL         = os.environ.get("SUPABASE_URL","").rstrip("/")
SUPABASE_SERVICE_KEY = os.environ.get("SUPABASE_SERVICE_KEY","")

if not SUPABASE_URL or not SUPABASE_SERVICE_KEY:
    print("❌ Missing SUPABASE_URL or SUPABASE_SERVICE_KEY in .env")
    sys.exit(1)

HEADERS = {
    "apikey":        SUPABASE_SERVICE_KEY,
    "Authorization": f"Bearer {SUPABASE_SERVICE_KEY}",
}

TOPIC_MAP = {
    "quadratic":"Quadratic Equations","logarithm":"Logarithms",
    "indices":"Indices","surd":"Surds","sequence":"Sequences & Series",
    "series":"Sequences & Series","matrix":"Matrices",
    "differentiat":"Calculus","integrat":"Calculus",
    "trigonometr":"Trigonometry","sine":"Trigonometry","cosine":"Trigonometry",
    "circle":"Circle Geometry","triangle":"Triangles",
    "probability":"Probability","permutation":"Permutation & Combination",
    "combination":"Permutation & Combination","statistic":"Statistics",
    "mean":"Statistics","median":"Statistics","bearing":"Bearings",
    "vector":"Vectors","set":"Set Theory","function":"Functions",
    "polynomial":"Polynomials","inequality":"Inequalities",
    "coordinate":"Coordinate Geometry","number base":"Number Bases",
    "binary":"Number Bases","fraction":"Fractions","percentage":"Percentages",
    "ratio":"Ratio & Proportion","profit":"Commercial Arithmetic",
    "loss":"Commercial Arithmetic","interest":"Commercial Arithmetic",
    "mensuration":"Mensuration","volume":"Mensuration","area":"Mensuration",
    "locus":"Locus","construction":"Construction","graph":"Graphs",
    "linear":"Linear Equations","simultaneous":"Simultaneous Equations",
    "variation":"Variation",
}

def guess_topic(text):
    lower = text.lower()
    for keyword, topic in TOPIC_MAP.items():
        if keyword in lower:
            return topic
    return "General Mathematics"

def parse_markdown(filepath):
    with open(filepath, "r", encoding="utf-8") as f:
        content = f.read()

    blocks    = re.split(r'\n---\n', content)
    questions = []

    for block in blocks[1:]:
        block = block.strip()
        if not block:
            continue

        m = re.match(r'\*\*(\d+)\.\*\*\s*(.+?)$', block, re.DOTALL)
        if not m:
            continue

        q_num  = int(m.group(1))
        q_text = m.group(2).strip()

        # Question image (diagram attached to question)
        img_match        = re.search(r'!\[diagram\]\((.+?)\)', block)
        image_local_path = img_match.group(1) if img_match else None

        q_text = re.sub(r'!\[diagram\]\(.+?\)', '', q_text).strip()
        q_text = re.sub(r'\*\*MARKING SCHEME:\*\*.*', '', q_text, flags=re.DOTALL).strip()
        q_text = re.sub(r'\*\*SCHEME_IMAGE:\*\*.*', '', q_text, flags=re.DOTALL).strip()

        if not q_text or len(q_text) < 5:
            continue

        # Marking scheme
        scheme_match = re.search(
            r'\*\*MARKING SCHEME:\*\*\s*(.+?)(?=\*\*SCHEME_IMAGE:|$)',
            block, re.DOTALL
        )
        marking_scheme = scheme_match.group(1).strip() if scheme_match else None

        # Answer/solution images (SCHEME_IMAGE lines)
        answer_image_paths = re.findall(r'\*\*SCHEME_IMAGE:\*\*\s*(.+)', block)
        answer_image_paths = [p.strip() for p in answer_image_paths if p.strip()]

        questions.append({
            "num":               q_num,
            "question_text":     q_text,
            "image_local_path":  image_local_path,
            "answer_image_paths": answer_image_paths,
            "topic":             guess_topic(q_text),
            "marking_scheme":    marking_scheme,
        })

    return questions

async def upload_image(client, local_path, storage_path):
    """Upload a single image to Supabase storage, return public URL or None."""
    if not local_path:
        return None

    # Resolve absolute path
    if not os.path.isabs(local_path):
        local_path = os.path.join(
            os.path.dirname(os.path.abspath(__file__)), local_path
        ).replace("\\", "/")

    if not os.path.exists(local_path):
        print(f"    ⚠️  File not found: {local_path}")
        return None

    ext = Path(local_path).suffix.lower()
    ct  = {
        ".png": "image/png", ".jpg": "image/jpeg",
        ".jpeg": "image/jpeg", ".gif": "image/gif",
        ".webp": "image/webp"
    }.get(ext, "image/png")

    with open(local_path, "rb") as f:
        data = f.read()

    resp = await client.post(
        f"{SUPABASE_URL}/storage/v1/object/question-images/{storage_path}",
        content=data,
        headers={**HEADERS, "Content-Type": ct, "x-upsert": "true"},
    )
    if resp.status_code in (200, 201):
        url = f"{SUPABASE_URL}/storage/v1/object/public/question-images/{storage_path}"
        print(f"    ✅ Image → {storage_path}")
        return url
    print(f"    ❌ Image failed ({resp.status_code}): {resp.text[:100]}")
    return None

async def insert_batch(client, rows):
    if not rows:
        return 0, 0
    resp = await client.post(
        f"{SUPABASE_URL}/rest/v1/theory_questions",
        headers={
            **HEADERS,
            "Content-Type": "application/json",
            "Prefer": "resolution=ignore-duplicates,return=minimal"
        },
        content=json.dumps(rows),
    )
    if resp.status_code in (200, 201):
        return len(rows), 0
    print(f"  ❌ Insert failed ({resp.status_code}): {resp.text[:200]}")
    return 0, len(rows)

async def main(md_filepath, exam_type, year):
    md_path  = Path(md_filepath)

    print(f"\n📄 Parsing: {md_filepath}")
    questions = parse_markdown(md_filepath)
    print(f"✅ Found {len(questions)} theory questions\n")

    if not questions:
        return

    inserted = failed = imgs_ok = imgs_fail = 0

    async with httpx.AsyncClient(timeout=30) as client:
        batch = []
        for q in questions:
            image_url = None
            has_image = False
            answer_image_urls = []

            # Upload question image
            if q["image_local_path"]:
                local    = q["image_local_path"].replace("\\", "/")
                filename = Path(local).name
                storage  = f"{exam_type.lower()}/{year}/theory/{filename}"
                url = await upload_image(client, local, storage)
                if url:
                    image_url = url
                    has_image = True
                    imgs_ok  += 1
                else:
                    imgs_fail += 1

            # Upload answer/solution images
            for ans_path in q.get("answer_image_paths", []):
                local    = ans_path.replace("\\", "/")
                filename = Path(local).name
                storage  = f"{exam_type.lower()}/{year}/theory/answers/{filename}"
                url = await upload_image(client, local, storage)
                if url:
                    answer_image_urls.append(url)
                    imgs_ok += 1
                else:
                    imgs_fail += 1

            batch.append({
                "exam_type":      exam_type.upper(),
                "year":           year,
                "subject":        "Mathematics",
                "topic":          q["topic"],
                "question_no":    q["num"],
                "question_text":  q["question_text"],
                "marking_scheme": q.get("marking_scheme"),
                "image_url":      image_url,
                "has_image":      has_image,
                "answer_images":  answer_image_urls,  # ← new column
            })

            if len(batch) >= 50:
                ok, fail = await insert_batch(client, batch)
                inserted += ok
                failed   += fail
                print(f"  📤 Inserted batch — {inserted} so far")
                batch = []

        if batch:
            ok, fail = await insert_batch(client, batch)
            inserted += ok
            failed   += fail

    print(f"\n{'='*50}")
    print(f"✅ Questions inserted  : {inserted}")
    print(f"❌ Questions failed    : {failed}")
    print(f"🖼  Images uploaded    : {imgs_ok}")
    print(f"⚠️  Images failed      : {imgs_fail}")
    print(f"{'='*50}\n")

if __name__ == "__main__":
    if len(sys.argv) < 4:
        print("Usage: python upload_theory.py <md_file> <EXAM_TYPE> <YEAR>")
        sys.exit(1)
    asyncio.run(main(sys.argv[1], sys.argv[2].upper(), int(sys.argv[3])))
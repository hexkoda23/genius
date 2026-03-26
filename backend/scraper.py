"""
scraper.py
──────────
Scrapes OBJECTIVE past questions from myschool.ng
Only scrapes MCQ (A-E) questions — no theory.

Usage:
  python scraper.py --subject mathematics --exam_type jamb --year 2024 --start 1 --end 10
  python scraper.py --subject mathematics --exam_type waec --year 2023 --start 1 --end 10
  python scraper.py --subject mathematics --exam_type neco --year 2023 --start 1 --end 5
  python scraper.py --subject mathematics --exam_type jamb --year 2024 --start 1 --end 10 --visible
  python scraper.py --subject mathematics --exam_type jamb --year 2024 --start 1 --end 10 --debug
"""

# ── Fix Windows CP1252 encoding issues (must be first) ───────────────────────
import sys
import io
if sys.stdout.encoding and sys.stdout.encoding.lower() != "utf-8":
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8",
                                  errors="replace", line_buffering=True)
if sys.stderr.encoding and sys.stderr.encoding.lower() != "utf-8":
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding="utf-8",
                                  errors="replace", line_buffering=True)
# ─────────────────────────────────────────────────────────────────────────────

import time
import re
import os
import argparse
import requests
from bs4 import BeautifulSoup
from selenium import webdriver
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from webdriver_manager.chrome import ChromeDriverManager


# ════════════════════════════════════════════════════════════════════════
#  IMAGE FILTER CONSTANTS
# ════════════════════════════════════════════════════════════════════════

SKIP_IMAGE_KW = [
    "pixel", "tracking", "icon", "logo", "banner", "adsense",
    "google", "facebook", "twitter", "whatsapp", "youtube",
    "play-store", "app-store", "download", "arrow", "button",
    "emojione", "sprite", "avatar", "gravatar",
    "spinner", "loading", "placeholder", "blank", "spacer",
    "transparent", 
]

# Only trust images from these domains
ALLOWED_IMAGE_DOMAINS = [
    "myschool.ng",
    "myschool-ng.s3",
    "s3.amazonaws.com",
    "cloudinary.com",
    "res.cloudinary",
]

# URL must contain one of these path segments to be a real math diagram
# (excludes ad banners that are also hosted on S3/Cloudinary)
MATH_IMAGE_PATH_KW = [
    "/uploads/", "/questions/", "/solutions/", "/answers/",
    "/diagrams/", "/math/", "/images/q", "/classroom/",
    "/storage/serve/", "/storage/",
    "question_image", "solution_image", "answer_image",
    "theory", "waec", "neco", "jamb", "mathematics",
]

# Minimum bytes for a real diagram image (500 bytes)
MIN_IMAGE_BYTES = 500


# ════════════════════════════════════════════════════════════════════════
#  DRIVER SETUP
# ════════════════════════════════════════════════════════════════════════

def setup_driver(headless=True):
    opts = Options()
    if headless:
        opts.add_argument("--headless=new")
    opts.add_argument("--no-sandbox")
    opts.add_argument("--disable-dev-shm-usage")
    opts.add_argument("--log-level=3")
    opts.add_argument("--disable-blink-features=AutomationControlled")
    opts.add_argument("--window-size=1920,1080")

    # Try system ChromeDriver first (avoids network download)
    try:
        service = Service()  # uses chromedriver from PATH
        driver  = webdriver.Chrome(service=service, options=opts)
        return driver
    except Exception:
        pass

    # Fallback: look in common Windows locations
    common_paths = [
        r"C:\Users\USER\.wdm\drivers\chromedriver\win64\chromedriver.exe",
        r"C:\chromedriver\chromedriver.exe",
        r"C:\Program Files\Google\Chrome\chromedriver.exe",
    ]
    for path in common_paths:
        if os.path.exists(path):
            try:
                service = Service(executable_path=path)
                driver  = webdriver.Chrome(service=service, options=opts)
                return driver
            except Exception:
                continue

    # Last resort: try webdriver_manager (needs internet)
    service = Service(ChromeDriverManager().install())
    return webdriver.Chrome(service=service, options=opts)


# ════════════════════════════════════════════════════════════════════════
#  JUNK FILTER
# ════════════════════════════════════════════════════════════════════════

JUNK_PATTERNS = [
    re.compile(r"^View Answer",              re.IGNORECASE),
    re.compile(r"^(JAMB|WAEC|NECO)\s*$",    re.IGNORECASE),
    re.compile(r"^\d{4}\s*$"),
    re.compile(r"JAMB CBT",                  re.IGNORECASE),
    re.compile(r"JAMB.*Whatsapp",            re.IGNORECASE),
    re.compile(r"Free Download",             re.IGNORECASE),
    re.compile(r"Candidates.*Resellers",     re.IGNORECASE),
    re.compile(r"^Exam\s*(Type|year)",       re.IGNORECASE),
    re.compile(r"^Question Type",            re.IGNORECASE),
    re.compile(r"^(Topics|Novels|All)\s*$",  re.IGNORECASE),
    re.compile(r"^(Objective|Theory)\s*$",   re.IGNORECASE),
    re.compile(r"\.question-desc",           re.IGNORECASE),
    re.compile(r"max-width",                 re.IGNORECASE),
    re.compile(r"height:\s*auto",            re.IGNORECASE),
    re.compile(r"Report an Error",           re.IGNORECASE),
    re.compile(r"Share on",                  re.IGNORECASE),
    re.compile(r"myschool\.ng",              re.IGNORECASE),
    re.compile(r"^Advertisement\s*$",        re.IGNORECASE),
]

def is_junk(line: str) -> bool:
    return any(p.search(line) for p in JUNK_PATTERNS)


# ════════════════════════════════════════════════════════════════════════
#  LATEX → READABLE TEXT
# ════════════════════════════════════════════════════════════════════════

def clean_latex(text: str) -> str:
    def replace(m):
        return _latex_to_readable(m.group(1).strip())
    text = re.sub(r'\\\((.+?)\\\)', replace, text, flags=re.DOTALL)
    text = re.sub(r'\\\[(.+?)\\\]', replace, text, flags=re.DOTALL)
    return text

def _latex_to_readable(s: str) -> str:
    # Matrices
    if any(x in s for x in [r'\begin{bmatrix}', r'\begin{pmatrix}', r'\begin{matrix}']):
        inner = re.sub(r'\\begin\{[a-z]+matrix\}', '', s)
        inner = re.sub(r'\\end\{[a-z]+matrix\}',   '', inner)
        inner = inner.replace(r'\\', ' | ').replace('&', ', ')
        return f"[{' '.join(inner.split())}]"

    s = re.sub(r'\\frac\{([^}]+)\}\{([^}]+)\}', r'(\1/\2)', s)
    s = re.sub(r'\\sqrt\{([^}]+)\}',             r'sqrt(\1)',   s)
    s = re.sub(r'\\sqrt\[([^\]]+)\]\{([^}]+)\}', r'(\1)sqrt(\2)', s)
    s = re.sub(r'\^\{([^}]+)\}',                 r'^\1',     s)
    s = re.sub(r'_\{([^}]+)\}',                  r'_\1',     s)

    replacements = {
        r'\times': 'x',   r'\div': '/',     r'\pm': '+/-',  r'\mp': '-/+',
        r'\leq':   '<=',  r'\geq': '>=',    r'\neq': '!=',  r'\approx': '~=',
        r'\infty': 'inf', r'\pi':  'pi',    r'\theta': 'theta', r'\alpha': 'alpha',
        r'\beta':  'beta',r'\gamma': 'gamma',r'\delta': 'delta',r'\sigma': 'sigma',
        r'\mu':    'mu',  r'\lambda': 'lambda',r'\in': 'in', r'\cup': 'union',
        r'\cap':   'intersect',r'\log': 'log',r'\ln': 'ln', r'\sin': 'sin',
        r'\cos':   'cos', r'\tan': 'tan',   r'\cdot': '*',  r'\ldots': '...',
    }
    for k, v in replacements.items():
        s = s.replace(k, v)

    s = re.sub(r'\^0\b', ' deg', s)
    s = s.replace('{', '').replace('}', '')
    return ' '.join(s.split())


# ════════════════════════════════════════════════════════════════════════
#  IMAGE DOWNLOADER
# ════════════════════════════════════════════════════════════════════════

def download_image(src: str, images_dir: str, exam_type: str, year: str,
                   question_num: int, img_index: int) -> str | None:
    """
    Download image and save to images/{exam_type}/{year}/q{num}_{idx}.png
    Returns the relative path string to embed in markdown, or None on failure.
    """
    try:
        if not src or src.startswith("data:") or src.startswith("blob:"):
            return None

        if not src.startswith("http"):
            src = "https://myschool.ng" + src

        src_lower = src.lower()

        # Block by keyword in URL
        if any(kw in src_lower for kw in SKIP_IMAGE_KW):
            return None

        # Only allow trusted image domains
        if not any(domain in src_lower for domain in ALLOWED_IMAGE_DOMAINS):
            return None

        # URL must look like a real math/question image, not an ad banner
        if not any(kw in src_lower for kw in MATH_IMAGE_PATH_KW):
            return None

        # Determine file extension
        url_path = src.split("?")[0].lower()
        ext = ".png"
        for candidate in [".png", ".jpg", ".jpeg", ".gif", ".webp"]:
            if url_path.endswith(candidate):
                ext = candidate
                break

        filename   = f"q{question_num}_{img_index}{ext}"
        local_path = os.path.join(images_dir, filename)

        # Skip if already downloaded
        if os.path.exists(local_path):
            rel_path = os.path.join("images", exam_type.lower(), str(year), filename).replace("\\", "/")
            print(f"      [CACHED] {filename}")
            return rel_path

        headers  = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
                          "AppleWebKit/537.36 Chrome/120 Safari/537.36",
            "Referer": "https://myschool.ng/",
        }
        response = requests.get(src, headers=headers, timeout=15)
        response.raise_for_status()

        # Must be a real image content type
        content_type = response.headers.get("Content-Type", "")
        if "image" not in content_type:
            return None

        # Must meet minimum size for a real diagram
        if len(response.content) < MIN_IMAGE_BYTES:
            return None

        with open(local_path, "wb") as f:
            f.write(response.content)

        rel_path = os.path.join("images", exam_type.lower(), str(year), filename).replace("\\", "/")
        print(f"      [SAVED] {filename} ({len(response.content)//1024}KB)")
        return rel_path

    except Exception as e:
        print(f"      [WARN] Image failed ({src[:60]}): {e}")
        return None


# ════════════════════════════════════════════════════════════════════════
#  TEXT CLEANER
# ════════════════════════════════════════════════════════════════════════

def clean_lines(raw_text: str, strip_options=True) -> str:
    """Clean raw text: remove junk, option lines, leading numbers."""
    cleaned = []
    for line in raw_text.split("\n"):
        line = line.strip()
        if not line:
            continue
        if strip_options and re.match(r"^[A-E][.\s]\s*$", line):
            continue
        if re.match(r"^\d+\s*$", line):
            continue
        if is_junk(line):
            continue
        cleaned.append(line)

    text = " ".join(cleaned).strip()
    text = re.sub(r'^\d+\s+', '', text)   # remove leading "1 " or "42 "
    text = re.sub(r'\s{2,}', ' ', text)   # collapse multiple spaces
    return text


# ════════════════════════════════════════════════════════════════════════
#  OBJECTIVE QUESTION EXTRACTOR
# ════════════════════════════════════════════════════════════════════════

def extract_objective_questions(html: str, images_dir: str,
                                exam_type: str, year: str,
                                question_offset: int = 0,
                                debug: bool = False) -> list[dict]:
    soup      = BeautifulSoup(html, "lxml")
    questions = []
    blocks    = soup.find_all("div", class_=re.compile(r"\bquestion\b"))

    question_num = question_offset

    for block in blocks:

        # ── 1. Extract options A–E ───────────────────────────────────
        option_items = block.find_all("li")
        options = []
        for li in option_items:
            raw = re.sub(r'\s+', ' ', li.get_text(" ", strip=True)).strip()
            if re.match(r"^[A-E][.\s]", raw):
                raw = re.sub(r'^([A-E])\s*\.?\s*', r'\1. ', raw)
                raw = clean_latex(raw)
                if len(raw) > 3:
                    options.append(raw)

        if len(options) < 4:
            continue

        # Keep A–E (up to 5 options); drop anything beyond E
        if len(options) > 5:
            options = options[:5]

        question_num += 1

        # ── 2. Answer URL ────────────────────────────────────────────
        answer_url  = None
        answer_link = block.find("a", href=re.compile(r"/classroom/"))
        if answer_link and "View Answer" in answer_link.get_text():
            href = answer_link["href"]
            answer_url = href if href.startswith("http") else "https://myschool.ng" + href

        # ── 3. Build question text + download images in ONE pass ─────
        block_copy = BeautifulSoup(str(block), "lxml")

        # Strip non-question elements first
        for tag in block_copy.find_all(["style", "script"]):
            tag.decompose()
        for tag in block_copy.find_all(["ul", "ol"]):
            tag.decompose()
        for tag in block_copy.find_all("a", href=re.compile(r"/classroom/")):
            tag.decompose()
        for tag in block_copy.find_all("span", class_=re.compile(r"badge")):
            tag.decompose()

        # Remove ALL MathJax rendered output (causes duplicate text)
        # Keep only the raw LaTeX source from script[type="math/tex"]
        for tag in block_copy.find_all(True,
                class_=re.compile(
                    r"MathJax|mjx-|MathJax_SVG|MathJax_Display|MathJax_nocache",
                    re.IGNORECASE)):
            tag.decompose()
        # Promote LaTeX source scripts to plain text
        for script in block_copy.find_all("script",
                type=re.compile(r"math/tex")):
            latex = script.get_text(strip=True)
            if latex:
                script.replace_with(block_copy.new_string(f" {latex} "))
            else:
                script.decompose()
        for tag in block_copy.find_all("script"):
            tag.decompose()
        # Remove leftover empty MathJax_Preview wrappers
        for preview in block_copy.find_all(True,
                class_=re.compile(r"MathJax_Preview", re.IGNORECASE)):
            preview.decompose()

        # ── Download each image and replace tag with markdown link ───
        image_paths = []
        img_index   = 1
        seen_srcs   = set()
        for img in block_copy.find_all("img"):
            src = (
                img.get("src", "") or img.get("data-src", "") or
                img.get("data-lazy-src", "") or img.get("data-original", "")
            ).strip()
            if not src or src in seen_srcs:
                img.decompose()
                continue
            seen_srcs.add(src)

            rel_path = download_image(
                src, images_dir, exam_type, year, question_num, img_index
            )
            if rel_path:
                image_paths.append(rel_path)
                from bs4 import NavigableString
                img.replace_with(NavigableString(f" ![diagram]({rel_path}) "))
                img_index += 1
            else:
                img.decompose()

        # ── Extract text (now contains ![diagram](...) inline) ───────
        raw_text      = clean_latex(block_copy.get_text("\n", strip=True))
        question_text = clean_lines(raw_text, strip_options=True)

        # If text is blank but has image, use placeholder
        if not question_text and image_paths:
            question_text = "[See diagram]"

        if not question_text:
            question_num -= 1
            continue

        if debug:
            print(f"\n  [Q{question_num}] {question_text[:120]}")
            print(f"  Options : {options}")
            print(f"  Images  : {image_paths}")

        questions.append({
            "question_num": question_num,
            "question":     question_text,
            "images":       image_paths,
            "options":      options,
            "answer_url":   answer_url,
        })

    return questions


# ════════════════════════════════════════════════════════════════════════
#  ANSWER SCRAPER
# ════════════════════════════════════════════════════════════════════════

def scrape_answer(driver, url: str) -> str | None:
    """Visit the answer page and extract the correct option letter (A–E)."""
    try:
        driver.get(url)
        time.sleep(1.2)
        soup = BeautifulSoup(driver.page_source, "lxml")

        # Strategy 1 — explicit "Correct Answer: Option X" text
        full_text = soup.get_text(" ", strip=True)
        m = re.search(
            r"Correct\s+Answer\s*[:\-]\s*(?:Option\s+)?([A-E])\b",
            full_text, re.IGNORECASE
        )
        if m:
            return m.group(1).upper()

        # Strategy 2 — highlighted / active option in answer page
        for tag in soup.find_all(["div", "span", "li"],
                                  class_=re.compile(r"correct|active|answer|highlight",
                                                    re.IGNORECASE)):
            text = tag.get_text(strip=True)
            m2   = re.match(r"^([A-E])[.\s]", text)
            if m2:
                return m2.group(1).upper()

    except Exception:
        pass
    return None


# ════════════════════════════════════════════════════════════════════════
#  MARKDOWN GENERATOR
# ════════════════════════════════════════════════════════════════════════

def generate_markdown(questions: list[dict], subject: str,
                      year: str, exam_type: str) -> str:
    lines = [
        f"Subject: {subject}",
        f"Exam: {exam_type.upper()}",
        f"Year: {year}",
        f"Type: Objective",
        "",
        "---",
        "",
    ]

    for q in questions:
        lines.append(f"**{q['question_num']}.** {q['question']}")
        lines.append("")

        for img_path in q.get("images", []):
            if img_path not in q["question"]:
                lines.append(f"![diagram]({img_path})")
                lines.append("")

        for opt in q.get("options", []):
            lines.append(opt)
        lines.append("")

        ans = q.get("answer", "?")
        lines.append(f"Answer: {ans if ans else '?'}")
        lines.append("")
        lines.append("---")
        lines.append("")

    return "\n".join(lines)


# ════════════════════════════════════════════════════════════════════════
#  MAIN SCRAPE ORCHESTRATOR
# ════════════════════════════════════════════════════════════════════════


def ai_infer_answer(question_text, options):
    """Ask Groq to pick the correct answer when scraping fails."""
    import os
    from groq import Groq
    from dotenv import load_dotenv
    load_dotenv()
    api_key = os.environ.get("GROQ_API_KEY")
    if not api_key:
        print("      [AI] GROQ_API_KEY not set - skipping")
        return None
    options_text = "\n".join(options)
    prompt = (
        "You are a mathematics teacher. "
        "Pick the correct answer for this multiple choice question.\n\n"
        f"Question: {question_text}\n\n"
        f"Options:\n{options_text}\n\n"
        "Reply with ONLY the letter of the correct answer (A, B, C, D, or E). Nothing else."
    )
    try:
        client = Groq(api_key=api_key)
        resp = client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[{"role": "user", "content": prompt}],
            max_tokens=5,
            temperature=0,
        )
        raw = resp.choices[0].message.content.strip()
        m = re.search(r"[A-E]", raw.upper())
        if m:
            print(f"      [AI] Inferred answer: {m.group()}")
            return m.group()
    except Exception as e:
        print(f"      [AI] Inference failed: {e}")
    return None

def scrape(subject_slug: str, exam_type: str, year: str,
           start_page: int, end_page: int,
           headless: bool = True, debug: bool = False):

    driver   = setup_driver(headless=headless)
    base_url = f"https://myschool.ng/classroom/{subject_slug}"

    output_dir = os.path.join(exam_type.lower(), subject_slug.replace("-", "_"))
    images_dir = os.path.join("images", exam_type.lower(), str(year))

    os.makedirs(output_dir, exist_ok=True)
    os.makedirs(images_dir, exist_ok=True)

    print(f"\n[OUTPUT]  {output_dir}/")
    print(f"[IMAGES]  {images_dir}/")

    all_questions   = []
    question_offset = 0
    skipped_pages   = 0

    for page in range(start_page, end_page + 1):
        print(f"\n[Page {page}/{end_page}] Fetching...")

        url = (
            f"{base_url}"
            f"?exam_type={exam_type}"
            f"&exam_year={year}"
            f"&type=obj"
            f"&page={page}"
        )

        try:
            driver.get(url)
            WebDriverWait(driver, 12).until(
                EC.presence_of_element_located(
                    (By.CSS_SELECTOR, "div[class*='question']")
                )
            )
        except Exception:
            print(f"  [SKIP] Page {page} timed out or has no questions")
            debug_path = os.path.join(output_dir, f"debug_page_{page}.html")
            with open(debug_path, "w", encoding="utf-8") as f:
                f.write(driver.page_source)
            skipped_pages += 1
            continue

        page_questions = extract_objective_questions(
            driver.page_source,
            images_dir,
            exam_type=exam_type,
            year=year,
            question_offset=question_offset,
            debug=debug,
        )

        print(f"  -> {len(page_questions)} questions found")
        question_offset += len(page_questions)
        all_questions.extend(page_questions)

    # ── Fetch answers ────────────────────────────────────────────────
    no_answer = 0
    print(f"\n[ANSWERS] Fetching answers for {len(all_questions)} questions...")
    for q in all_questions:
        label = f"Q{q['question_num']}/{len(all_questions)}"
        if q.get("answer_url"):
            ans = scrape_answer(driver, q["answer_url"])
            if ans:
                q["answer"] = ans
                print(f"  {label} -> {ans}")
            else:
                print(f"  {label} -> [WARN] answer not found, trying AI...")
                ai_ans = ai_infer_answer(q["question"], q.get("options", []))
                if ai_ans:
                    q["answer"] = ai_ans
                    print(f"  {label} -> {ai_ans} (AI)")
                else:
                    q["answer"] = "?"
                    no_answer  += 1
        else:
            q["answer"] = "?"
            no_answer  += 1

    driver.quit()

    print(f"\n{'='*50}")
    print(f"[DONE] Total questions scraped : {len(all_questions)}")
    print(f"[WARN] No answer found         : {no_answer}")
    print(f"[INFO] Pages skipped           : {skipped_pages}")
    print(f"{'='*50}")

    return all_questions, output_dir, images_dir


# ════════════════════════════════════════════════════════════════════════
#  ENTRY POINT
# ════════════════════════════════════════════════════════════════════════

def main():
    parser = argparse.ArgumentParser(
        description="Scrape MCQ past questions from myschool.ng"
    )
    parser.add_argument("--subject",   required=True,
                        help="Subject slug e.g. mathematics")
    parser.add_argument("--exam_type", required=True,
                        help="Exam: jamb / waec / neco")
    parser.add_argument("--year",      required=True,
                        help="Year e.g. 2024")
    parser.add_argument("--start",     type=int, default=1,
                        help="Start page (default: 1)")
    parser.add_argument("--end",       type=int, required=True,
                        help="End page")
    parser.add_argument("--visible",   action="store_true",
                        help="Show browser window while scraping")
    parser.add_argument("--debug",     action="store_true",
                        help="Print each question as it is parsed")
    args = parser.parse_args()

    questions, output_dir, images_dir = scrape(
        subject_slug = args.subject,
        exam_type    = args.exam_type,
        year         = args.year,
        start_page   = args.start,
        end_page     = args.end,
        headless     = not args.visible,
        debug        = args.debug,
    )

    if not questions:
        print("\n[ERROR] No questions scraped — check the URL or try --visible --debug")
        return

    subject_title = args.subject.replace("-", " ").title()
    md_content    = generate_markdown(
        questions, subject_title, args.year, args.exam_type
    )

    filename = f"{args.subject}_{args.year}_obj.md"
    filepath = os.path.join(output_dir, filename)

    with open(filepath, "w", encoding="utf-8") as f:
        f.write(md_content)

    with_answer = sum(1 for q in questions if q.get("answer") not in (None, "?"))
    with_image  = sum(1 for q in questions if q.get("images"))

    print(f"\n[SAVED]  {filepath}")
    print(f"[INFO]   With images  : {with_image}")
    print(f"[INFO]   With answers : {with_answer}")
    print(f"[INFO]   Images folder: {images_dir}/")
    print(f"\nNext step -- upload to Supabase:")
    print(f"  python upload_questions.py {filepath} {args.exam_type.upper()} {args.year}")


if __name__ == "__main__":
    main()
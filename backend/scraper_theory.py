"""
scraper_theory.py
─────────────────
Scrapes THEORY past questions + marking schemes + images from myschool.ng
WAEC and NECO only.

Usage:
  python scraper_theory.py --exam_type waec --year 2025 --start 1 --end 3
  python scraper_theory.py --exam_type waec --year 2025 --start 1 --end 3 --visible
  python scraper_theory.py --exam_type waec --year 2025 --start 1 --end 3 --debug
  python scraper_theory.py --exam_type waec --year 2025 --start 1 --end 3 --visible --pause
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
from bs4 import BeautifulSoup, NavigableString
from selenium import webdriver
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC

SUBJECT = "mathematics"

TOPIC_MAP = {
    "quadratic":    "Quadratic Equations",
    "logarithm":    "Logarithms",
    "indices":      "Indices",
    "surd":         "Surds",
    "sequence":     "Sequences & Series",
    "series":       "Sequences & Series",
    "matrix":       "Matrices",
    "differentiat": "Calculus",
    "integrat":     "Calculus",
    "trigonometr":  "Trigonometry",
    "sine rule":    "Trigonometry",
    "cosine rule":  "Trigonometry",
    "circle":       "Circle Geometry",
    "triangle":     "Triangles",
    "probability":  "Probability",
    "permutation":  "Permutation & Combination",
    "combination":  "Permutation & Combination",
    "statistic":    "Statistics",
    "mean":         "Statistics",
    "median":       "Statistics",
    "bearing":      "Bearings",
    "vector":       "Vectors",
    "set":          "Set Theory",
    "function":     "Functions",
    "polynomial":   "Polynomials",
    "inequality":   "Inequalities",
    "coordinate":   "Coordinate Geometry",
    "number base":  "Number Bases",
    "binary":       "Number Bases",
    "fraction":     "Fractions",
    "percentage":   "Percentages",
    "ratio":        "Ratio & Proportion",
    "profit":       "Commercial Arithmetic",
    "loss":         "Commercial Arithmetic",
    "interest":     "Commercial Arithmetic",
    "mensuration":  "Mensuration",
    "volume":       "Mensuration",
    "area":         "Mensuration",
    "locus":        "Locus",
    "construct":    "Construction",
    "graph":        "Graphs",
    "linear":       "Linear Equations",
    "simultaneous": "Simultaneous Equations",
    "variation":    "Variation",
    "modulo":       "Modular Arithmetic",
    "arithmetic":   "Commercial Arithmetic",
    "angle":        "Angles & Geometry",
    "polygon":      "Polygons",
    "frequency":    "Statistics",
    "histogram":    "Statistics",
    "ogive":        "Statistics",
    "cumulative":   "Statistics",
}

JUNK_PATTERNS = [
    re.compile(r"View Answer",           re.IGNORECASE),
    re.compile(r"Report an Error",       re.IGNORECASE),
    re.compile(r"Share on",              re.IGNORECASE),
    re.compile(r"myschool\.ng",          re.IGNORECASE),
    re.compile(r"^Advertisement",        re.IGNORECASE),
    re.compile(r"JAMB CBT",              re.IGNORECASE),
    re.compile(r"Free Download",         re.IGNORECASE),
    re.compile(r"^(Objective|Theory)$",  re.IGNORECASE),
    re.compile(r"Candidates.*Resellers", re.IGNORECASE),
    re.compile(r"Download Now",          re.IGNORECASE),
    re.compile(r"WhatsApp",              re.IGNORECASE),
    re.compile(r"Discuss \(\d+\)",       re.IGNORECASE),
    re.compile(r"Go back to",            re.IGNORECASE),
    re.compile(r"^Previous$",            re.IGNORECASE),
    re.compile(r"^Next$",                re.IGNORECASE),
]

# Keywords that, if found in an image URL, mean it's junk (ads/icons/emoji)
SKIP_IMAGE_KW = [
    "pixel", "tracking", "icon", "logo", "banner", "adsense",
    "google", "facebook", "twitter", "whatsapp", "youtube",
    "play-store", "app-store", "download", "arrow", "button",
    "jamb-cbt", "mobile-app", "get-ready", "software",
    "emoji", "emojione", "sprite", "avatar", "gravatar",
    "spinner", "loading", "placeholder", "blank", "spacer",
    "1x1", "transparent", "cdnjs", "jsdelivr", "cloudflare",
    "jquery", "bootstrap", "fontawesome", "wp-content/themes",
    "wp-includes", "wp-admin", "badge", "playstore", "appstore",
    "windows_badge", "footer_logo",
]

# Only trust images from these domains
ALLOWED_IMAGE_DOMAINS = [
    "myschool.ng",
    "myschool-ng.s3",
    "s3.amazonaws.com",
    "cloudinary.com",
    "res.cloudinary",
]

# Image URL must contain at least one of these path segments
# to be considered a real math diagram (not an ad banner)
MATH_IMAGE_PATH_KW = [
    "/storage/serve/",
    "/storage/classroom/",
    "/storage/",
    "/uploads/",
    "/questions/",
    "/solutions/",
    "/answers/",
    "/diagrams/",
    "/math/",
    "/images/q",
    "/classroom/",
    "question_image",
    "solution_image",
    "answer_image",
]

# Minimum file size for a real diagram (~10 KB)
MIN_IMAGE_BYTES = 2_000  # 2KB minimum — some real diagrams are small


# ════════════════════════════════════════════════════════════════════════
#  HELPERS
# ════════════════════════════════════════════════════════════════════════

def is_junk(line):
    return any(p.search(line) for p in JUNK_PATTERNS)


def guess_topic(text):
    lower = text.lower()
    for keyword, topic in TOPIC_MAP.items():
        if keyword in lower:
            return topic
    return "General Mathematics"


def get_img_src(img_tag):
    """Extract best src from an img tag, checking all lazy-load attributes."""
    return (
        img_tag.get("src", "") or
        img_tag.get("data-src", "") or
        img_tag.get("data-lazy-src", "") or
        img_tag.get("data-original", "")
    ).strip()


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

    try:
        driver = webdriver.Chrome(service=Service(), options=opts)
        return driver
    except Exception:
        pass

    common_paths = [
        r"C:\Users\USER\.wdm\drivers\chromedriver\win64\chromedriver.exe",
        r"C:\chromedriver\chromedriver.exe",
        r"C:\Program Files\Google\Chrome\chromedriver.exe",
    ]
    for path in common_paths:
        if os.path.exists(path):
            try:
                driver = webdriver.Chrome(
                    service=Service(executable_path=path), options=opts)
                return driver
            except Exception:
                continue

    from webdriver_manager.chrome import ChromeDriverManager
    return webdriver.Chrome(
        service=Service(ChromeDriverManager().install()), options=opts)


# ════════════════════════════════════════════════════════════════════════
#  IMAGE DOWNLOADER
# ════════════════════════════════════════════════════════════════════════

def download_image(src, images_dir, exam_type, year, q_num, idx):
    """
    Download a single image. Returns relative path string or None.
    Three-layer filter: keyword block → domain allowlist → path allowlist.
    """
    try:
        if not src or src.startswith("data:") or src.startswith("blob:"):
            return None

        if not src.startswith("http"):
            src = "https://myschool.ng" + src

        src_lower = src.lower()

        # 1. Block by keyword in URL
        if any(kw in src_lower for kw in SKIP_IMAGE_KW):
            return None

        # 2. Only allow trusted domains
        if not any(domain in src_lower for domain in ALLOWED_IMAGE_DOMAINS):
            print(f"      [REJECT-DOMAIN] {src[:80]}")
            return None

        # 3. URL path must look like a real math image
        if not any(kw in src_lower for kw in MATH_IMAGE_PATH_KW):
            print(f"      [REJECT-PATH] {src[:80]}")
            return None

        # Determine extension
        url_clean = src.split("?")[0].lower()
        ext = ".png"
        for candidate in [".png", ".jpg", ".jpeg", ".gif", ".webp"]:
            if url_clean.endswith(candidate):
                ext = candidate
                break

        filename   = f"theory_q{q_num}_{idx}{ext}"
        local_path = os.path.join(images_dir, filename)
        rel_path   = f"images/{exam_type.lower()}/{year}/theory/{filename}"

        if os.path.exists(local_path):
            print(f"      [CACHED] {filename}")
            return rel_path

        headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
                          "AppleWebKit/537.36 Chrome/120 Safari/537.36",
            "Referer": "https://myschool.ng/",
        }
        
        resp = requests.get(src, headers=headers, timeout=15)
        
        resp.raise_for_status()
        resp = requests.get(src, headers=headers, timeout=15)
        resp.raise_for_status()

        # 4. Must be large enough to be a real diagram
        if len(resp.content) < MIN_IMAGE_BYTES:
            return None

        # 5. Verify it's actually an image (server sometimes returns text/plain)
        try:
            from PIL import Image as _PIL
            import io as _io
            pil_img = _PIL.open(_io.BytesIO(resp.content))
            w, h = pil_img.size
            if h < 150:  # reject banner ads
                return None
        except Exception:
            return None  # not a valid image file
        

        with open(local_path, "wb") as f:
            f.write(resp.content)

        print(f"      [SAVED] {filename} ({len(resp.content)//1024}KB)")
        return rel_path

    except Exception as e:
        print(f"      [WARN] Image failed ({src[:60]}): {e}")
        return None


# ════════════════════════════════════════════════════════════════════════
#  LATEX CLEANER
# ════════════════════════════════════════════════════════════════════════

def clean_latex(text: str) -> str:
    def _convert(s: str) -> str:
        s = re.sub(r'\\frac\{([^}]+)\}\{([^}]+)\}', r'(\1/\2)', s)
        s = re.sub(r'\\sqrt\{([^}]+)\}',             r'sqrt(\1)', s)
        s = re.sub(r'\\sqrt\[([^\]]+)\]\{([^}]+)\}', r'(\1)sqrt(\2)', s)
        s = re.sub(r'\^\{([^}]+)\}',                 r'^\1', s)
        s = re.sub(r'_\{([^}]+)\}',                  r'_\1', s)
        replacements = {
            r'\times': 'x',      r'\div': '/',        r'\pm': '+/-',
            r'\mp': '-/+',       r'\leq': '<=',       r'\geq': '>=',
            r'\neq': '!=',       r'\approx': '~=',    r'\pi': 'pi',
            r'\theta': 'theta',  r'\alpha': 'alpha',  r'\beta': 'beta',
            r'\gamma': 'gamma',  r'\delta': 'delta',  r'\sigma': 'sigma',
            r'\mu': 'mu',        r'\lambda': 'lambda', r'\infty': 'inf',
            r'\in': 'in',        r'\cup': 'union',    r'\cap': 'intersect',
            r'\log': 'log',      r'\ln': 'ln',        r'\sin': 'sin',
            r'\cos': 'cos',      r'\tan': 'tan',      r'\cdot': '*',
            r'\ldots': '...',
        }
        for k, v in replacements.items():
            s = s.replace(k, v)
        s = re.sub(r'\^0\b', ' deg', s)
        s = s.replace('{', '').replace('}', '')
        return ' '.join(s.split())

    def replace_block(m):
        return _convert(m.group(1).strip())

    text = re.sub(r'\\\((.+?)\\\)', replace_block, text, flags=re.DOTALL)
    text = re.sub(r'\\\[(.+?)\\\]', replace_block, text, flags=re.DOTALL)
    text = _remove_duplicate_phrases(text)

    # Handle bare LaTeX not wrapped in \( \)
    text = re.sub(r'\\frac\{([^}]+)\}\{([^}]+)\}', r'(\1/\2)', text)
    text = re.sub(r'\\sqrt\{([^}]+)\}', r'sqrt(\1)', text)
    text = re.sub(r'\^\{([^}]+)\}', r'^\1', text)
    text = re.sub(r'_\{([^}]+)\}', r'_\1', text)
    for k, v in {
        r'\times': 'x', r'\div': '/', r'\leq': '<=', r'\geq': '>=',
        r'\neq': '!=',  r'\pi': 'pi', r'\theta': 'theta',
        r'\log': 'log', r'\ln': 'ln', r'\sin': 'sin',
        r'\cos': 'cos', r'\tan': 'tan', r'\infty': 'inf',
        r'\alpha': 'alpha', r'\beta': 'beta', r'\pm': '+/-',
    }.items():
        text = text.replace(k, v)
    text = re.sub(r'\{([^}]*)\}', r'\1', text)

    return text


def _remove_duplicate_phrases(text: str) -> str:
    words = text.split()
    if len(words) < 6:
        return text
    result = []
    i = 0
    while i < len(words):
        found_repeat = False
        for seq_len in range(15, 2, -1):
            if i + seq_len * 2 > len(words):
                continue
            if words[i:i+seq_len] == words[i+seq_len:i+seq_len*2]:
                result.extend(words[i:i+seq_len])
                i += seq_len * 2
                found_repeat = True
                break
        if not found_repeat:
            result.append(words[i])
            i += 1
    return ' '.join(result)


# ════════════════════════════════════════════════════════════════════════
#  SCROLL TO TRIGGER LAZY IMAGES
# ════════════════════════════════════════════════════════════════════════

def scroll_and_wait(driver):
    try:
        # Scroll down slowly to trigger IntersectionObserver lazy loading
        for _ in range(8):
            driver.execute_script("window.scrollBy(0, window.innerHeight * 0.6)")
            time.sleep(0.6)
        time.sleep(1.0)
        # Force all known lazy-load attributes to src
        driver.execute_script("""
            document.querySelectorAll('img[data-src]').forEach(img => {
                if (!img.src || img.src === window.location.href)
                    img.src = img.getAttribute('data-src');
            });
            document.querySelectorAll('img[data-lazy-src]').forEach(img => {
                if (!img.src || img.src === window.location.href)
                    img.src = img.getAttribute('data-lazy-src');
            });
            document.querySelectorAll('img[data-original]').forEach(img => {
                if (!img.src || img.src === window.location.href)
                    img.src = img.getAttribute('data-original');
            });
            document.querySelectorAll('img[loading="lazy"]').forEach(img => {
                img.loading = 'eager';
            });
        """)
        time.sleep(2.0)
        driver.execute_script("window.scrollTo(0, 0)")
        time.sleep(0.5)
    except Exception:
        pass


# ════════════════════════════════════════════════════════════════════════
#  THEORY QUESTION EXTRACTOR
# ════════════════════════════════════════════════════════════════════════

def extract_theory_questions(html, images_dir, exam_type, year,
                              question_offset=0, debug=False):
    soup      = BeautifulSoup(html, "lxml")
    content   = soup.find("div", id="page-content-section") or soup
    blocks    = content.find_all("div", class_=re.compile(r"question-item"))
    questions = []
    q_num     = question_offset

    for block in blocks:
        # Skip MCQ blocks (have 4+ A-E options)
        mcq_options = [
            li for li in block.find_all("li")
            if re.match(r"^[A-E][.\s]", li.get_text(strip=True))
        ]
        if len(mcq_options) >= 4:
            continue

        q_num += 1

        # Answer URL
        answer_url  = None
        answer_link = block.find("a", href=re.compile(r"/classroom/\w+/\d+"))
        if answer_link:
            href = answer_link.get("href", "")
            answer_url = href if href.startswith("http") \
                else "https://myschool.ng" + href

        # Question images
        image_paths = []
        img_idx     = 1
        seen_srcs   = set()
        for img in block.find_all("img"):
            src = get_img_src(img)
            if not src or src in seen_srcs:
                continue
            seen_srcs.add(src)
            rel = download_image(src, images_dir, exam_type, year, q_num, img_idx)
            if rel:
                image_paths.append(rel)
                img_idx += 1

        # Question text
        q_desc = block.find("div", class_=re.compile(r"question-desc"))
        if not q_desc:
            q_num -= 1
            continue

        desc_copy = BeautifulSoup(str(q_desc), "lxml")

        # Remove ALL MathJax rendered output (causes duplicate text)
        for tag in desc_copy.find_all(True, class_=re.compile(
                r"MathJax|mjx-|MathJax_SVG|MathJax_Display|MathJax_nocache",
                re.IGNORECASE)):
            tag.decompose()
        # Promote raw LaTeX source to plain text
        for script in desc_copy.find_all("script", type=re.compile(r"math/tex")):
            latex = script.get_text(strip=True)
            script.replace_with(NavigableString(f" {latex} ") if latex else "")
        for tag in desc_copy.find_all("script"):
            tag.decompose()
        for preview in desc_copy.find_all(True, class_=re.compile(
                r"MathJax_Preview", re.IGNORECASE)):
            preview.decompose()

        # Convert tables to text
        for table in desc_copy.find_all("table"):
            rows = []
            for tr in table.find_all("tr"):
                cells = [td.get_text(" ", strip=True)
                         for td in tr.find_all(["td", "th"])]
                rows.append(" | ".join(cells))
            table.replace_with(NavigableString(
                "\n[TABLE]\n" + "\n".join(rows) + "\n[/TABLE]\n"
            ))

        raw    = clean_latex(desc_copy.get_text("\n", strip=True))
        lines  = [l.strip() for l in raw.split("\n")
                  if l.strip() and not is_junk(l.strip())]
        q_text = re.sub(r'^\d+\s+', '', " ".join(lines).strip())
        q_text = re.sub(r'\s{2,}', ' ', q_text)

        if not q_text and image_paths:
            q_text = "[See diagram]"
        if not q_text or len(q_text) < 5:
            q_num -= 1
            continue

        if debug:
            print(f"\n  [Theory Q{q_num}] {q_text[:120]}")
            print(f"  Images    : {image_paths}")
            print(f"  Answer URL: {answer_url}")

        questions.append({
            "question_num": q_num,
            "question":     q_text,
            "images":       image_paths,
            "topic":        guess_topic(q_text),
            "answer_url":   answer_url,
        })

    return questions


# ════════════════════════════════════════════════════════════════════════
#  MARKING SCHEME SCRAPER
# ════════════════════════════════════════════════════════════════════════

def scrape_marking_scheme(driver, url, images_dir, exam_type, year, q_num):
    """
    Returns (scheme_text, answer_image_paths).
    - Answer images: scans ALL imgs in page-content-section (filtered by
      domain + path keywords, so emoji/ads are rejected automatically).
    - Scheme text: extracted from the div.mb-4 containing "Explanation".
    """
    if not url:
        return None, []

    try:
        driver.get(url)
        time.sleep(2.5)

        # Scroll to trigger lazy images
        for _ in range(5):
            driver.execute_script("window.scrollBy(0, window.innerHeight)")
            time.sleep(0.5)
        driver.execute_script("""
            document.querySelectorAll('img[data-src]').forEach(img => {
                if (!img.src || img.src === window.location.href)
                    img.src = img.getAttribute('data-src');
            });
            document.querySelectorAll('img[data-lazy-src]').forEach(img => {
                if (!img.src || img.src === window.location.href)
                    img.src = img.getAttribute('data-lazy-src');
            });
            document.querySelectorAll('img[data-original]').forEach(img => {
                if (!img.src || img.src === window.location.href)
                    img.src = img.getAttribute('data-original');
            });
            document.querySelectorAll('img[loading="lazy"]').forEach(img => {
                img.loading = 'eager';
            });
        """)
        time.sleep(1.5)
        driver.execute_script("window.scrollTo(0, 0)")
        time.sleep(0.3)

        live_html = driver.execute_script(
            "return document.documentElement.outerHTML"
        )
        soup = BeautifulSoup(live_html, "lxml")
        content = soup.find("div", id="page-content-section")
        if not content:
            print(f"      [WARN] No page-content-section found")
            return None, []

        # Strip noise
        for tag in content.find_all(["script", "style", "nav", "iframe"]):
            tag.decompose()
        for tag in content.find_all(True, class_=re.compile(
                r"MathJax|mjx-|MathJax_SVG|MathJax_Display|MathJax_nocache",
                re.IGNORECASE)):
            tag.decompose()
        for preview in content.find_all(True, class_=re.compile(
                r"MathJax_Preview", re.IGNORECASE)):
            preview.unwrap()
        for tag in content.find_all("script"):
            tag.decompose()

        # ── Collect answer images ─────────────────────────────────────
        # Images are ONLY collected from INSIDE the div.mb-4 that contains
        # the Explanation. The question-reprint images (div.text-center above
        # the explanation) are intentionally ignored.
        # ── Find the div.mb-4 that contains <h5>Explanation</h5> ─────
        explanation_mb4 = None
        for mb4 in content.find_all("div", class_="mb-4"):
            h5 = mb4.find(["h5", "h4", "h3", "strong", "b"])
            if h5 and "explanation" in h5.get_text(strip=True).lower():
                explanation_mb4 = mb4
                break

        answer_images = []
        scheme_text   = None

        # ── Helper: convert tables to text ───────────────────────────
        def convert_tables(node):
            for table in node.find_all("table"):
                rows = []
                for tr in table.find_all("tr"):
                    cells = [td.get_text(" ", strip=True)
                             for td in tr.find_all(["td", "th"])]
                    rows.append(" | ".join(cells))
                table.replace_with(NavigableString(
                    "\n[TABLE]\n" + "\n".join(rows) + "\n[/TABLE]\n"
                ))

        answer_images = []
        scheme_text   = None

        if explanation_mb4:
            # Collect ALL images anywhere inside the explanation mb-4
            img_idx   = 1
            seen_srcs = set()
            for img in explanation_mb4.find_all("img"):
                src = get_img_src(img)
                
                if not src or src in seen_srcs:
                    continue
                seen_srcs.add(src)
                rel = download_image(
                    src, images_dir, exam_type, year, q_num, 90 + img_idx
                )
                if rel:
                    answer_images.append(rel)
                    img_idx += 1

            # Extract scheme text
            convert_tables(explanation_mb4)
            raw   = clean_latex(explanation_mb4.get_text("\n", strip=True))
            lines = [l.strip() for l in raw.split("\n")
                     if l.strip()
                     and not is_junk(l.strip())
                     and l.strip().lower() != "explanation"]
            result = "\n".join(lines).strip()
            if len(result) > 20:
                img_note = f" + {len(answer_images)} image(s)" if answer_images else ""
                print(f"      [OK] Scheme found ({len(result)} chars){img_note}")
                scheme_text = result

        # Fallback: largest mb-4
        if not scheme_text:
            candidates = content.find_all("div", class_="mb-4")
            if candidates:
                best   = max(candidates, key=lambda d: len(d.get_text(strip=True)))
                convert_tables(best)
                raw    = clean_latex(best.get_text("\n", strip=True))
                lines  = [l.strip() for l in raw.split("\n")
                          if l.strip() and not is_junk(l.strip())]
                result = "\n".join(lines).strip()
                if len(result) > 50:
                    img_note = f" + {len(answer_images)} image(s)" if answer_images else ""
                    print(f"      [OK] Scheme via largest mb-4 ({len(result)} chars){img_note}")
                    scheme_text = result

        if not scheme_text:
            print(f"      [WARN] No scheme found")

        return scheme_text, answer_images

    except Exception as e:
        import traceback
        print(f"      [WARN] Scheme scrape failed: {e}")
        traceback.print_exc()
        return None, []


# ════════════════════════════════════════════════════════════════════════
#  MARKDOWN GENERATOR
# ════════════════════════════════════════════════════════════════════════

def generate_markdown(questions, year, exam_type):
    lines = [
        f"Subject: Mathematics",
        f"Exam: {exam_type.upper()}",
        f"Year: {year}",
        f"Type: Theory",
        "",
        "---",
        "",
    ]
    for q in questions:
        lines.append(f"**{q['question_num']}.** {q['question']}")
        lines.append("")

        for img in q.get("images", []):
            if img not in q["question"]:
                lines.append(f"![diagram]({img})")
                lines.append("")

        scheme = q.get("marking_scheme")
        if scheme:
            lines.append("**MARKING SCHEME:**")
            lines.append(scheme)
            lines.append("")

        for img in q.get("answer_images", []):
            lines.append(f"**SCHEME_IMAGE:** {img}")
            lines.append("")

        lines.append("---")
        lines.append("")

    return "\n".join(lines)


# ════════════════════════════════════════════════════════════════════════
#  MAIN SCRAPE ORCHESTRATOR
# ════════════════════════════════════════════════════════════════════════

def scrape(exam_type, year, start_page, end_page,
           headless=True, debug=False, pause=False):

    driver     = setup_driver(headless)
    base_url   = f"https://myschool.ng/classroom/{SUBJECT}"
    output_dir = os.path.join(exam_type.lower(), "mathematics")
    images_dir = os.path.join("images", exam_type.lower(), str(year), "theory")
    os.makedirs(output_dir, exist_ok=True)
    os.makedirs(images_dir, exist_ok=True)

    print(f"\n[OUTPUT]  {output_dir}/")
    print(f"[IMAGES]  {images_dir}/")

    all_questions   = []
    question_offset = 0
    skipped         = 0

    for page in range(start_page, end_page + 1):
        print(f"\n[Page {page}/{end_page}] Fetching theory...")

        url = (
            f"{base_url}"
            f"?exam_type={exam_type}"
            f"&exam_year={year}"
            f"&type=theory"
            f"&page={page}"
        )

        try:
            driver.get(url)
            WebDriverWait(driver, 15).until(
                EC.presence_of_element_located((By.ID, "page-content-section"))
            )
            WebDriverWait(driver, 15).until(
                EC.presence_of_element_located(
                    (By.CSS_SELECTOR,
                     "#page-content-section div[class*='question']")
                )
            )
            try:
                WebDriverWait(driver, 10).until(
                    lambda d: d.execute_script(
                        "return typeof MathJax === 'undefined' || "
                        "MathJax.Hub === undefined || "
                        "MathJax.Hub.queue.running === 0"
                    )
                )
            except Exception:
                time.sleep(3)

            print("  [SCROLL] Triggering lazy images...")
            scroll_and_wait(driver)

            if pause:
                print("\n  [PAUSED] Press ENTER to continue...")
                input()

        except Exception:
            print(f"  [SKIP] Page {page} timed out")
            skipped += 1
            continue

        live_html = driver.execute_script(
            "return document.documentElement.outerHTML"
        )
        page_qs = extract_theory_questions(
            live_html,
            images_dir,
            exam_type,
            year,
            question_offset=question_offset,
            debug=debug,
        )
        print(f"  -> {len(page_qs)} theory questions found")
        question_offset += len(page_qs)
        all_questions.extend(page_qs)

    # ── Scrape marking schemes ────────────────────────────────────────
    questions_with_url = [q for q in all_questions if q.get("answer_url")]
    print(f"\n[SCHEMES] Scraping marking schemes for "
          f"{len(questions_with_url)}/{len(all_questions)} questions...")

    for q in all_questions:
        label = f"Q{q['question_num']}"
        if q.get("answer_url"):
            scheme, ans_images = scrape_marking_scheme(
                driver,
                q["answer_url"],
                images_dir,
                exam_type,
                year,
                q["question_num"],
            )
            q["marking_scheme"] = scheme
            q["answer_images"]  = ans_images
            status = "[OK]" if scheme else "[WARN] no scheme"
            if ans_images:
                status += f" + {len(ans_images)} answer img(s)"
            print(f"  {label} -> {status}")
        else:
            q["marking_scheme"] = None
            q["answer_images"]  = []
            print(f"  {label} -> no answer URL")

    driver.quit()

    with_images   = sum(1 for q in all_questions if q.get("images"))
    with_schemes  = sum(1 for q in all_questions if q.get("marking_scheme"))
    with_ans_imgs = sum(1 for q in all_questions if q.get("answer_images"))

    print(f"\n{'='*50}")
    print(f"[DONE] Total theory questions : {len(all_questions)}")
    print(f"[INFO] With question images   : {with_images}")
    print(f"[INFO] With marking schemes   : {with_schemes}")
    print(f"[INFO] With answer images     : {with_ans_imgs}")
    print(f"[INFO] Pages skipped          : {skipped}")
    print(f"{'='*50}")

    return all_questions, output_dir, images_dir


# ════════════════════════════════════════════════════════════════════════
#  ENTRY POINT
# ════════════════════════════════════════════════════════════════════════

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--exam_type", required=True)
    parser.add_argument("--year",      required=True)
    parser.add_argument("--start",     type=int, default=1)
    parser.add_argument("--end",       type=int, required=True)
    parser.add_argument("--visible",   action="store_true")
    parser.add_argument("--debug",     action="store_true")
    parser.add_argument("--pause",     action="store_true")
    args = parser.parse_args()

    if args.exam_type.lower() == "jamb":
        print("[ERROR] JAMB has no theory questions.")
        return

    questions, output_dir, images_dir = scrape(
        exam_type  = args.exam_type,
        year       = args.year,
        start_page = args.start,
        end_page   = args.end,
        headless   = not args.visible,
        debug      = args.debug,
        pause      = args.pause,
    )

    if not questions:
        print("\n[ERROR] No theory questions found.")
        return

    md_content = generate_markdown(questions, args.year, args.exam_type)
    filename   = f"mathematics_{args.year}_theory.md"
    filepath   = os.path.join(output_dir, filename)

    with open(filepath, "w", encoding="utf-8") as f:
        f.write(md_content)

    with_images   = sum(1 for q in questions if q.get("images"))
    with_schemes  = sum(1 for q in questions if q.get("marking_scheme"))
    with_ans_imgs = sum(1 for q in questions if q.get("answer_images"))

    print(f"\n[SAVED]  {filepath}")
    print(f"[INFO]   Q images      : {with_images}")
    print(f"[INFO]   Schemes       : {with_schemes}")
    print(f"[INFO]   Answer images : {with_ans_imgs}")
    print(f"\nNext step:")
    print(f"  python upload_theory.py {filepath} "
          f"{args.exam_type.upper()} {args.year}")


if __name__ == "__main__":
    main()
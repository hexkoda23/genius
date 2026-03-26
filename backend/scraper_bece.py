"""
scraper_bece.py  —  BECE Mathematics PDF scraper
Structure per year (reverse order 2010→1990):
  2001–2010: "April YYYY" headers
  1990–2000: "August YYYY" headers

Usage:
    python scraper_bece.py
    python scraper_bece.py --start-page 7
"""

import pdfplumber, json, re, argparse
from pathlib import Path

try:
    from pdf2image import convert_from_path
    PDF2IMAGE_OK = True
except ImportError:
    PDF2IMAGE_OK = False
    print("WARNING: pdf2image not installed — images skipped")

# ════════════════════════════════════════════════════════════════════════
#  TOPIC DETECTION
# ════════════════════════════════════════════════════════════════════════

TOPIC_MAP = {
    'Set Theory':             ['venn', 'union', 'intersection', 'universal set', 'subset', 'well defined'],
    'Number & Numeration':    ['lcm', 'hcf', 'standard form', 'fraction', 'decimal', 'percentage', 'integer', 'prime', 'number base', 'significant'],
    'Algebra':                ['factori', 'simplify', 'expand', 'expression', 'equation', 'inequalit', 'subject of', 'solve for'],
    'Ratio & Proportion':     ['ratio', 'proportion', 'rate', 'speed', 'distance', 'time', 'gallon', 'litre'],
    'Commercial Maths':       ['profit', 'loss', 'discount', 'interest', 'salary', 'tax', 'cost price', 'selling price', 'commission', 'ghc', 'gh'],
    'Geometry & Mensuration': ['area', 'perimeter', 'volume', 'angle', 'triangle', 'circle', 'rectangle', 'polygon', 'diagonal', 'square', 'sector', 'bearing', 'elevation'],
    'Statistics':             ['mean', 'median', 'mode', 'frequency', 'average', 'bar chart', 'pie chart', 'histogram', 'probability', 'score'],
    'Vectors & Matrices':     ['vector', 'matrix', 'determinant', 'translation', 'transformation', 'enlargement'],
    'Coordinate Geometry':    ['gradient', 'slope', 'coordinates', 'midpoint', 'distance between', 'point'],
    'Sequences & Series':     ['sequence', 'series', 'arithmetic', 'geometric', 'nth term', 'missing number'],
}

def detect_topic(text):
    t = text.lower()
    for topic, kws in TOPIC_MAP.items():
        if any(k in t for k in kws):
            return topic
    return 'General Mathematics'

# ════════════════════════════════════════════════════════════════════════
#  TEXT HELPERS
# ════════════════════════════════════════════════════════════════════════

# ── FIX 1: catch ALL month variants used in the PDF ──────────────────
YEAR_RE = re.compile(
    r'(?:January|February|March|April|May|June|July|August|'
    r'September|October|November|December)\s+((?:19|20)\d{2})',
    re.IGNORECASE
)

def extract_year_from_text(text):
    """Return the first year found via any month header, or None."""
    m = YEAR_RE.search(text)
    return int(m.group(1)) if m else None

# ════════════════════════════════════════════════════════════════════════
#  SPACE FIXER — DP word-boundary detector (no external dependencies)
# ════════════════════════════════════════════════════════════════════════

_VOCAB = set("""
the be to of and a in that have it for not on with he as you do at this but
his by from they we say her she or an will my one all would there their what
so up out if about who get which go me when make can like time no just him know
take people into year years your good some could them see other than then now
look only come its over think also back after use two how our work first well
way even new want because any these give day most us many where when
find value calculate given evaluate simplify factorize expand solve
ratio proportion percentage profit loss interest discount cost price principal
compound rate annum money amount pay earn spend total length width height
area perimeter volume radius diameter angle triangle rectangle square circle
polygon bearing distance speed average mean median mode frequency probability
class mark score distribution histogram chart fraction decimal percent whole
number integer prime factor algebra expression equation inequality linear
quadratic matrix vector transformation reflection rotation translation
enlargement trigonometry adjacent opposite hypotenuse sequence progression
intersection universal subset significant approximation standard pupils
students teachers school bought sold trade business ribbon strip strips cut
remain north south east west degrees minutes seconds metres centimetres
kilometres grams kilograms litres cedis cedi ghana machine print books
following ages members group conducted test result displayed table diagram
figure plane sides shown drawn completely correctly together between another
during before receive received payment monthly installment income tax
commission fee marked hire purchase deposit annual weekly daily simple compound
earned shared diagonal were was been have had has make makes made making
print prints printed printing cut cuts cutting their there they these those
any all some none each every much more most less fewer come goes went taken given
find finds found finding give gives gave giving take takes took taking put puts
putting run runs ran running set sets setting draw draws drew drawing show shows
showed shown prove proves proved proven write writes wrote written read reads
know knows knew known see sees saw seen feel feels felt feeling tell tells told
holding call calls called calling keep keeps kept keeping let lets letting sit
sits sat sitting stand stands stood standing bring brings brought bringing buy
buys bought buying sell sells sold selling pay pays paid paying work works worked
study studies studied studying get gets got gotten turn turns turned turning
change changes changed changing form forms formed forming open opens opened
opening move moves moved moving pass passes passed passing cross crosses crossed
reaching meet meets met meeting join joins joined joining share shares shared
sharing earn earns earned earning receive receives received receiving spend spends
spent spending borrow borrows borrowed borrowing lend lends lent lending save
saves saved saving collect collects collected collecting increase increases
increased increasing decrease decreases decreased decreasing represent represents
apply applies applied applying compare compares compared comparing measure
measures measured measuring calculate calculates calculated calculating determine
determines determined determining list lists listed listing label labels labeled
name names named naming identify identifies identified print machine strip class
test result age ages mean median mode range bar pie diagram figure school teacher
pupil student french english radio valued percent year month week day hour bearing
direction probability outcome olu kofi ama kojo kwame busase atoru subject subjects
the and for are but not you all can was one our out has its who him his how did
got let put way too use had may say see per now old ago bar car far jar war bag big
bug dug fog hog log mug arm aim air ate ask act art arc bed bad bud bus bit boy
buy cab cod cop cot cow cup dam dry due ear eat end era fed fee few fin fit fix fly
foe fry gap gas gel gem gin god gum gut hat hay hem hen hip hoe hop hot hub hue hug
hum ice ill ink inn ion ire ivy jam jaw jay jet jig job jot joy jug keg kin kit lab
lad lag lap law lay leg lip lit mad man map mat mix mob mop mud nag nap net new nod
nun oak oat odd ode off oil ore owl own pad pan pat paw pea peg pen pie pig pin pit
pod pop pot pro rag ram rap rat raw ray red ref rep rib rid rig rim rip rob rod rot
row rub rut sag sap sat saw sea sir six ski sky sob son sow spa sub sue sum tab tag
tan tap tax tea ten tie tin tip toe ton top toy tub tug van vat via wag wax web wed
wet wig win wit woe yam yap yaw yea yes yet cut off arc sin cos odd mid net aim also
else true false show add log dot map per
remove removes removing removed brackets equivalent ascending descending arrange arranges
arranged fractions probability obtaining obtain tossed coin coins die fair thrown chance
median integers within counting gradient gradients straight relation relations subject
mapping mappings image images translated translate vector vectors marked reduction sale
customer customers distributed distribute property properties addition defined define
commutative associative distributive identity rotated rotate origin enlargement scale
factor factors perpendicular bisector mediator construction ladder touches touch wall
sector shaded circumference diameter cylinder cylinders curved surface closed circular
radius hostel workers decimal standard form coordinates plot plots vertices vertices
figure formed units right downwards horizontal vertical unitary approach nearest modal
occurring remainder population estimated current simple interest formula principal
invested rate instalment monthly amount owed bank solving multiplying numerator
denominator converting whole improper mixed equivalent reading column binary numeral
base five two ten change substitution grouping product theorem pythagorean exterior
alternate supplementary angles straight line hypotenuse perimeter boys girls
hockey volleyball club salary rent mathematics science ga offered passed venn diagram
items journey transport food pocket voting election prefect prices customer sale
watered cylindrical container equating volume cuboid letters surname workers
anticlockwise clockwise rotation translation enlargement reflection rotation
coordinates axes axis origin sector angle shaded region
order greatest angled rational under respectively numbers letters workers angles vertices boys girls items units yaxis xaxis numbers letters workers angles vertices boys girls items units
""".split())

_TWO = {'cm','km','kg','ml','mm','in','is','it','at','as','an','be','by','do',
        'go','he','if','me','my','no','of','on','or','so','to','up','us','we','am','gh','dl'}

def _word_score(w):
    if w in _VOCAB:        return 10 ** min(len(w), 12)
    if len(w) == 1:
        if w in ('a', 'i'): return 10
        if w in 'xynpqrkbctvwzmafhledsg': return 50  # common math variables
        return -1e15
    if len(w) == 2:        return 100 if w in _TWO else -1e10
    return -(10 ** len(w)) * 0.001

def _dp_split(text):
    n = len(text)
    if not n: return [text]
    best = [-1e300] * (n + 1); back = [0] * (n + 1); best[0] = 0.0
    for i in range(1, n + 1):
        for j in range(max(0, i - 22), i):
            sc = best[j] + _word_score(text[j:i])
            if sc > best[i]: best[i] = sc; back[i] = j
    words, i = [], n
    while i: j = back[i]; words.append(text[j:i]); i = j
    return words[::-1]

def add_spaces(text):
    """Restore word spaces in PDF-extracted concatenated text."""
    if len(text.split()) >= 4:
        text = re.sub(r'([a-zA-Z])(\d)', r'\1 \2', text)
        text = re.sub(r'(\d)([a-zA-Z])', r'\1 \2', text)
        return re.sub(r'  +', ' ', text).strip()
    parts = re.split(r'([^a-zA-Z]+)', text)
    out = []
    for tok in parts:
        if re.match(r'^[a-zA-Z]{2,}$', tok):
            words = _dp_split(tok.lower())
            if tok[0].isupper() and words:
                words[0] = words[0][0].upper() + words[0][1:]
            out.append(' '.join(words))
        else:
            out.append(tok)
    result = ''.join(out)
    result = re.sub(r'([a-zA-Z])(\d)', r'\1 \2', result)
    result = re.sub(r'(\d)([a-zA-Z])', r'\1 \2', result)
    result = re.sub(r'([.!?])([A-Z])', r'\1 \2', result)
    result = re.sub(r'(,)(\d)', r'\1 \2', result)
    return re.sub(r'  +', ' ', result).strip()

SKIP_RE = re.compile(
    r'NOT DRAWN TO SCALE|Turn over|End of paper|'
    r'BECE|Junior.*School|West African|Word Publishers|'
    r'All working must|use of calculators|marks will not|questions carry equal|'
    r'Unauthorized|copyright',
    re.IGNORECASE
)

def is_header_line(line):
    if YEAR_RE.search(line):
        return True
    low = line.lower().replace(' ', '')
    return any(k in low for k in [
        '60marks', '80marks', 'answerfour', 'answerthree',
        'allworkingmust', 'markswillnot', 'questionscarryequal'
    ])

# ════════════════════════════════════════════════════════════════════════
#  PAGE TYPE DETECTION
# ════════════════════════════════════════════════════════════════════════

OPT_RE  = re.compile(r'^[A-E][\.\)]\s*\S', re.MULTILINE)
MCQ_RE  = re.compile(r'^\d{1,2}[.\s]\s*\S', re.MULTILINE)
KEY_RE  = re.compile(r'^\d+[\.\)]\s*[A-E][\.\)\s]', re.MULTILINE)
SOL_RE  = re.compile(r'^\d+\s*[\.\(]', re.MULTILINE)
METH_RE = re.compile(r'\bmethod\s*\d*\b|\bapproach\s*\d*\b', re.IGNORECASE)

def get_page_type(text, prev_type=None):
    """
    Returns (year_or_None, page_type).
    page_type: 'mcq_q' | 'mcq_ans' | 'theory_q' | 'theory_sol' |
               'mcq_cont' | 'mcq_ans_cont' | 'theory_q_cont' |
               'theory_sol_cont' | 'unknown'
    """
    # ── FIX 2: use the new multi-month YEAR_RE ────────────────────────
    year = extract_year_from_text(text)

    low_ns    = text.lower().replace(' ', '')
    opts      = len(OPT_RE.findall(text))
    mcq_lines = len(MCQ_RE.findall(text))
    key_count = len(KEY_RE.findall(text))
    sol_count = len(SOL_RE.findall(text))
    has_meth  = bool(METH_RE.search(text))

    # ── Pages WITH year header ────────────────────────────────────────

    # 1. Theory question section header (with explicit marks/attempt keywords)
    if year and ('60marks' in low_ns or '80marks' in low_ns or
                 'answerfour' in low_ns or 'answerthree' in low_ns or
                 'attemptfour' in low_ns or 'attemptthree' in low_ns):
        return year, 'theory_q'

    # 2. Answer key page (many "N. D." lines, no options)
    if year and key_count >= 5 and opts == 0:
        return year, 'mcq_ans'

    # 3. MCQ question page (has options)
    if year and (opts >= 8 or (opts >= 4 and mcq_lines >= 3)):
        return year, 'mcq_q'

    # 3b. Theory question page without explicit header (e.g. 1998):
    #     year header + starts with Q1 + no MCQ options + no solution methods
    starts_q1 = bool(re.search(r'^\s*1\s*[\.\(]', text, re.MULTILINE))
    if year and starts_q1 and opts == 0 and not has_meth:
        return year, 'theory_q'

    # 4. Theory solution page
    if year and (has_meth or (sol_count >= 2 and opts == 0)):
        return year, 'theory_sol'

    # ── Pages WITHOUT year header (continuations) ─────────────────────

    # 5. Answer key continuation
    if not year and key_count >= 10 and opts == 0:
        return None, 'mcq_ans_cont'

    # 6. MCQ continuation
    if not year and (opts >= 8 or (opts >= 4 and mcq_lines >= 3)):
        return None, 'mcq_cont'

    # 7. Theory question continuation
    if not year and prev_type in ('theory_q', 'theory_q_cont') and not has_meth:
        return None, 'theory_q_cont'

    # 8. Theory solution continuation
    if not year and (has_meth or sol_count >= 2) and opts == 0:
        return None, 'theory_sol_cont'

    return year, 'unknown'

# ════════════════════════════════════════════════════════════════════════
#  IMAGE EXTRACTION
# ════════════════════════════════════════════════════════════════════════

POPPLER_PATH = r"C:\Users\poppler-25.12.0\Library\bin"

def extract_images(pdf_path, page, page_num, year, section, subfolder, dpi=200):
    if not PDF2IMAGE_OK:
        return []
    try:
        if not page.images:
            return []
    except Exception:
        return []
    try:
        pil_pages = convert_from_path(
            pdf_path, first_page=page_num, last_page=page_num, dpi=dpi,
            poppler_path=POPPLER_PATH)
        if not pil_pages:
            return []
        pil_img = pil_pages[0]
    except Exception as e:
        print(f"    [WARN] p{page_num} image failed: {e}")
        return []

    pw, ph = float(page.width), float(page.height)
    iw, ih = pil_img.size
    sx, sy = iw / pw, ih / ph
    saved  = []

    for ci, obj in enumerate(page.images):
        x0 = float(obj.get('x0', 0))
        y0 = float(obj.get('y0', 0))
        x1 = float(obj.get('x1', pw))
        y1 = float(obj.get('y1', ph))
        if (x1 - x0) < 40 or (y1 - y0) < 40:
            continue
        top, bottom = ph - y1, ph - y0
        pad = 8
        box = (
            max(0,  int(x0     * sx) - pad),
            max(0,  int(top    * sy) - pad),
            min(iw, int(x1     * sx) + pad),
            min(ih, int(bottom * sy) + pad),
        )
        if box[2] <= box[0] or box[3] <= box[1]:
            continue
        folder = Path(f'images/bece/{year}/{section}/{subfolder}')
        folder.mkdir(parents=True, exist_ok=True)
        fname = f'p{page_num}_img{ci+1}.png'
        fpath = folder / fname
        pil_img.crop(box).save(str(fpath), 'PNG')
        rel = str(fpath).replace('\\', '/')
        saved.append(rel)
        print(f"      [IMG] {rel}")
    return saved

# ════════════════════════════════════════════════════════════════════════
#  BUCKET BUILDER
# ════════════════════════════════════════════════════════════════════════

def build_buckets(pdf_path, start_page=7, dpi=200):
    buckets      = {}
    current_year = None
    prev_type    = None

    with pdfplumber.open(pdf_path) as pdf:
        total = len(pdf.pages)
        print(f"[INFO] {pdf_path}: {total} pages, scanning from page {start_page}\n")

        for idx in range(start_page - 1, total):
            page     = pdf.pages[idx]
            page_num = idx + 1
            text     = page.extract_text() or ''
            if not text.strip():
                continue

            year_found, ptype = get_page_type(text, prev_type)

            # ── FIX 3: allow year to change in either direction ───────
            # The PDF is roughly 2010→1990 but pages within a year can
            # re-print the year header. Only switch year when a NEW
            # distinct year appears.
            if year_found and year_found != current_year:
                current_year = year_found
                print(f"\n  [YEAR] {current_year}")
                if current_year not in buckets:
                    buckets[current_year] = {
                        'mcq_q': [], 'mcq_ans': [],
                        'theory_q': [], 'theory_sol': []
                    }

            RESOLVE = {
                'mcq_cont':        'mcq_q',
                'mcq_ans_cont':    'mcq_ans',
                'theory_q_cont':   'theory_q',
                'theory_sol_cont': 'theory_sol',
                'mcq_q':           'mcq_q',
                'mcq_ans':         'mcq_ans',
                'theory_q':        'theory_q',
                'theory_sol':      'theory_sol',
            }
            if ptype == 'unknown':
                resolved = RESOLVE.get(prev_type, None)
            else:
                resolved = RESOLVE.get(ptype, None)

            if not resolved or not current_year:
                prev_type = ptype
                continue

            print(f"    p{page_num}: {ptype} → {resolved}")

            # Extract images
            imgs = []
            if resolved == 'mcq_q':
                imgs = extract_images(pdf_path, page, page_num,
                                      current_year, 'objective', 'questions', dpi)
            elif resolved == 'mcq_ans':
                imgs = extract_images(pdf_path, page, page_num,
                                      current_year, 'objective', 'answers', dpi)
            elif resolved == 'theory_q':
                imgs = extract_images(pdf_path, page, page_num,
                                      current_year, 'theory', 'questions', dpi)
            elif resolved == 'theory_sol':
                imgs = extract_images(pdf_path, page, page_num,
                                      current_year, 'theory', 'answers', dpi)

            ans_map = {}
            if resolved == 'mcq_ans':
                for m in re.finditer(r'(\d{1,2})[\.\)]\s*([A-E])[\.\)\s]', text):
                    ans_map[int(m.group(1))] = m.group(2).upper()

            entry = {'text': text, 'imgs': imgs, 'page': page_num}
            if ans_map:
                entry['ans_map'] = ans_map

            buckets[current_year][resolved].append(entry)
            prev_type = ptype

    print(f"\n[INFO] Years found: {sorted(buckets.keys())}\n")
    return buckets

# ════════════════════════════════════════════════════════════════════════
#  MCQ PARSER
# ════════════════════════════════════════════════════════════════════════

MAX_QUESTIONS = 40

def split_inline_options(text):
    """
    Split "14.8994 B)148.994 C)1489.94 D)14899.4 E)148994.0"
    into a dict {'a': '14.8994', 'b': '148.994', ...}.
    Returns None if no inline B-E options found.
    """
    splits = list(re.finditer(r'\b([B-E])\s*[\.)\s]\s*', text))
    if not splits:
        return None
    result = {'a': text[:splits[0].start()].strip()}
    for i, match in enumerate(splits):
        letter = match.group(1).lower()
        start  = match.end()
        end    = splits[i+1].start() if i+1 < len(splits) else len(text)
        result[letter] = text[start:end].strip()
    return result


def parse_mcq(bucket_year, year):
    q_pages   = bucket_year.get('mcq_q', [])
    ans_pages = bucket_year.get('mcq_ans', [])

    ans_map    = {}
    all_a_imgs = []
    for p in ans_pages:
        ans_map.update(p.get('ans_map', {}))
        all_a_imgs.extend(p.get('imgs', []))

    questions = []
    current_q = None

    def flush():
        if current_q and len(questions) < MAX_QUESTIONS:
            current_q['topic'] = detect_topic(current_q['question_text'])
            if not current_q['correct_answer']:
                current_q['correct_answer'] = ans_map.get(current_q['question_no'])
            questions.append(current_q)

    for p in q_pages:
        q_imgs = p.get('imgs', [])
        for raw in p['text'].split('\n'):
            line = add_spaces(raw.strip())
            if not line or SKIP_RE.search(line) or is_header_line(line):
                continue

            m = re.match(r'^(\d{1,2})[.\s]\s+(.{5,})', line)
            if m and not re.match(r'^[A-E][.\)]', line):
                q_no = int(m.group(1))
                if q_no < 1 or q_no > 40:
                    continue
                flush()
                q_text = m.group(2).strip()
                # Split off inline options if all on one line:
                # Pattern 1: "...question A) opt1 B) opt2 C) opt3 D) opt4 E) opt5"
                # Pattern 2: option A alone at end, B-E on next lines
                opts_inline = {'a': None, 'b': None, 'c': None, 'd': None, 'e': None}
                inline_a = re.search(r'\s+A\s*[.)\s]\s*(.+)$', q_text)
                if inline_a:
                    a_val = inline_a.group(1).strip()
                    q_text = q_text[:inline_a.start()].strip()
                    # Check if a_val itself contains B) C) D) E) — all inline
                    parsed = split_inline_options(a_val)
                    if parsed:
                        opts_inline = {k: parsed.get(k) for k in 'abcde'}
                    else:
                        opts_inline['a'] = a_val
                current_q = {
                    'exam_type':          'BECE',
                    'year':               year,
                    'subject':            'Mathematics',
                    'question_no':        q_no,
                    'question_text':      q_text,
                    'option_a':           opts_inline['a'],
                    'option_b':           opts_inline['b'],
                    'option_c':           opts_inline['c'],
                    'option_d':           opts_inline['d'],
                    'option_e':           opts_inline['e'],
                    'correct_answer':     ans_map.get(q_no),
                    'topic':              None,
                    'image_paths':        list(q_imgs),
                    'answer_image_paths': list(all_a_imgs),
                }
                continue

            om = re.match(r'^([A-E])[\.\.)]\s*(.+)', line)
            if om and current_q:
                letter = om.group(1).upper()
                rest   = om.group(2).strip()
                # Check if rest contains more inline options e.g "val B)x C)y D)z E)w"
                more = split_inline_options(letter + ')' + rest)
                if more and len([v for v in more.values() if v]) >= 3:
                    for k, v in more.items():
                        if v: current_q[f'option_{k}'] = v
                else:
                    current_q[f'option_{letter.lower()}'] = rest
                continue

            if current_q and not re.match(r'^[A-D][\.\)]', line):
                current_q['question_text'] += ' ' + line

    flush()
    return questions

# ════════════════════════════════════════════════════════════════════════
#  THEORY PARSER
# ════════════════════════════════════════════════════════════════════════

def parse_theory(bucket_year, year):
    th_q_pages = bucket_year.get('theory_q', [])
    th_s_pages = bucket_year.get('theory_sol', [])

    questions     = []
    current_no    = None
    current_lines = []
    current_imgs  = []

    def flush_q():
        if current_no is None or not current_lines:
            return
        text = ' '.join(current_lines).strip()
        if len(text) > 10:
            questions.append({
                'exam_type':          'BECE',
                'year':               year,
                'subject':            'Mathematics',
                'question_no':        current_no,
                'question_text':      text,
                'marking_scheme':     None,
                'topic':              detect_topic(text),
                'image_paths':        list(current_imgs),
                'answer_image_paths': [],
            })

    for p in th_q_pages:
        q_imgs = p.get('imgs', [])
        for raw in p['text'].split('\n'):
            line = raw.strip()
            if not line or SKIP_RE.search(line) or is_header_line(line):
                continue

            # Match: "1. (a) text"  "2. text"  "3.(a) text"  "4 (a) text"
            m = re.match(r'^(\d{1,2})[.\s]\s*(.+)', line)
            if m:
                q_no = int(m.group(1))
                rest = m.group(2).strip()
                # New question if: valid range, different number,
                # starts with letter or (a)/(b) — not a math operator
                is_new_q = (
                    1 <= q_no <= 6
                    and q_no != current_no
                    and bool(re.match(r'^\(?[a-zA-Z¢]', rest))
                    and len(rest) > 3
                )
                if is_new_q:
                    flush_q()
                    current_no    = q_no
                    current_lines = [add_spaces(rest)]
                    current_imgs  = list(q_imgs)
                    continue

            if current_no is not None:
                current_lines.append(add_spaces(line))
                for img in q_imgs:
                    if img not in current_imgs:
                        current_imgs.append(img)
    flush_q()

    # Solutions
    sol_map     = {}
    sol_img_map = {}
    cur_sol_no  = None
    cur_sol_lns = []
    cur_sol_img = []

    def flush_sol():
        if cur_sol_no and cur_sol_lns:
            sol_map[cur_sol_no]     = '\n'.join(cur_sol_lns).strip()
            sol_img_map[cur_sol_no] = list(cur_sol_img)

    for p in th_s_pages:
        s_imgs = p.get('imgs', [])
        for raw in p['text'].split('\n'):
            line = raw.strip()
            if not line or SKIP_RE.search(line) or is_header_line(line):
                continue
            m = re.match(r'^(\d{1,2})\s*[\.\(]', line)
            if m:
                q_no = int(m.group(1))
                if q_no != cur_sol_no:
                    flush_sol()
                    cur_sol_no  = q_no
                    cur_sol_lns = [line]
                    cur_sol_img = list(s_imgs)
                    continue
            if cur_sol_no is not None:
                cur_sol_lns.append(line)
                for img in s_imgs:
                    if img not in cur_sol_img:
                        cur_sol_img.append(img)
    flush_sol()

    for q in questions:
        n = q['question_no']
        q['marking_scheme']     = sol_map.get(n)
        q['answer_image_paths'] = sol_img_map.get(n, [])

    return questions

# ════════════════════════════════════════════════════════════════════════
#  ENTRY POINT
# ════════════════════════════════════════════════════════════════════════

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('pdf',          nargs='?', default='BECE_Mathematics_1990_2012.pdf')
    parser.add_argument('--start-page', type=int, default=7)
    parser.add_argument('--dpi',        type=int, default=200)
    parser.add_argument('--obj-out',    default='bece_objective.json')
    parser.add_argument('--theory-out', default='bece_theory.json')
    args = parser.parse_args()

    buckets    = build_buckets(args.pdf, args.start_page, args.dpi)
    all_obj    = []
    all_theory = []

    for year in sorted(buckets.keys()):
        by = buckets[year]
        print(f"── {year} ──")
        obj = parse_mcq(by, year)
        # De-duplicate: keep first occurrence of each (year, question_no)
        seen_obj = set()
        for q in obj:
            key = (q['year'], q['question_no'])
            if key not in seen_obj:
                seen_obj.add(key)
                all_obj.append(q)
        print(f"  Objective : {len(obj)} questions")
        th = parse_theory(by, year)
        seen_thy = set()
        for q in th:
            key = (q['year'], q['question_no'])
            if key not in seen_thy:
                seen_thy.add(key)
                all_theory.append(q)
        print(f"  Theory    : {len(th)} questions")

    with open(args.obj_out, 'w', encoding='utf-8') as f:
        json.dump(all_obj, f, indent=2, ensure_ascii=False)
    print(f"\n[SAVED] {args.obj_out}  ({len(all_obj)} questions)")

    with open(args.theory_out, 'w', encoding='utf-8') as f:
        json.dump(all_theory, f, indent=2, ensure_ascii=False)
    print(f"[SAVED] {args.theory_out}  ({len(all_theory)} questions)")

    obj_with_imgs    = sum(1 for q in all_obj    if q.get('image_paths'))
    theory_with_imgs = sum(1 for q in all_theory if q.get('image_paths'))

    print(f"\n{'='*55}")
    print(f"Years found      : {sorted(buckets.keys())}")
    print(f"Total MCQ        : {len(all_obj)}")
    print(f"Total Theory     : {len(all_theory)}")
    print(f"MCQ answered     : {sum(1 for q in all_obj    if q.get('correct_answer'))}")
    print(f"Theory w/scheme  : {sum(1 for q in all_theory if q.get('marking_scheme'))}")
    print(f"MCQ with images  : {obj_with_imgs}")
    print(f"Theory w/images  : {theory_with_imgs}")
    print(f"{'='*55}")

if __name__ == '__main__':
    main()
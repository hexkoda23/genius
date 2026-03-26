import pdfplumber, re

OPT_RE  = re.compile(r'^[A-D][\.\)]\s*\S', re.MULTILINE)
MCQ_RE  = re.compile(r'^\d{1,2}[.\s]\s*\S', re.MULTILINE)
KEY_RE  = re.compile(r'^\d+[\.\)]\s*[A-D][\.\)\s]', re.MULTILINE)
SOL_RE  = re.compile(r'^\d+\s*[\.\(]', re.MULTILINE)
METH_RE = re.compile(r'\bmethod\s*\d*\b|\bapproach\s*\d*\b', re.IGNORECASE)

def get_page_type(text):
    year = None
    ym = re.search(r'April\s+(19|20)\d{2}', text, re.IGNORECASE)
    if ym:
        year = int(re.search(r'(19|20)\d{2}', ym.group()).group())
    low_ns    = text.lower().replace(' ', '')
    opts      = len(OPT_RE.findall(text))
    mcq_lines = len(MCQ_RE.findall(text))
    key_count = len(KEY_RE.findall(text))
    sol_count = len(SOL_RE.findall(text))
    has_meth  = bool(METH_RE.search(text))

    if year and ('60marks' in low_ns or '80marks' in low_ns or
                 'answerfour' in low_ns or 'answerthree' in low_ns):
        return year, 'theory_q'
    if year and key_count >= 5 and opts == 0:
        return year, 'mcq_ans'
    is_mcq = opts >= 8 or (opts >= 4 and mcq_lines >= 3)
    if is_mcq:
        return year, 'mcq_q' if year else 'mcq_cont'
    if year and (has_meth or (sol_count >= 2 and opts == 0)):
        return year, 'theory_sol'
    if opts >= 2 and mcq_lines >= 4:
        return None, 'mcq_cont'
    if sol_count >= 2 and opts == 0:
        return None, 'theory_sol_cont'
    return year, 'unknown'

# Show pages 53-105 with type + first line
with pdfplumber.open('BECE_Mathematics_1990_2012.pdf') as pdf:
    current_year = None
    for i in range(52, 160):
        text = pdf.pages[i].extract_text() or ''
        if not text.strip():
            continue
        year, ptype = get_page_type(text)
        opts = len(OPT_RE.findall(text))
        mcq  = len(MCQ_RE.findall(text))
        sol  = len(SOL_RE.findall(text))
        key  = len(KEY_RE.findall(text))
        if year and year != current_year:
            current_year = year
            print(f"\n{'='*60}")
            print(f"  YEAR {year}")
            print(f"{'='*60}")
        first = text.strip().splitlines()[0][:55]
        print(f"  p{i+1:3d} {ptype:20s} opts={opts:2d} mcq={mcq:2d} sol={sol:2d} key={key:2d} | {first}")
"""
scraper_nabteb.py  (v2)
"""
import pdfplumber, json, re, argparse

SKIP_RE     = re.compile(r'NABTEB Past Questions|myschoolgist\.com|For other subjects|Uploaded online|www\.', re.IGNORECASE)
Q_MAIN_RE   = re.compile(r'^(\d{1,2})\s*\(([a-e])\)\s+(.+)', re.IGNORECASE)
Q_NUM_RE    = re.compile(r'^(\d{1,2})[.\s]+([A-Z].+)')
SOLUTION_RE = re.compile(r'^\s*[Ss]olution\b\.?\s*$')

def clean(line): return line.strip()
def is_skip(line): return bool(SKIP_RE.search(line))

def extract_all_text(pdf_path):
    pages = []
    with pdfplumber.open(pdf_path) as pdf:
        for i, page in enumerate(pdf.pages, 1):
            text = page.extract_text() or ''
            lines = [clean(l) for l in text.split('\n') if clean(l) and not is_skip(clean(l))]
            pages.append((i, '\n'.join(lines)))
    return pages

def split_q_and_solution(text):
    lines = text.split('\n')
    for i, line in enumerate(lines):
        if SOLUTION_RE.match(line):
            return '\n'.join(lines[:i]), '\n'.join(lines[i+1:])
    return text, ''

def is_new_question(line):
    m = Q_MAIN_RE.match(line)
    if m: return True, int(m.group(1)), line
    m2 = Q_NUM_RE.match(line)
    if m2:
        num = int(m2.group(1))
        if 1 <= num <= 20: return True, num, line
    return False, None, line

def parse_questions(pages, year):
    q_texts, s_texts, q_order = {}, {}, []
    current_q_no = None

    for _, text in pages:
        q_part, sol_part = split_q_and_solution(text)

        for line in q_part.split('\n'):
            line = clean(line)
            if not line: continue
            is_new, q_no, ltext = is_new_question(line)
            if is_new and q_no:
                current_q_no = q_no
                if q_no not in q_texts:
                    q_texts[q_no] = []; s_texts[q_no] = []; q_order.append(q_no)
                q_texts[q_no].append(ltext)
            elif current_q_no:
                q_texts[current_q_no].append(line)

        if current_q_no and sol_part.strip():
            for line in sol_part.split('\n'):
                line = clean(line)
                if not line: continue
                is_new, q_no, _ = is_new_question(line)
                if is_new and q_no and q_no in q_texts:
                    current_q_no = q_no
                if current_q_no:
                    if current_q_no not in s_texts: s_texts[current_q_no] = []
                    s_texts[current_q_no].append(line)

    questions = []
    seen = set()
    for q_no in q_order:
        if q_no in seen: continue
        seen.add(q_no)
        q_text = '\n'.join(q_texts.get(q_no, [])).strip()
        s_text = '\n'.join(s_texts.get(q_no, [])).strip()
        if len(q_text) < 20: continue
        if not any(c.isalpha() for c in q_text[:30]): continue
        questions.append({
            'exam_type': 'NABTEB', 'year': year, 'subject': 'Mathematics',
            'question_no': q_no, 'question_text': q_text,
            'marking_scheme': s_text or None, 'topic': detect_topic(q_text),
        })
    questions.sort(key=lambda x: x['question_no'])
    return questions

TOPICS = {
    'Indices & Logarithms': ['log', 'indices', 'standard form'],
    'Sequences & Series':   ['G.P', 'A.P', 'geometric', 'arithmetic', 'nth term'],
    'Mensuration':          ['volume', 'capacity', 'cylinder', 'cone', 'bucket'],
    'Trigonometry':         ['sin', 'cos', 'tan', 'bearing', 'elevation'],
    'Circle Theorems':      ['circle', 'radius', 'chord', 'tangent', 'cyclic'],
    'Algebra':              ['equation', 'solve', 'simplify', 'subject of'],
    'Statistics':           ['mean', 'median', 'mode', 'frequency', 'moving average', 'weighted'],
    'Commercial Maths':     ['profit', 'loss', 'discount', 'interest', 'salary', 'tax'],
    'Set Theory':           ['venn', 'union', 'intersection'],
    'Probability':          ['probability', 'chance', 'random'],
    'Locus':                ['locus', 'construct', 'compass'],
}
def detect_topic(text):
    t = text.lower()
    for topic, kws in TOPICS.items():
        if any(k.lower() in t for k in kws): return topic
    return 'General Mathematics'

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('pdf'); parser.add_argument('--year', type=int, required=True)
    parser.add_argument('--out')
    args = parser.parse_args()
    out_file = args.out or f'nabteb_{args.year}.json'
    print(f"📄 Reading {args.pdf}...")
    pages = extract_all_text(args.pdf)
    print(f"🔍 Parsing {args.year}...")
    questions = parse_questions(pages, args.year)
    print(f"\n✅ {len(questions)} questions:\n")
    for q in questions:
        sol = '✓' if q['marking_scheme'] else '✗'
        print(f"  Q{q['question_no']:>2} [{q['topic']:<28}] sol:{sol} — {q['question_text'][:65].replace(chr(10),' ')}")
    with open(out_file, 'w', encoding='utf-8') as f:
        json.dump(questions, f, indent=2, ensure_ascii=False)
    print(f"\n💾 → {out_file}")

if __name__ == '__main__':
    main()
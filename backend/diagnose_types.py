import pdfplumber, re

def get_page_type(text):
    year = None
    ym = re.search(r'April\s+(19|20)\d{2}', text, re.IGNORECASE)
    if ym:
        year = int(re.search(r'(19|20)\d{2}', ym.group()).group())

    low_ns = text.lower().replace(' ', '')

    if year and ('60marks' in low_ns or '80marks' in low_ns or
                 'answerfour' in low_ns or 'answerthree' in low_ns):
        return year, 'theory_q'

    if year:
        key_count = len(re.findall(r'^\d+[\.\)]\s*[A-D][\.\)\s]', text, re.MULTILINE))
        if key_count >= 5:
            return year, 'mcq_ans'

    if year:
        sol_count = len(re.findall(r'^\d+\s*[\.\(]', text, re.MULTILINE))
        has_method = bool(re.search(r'\bmethod\s*\d*\b|\bapproach\s*\d*\b', text, re.IGNORECASE))
        if sol_count >= 2 or has_method:
            return year, 'theory_sol'

    if year:
        mcq_count = len(re.findall(r'^\d{1,2}[.\s]\s+\S', text, re.MULTILINE))
        opt_count = len(re.findall(r'^[A-D][\.\)]\s', text, re.MULTILINE))
        if mcq_count >= 2 and opt_count >= 4:
            return year, 'mcq_q'

    mcq_count = len(re.findall(r'^\d{1,2}[.\s]\s+\S', text, re.MULTILINE))
    opt_count = len(re.findall(r'^[A-D][\.\)]\s', text, re.MULTILINE))
    if mcq_count >= 2 and opt_count >= 4:
        return None, 'mcq_cont'

    sol_count = len(re.findall(r'^\d+\s*[\.\(]', text, re.MULTILINE))
    if sol_count >= 2:
        return None, 'theory_sol_cont'

    return year, 'unknown'

with pdfplumber.open('BECE_Mathematics_1990_2012.pdf') as pdf:
    for i in range(52, 130):  # pages 53-130
        text = pdf.pages[i].extract_text() or ''
        if not text.strip():
            continue
        year, ptype = get_page_type(text)

        # Show counts used in detection
        mcq_q   = len(re.findall(r'^\d{1,2}[.\s]\s+\S', text, re.MULTILINE))
        opt_c   = len(re.findall(r'^[A-D][\.\)]\s', text, re.MULTILINE))
        sol_c   = len(re.findall(r'^\d+\s*[\.\(]', text, re.MULTILINE))
        key_c   = len(re.findall(r'^\d+[\.\)]\s*[A-D][\.\)\s]', text, re.MULTILINE))
        method  = bool(re.search(r'\bmethod\s*\d*\b|\bapproach\s*\d*\b', text, re.IGNORECASE))
        first   = text.strip().splitlines()[0][:50] if text.strip() else ''

        print(f"p{i+1:3d} year={str(year):4s} type={ptype:18s} | mcq_q={mcq_q} opts={opt_c} sol={sol_c} key={key_c} meth={method} | {first}")
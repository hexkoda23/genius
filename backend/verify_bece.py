"""
BECE scrape verification script.
Run from the backend folder where bece_objective.json and bece_theory.json live.
"""
import json, sys, os
from collections import defaultdict

EXPECTED_YEARS = set(range(1990, 2011))  # 1990–2010 (21 years)
# 2011 and 2012 may not be in this PDF — we'll flag if missing

def load(path):
    if not os.path.exists(path):
        print(f"[MISSING] {path}")
        return []
    with open(path) as f:
        return json.load(f)

obj = load("bece_objective.json")
thy = load("bece_theory.json")

print("=" * 60)
print("  BECE SCRAPE VERIFICATION REPORT")
print("=" * 60)

# ── 1. Year coverage ──────────────────────────────────────────
obj_years = defaultdict(list)
thy_years = defaultdict(list)
for q in obj: obj_years[q.get('year')].append(q)
for q in thy: thy_years[q.get('year')].append(q)

all_years = sorted(set(obj_years) | set(thy_years))
print(f"\n[1] YEAR COVERAGE  ({len(all_years)} years found)")
print(f"    Expected: {sorted(EXPECTED_YEARS)}")
missing_years = EXPECTED_YEARS - set(all_years)
if missing_years:
    print(f"    [WARN] Missing years: {sorted(missing_years)}")
else:
    print(f"    [OK] All expected years present")

# ── 2. Per-year counts ────────────────────────────────────────
print(f"\n[2] PER-YEAR BREAKDOWN")
print(f"    {'Year':<6} {'MCQ':>5} {'Theory':>8} {'MCQ ans':>8} {'Theory sol':>11}")
print(f"    {'-'*6} {'-'*5} {'-'*8} {'-'*8} {'-'*11}")
for yr in all_years:
    oqs = obj_years.get(yr, [])
    tqs = thy_years.get(yr, [])
    mcq_ans = sum(1 for q in oqs if q.get('correct_answer'))
    thy_sol = sum(1 for q in tqs if q.get('marking_scheme'))
    
    mcq_warn = " !" if len(oqs) < 30 else ""
    thy_warn = " !" if len(tqs) < 3 else ""
    print(f"    {yr:<6} {len(oqs):>5}{mcq_warn:<2} {len(tqs):>8}{thy_warn:<2} "
          f"{mcq_ans:>8} {thy_sol:>11}")

# ── 3. Field completeness ─────────────────────────────────────
print(f"\n[3] FIELD COMPLETENESS")

def check_fields(questions, label, required_fields, optional_fields):
    print(f"\n    [{label}]  ({len(questions)} questions)")
    for field in required_fields:
        missing = [q for q in questions if not q.get(field)]
        pct = 100 * (len(questions) - len(missing)) / max(len(questions), 1)
        status = "[OK]" if len(missing) == 0 else "[WARN]" if pct > 80 else "[BAD]"
        print(f"      {status} {field:<25} {pct:5.1f}% filled  ({len(missing)} missing)")
    for field in optional_fields:
        filled = [q for q in questions if q.get(field)]
        pct = 100 * len(filled) / max(len(questions), 1)
        print(f"      [OPT] {field:<25} {pct:5.1f}% filled")

check_fields(
    obj, "OBJECTIVE",
    required_fields=['year', 'question_no', 'question_text', 'option_b', 'option_c', 'option_d', 'correct_answer'],
    optional_fields=['option_a', 'topic', 'image_paths', 'answer_image_paths']
)

check_fields(
    thy, "THEORY",
    required_fields=['year', 'question_no', 'question_text', 'marking_scheme'],
    optional_fields=['topic', 'image_paths', 'answer_image_paths']
)

# ── 4. Sample questions ───────────────────────────────────────
print(f"\n[4] SAMPLE QUESTIONS (first of each type)")

if obj:
    q = obj[0]
    print(f"\n    OBJECTIVE sample (yr={q.get('year')} q={q.get('question_no')}):")
    print(f"      Q: {str(q.get('question_text',''))[:80]}")
    print(f"      A: {q.get('option_a','')[:50]}")
    print(f"      ANS: {q.get('correct_answer')}")
    print(f"      Topic: {q.get('topic')}")

if thy:
    q = thy[0]
    print(f"\n    THEORY sample (yr={q.get('year')} q={q.get('question_no')}):")
    print(f"      Q: {str(q.get('question_text',''))[:80]}")
    scheme = str(q.get('marking_scheme',''))
    print(f"      Scheme: {scheme[:80]}")

# ── 5. Duplicate check ────────────────────────────────────────
print(f"\n[5] DUPLICATE CHECK")
obj_keys = [(q.get('year'), q.get('question_no')) for q in obj]
thy_keys = [(q.get('year'), q.get('question_no')) for q in thy]
obj_dups = len(obj_keys) - len(set(obj_keys))
thy_dups = len(thy_keys) - len(set(thy_keys))
print(f"    Objective duplicates: {obj_dups}")
print(f"    Theory duplicates:    {thy_dups}")

# ── 6. Schema check (Supabase field names) ────────────────────
print(f"\n[6] SUPABASE SCHEMA COMPATIBILITY")
OBJ_EXPECTED_FIELDS = {
    'exam_type', 'year', 'subject', 'question_no', 'question_text',
    'option_a', 'option_b', 'option_c', 'option_d', 'option_e',
    'correct_answer', 'topic', 'image_paths', 'answer_image_paths'
}
THY_EXPECTED_FIELDS = {
    'exam_type', 'year', 'subject', 'question_no', 'question_text',
    'marking_scheme', 'topic', 'image_paths', 'answer_image_paths'
}
if obj:
    extra = set(obj[0].keys()) - OBJ_EXPECTED_FIELDS
    missing = OBJ_EXPECTED_FIELDS - set(obj[0].keys())
    if extra:   print(f"    [WARN] Objective extra fields: {extra}")
    if missing: print(f"    [WARN] Objective missing fields: {missing}")
    if not extra and not missing: print(f"    [OK] Objective fields match schema")
if thy:
    extra = set(thy[0].keys()) - THY_EXPECTED_FIELDS
    missing = THY_EXPECTED_FIELDS - set(thy[0].keys())
    if extra:   print(f"    [WARN] Theory extra fields: {extra}")
    if missing: print(f"    [WARN] Theory missing fields: {missing}")
    if not extra and not missing: print(f"    [OK] Theory fields match schema")

# ── 7. Summary ────────────────────────────────────────────────
print(f"\n{'=' * 60}")
print(f"  SUMMARY")
print(f"{'=' * 60}")
print(f"  Objective questions : {len(obj)}")
print(f"  Theory questions    : {len(thy)}")
print(f"  Years covered       : {len(all_years)} ({min(all_years) if all_years else '?'}–{max(all_years) if all_years else '?'})")

issues = []
if missing_years: issues.append(f"Missing years: {sorted(missing_years)}")
if obj_dups:      issues.append(f"{obj_dups} duplicate objective questions")
if thy_dups:      issues.append(f"{thy_dups} duplicate theory questions")
low_mcq = [yr for yr in all_years if len(obj_years[yr]) < 30]
if low_mcq:       issues.append(f"Low MCQ count years: {low_mcq}")
low_thy = [yr for yr in all_years if len(thy_years[yr]) < 3]
if low_thy:       issues.append(f"Low theory count years: {low_thy}")

if issues:
    print(f"\n  [!] Issues to review:")
    for i in issues: print(f"      - {i}")
else:
    print(f"\n  [OK] No major issues — ready for upload!")
print()
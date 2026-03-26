import json

with open('bece_objective.json') as f:
    qs = json.load(f)

# Show 3 samples from 2009
print("=== MCQ SAMPLES (2009) ===")
samples = [q for q in qs if q['year'] == 2009][:3]
for q in samples:
    print(f"Q{q['question_no']}: {q['question'][:90]}")
    print(f"  A: {q['option_a']}")
    print(f"  B: {q['option_b']}")
    print(f"  C: {q['option_c']}")
    print(f"  D: {q['option_d']}")
    print(f"  Ans: {q['answer']}")
    print()

# Check for None options across all years
print("=== OPTION COVERAGE ===")
for year in sorted(set(q['year'] for q in qs)):
    year_qs = [q for q in qs if q['year'] == year]
    missing_b = sum(1 for q in year_qs if not q['option_b'])
    missing_c = sum(1 for q in year_qs if not q['option_c'])
    missing_d = sum(1 for q in year_qs if not q['option_d'])
    print(f"{year}: {len(year_qs)} questions | missing B={missing_b} C={missing_c} D={missing_d}")

with open('bece_theory.json') as f:
    th = json.load(f)

print("\n=== THEORY SAMPLES (2009) ===")
samples = [q for q in th if q['year'] == 2009][:2]
for q in samples:
    print(f"Q{q['question_no']}: {q['question_text'][:120]}")
    print(f"  Has scheme: {bool(q['marking_scheme'])}")
    print()
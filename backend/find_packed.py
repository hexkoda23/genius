import json, re

with open('bece_objective.json') as f: obj = json.load(f)
with open('bece_theory.json') as f: thy = json.load(f)

def find_packed(text):
    if not text: return []
    return re.findall(r'[a-zA-Z]{12,}', text)

print('=== PACKED WORDS IN OBJECTIVE ===')
seen = set()
for q in obj:
    for field in ['question_text', 'option_a', 'option_b', 'option_c', 'option_d']:
        for w in find_packed(q.get(field) or ''):
            if w.lower() not in seen:
                seen.add(w.lower())
                print(f'  [{q["year"]}] {field}: {w}')

print()
print('=== PACKED WORDS IN THEORY ===')
seen2 = set()
for q in thy:
    for field in ['question_text', 'marking_scheme']:
        for w in find_packed(q.get(field) or ''):
            if w.lower() not in seen2:
                seen2.add(w.lower())
                print(f'  [{q["year"]}] {field}: {w}')

print(f'\nTotal unique packed runs: obj={len(seen)}, thy={len(seen2)}')
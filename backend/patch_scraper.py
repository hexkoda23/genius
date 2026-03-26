"""
patch_scraper.py
Run this once from your backend folder:
  python patch_scraper.py
"""
import re

with open('scraper.py', 'r', encoding='utf-8') as f:
    src = f.read()

# ── 1. Add ai_infer_answer function ────────────────────────────────────────
AI_FUNC = """
def ai_infer_answer(question_text, options):
    \"\"\"Ask Groq to pick the correct answer when scraping fails.\"\"\"
    import os
    from groq import Groq
    from dotenv import load_dotenv
    load_dotenv()
    api_key = os.environ.get("GROQ_API_KEY")
    if not api_key:
        print("      [AI] GROQ_API_KEY not set - skipping")
        return None
    options_text = "\\n".join(options)
    prompt = (
        "You are a mathematics teacher. "
        "Pick the correct answer for this multiple choice question.\\n\\n"
        f"Question: {question_text}\\n\\n"
        f"Options:\\n{options_text}\\n\\n"
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

"""

if 'def ai_infer_answer' not in src:
    src = src.replace('def scrape(', AI_FUNC + 'def scrape(')
    print('[OK] Added ai_infer_answer() function')
else:
    print('[SKIP] ai_infer_answer() already present')

# ── 2. Patch the answers loop ──────────────────────────────────────────────
OLD = (
    '                q["answer"] = "?"\n'
    '                no_answer  += 1\n'
    '                print(f"  {label} -> [WARN] answer not found")'
)
NEW = (
    '                print(f"  {label} -> [WARN] answer not found, trying AI...")\n'
    '                ai_ans = ai_infer_answer(q["question"], q.get("options", []))\n'
    '                if ai_ans:\n'
    '                    q["answer"] = ai_ans\n'
    '                    print(f"  {label} -> {ai_ans} (AI)")\n'
    '                else:\n'
    '                    q["answer"] = "?"\n'
    '                    no_answer  += 1'
)

if OLD in src:
    src = src.replace(OLD, NEW)
    print('[OK] Patched answers loop')
else:
    print('[ERROR] Could not find answers loop - indentation may differ')
    print('        Search for this line in scraper.py manually:')
    print('        print(f"  {label} -> [WARN] answer not found")')

with open('scraper.py', 'w', encoding='utf-8') as f:
    f.write(src)

print('\n[DONE] scraper.py updated.')
print('Verify with: Select-String "ai_infer_answer" scraper.py')
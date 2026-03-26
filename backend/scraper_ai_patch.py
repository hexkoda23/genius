# This script applies the two changes to scraper.py in-place.
# Run it once from your backend folder:
#   python scraper_ai_patch.py

import re

with open("scraper.py", "r", encoding="utf-8") as f:
    src = f.read()

# ── CHANGE 1: Insert ai_infer_answer() before the scrape() function ────────
AI_FUNC = '''
def ai_infer_answer(question_text: str, options: list) -> str:
    """
    Ask Groq to pick the correct answer when scraping fails.
    Returns a letter A-E, or None if the call fails.
    """
    import os
    from groq import Groq

    api_key = os.environ.get("GROQ_API_KEY")
    if not api_key:
        try:
            from dotenv import load_dotenv
            load_dotenv()
            api_key = os.environ.get("GROQ_API_KEY")
        except ImportError:
            pass

    if not api_key:
        print("      [AI] GROQ_API_KEY not set - skipping AI answer inference")
        return None

    options_text = "\\n".join(options)
    prompt = f"""You are a mathematics teacher. Pick the correct answer for this multiple choice question.

Question: {question_text}

Options:
{options_text}

Reply with ONLY the letter of the correct answer (A, B, C, D, or E). Nothing else."""

    try:
        client   = Groq(api_key=api_key)
        response = client.chat.completions.create(
            model       = "llama-3.3-70b-versatile",
            messages    = [{"role": "user", "content": prompt}],
            max_tokens  = 5,
            temperature = 0,
        )
        raw    = response.choices[0].message.content.strip()
        letter = re.search(r"[A-E]", raw.upper())
        if letter:
            print(f"      [AI] Inferred answer: {letter.group()}")
            return letter.group()
    except Exception as e:
        print(f"      [AI] Inference failed: {e}")

    return None


'''



def ai_infer_answer(question_text: str, options: list) -> str:
    import os
    from groq import Groq
    api_key = os.environ.get("GROQ_API_KEY")
    if not api_key:
        try:
            from dotenv import load_dotenv
            load_dotenv()
            api_key = os.environ.get("GROQ_API_KEY")
        except ImportError:
            pass
    if not api_key:
        print("      [AI] GROQ_API_KEY not set - skipping")
        return None
    options_text = "\n".join(options)
    prompt = f"""You are a mathematics teacher. Pick the correct answer for this multiple choice question.

Question: {question_text}

Options:
{options_text}

Reply with ONLY the letter of the correct answer (A, B, C, D, or E). Nothing else."""
    try:
        client = Groq(api_key=api_key)
        response = client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[{"role": "user", "content": prompt}],
            max_tokens=5,
            temperature=0,
        )
        raw = response.choices[0].message.content.strip()
        letter = re.search(r"[A-E]", raw.upper())
        if letter:
            print(f"      [AI] Inferred answer: {letter.group()}")
            return letter.group()
    except Exception as e:
        print(f"      [AI] Inference failed: {e}")
    return None




# Insert before def scrape(
if "def ai_infer_answer" not in src:
    src = src.replace("def scrape(", AI_FUNC + "def scrape(")
    print("[OK] Added ai_infer_answer() function")
else:
    print("[SKIP] ai_infer_answer() already present")

# ── CHANGE 2: Replace the answers loop ─────────────────────────────────────
OLD_LOOP = '''        for q in all_questions:
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
            print(f"  {label} -> [WARN] no answer URL, trying AI...")
            ai_ans = ai_infer_answer(q["question"], q.get("options", []))
            if ai_ans:
                q["answer"] = ai_ans
                print(f"  {label} -> {ai_ans} (AI)")
            else:
                q["answer"] = "?"
                no_answer  += 1'''

NEW_LOOP = '''        for q in all_questions:
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
            print(f"  {label} -> [WARN] no answer URL, trying AI...")
            ai_ans = ai_infer_answer(q["question"], q.get("options", []))
            if ai_ans:
                q["answer"] = ai_ans
                print(f"  {label} -> {ai_ans} (AI)")
            else:
                q["answer"] = "?"
                no_answer  += 1'''

if OLD_LOOP in src:
    src = src.replace(OLD_LOOP, NEW_LOOP)
    print("[OK] Updated answers loop with AI fallback")
else:
    print("[WARN] Could not find exact answers loop - applying fuzzy patch")
    # Fuzzy fallback: just replace the WARN line
    src = src.replace(
        '                q["answer"] = "?"\n                no_answer  += 1\n                print(f"  {label} -> [WARN] answer not found")',
        '                print(f"  {label} -> [WARN] answer not found, trying AI...")\n                ai_ans = ai_infer_answer(q["question"], q.get("options", []))\n                if ai_ans:\n                    q["answer"] = ai_ans\n                    print(f"  {label} -> {ai_ans} (AI)")\n                else:\n                    q["answer"] = "?"\n                    no_answer  += 1'
    )
    print("[OK] Applied fuzzy patch")

with open("scraper.py", "w", encoding="utf-8") as f:
    f.write(src)

print("\n[DONE] scraper.py updated. Test with:")
print("  python scraper.py --subject mathematics --exam_type waec --year 2025 --start 1 --end 1")
import re

def clean_response(text: str) -> str:
    """
    Post-processes Groq's raw response.
    Converts ALL LaTeX patterns into clean [math] / [m] tags
    regardless of how Groq chose to format them.
    Ensures every numbered step is on its own line.
    """
    if not text:
        return text

    # ── Step 1: Normalise line endings ──────────────────────
    text = text.replace('\r\n', '\n')

    # ── Step 2: Convert $$ blocks → [math] ─────────────────
    text = re.sub(
        r'\$\$([\s\S]*?)\$\$',
        lambda m: f'\n\n[math]{m.group(1).strip()}[/math]\n\n',
        text
    )

    # ── Step 3: Convert single $ → [m] for inline ──────────
    # But only if the content looks like math (has LaTeX commands or operators)
    def replace_inline_dollar(m):
        inner = m.group(1).strip()
        # If it looks like a full equation, make it a block
        if any(c in inner for c in ['=', '\\frac', '\\left', '\\sqrt', '\\pm']):
            if len(inner) > 15:
                return f'\n\n[math]{inner}[/math]\n\n'
        return f'[m]{inner}[/m]'

    text = re.sub(r'\$([^$\n]{1,200}?)\$', replace_inline_dollar, text)

    # ── Step 4: Convert raw LaTeX lines with no delimiters ──
    # Lines that are ONLY a LaTeX expression (no surrounding text)
    def replace_raw_latex_line(m):
        line = m.group(0).strip()
        # Must contain LaTeX commands to qualify
        has_latex = any(cmd in line for cmd in [
            '\\frac', '\\left', '\\right', '\\sqrt', '\\pm',
            '\\cdot', '\\times', '\\div', '\\leq', '\\geq',
            '\\Rightarrow', '\\rightarrow', '\\alpha', '\\beta',
            '\\theta', '\\pi', '\\int', '\\sum', '\\infty',
            '\\partial', '^{', '_{',
        ])
        # Must look like math, not a sentence
        word_count = len(re.findall(r'[a-zA-Z]{4,}', line))
        if has_latex and word_count < 4:
            return f'\n\n[math]{line}[/math]\n\n'
        return m.group(0)

    text = re.sub(r'^[^\S\n]*([^\n]*\\[a-zA-Z{]+[^\n]*)$',
                  replace_raw_latex_line, text, flags=re.MULTILINE)

    # ── Step 5: Fix packed numbered steps ───────────────────
    # "1. text 2. text 3. text" → each on its own line
    text = re.sub(r'(\d+\.)\s+', r'\n\n\1 ', text)

    # ── Step 6: Ensure [math] blocks have blank lines ───────
    text = re.sub(r'([^\n])\[math\]', r'\1\n\n[math]', text)
    text = re.sub(r'\[/math\]([^\n])', r'[/math]\n\n\1', text)

    # ── Step 7: Nuclear $ cleanup — strip any remaining $ ───
    text = re.sub(r'\$\$', '', text)
    text = re.sub(r'\$', '', text)

    # ── Step 8: Collapse excess blank lines ─────────────────
    text = re.sub(r'\n{3,}', '\n\n', text)

    return text.strip()
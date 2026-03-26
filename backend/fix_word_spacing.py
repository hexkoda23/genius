"""
fix_word_spacing.py — Full-text word re-segmentation for BECE data
Strips all spaces from concatenated/fragmented text, then uses wordninja
to properly re-segment words. Preserves numbers, math symbols, and
punctuation.
"""
import json, re, copy
import wordninja


def resegment_text(text):
    """Strip spaces from a run of alpha chars and re-split with wordninja."""
    if not text or not isinstance(text, str):
        return text
    
    # Split text into segments: alpha-runs vs everything else
    # We'll re-segment only the alpha runs
    # Pattern: capture runs of (alpha + spaces between alpha) that are likely broken words
    
    # Strategy: split into tokens by spaces, identify consecutive alpha-only tokens,
    # merge them, and re-split with wordninja
    
    result = []
    # Use regex to split while keeping delimiters
    # Split on: numbers, math symbols, punctuation, brackets, etc.
    # Keep: pure alphabetic runs (possibly with embedded spaces from bad PDF)
    
    # Approach: split text by non-alpha boundaries, process alpha chunks
    parts = re.split(r'(\s*[^A-Za-z\s]+\s*)', text)
    
    for part in parts:
        if not part:
            continue
        # Check if this part is mostly alphabetic (possibly with spaces)
        stripped = part.strip()
        alpha_only = re.sub(r'\s+', '', stripped)
        
        if alpha_only and alpha_only.isalpha() and len(alpha_only) >= 4:
            # This is an alpha run — re-segment with wordninja
            words = wordninja.split(alpha_only.lower())
            if words:
                # Preserve leading/trailing whitespace
                lead = ' ' if part and part[0] == ' ' else ''
                trail = ' ' if part and part[-1] == ' ' else ''
                
                # Preserve capitalization of first word if original was capitalized
                rejoined = ' '.join(words)
                if stripped and stripped[0].isupper():
                    rejoined = rejoined[0].upper() + rejoined[1:]
                result.append(lead + rejoined + trail)
            else:
                result.append(part)
        else:
            result.append(part)
    
    text = ''.join(result)
    # Clean up multiple spaces
    text = re.sub(r'  +', ' ', text).strip()
    return text


def process_file(filepath, text_fields, preview_count=5):
    print(f"\nLoading {filepath} ...")
    with open(filepath, 'r', encoding='utf-8') as f:
        data = json.load(f)
    print(f"  {len(data)} entries loaded")

    print(f"\n  BEFORE → AFTER examples:")
    shown = 0
    for q in data:
        for field in text_fields:
            val = q.get(field, '')
            if val and shown < preview_count:
                fixed = resegment_text(val)
                if fixed != val:
                    print(f"    FIELD: {field}")
                    print(f"    BEFORE: {val[:120]}")
                    print(f"    AFTER:  {fixed[:120]}\n")
                    shown += 1

    fixed_data = copy.deepcopy(data)
    for q in fixed_data:
        for field in text_fields:
            if q.get(field):
                q[field] = resegment_text(q[field])

    with open(filepath, 'w', encoding='utf-8') as f:
        json.dump(fixed_data, f, indent=2, ensure_ascii=False)
    print(f"  ✅ Saved {filepath} ({len(fixed_data)} entries)")
    return fixed_data


def main():
    process_file(
        'bece_objective.json',
        ['question_text', 'question', 'option_a', 'option_b', 'option_c', 'option_d', 'option_e']
    )
    process_file(
        'bece_theory.json',
        ['question_text', 'marking_scheme']
    )
    print("\n✅ Done!")


if __name__ == '__main__':
    main()

"""
fix_image_paths.py
──────────────────
Moves old images from jamb/mathematics/images/ into the new
images/{exam_type}/{year}/ structure and fixes all .md files.

Run once:
  python fix_image_paths.py
"""

import os
import re
import shutil

EXAMS = {
    "jamb": "jamb/mathematics",
    "waec": "waec/mathematics",
    "neco": "neco/mathematics",
}

def fix_exam(exam_type: str, md_folder: str):
    if not os.path.exists(md_folder):
        return

    md_files = [f for f in os.listdir(md_folder) if f.endswith("_obj.md")]

    for md_file in md_files:
        # Extract year from filename e.g. mathematics_2023_obj.md → 2023
        m = re.search(r"_(\d{4})_obj\.md$", md_file)
        if not m:
            continue
        year = m.group(1)

        md_path    = os.path.join(md_folder, md_file)
        new_img_dir = os.path.join("images", exam_type, year)
        os.makedirs(new_img_dir, exist_ok=True)

        with open(md_path, "r", encoding="utf-8") as f:
            content = f.read()

        # Find all image references in this markdown
        # Old format: images/q1_1.png or just q1_1.png
        img_refs = re.findall(r'!\[diagram\]\(([^)]+)\)', content)

        updated_content = content
        moved = 0
        fixed = 0

        for old_ref in img_refs:
            filename = os.path.basename(old_ref)

            # New path
            new_ref  = f"images/{exam_type}/{year}/{filename}"

            # Possible old locations to check
            candidates = [
                old_ref,                                          # as written
                os.path.join(md_folder, old_ref),                # relative to md
                os.path.join(md_folder, "images", filename),     # old images/ folder
                os.path.join("images", "temp", filename),        # temp folder
                os.path.join(md_folder.split("/")[0],
                             md_folder.split("/")[1] if "/" in md_folder else "",
                             "images", filename),                 # jamb/mathematics/images/
            ]

            # Try to find and move the file
            file_found = False
            for candidate in candidates:
                candidate = candidate.replace("\\", "/")
                if os.path.exists(candidate):
                    dest = os.path.join(new_img_dir, filename)
                    if not os.path.exists(dest):
                        shutil.copy2(candidate, dest)
                        moved += 1
                    file_found = True
                    break

            if not file_found:
                print(f"    ⚠ Image not found: {filename}")

            # Fix path in markdown regardless
            if old_ref != new_ref:
                updated_content = updated_content.replace(
                    f"![diagram]({old_ref})",
                    f"![diagram]({new_ref})"
                )
                fixed += 1

        # Save updated markdown
        if fixed > 0:
            with open(md_path, "w", encoding="utf-8") as f:
                f.write(updated_content)

        print(f"  ✅ {exam_type.upper()} {year} — {moved} images moved, {fixed} paths fixed in .md")


def main():
    print("\n🔧 Fixing image paths...\n")

    for exam_type, md_folder in EXAMS.items():
        if os.path.exists(md_folder):
            print(f"\n── {exam_type.upper()} ──")
            fix_exam(exam_type, md_folder)

    # Clean up temp folder if empty
    temp_dir = os.path.join("images", "temp")
    if os.path.exists(temp_dir):
        remaining = os.listdir(temp_dir)
        if not remaining:
            os.rmdir(temp_dir)
            print("\n🗑  Cleaned up temp folder")
        else:
            print(f"\n⚠  {len(remaining)} images still in images/temp/ — check manually")

    print("\n✅ Done! Now clear Supabase and re-upload everything:")
    print("   1. Run in Supabase SQL Editor:")
    print("      truncate table cbt_answers, cbt_sessions, exam_questions restart identity cascade;")
    print("   2. Delete all files in Supabase Storage → question-images bucket")
    print("   3. Run: python scrape_all.py --upload-only")


if __name__ == "__main__":
    main()
import os
import sys
import re
from supabase import create_client
from dotenv import load_dotenv

def get_credentials():
    # Try current dir or frontend/
    paths = [".env", "frontend/.env"]
    for p in paths:
        if os.path.exists(p):
            load_dotenv(p)
            return os.getenv('VITE_SUPABASE_URL'), os.getenv('SUPABASE_SERVICE_KEY') or os.getenv('VITE_SUPABASE_ANON_KEY')
    return None, None

def import_images(image_folder):
    url, key = get_credentials()
    if not url or not key:
        print("❌ Error: Supabase credentials not found in .env")
        return

    sb = create_client(url, key)
    
    # 1. Scan for image files
    valid_exts = ('.png', '.jpg', '.jpeg', '.webp')
    images = [f for f in os.listdir(image_folder) if f.lower().endswith(valid_exts)]
    
    if not images:
        print(f"❌ No images found in {image_folder}")
        return

    print(f"🚀 Found {len(images)} images. Starting import...")

    success = 0
    for filename in images:
        # Expected format: waec_2024_q33.png or jamb_2024_q1.png
        m = re.match(r"([a-z]+)_(\d{4})_q(\d+)", filename.lower())
        if not m:
            print(f"  ⏭ Skipping {filename} (name must be like: waec_2024_q33.png)")
            continue
            
        exam_type = m.group(1).upper()
        year = int(m.group(2))
        q_no = int(m.group(3))
        
        file_path = os.path.join(image_folder, filename)
        storage_path = f"{exam_type.lower()}/{year}/{filename}"
        
        try:
            # 2. Upload to storage
            with open(file_path, 'rb') as f:
                sb.storage.from_('question-images').upload(
                    path=storage_path,
                    file=f,
                    file_options={"upsert": "true"}
                )
            
            # 3. Get public URL
            image_url = sb.storage.from_('question-images').get_public_url(storage_path)
            
            # 4. Update database
            # We need to find the question ID first.
            # In your DB, 'question_no' + 'exam_type' + 'year' should be unique enough for one subject.
            # Assuming 'Mathematics' as default.
            res = sb.table('exam_questions') \
                .update({"image_url": image_url}) \
                .eq('exam_type', exam_type) \
                .eq('year', year) \
                .ilike('question_text', f'%**{q_no}.%') \
                .execute()
            
            # If the ilike fails, try a direct update if you have a mapping
            # (In this project, questions are often just rows in order)
            # A better way might be needed if question_no isn't a column
            
            print(f"  ✅ Imported {filename} -> {image_url}")
            success += 1
            
        except Exception as e:
            print(f"  ❌ Failed {filename}: {e}")

    print(f"\n✨ Done! {success} images imported.")

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python import_images.py <folder_path>")
    else:
        import_images(sys.argv[1])

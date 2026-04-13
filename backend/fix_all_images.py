import os
import re
import json
import httpx
import asyncio
from dotenv import load_dotenv
from supabase import create_client

load_dotenv()

SUPABASE_URL = os.environ.get("SUPABASE_URL", "").rstrip("/")
SUPABASE_SERVICE_KEY = os.environ.get("SUPABASE_SERVICE_KEY", "")
supabase = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)

HEADERS = {
    "apikey": SUPABASE_SERVICE_KEY,
    "Authorization": f"Bearer {SUPABASE_SERVICE_KEY}",
}

async def upload_and_fix():
    base_images_dir = 'images'
    if not os.path.isdir(base_images_dir):
        print(f"Directory {base_images_dir} not found")
        return

    async with httpx.AsyncClient(timeout=60) as client:
        # Traverse images/{exam}/{year}/{type}
        for exam in os.listdir(base_images_dir):
            exam_path = os.path.join(base_images_dir, exam)
            if not os.path.isdir(exam_path): continue
            
            for year in os.listdir(exam_path):
                year_path = os.path.join(exam_path, year)
                if not os.path.isdir(year_path): continue
                
                for q_type in os.listdir(year_path):
                    type_path = os.path.join(year_path, q_type)
                    if not os.path.isdir(type_path): continue
                    
                    metadata_file = os.path.join(type_path, 'metadata.json')
                    if not os.path.exists(metadata_file): continue
                    
                    print(f"\n🚀 Processing {exam.upper()} {year} {q_type}...")
                    
                    with open(metadata_file, 'r') as f:
                        metadata = json.load(f)
                    
                    for item in metadata:
                        img_file = item.get('image_file')
                        if not img_file: continue
                        
                        local_path = os.path.join(type_path, img_file)
                        if not os.path.exists(local_path): continue
                        
                        storage_path = f"{exam}/{year}/{q_type}/{img_file}"
                        
                        # 1. Upload to Supabase Storage
                        with open(local_path, "rb") as f:
                            image_data = f.read()

                        resp = await client.post(
                            f"{SUPABASE_URL}/storage/v1/object/question-images/{storage_path}",
                            content=image_data,
                            headers={**HEADERS, "Content-Type": "image/png", "x-upsert": "true"}
                        )
                        
                        if resp.status_code in (200, 201):
                            storage_url = f"{SUPABASE_URL}/storage/v1/object/public/question-images/{storage_path}"
                            
                            # 2. Update Database
                            q_text = item['question_text']
                            
                            def clean_text(t):
                                # Remove LaTeX, special chars, and extra whitespace
                                t = re.sub(r'\\\(|\\\)|\\\[|\\\]|\^0|\$', '', t)
                                t = re.sub(r'[^a-zA-Z0-9]', '', t)
                                return t.lower()

                            search_clean = clean_text(q_text)
                            if len(search_clean) > 40:
                                search_clean = search_clean[:40]
                            
                            try:
                                # We can't use ilike with this clean version easily in SQL
                                # So let's fetch all questions for this exam/year and match in Python
                                if not hasattr(upload_and_fix, 'cache_year'):
                                    upload_and_fix.cache_year = None
                                    upload_and_fix.questions = []
                                
                                cache_key = f"{exam}_{year}"
                                if upload_and_fix.cache_year != cache_key:
                                    print(f"  📥 Fetching DB rows for {cache_key}...")
                                    res = supabase.table('exam_questions') \
                                        .select('id, question_text') \
                                        .eq('exam_type', exam.upper()) \
                                        .eq('year', int(year)) \
                                        .execute()
                                    upload_and_fix.questions = res.data
                                    upload_and_fix.cache_year = cache_key
                                
                                matched_id = None
                                for db_q in upload_and_fix.questions:
                                    db_clean = clean_text(db_q['question_text'])
                                    if search_clean in db_clean or db_clean in search_clean:
                                        matched_id = db_q['id']
                                        break
                                
                                if matched_id:
                                    supabase.table('exam_questions') \
                                        .update({'image_url': storage_url, 'has_image': True}) \
                                        .eq('id', matched_id) \
                                        .execute()
                                    print(f"  ✅ Updated Q: {q_text[:40]}...")
                                else:
                                    print(f"  ⚠️ No match for: {q_text[:40]}...")
                            except Exception as e:
                                print(f"  ❌ DB Error: {e}")
                        else:
                            print(f"  ❌ Upload failed for {img_file}")

if __name__ == "__main__":
    asyncio.run(upload_and_fix())

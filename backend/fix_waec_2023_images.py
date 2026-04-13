import os
import json
from dotenv import load_dotenv
from supabase import create_client

load_dotenv()

url = os.getenv('SUPABASE_URL')
key = os.getenv('SUPABASE_SERVICE_KEY')
supabase = create_client(url, key)

def fix_waec_2023():
    metadata_path = 'images/waec/2023/objectives/metadata.json'
    if not os.path.exists(metadata_path):
        print(f"Metadata not found at {metadata_path}")
        return

    with open(metadata_path, 'r') as f:
        metadata = json.load(f)

    for item in metadata:
        q_text = item['question_text']
        img_file = item['image_file']
        
        # Construct the Supabase storage URL
        storage_url = f"{url}/storage/v1/object/public/question-images/waec/2023/objectives/{img_file}"
        
        # Replace common variations of spaces
        search_term = q_text.replace('\\(', '').replace('\\)', '').replace('^0', '').replace('\n', ' ').strip()
        search_term = search_term.replace('\xa0', ' ') # Handle non-breaking spaces
        
        # Take a much longer segment for uniqueness
        if len(search_term) > 100:
            search_term = search_term[:100]

        print(f"Updating Q containing: {search_term[:50]}... with image {img_file}")
        
        try:
            # Use '%' between words to allow for any space character/formatting
            words = search_term.split()
            # Only use first 10 words to avoid too long query
            flexible_search = "%".join(words[:10])
            
            res = supabase.table('exam_questions') \
                .update({'image_url': storage_url, 'has_image': True}) \
                .eq('exam_type', 'WAEC') \
                .eq('year', 2023) \
                .ilike('question_text', f"%{flexible_search}%") \
                .execute()
            
            if res.data:
                print(f"  ✅ Updated {len(res.data)} rows")
            else:
                print(f"  ⚠️ No rows found")
        except Exception as e:
            print(f"  ❌ Error updating: {e}")

if __name__ == "__main__":
    fix_waec_2023()

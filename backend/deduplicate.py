import os
from dotenv import load_dotenv
from supabase import create_client

load_dotenv()

url = os.getenv('SUPABASE_URL')
key = os.getenv('SUPABASE_SERVICE_KEY')
supabase = create_client(url, key)

def deduplicate_waec_2023():
    print("Fetching WAEC 2023 questions...")
    res = supabase.table('exam_questions') \
        .select('id, question_text') \
        .eq('exam_type', 'WAEC') \
        .eq('year', 2023) \
        .execute()
    
    questions = res.data
    print(f"Found {len(questions)} total rows.")

    seen_texts = {}
    to_delete = []
    
    for q in questions:
        text = q['question_text'].strip()
        if text in seen_texts:
            to_delete.append(q['id'])
        else:
            seen_texts[text] = q['id']

    print(f"Identified {len(to_delete)} duplicate rows to delete.")
    
    if to_delete:
        # Delete in batches of 100
        for i in range(0, len(to_delete), 100):
            batch = to_delete[i:i+100]
            supabase.table('exam_questions').delete().in_('id', batch).execute()
            print(f"  Deleted {len(batch)} rows...")

    print("Deduplication complete.")

if __name__ == "__main__":
    deduplicate_waec_2023()

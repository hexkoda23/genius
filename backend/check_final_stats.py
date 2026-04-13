import os
from dotenv import load_dotenv
from supabase import create_client

load_dotenv()

url = os.getenv('SUPABASE_URL')
key = os.getenv('SUPABASE_SERVICE_KEY')
supabase = create_client(url, key)

def check_stats():
    res = supabase.table('exam_questions').select('id, image_url, exam_type, year').execute()
    data = res.data
    
    total = len(data)
    with_images = len([r for r in data if r['image_url']])
    relative_paths = len([r for r in data if r['image_url'] and not r['image_url'].startswith('http')])
    supabase_urls = len([r for r in data if r['image_url'] and 'supabase.co' in r['image_url']])
    
    print(f"Total questions: {total}")
    print(f"Questions with image_url: {with_images}")
    print(f"  - Relative paths: {relative_paths}")
    print(f"  - Supabase URLs: {supabase_urls}")
    
    # Show breakdown by exam
    exams = {}
    for r in data:
        e = r['exam_type']
        if e not in exams: exams[e] = {'total': 0, 'with_img': 0}
        exams[e]['total'] += 1
        if r['image_url']: exams[e]['with_img'] += 1
        
    for e, stats in exams.items():
        print(f"{e}: {stats['with_img']}/{stats['total']} questions have images")

if __name__ == "__main__":
    check_stats()

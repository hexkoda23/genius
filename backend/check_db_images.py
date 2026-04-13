import os
from dotenv import load_dotenv
from supabase import create_client

load_dotenv()

url = os.getenv('SUPABASE_URL')
key = os.getenv('SUPABASE_SERVICE_KEY')

if not url or not key:
    print("Supabase credentials missing")
    exit(1)

supabase = create_client(url, key)

try:
    res = supabase.table('exam_questions').select('year').eq('exam_type', 'WAEC').execute()
    years = sorted(list(set([r['year'] for r in res.data])))
    print(f"Available WAEC years: {years}")
except Exception as e:
    print(f"Error: {e}")

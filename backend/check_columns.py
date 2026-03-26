from supabase import create_client
from dotenv import load_dotenv
import os

load_dotenv()

url = os.getenv('SUPABASE_URL')
key = os.getenv('SUPABASE_KEY') or os.getenv('SUPABASE_SERVICE_KEY') or os.getenv('SUPABASE_ANON_KEY')

print(f"URL found: {bool(url)}")
print(f"Key found: {bool(key)}")

sb  = create_client(url, key)
res = sb.table('theory_questions').select('*').limit(1).execute()

if res.data:
    print('\nColumns:', list(res.data[0].keys()))
else:
    print('No data found in theory_questions')
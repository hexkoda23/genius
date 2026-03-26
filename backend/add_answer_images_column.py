"""
add_answer_images_column.py
───────────────────────────
Adds answer_images column to theory_questions table in Supabase.
Run once, then delete this file.
"""
from supabase import create_client
from dotenv import load_dotenv
import os

load_dotenv()

url = os.getenv('SUPABASE_URL')
key = os.getenv('SUPABASE_KEY') or os.getenv('SUPABASE_SERVICE_KEY') or os.getenv('SUPABASE_ANON_KEY')

sb = create_client(url, key)

# Add the column via raw SQL through Supabase RPC
# If this fails, you'll need to add it manually in the Supabase dashboard
try:
    sb.rpc('exec_sql', {
        'sql': 'ALTER TABLE theory_questions ADD COLUMN IF NOT EXISTS answer_images TEXT[] DEFAULT \'{}\''
    }).execute()
    print("[OK] answer_images column added successfully")
except Exception as e:
    print(f"[RPC failed] You need to add the column manually: {e}")
    print()
    print("Go to: https://supabase.com/dashboard")
    print("Navigate to: Your project → SQL Editor")
    print("Run this SQL:")
    print()
    print("ALTER TABLE theory_questions ADD COLUMN IF NOT EXISTS answer_images TEXT[] DEFAULT '{}';")
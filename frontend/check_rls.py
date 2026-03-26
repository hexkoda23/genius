import os
import requests
from dotenv import load_dotenv

load_dotenv()

SUPABASE_URL = os.environ.get("VITE_SUPABASE_URL")
SUPABASE_ANON_KEY = os.environ.get("VITE_SUPABASE_ANON_KEY")

headers = {
    "apikey": SUPABASE_ANON_KEY,
    "Authorization": f"Bearer {SUPABASE_ANON_KEY}"
}

url = f"{SUPABASE_URL}/rest/v1/exam_questions?select=exam_type,year&limit=1"
try:
    response = requests.get(url, headers=headers)
    print("Response Status:", response.status_code)
    print("Data:", response.json())
except Exception as e:
    print("Error:", e)

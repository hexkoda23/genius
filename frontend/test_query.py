import os
import requests
import json
from dotenv import load_dotenv

load_dotenv()

SUPABASE_URL = os.environ.get("VITE_SUPABASE_URL")
SUPABASE_ANON_KEY = os.environ.get("VITE_SUPABASE_ANON_KEY")

headers = {
    "apikey": SUPABASE_ANON_KEY,
    "Authorization": f"Bearer {SUPABASE_ANON_KEY}"
}

# The exact query from CBT.jsx:
# eq(exam_type, WAEC) + not(option_a, is, null) etc.
url = f"{SUPABASE_URL}/rest/v1/exam_questions?exam_type=eq.WAEC&option_a=not.is.null&option_b=not.is.null&option_c=not.is.null&option_d=not.is.null"

response = requests.get(url, headers=headers)
print("Status:", response.status_code)
data = response.json()
print("Number of results:", len(data))
if len(data) == 0:
    print("Testing without option checks...")
    url2 = f"{SUPABASE_URL}/rest/v1/exam_questions?exam_type=eq.WAEC"
    print("Without option filters:", len(requests.get(url2, headers=headers).json()))

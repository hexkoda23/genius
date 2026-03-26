import os
import requests
from collections import Counter
from dotenv import load_dotenv

load_dotenv()

SUPABASE_URL = os.environ.get("SUPABASE_URL")
SUPABASE_SERVICE_KEY = os.environ.get("SUPABASE_SERVICE_KEY")

headers = {
    "apikey": SUPABASE_SERVICE_KEY,
    "Authorization": f"Bearer {SUPABASE_SERVICE_KEY}"
}

url1 = f"{SUPABASE_URL}/rest/v1/exam_questions?select=exam_type,year"
response1 = requests.get(url1, headers=headers)
data1 = response1.json()
print("exam_questions status:", response1.status_code)
print("exam_questions count:", len(data1))

if data1:
    types = Counter(row.get('exam_type') for row in data1)
    years = Counter(row.get('year') for row in data1)
    print("Exam types:", dict(types))
    print("Years:", dict(years))

url2 = f"{SUPABASE_URL}/rest/v1/cbt_sessions?select=id&limit=1"
response2 = requests.get(url2, headers=headers)
print("cbt_sessions status:", response2.status_code)
if response2.ok:
    print("cbt_sessions sample:", response2.json())
else:
    print("cbt_sessions error:", response2.text[:200])

url3 = f"{SUPABASE_URL}/rest/v1/cbt_answers?select=id&limit=1"
response3 = requests.get(url3, headers=headers)
print("cbt_answers status:", response3.status_code)
if response3.ok:
    print("cbt_answers sample:", response3.json())
else:
    print("cbt_answers error:", response3.text[:200])

url4 = f"{SUPABASE_URL}/rest/v1/study_sessions?select=id,session_type,completed&limit=1"
response4 = requests.get(url4, headers=headers)
print("study_sessions status:", response4.status_code)
if response4.ok:
    print("study_sessions sample:", response4.json())
else:
    print("study_sessions error:", response4.text[:200])

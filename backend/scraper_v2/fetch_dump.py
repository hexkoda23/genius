import requests

headers = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
}
url = "https://myschool.ng/classroom/mathematics?exam_type=waec&exam_year=2024&type=obj&page=1"

try:
    response = requests.get(url, headers=headers, timeout=15)
    with open("page_dump.html", "w", encoding="utf-8") as f:
        f.write(response.text)
    print("Page dump saved successfully.")
except Exception as e:
    print(f"Error: {e}")

"""
debug_answer_page.py
Quick diagnostic — fetches ONE answer page and prints:
  1. All image URLs found anywhere on the page
  2. Whether an "Explanation" node exists
  3. The mb-4 div count and their text lengths

Usage:
  python debug_answer_page.py
"""
import sys, io
if sys.stdout.encoding and sys.stdout.encoding.lower() != "utf-8":
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace", line_buffering=True)

import time
from bs4 import BeautifulSoup
from selenium import webdriver
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.chrome.options import Options

URL = "https://myschool.ng/classroom/mathematics/53383?exam_type=waec&exam_year=2001&type=theory&page=1"

opts = Options()
opts.add_argument("--headless=new")
opts.add_argument("--no-sandbox")
opts.add_argument("--disable-dev-shm-usage")
opts.add_argument("--log-level=3")
opts.add_argument("--window-size=1920,1080")

driver = webdriver.Chrome(service=Service(), options=opts)
driver.get(URL)
time.sleep(3)
driver.execute_script("window.scrollTo(0, document.body.scrollHeight)")
time.sleep(2)
html = driver.page_source
driver.quit()

soup = BeautifulSoup(html, "lxml")

print("\n" + "="*60)
print("ALL IMAGE URLs ON PAGE:")
print("="*60)
for img in soup.find_all("img"):
    src = (img.get("src","") or img.get("data-src","") or
           img.get("data-lazy-src","") or img.get("data-original","")).strip()
    if src:
        print(f"  {src}")

print("\n" + "="*60)
print("EXPLANATION NODE SEARCH:")
print("="*60)
found = False
for tag in soup.find_all(["h2","h3","h4","p","div","strong","b","span"]):
    try:
        txt = tag.get_text(strip=True)
        if "explanation" in txt.lower() and len(txt) < 30:
            print(f"  FOUND: <{tag.name} class='{tag.get('class','')}'>  text='{txt}'")
            found = True
            # Print next 3 siblings
            for i, sib in enumerate(tag.find_next_siblings()):
                print(f"    sibling[{i}]: <{sib.name}> text={sib.get_text(' ',strip=True)[:80]!r}")
                if i >= 4:
                    break
            break
    except Exception:
        continue
if not found:
    print("  NOT FOUND - no tag with text 'explanation' under 30 chars")

print("\n" + "="*60)
print("ALL MB-4 DIVS:")
print("="*60)
for i, div in enumerate(soup.find_all("div", class_="mb-4")):
    txt = div.get_text(" ", strip=True)
    imgs = div.find_all("img")
    print(f"  mb-4[{i}]: len={len(txt)} imgs={len(imgs)} text={txt[:100]!r}")

print("\n" + "="*60)
print("PAGE-CONTENT-SECTION STRUCTURE (top level children):")
print("="*60)
content = soup.find("div", id="page-content-section")
if content:
    for i, child in enumerate(content.children):
        if hasattr(child, 'name') and child.name:
            txt = child.get_text(" ", strip=True)[:60]
            cls = child.get("class", "")
            imgs = child.find_all("img")
            print(f"  [{i}] <{child.name} class={cls}> imgs={len(imgs)} text={txt!r}")
else:
    print("  page-content-section NOT FOUND")
"""
debug_images.py - inspect img tags on theory answer pages (Windows safe)
"""
import time
import sys
import io

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")

from selenium import webdriver
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.chrome.options import Options
from bs4 import BeautifulSoup

URLS = {
    "Q3 answer": "https://myschool.ng/classroom/mathematics/53385?exam_type=waec&exam_year=2001&type=theory&page=1",
    "Q4 answer": "https://myschool.ng/classroom/mathematics/53386?exam_type=waec&exam_year=2001&type=theory&page=1",
    "Q11 answer": "https://myschool.ng/classroom/mathematics/53407?exam_type=waec&exam_year=2001&type=theory&page=3",
    "Q listing page 1": "https://myschool.ng/classroom/mathematics?exam_type=waec&exam_year=2001&type=theory&page=1",
}

def setup_driver():
    opts = Options()
    opts.add_argument("--headless=new")
    opts.add_argument("--no-sandbox")
    opts.add_argument("--disable-dev-shm-usage")
    opts.add_argument("--window-size=1920,1080")
    return webdriver.Chrome(service=Service(), options=opts)

def inspect_page(driver, url, label):
    print(f"\n{'='*60}")
    print(f"PAGE: {label}")
    print(f"{'='*60}")
    driver.get(url)
    time.sleep(3)
    for _ in range(6):
        driver.execute_script("window.scrollBy(0, window.innerHeight)")
        time.sleep(0.7)
    driver.execute_script("""
        document.querySelectorAll('img').forEach(img => {
            ['data-src','data-lazy-src','data-original',
             'data-cfsrc','data-lazy','data-url','data-image'].forEach(attr => {
                if (img.getAttribute(attr) && (!img.src || img.src === window.location.href)) {
                    img.src = img.getAttribute(attr);
                }
            });
        });
    """)
    time.sleep(2)
    live_html = driver.execute_script("return document.documentElement.outerHTML")
    soup      = BeautifulSoup(live_html, "lxml")
    content   = soup.find("div", id="page-content-section")
    if not content:
        print("  ERROR: No page-content-section found")
        return
    all_imgs = content.find_all("img")
    print(f"\nTotal images in page-content-section: {len(all_imgs)}")
    for i, img in enumerate(all_imgs, 1):
        print(f"\n  [IMG {i}]")
        for attr, val in dict(img.attrs).items():
            print(f"    {attr} = {str(val)[:150]}")
        parent = img.parent
        if parent and hasattr(parent, 'name'):
            cls = ' '.join(parent.get('class', []))
            pid = parent.get('id', '')
            print(f"    parent: <{parent.name} class='{cls}' id='{pid}'>")
    print(f"\nmb-4 blocks summary:")
    for i, mb4 in enumerate(content.find_all("div", class_="mb-4"), 1):
        txt  = mb4.get_text(strip=True)[:80]
        imgs = len(mb4.find_all("img"))
        print(f"  [{i}] imgs={imgs} text='{txt}'")

def main():
    driver = setup_driver()
    try:
        for label, url in URLS.items():
            inspect_page(driver, url, label)
    finally:
        driver.quit()
    print(f"\nDone.")

if __name__ == "__main__":
    main()
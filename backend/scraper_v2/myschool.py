import os
import re
import time
from selenium.webdriver.common.by import By
from .base import BaseScraper
from .utils import process_image, detect_topic, save_metadata

class MySchoolScraper(BaseScraper):
    def __init__(self, headless=True):
        super().__init__(headless)
        self.base_url = "https://myschool.ng/classroom/mathematics"

    def scrape_exam(self, exam_key, year, q_type="objectives", max_pages=10):
        type_param = "obj" if q_type == "objectives" else "theory"
        output_dir = f"backend/images/{exam_key}/{year}/{q_type}"
        os.makedirs(output_dir, exist_ok=True)
        
        all_metadata = []
        question_count = 0

        for page in range(1, max_pages + 1):
            url = f"{self.base_url}?exam_type={exam_key}&exam_year={year}&type={type_param}&page={page}"
            print(f"Scraping {exam_key.upper()} {year} {q_type} | Page {page}...")
            
            if not self.safe_get(url):
                print(f"  [ERROR] Failed to load page {page}")
                continue

            self.wait_for_mathjax()
            
            # Refined selector based on HTML audit
            questions = self.driver.find_elements(By.CSS_SELECTOR, "div.question-item")
            if not questions:
                print(f"  [WARN] No questions found on page {page}. Ending.")
                break

            for i, q_element in enumerate(questions, 1):
                question_count += 1
                q_id = f"{exam_key}_{year}_{type_param}_{question_count:03d}"
                img_filename = f"q{question_count:03d}.png"
                img_path = os.path.join(output_dir, img_filename)

                try:
                    # 1. Extract and Clean Data
                    sn_text = q_element.find_element(By.CSS_SELECTOR, ".question_sn").text.strip()
                    desc_element = q_element.find_element(By.CSS_SELECTOR, ".question-desc")
                    raw_text = desc_element.text.strip()
                    
                    # 2. Topic Detection
                    topic = detect_topic(raw_text)
                    
                    # 3. Handle diagrams
                    has_diag = bool(desc_element.find_elements(By.TAG_NAME, "img"))

                    # 4. Take Screenshot of the full question-item block
                    self.driver.execute_script("arguments[0].scrollIntoView({block: 'center'});", q_element)
                    time.sleep(0.5)
                    
                    # Hide unneeded parts
                    self.driver.execute_script("""
                        let links = arguments[0].querySelectorAll('a.view-answer, .badge, .question-meta, .fb-comments, .alert');
                        links.forEach(l => l.style.display = 'none');
                    """, q_element)

                    q_element.screenshot(img_path)
                    process_image(img_path)

                    # 5. Build Metadata
                    q_data = {
                        "id": q_id,
                        "exam": exam_key,
                        "year": int(year),
                        "type": q_type,
                        "question_number": int(sn_text) if sn_text.isdigit() else question_count,
                        "question_text": raw_text,
                        "options": self.parse_options_from_element(q_element),
                        "correct_answer": "Pending",
                        "topic": topic,
                        "has_diagram": has_diag,
                        "image_file": img_filename,
                        "image_path": img_path.replace("\\", "/"),
                        "source_url": url
                    }
                    all_metadata.append(q_data)
                    print(f"  [OK] Captured Question {question_count} (SN: {sn_text})")

                except Exception as e:
                    print(f"  [ERROR] Error capturing question {question_count}: {e}")
                    self.log_error(exam_key.upper(), year, url, 500, str(e))

        # Save metadata.json
        save_metadata(os.path.join(output_dir, "metadata.json"), all_metadata)
        return len(all_metadata)

    def parse_options_from_element(self, q_element):
        options = {}
        try:
            items = q_element.find_elements(By.CSS_SELECTOR, "ul.list-unstyled li")
            for li in items:
                text = li.text.strip()
                m = re.match(r'^([A-E])\.?\s*(.*)$', text, re.DOTALL)
                if m:
                    options[m.group(1).upper()] = m.group(2).strip()
        except:
            pass
        return options

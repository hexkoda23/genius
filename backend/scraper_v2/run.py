import sys
import os
import json
import time
from datetime import datetime

# Add the current directory to sys.path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from scraper_v2.waec import WAECScraper
from scraper_v2.jamb import JAMBScraper
from scraper_v2.neco import NECOScraper
from scraper_v2.nabteb import NABTEBScraper

def main():
    summary = {
        "scrape_date": datetime.now().isoformat(),
        "total_questions_captured": 0,
        "breakdown": {},
        "errors": [],
        "missing": []
    }

    scrapers = {
        "waec": WAECScraper(headless=True),
        "jamb": JAMBScraper(headless=True),
        "neco": NECOScraper(headless=True),
        "nabteb": NABTEBScraper(headless=True)
    }

    years = ["2023", "2024", "2025"]
    
    try:
        for exam, scraper in scrapers.items():
            summary["breakdown"][exam] = {}
            for year in years:
                summary["breakdown"][exam][year] = {}
                
                # Objectives
                print(f"\n--- Starting {exam.upper()} {year} Objectives ---")
                obj_count = scraper.scrape_exam(exam, year, q_type="objectives", max_pages=10)
                summary["breakdown"][exam][year]["objectives"] = obj_count
                summary["total_questions_captured"] += obj_count
                
                if obj_count == 0 and year == "2025":
                    summary["missing"].append({"exam": exam, "year": year, "reason": "not yet published"})

                # Theory (Skip for JAMB)
                if exam != "jamb":
                    print(f"\n--- Starting {exam.upper()} {year} Theory ---")
                    theory_count = scraper.scrape_exam(exam, year, q_type="theory", max_pages=5)
                    summary["breakdown"][exam][year]["theory"] = theory_count
                    summary["total_questions_captured"] += theory_count

                # Small delay between years
                time.sleep(5)

        # Save Final Summary
        with open("backend/images/scrape_summary.json", "w") as f:
            json.dump(summary, f, indent=2)
            
        print(f"\n\nDONE! Total questions captured: {summary['total_questions_captured']}")
        
    except Exception as e:
        print(f"CRITICAL ERROR: {e}")
        summary["errors"].append({"exam": "Global", "year": "N/A", "url": "N/A", "reason": str(e)})
        with open("backend/images/scrape_summary.json", "w") as f:
            json.dump(summary, f, indent=2)
    finally:
        for s in scrapers.values():
            s.close()

if __name__ == "__main__":
    main()

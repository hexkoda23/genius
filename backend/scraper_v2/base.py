import time
import random
import os
from selenium import webdriver
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.chrome.options import Options
from webdriver_manager.chrome import ChromeDriverManager

USER_AGENTS = [
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36",
    "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/118.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:109.0) Gecko/20100101 Firefox/121.0",
]

class BaseScraper:
    def __init__(self, headless=True):
        self.driver = self.setup_driver(headless)
        self.errors_log = "backend/images/errors.log"

    def setup_driver(self, headless):
        opts = Options()
        if headless:
            opts.add_argument("--headless=new")
        opts.add_argument("--no-sandbox")
        opts.add_argument("--disable-dev-shm-usage")
        opts.add_argument("--window-size=1920,1080")
        opts.add_argument(f"user-agent={random.choice(USER_AGENTS)}")
        # Anti-detection
        opts.add_argument("--disable-blink-features=AutomationControlled")
        
        service = Service(ChromeDriverManager().install())
        driver = webdriver.Chrome(service=service, options=opts)
        driver.execute_script("Object.defineProperty(navigator, 'webdriver', {get: () => undefined})")
        return driver

    def rotate_ua(self):
        # Note: Selenium doesn't support changing UA mid-session easily
        # For now we'll just reinject via script if possible or stick to one per init
        pass

    def safe_get(self, url, wait_range=(2, 4)):
        time.sleep(random.uniform(*wait_range))
        try:
            self.driver.get(url)
            return True
        except Exception as e:
            self.log_error("N/A", "N/A", url, 500, str(e))
            return False

    def log_error(self, exam, year, url, status, reason):
        ts = time.strftime("%Y-%m-%d %H:%M:%S")
        with open(self.errors_log, "a") as f:
            f.write(f"[{ts}] {exam} {year} | URL: {url} | Status: {status} | Reason: {reason}\n")

    def wait_for_mathjax(self, timeout=15):
        """Wait for MathJax to finish rendering."""
        # This script checks for MathJax 2 and 3 common indicators
        script = """
        return (typeof MathJax === 'undefined') || 
               (MathJax.version && MathJax.version.startsWith('2') && !MathJax.isReady) ||
               (MathJax.typesetPromise && typeof MathJax.typesetPromise === 'function');
        """
        # More robust: wait until .MathJax_Process and .mjx-chtml.mjx-processing are gone
        start = time.time()
        while time.time() - start < timeout:
            busy = self.driver.execute_script(
                "return !!(document.querySelector('.MathJax_Process, .mjx-processing, .MathJax_Preview'));"
            )
            if not busy:
                break
            time.sleep(0.5)

    def close(self):
        if self.driver:
            self.driver.quit()

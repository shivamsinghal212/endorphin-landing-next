from playwright.sync_api import sync_playwright
import os

BASE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
HTML = f"file://{BASE}/design-mockups/ig-run-clubs/carousel.html"
OUT_DIR = f"{BASE}/screenshots/ig-run-clubs/carousel"
os.makedirs(OUT_DIR, exist_ok=True)

NAMES = ["1-cover", "2-stridetribe", "3-aavjo", "4-tez", "5-cta"]

with sync_playwright() as pw:
    browser = pw.chromium.launch()
    page = browser.new_page(viewport={"width": 1080, "height": 1350}, device_scale_factor=1)
    for i, name in enumerate(NAMES, start=1):
        page.goto(f"{HTML}?slide={i}")
        page.wait_for_load_state("networkidle")
        page.evaluate("document.fonts.ready")
        page.wait_for_timeout(600)
        path = f"{OUT_DIR}/{name}.png"
        page.screenshot(path=path)
        print(f"Saved: {path}")
    browser.close()

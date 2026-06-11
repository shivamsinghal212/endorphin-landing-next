from playwright.sync_api import sync_playwright
import os

BASE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
HTML = f"file://{BASE}/design-mockups/ig-run-clubs/poster.html"
OUT_DIR = f"{BASE}/screenshots/ig-run-clubs"
os.makedirs(OUT_DIR, exist_ok=True)

CLUBS = ["stridetribe", "aavjo", "tez"]

with sync_playwright() as pw:
    browser = pw.chromium.launch()
    page = browser.new_page(viewport={"width": 1080, "height": 1350}, device_scale_factor=1)
    for club in CLUBS:
        page.goto(f"{HTML}?club={club}")
        page.wait_for_load_state("networkidle")
        page.evaluate("document.fonts.ready")
        page.wait_for_timeout(800)
        path = f"{OUT_DIR}/{club}.png"
        page.screenshot(path=path)
        print(f"Saved: {path}")
    browser.close()

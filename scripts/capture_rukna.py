from playwright.sync_api import sync_playwright
import os

URL = "https://www.endorfin.run/clubs/rukna-manahai"
OUT_DIR = "/Users/shivamsinghal/Desktop/projects/personal/endorphin-landing-next/screenshots/rukna-manahai"
os.makedirs(OUT_DIR, exist_ok=True)

VIEWPORTS = [
    {"name": "mobile-375", "width": 375, "height": 812},
    {"name": "tablet-768", "width": 768, "height": 1024},
    {"name": "desktop-1440", "width": 1440, "height": 900},
]

def capture(page, vp):
    name = vp["name"]
    w, h = vp["width"], vp["height"]
    page.set_viewport_size({"width": w, "height": h})
    page.goto(URL, wait_until="networkidle", timeout=60000)
    # Let fonts / images settle
    page.wait_for_timeout(2500)

    # Above-the-fold (viewport only, no full page)
    atf_path = f"{OUT_DIR}/{name}-above-fold.png"
    page.screenshot(path=atf_path, full_page=False, clip={"x": 0, "y": 0, "width": w, "height": h})
    print(f"Saved: {atf_path}")

    # Full-page scroll snapshots at key sections
    # Scroll to ~1x viewport (hero bottom / upcoming runs)
    page.evaluate(f"window.scrollTo(0, {h})")
    page.wait_for_timeout(800)
    section1_path = f"{OUT_DIR}/{name}-scroll-1x.png"
    page.screenshot(path=section1_path, full_page=False, clip={"x": 0, "y": 0, "width": w, "height": h})
    print(f"Saved: {section1_path}")

    # Scroll to ~2x viewport (comments roller)
    page.evaluate(f"window.scrollTo(0, {h * 2})")
    page.wait_for_timeout(800)
    section2_path = f"{OUT_DIR}/{name}-scroll-2x.png"
    page.screenshot(path=section2_path, full_page=False, clip={"x": 0, "y": 0, "width": w, "height": h})
    print(f"Saved: {section2_path}")

    # Scroll to ~3x viewport (brand collabs + footer)
    page.evaluate(f"window.scrollTo(0, {h * 3})")
    page.wait_for_timeout(800)
    section3_path = f"{OUT_DIR}/{name}-scroll-3x.png"
    page.screenshot(path=section3_path, full_page=False, clip={"x": 0, "y": 0, "width": w, "height": h})
    print(f"Saved: {section3_path}")

    # Full page
    page.evaluate("window.scrollTo(0, 0)")
    page.wait_for_timeout(500)
    full_path = f"{OUT_DIR}/{name}-full.png"
    page.screenshot(path=full_path, full_page=True)
    print(f"Saved: {full_path}")

    return {"atf": atf_path, "scroll1": section1_path, "scroll2": section2_path, "scroll3": section3_path, "full": full_path}

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    for vp in VIEWPORTS:
        print(f"\n--- Capturing {vp['name']} ({vp['width']}x{vp['height']}) ---")
        ctx = browser.new_context(
            viewport={"width": vp["width"], "height": vp["height"]},
            device_scale_factor=2 if vp["width"] <= 375 else 1,
        )
        page = ctx.new_page()
        paths = capture(page, vp)
        ctx.close()
    browser.close()

print("\nAll screenshots captured.")

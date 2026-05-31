from playwright.sync_api import sync_playwright
import os

URL = "https://www.endorfin.run/clubs/rukna-manahai"
OUT_DIR = "/Users/shivamsinghal/Desktop/projects/personal/endorphin-landing-next/screenshots/rukna-manahai"
os.makedirs(OUT_DIR, exist_ok=True)

def scroll_to_element(page, selector):
    try:
        el = page.locator(selector).first
        el.scroll_into_view_if_needed()
        page.wait_for_timeout(800)
        return True
    except:
        return False

def capture_section(page, name, selector, output_name, w, h):
    try:
        el = page.locator(selector).first
        el.scroll_into_view_if_needed()
        page.wait_for_timeout(900)
        path = f"{OUT_DIR}/{output_name}.png"
        page.screenshot(path=path, full_page=False, clip={"x": 0, "y": 0, "width": w, "height": h})
        print(f"Saved: {path}")
    except Exception as e:
        print(f"Could not capture {name}: {e}")

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)

    # --- Desktop 1440: Brand collabs + footer ---
    ctx = browser.new_context(viewport={"width": 1440, "height": 900})
    page = ctx.new_page()
    page.goto(URL, wait_until="networkidle", timeout=60000)
    page.wait_for_timeout(2500)

    # Brand collabs section
    capture_section(page, "brand-collabs", "text=BRAND COLLABORATIONS", "desktop-1440-brand-collabs", 1440, 900)

    # Footer CTA
    capture_section(page, "footer-cta", "text=GET RUN REMINDERS", "desktop-1440-footer-cta", 1440, 600)

    # Comments roller - scroll to it
    capture_section(page, "comments", "text=WHAT PEOPLE ARE SAYING", "desktop-1440-comments", 1440, 900)

    # Upcoming RSVP row
    capture_section(page, "upcoming-rsvp", "text=UPCOMING", "desktop-1440-upcoming-rsvp", 1440, 500)

    ctx.close()

    # --- Mobile 375: Same sections ---
    ctx = browser.new_context(viewport={"width": 375, "height": 812}, device_scale_factor=2)
    page = ctx.new_page()
    page.goto(URL, wait_until="networkidle", timeout=60000)
    page.wait_for_timeout(2500)

    # Hero section close-up (above fold)
    path = f"{OUT_DIR}/mobile-375-hero-detail.png"
    page.screenshot(path=path, full_page=False, clip={"x": 0, "y": 0, "width": 375, "height": 812})
    print(f"Saved: {path}")

    # Upcoming RSVP
    capture_section(page, "upcoming-rsvp-mobile", "text=UPCOMING", "mobile-375-upcoming-rsvp", 375, 500)

    # Brand collabs
    capture_section(page, "brand-collabs-mobile", "text=BRAND COLLABORATIONS", "mobile-375-brand-collabs", 375, 600)

    # Comments
    capture_section(page, "comments-mobile", "text=WHAT PEOPLE ARE SAYING", "mobile-375-comments", 375, 600)

    # Footer CTA
    capture_section(page, "footer-cta-mobile", "text=GET RUN REMINDERS", "mobile-375-footer-cta", 375, 500)

    ctx.close()

    # --- Tablet 768: Same sections ---
    ctx = browser.new_context(viewport={"width": 768, "height": 1024})
    page = ctx.new_page()
    page.goto(URL, wait_until="networkidle", timeout=60000)
    page.wait_for_timeout(2500)

    capture_section(page, "brand-collabs-tablet", "text=BRAND COLLABORATIONS", "tablet-768-brand-collabs", 768, 700)
    capture_section(page, "comments-tablet", "text=WHAT PEOPLE ARE SAYING", "tablet-768-comments", 768, 700)
    capture_section(page, "footer-cta-tablet", "text=GET RUN REMINDERS", "tablet-768-footer-cta", 768, 500)
    capture_section(page, "upcoming-rsvp-tablet", "text=UPCOMING", "tablet-768-upcoming-rsvp", 768, 500)

    ctx.close()
    browser.close()

print("\nDetail screenshots captured.")

"""E2E logout test."""
from playwright.sync_api import sync_playwright
import time, sys

with sync_playwright() as p:
    browser = p.chromium.connect_over_cdp("http://localhost:9222")
    ctx = browser.contexts[0]
    page = ctx.new_page()

    page.goto("http://localhost:3000/login", wait_until="networkidle")
    page.locator('input[type="email"]').first.fill("benitocabrera@hotmail.com")
    page.locator('input[type="password"]').first.fill("Benitomz2026$")
    page.locator('button[type="submit"]').first.click()

    page.wait_for_url("**/dashboard**", timeout=15000)
    print("logged in. URL:", page.url)
    time.sleep(2)

    # Check session cookie present
    cookies_before = [c["name"] for c in ctx.cookies() if c["name"].startswith("sb-")]
    print("sb cookies before logout:", cookies_before)

    # Click user menu trigger
    print("clicking user menu...")
    try:
        page.locator('button:has(svg.lucide-chevron-down)').first.click(timeout=5000)
    except Exception:
        # fallback
        page.evaluate(r"""() => {
            const btns = document.querySelectorAll('button');
            for (const b of btns) {
              const svg = b.querySelector('svg');
              if (svg && (b.innerText.includes('@') || b.innerText.toLowerCase().includes('benito'))) {
                b.click(); return;
              }
            }
        }""")
    time.sleep(1)
    page.screenshot(path="scripts/_logout-1-menu.png")

    # Click "Cerrar Sesión"
    page.get_by_text("Cerrar Sesión").first.click(timeout=5000)
    print("clicked Cerrar Sesión")
    time.sleep(3)

    cookies_after = [c["name"] for c in ctx.cookies() if c["name"].startswith("sb-")]
    print("sb cookies after logout:", cookies_after)
    print("URL after logout:", page.url)

    # Try accessing /dashboard (should bounce to /login)
    page.goto("http://localhost:3000/dashboard", wait_until="domcontentloaded")
    time.sleep(2)
    print("Tried /dashboard, ended at:", page.url)

    if "/login" in page.url and not cookies_after:
        print("LOGOUT OK")
    else:
        print("LOGOUT FAILED")
        sys.exit(1)

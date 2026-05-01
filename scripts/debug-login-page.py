from playwright.sync_api import sync_playwright
import time

with sync_playwright() as p:
    browser = p.chromium.connect_over_cdp("http://localhost:9222")
    ctx = browser.contexts[0]
    page = ctx.new_page()

    errors = []
    page.on("pageerror", lambda e: errors.append(("pageerror", str(e), e.stack if hasattr(e,'stack') else '')))
    page.on("console", lambda m: errors.append((m.type, m.text, '')))

    page.goto("http://localhost:3000/login", wait_until="networkidle", timeout=30000)
    time.sleep(2)

    # Trigger submit
    page.locator('input[type="email"]').first.fill("benitocabrerar@gmail.com")
    page.locator('input[type="password"]').first.fill("Temporal2026!")
    page.locator('button[type="submit"]').first.click()
    time.sleep(3)

    print("URL:", page.url)
    print("---ERRORS---")
    for e in errors[-30:]:
        if e[0] in ('pageerror','error') or 'login' in e[1].lower() or 'supabase' in e[1].lower() or 'auth' in e[1].lower():
            print(e[0], "::", e[1][:300])
            if e[2]: print("  stack:", e[2][:500])

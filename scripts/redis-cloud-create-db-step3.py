"""
Step 3: Llena nombre y crea DB.
"""
from playwright.sync_api import sync_playwright
import time, re, sys

def find_redis_page(ctx):
    for pg in ctx.pages:
        if "redislabs" in pg.url or "redis.com" in pg.url:
            return pg
    return None

def main():
    with sync_playwright() as p:
        browser = p.chromium.connect_over_cdp("http://localhost:9222")
        ctx = browser.contexts[0]
        page = find_redis_page(ctx)
        if not page: sys.exit(1)
        page.bring_to_front()
        print("URL:", page.url)

        # Scroll to form
        page.locator("text=Create database").first.scroll_into_view_if_needed()
        time.sleep(1)

        # Llenar Name field
        # Busca input con label "Name"
        name_input = None
        for sel in [
            'input[name="name"]',
            'input[aria-label*="Name" i]',
            'input[placeholder*="name" i]',
        ]:
            loc = page.locator(sel).first
            if loc.count() > 0:
                name_input = loc; break

        if name_input is None:
            # heuristica: input cerca del texto "Name"
            page.locator("text=Name").first.click()
            page.keyboard.press("Tab")
            page.keyboard.type("poweria-legal", delay=30)
        else:
            try:
                name_input.fill("")
            except: pass
            name_input.fill("poweria-legal")
        print("Filled name")

        time.sleep(2)
        page.screenshot(path="scripts/_redis-step3-prefill.png", full_page=True)

        # Click Create database
        page.get_by_role("button", name=re.compile(r"Create database", re.I)).first.click(timeout=10000)
        print("Clicked Create database")

        # Wait redirect to db detail
        for i in range(30):
            time.sleep(2)
            url = page.url
            print(f"[{i*2}s] url={url}")
            if "/databases/" in url and "essential" not in url and "add-subscription" not in url:
                break
            if "/databases" in url and "#/add-subscription" not in url and i > 3:
                break

        time.sleep(3)
        page.screenshot(path="scripts/_redis-step3-after.png", full_page=True)
        body = page.locator("body").inner_text()
        with open("scripts/_redis-step3.txt", "w", encoding="utf-8") as f:
            f.write(body)
        print("---STEP3 BODY tail (last 2000)---")
        print(body[-2000:])
        print("URL final:", page.url)

if __name__ == "__main__":
    main()

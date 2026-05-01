"""
Step 2: Elige Free plan, configura DB y crea.
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
        if not page: print("no page"); sys.exit(1)
        page.bring_to_front()
        print("URL:", page.url)

        # Click "Just try it" (free plan)
        try:
            page.get_by_role("button", name=re.compile(r"Just try it", re.I)).first.click(timeout=10000)
            print("Clicked Just try it")
        except Exception as e:
            print("button err:", e)
            page.get_by_text("Just try it", exact=False).first.click()

        time.sleep(5)
        page.screenshot(path="scripts/_redis-step2-config.png", full_page=True)
        print("URL:", page.url)

        body = page.locator("body").inner_text()
        with open("scripts/_redis-step2.txt", "w", encoding="utf-8") as f:
            f.write(body)
        print("---STEP2 BODY (1800)---")
        print(body[:1800])

if __name__ == "__main__":
    main()

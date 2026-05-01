"""Click directo en IconButtonShow del Connection Wizard."""
from playwright.sync_api import sync_playwright
import time, re, sys, json

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

        body = page.locator("body").inner_text()
        if "redis://default:" not in body:
            page.get_by_role("button", name=re.compile(r"^Connect$", re.I)).first.click()
            time.sleep(3)

        # Click ALL "Show" icon buttons by aria-label="Show"
        clicked = page.evaluate(r"""() => {
            const svgs = document.querySelectorAll('svg[aria-label="Show"]');
            const results = [];
            for (const svg of svgs) {
              let btn = svg.closest('button') || svg.parentElement;
              if (btn && btn.click) { btn.click(); results.push(btn.outerHTML.slice(0,180)); }
            }
            return results;
        }""")
        print("clicked", len(clicked), "show buttons")
        time.sleep(2)

        # Read password from any input now
        inputs = page.evaluate(r"""() => Array.from(document.querySelectorAll('input,textarea')).map(i=>({
            type:i.type, value:i.value, name:i.name||'', placeholder:i.placeholder||'', aria:i.getAttribute('aria-label')||''
        })).filter(x=>x.value)""")
        print("inputs:")
        for x in inputs: print(" ", json.dumps(x, ensure_ascii=False))

        codes = page.evaluate(r"""() => Array.from(document.querySelectorAll('code,pre,[class*="snippet"]')).map(e=>e.innerText).filter(Boolean)""")
        print("\ncode:")
        for c in codes[:6]: print(" >>>", c[:400])

        body2 = page.locator("body").inner_text()
        m = re.search(r"redis://default:([^@\s]+)@", body2)
        if m:
            pwd = m.group(1)
            print("\nDETECTED PWD:", pwd)
            if "*" not in pwd:
                with open("scripts/_redis-final.txt","w") as f:
                    f.write(pwd)
                print("OK saved")

        page.screenshot(path="scripts/_redis-revealed-v2.png", full_page=True)

if __name__ == "__main__":
    main()

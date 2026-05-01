"""
Click en "Connect" para abrir modal con credenciales completas.
"""
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

        # Click el botón Connect (justo bajo Public endpoint o card "Connect to database")
        # Hay 2 "Connect" en la página. El relevante es el de la card "Connect to database".
        connect_btns = page.get_by_role("button", name=re.compile(r"^Connect$", re.I))
        cnt = connect_btns.count()
        print(f"Found {cnt} Connect buttons")
        if cnt == 0:
            # try any text "Connect"
            page.get_by_text("Connect", exact=True).first.click()
        else:
            connect_btns.first.click(timeout=8000)
        print("Clicked Connect")
        time.sleep(4)
        page.screenshot(path="scripts/_redis-connect-modal.png", full_page=True)

        # En el modal, buscar tabs Redis CLI / Client / Insight. Click "Redis CLI" → muestra
        # comando con -a <password>. O bien "RedisInsight" → muestra connection url.
        body = page.locator("body").inner_text()
        with open("scripts/_redis-connect-modal.txt", "w", encoding="utf-8") as f:
            f.write(body)

        # Look for password directly
        # En la modal de Connect suele haber línea: "redis-cli -u redis://default:PASSWORD@host:port"
        m = re.search(r"redis://default:([^@\s]+)@", body)
        if m:
            print("PASSWORD via redis://:", m.group(1))
        m2 = re.search(r"-a\s+([A-Za-z0-9\-_]{8,})", body)
        if m2:
            print("PASSWORD via -a:", m2.group(1))

        # Si no, intentar ver inputs reveladas
        inputs = page.evaluate("""() => Array.from(document.querySelectorAll('input,textarea')).map(i=>({
            type:i.type, value:i.value, name:i.name||'', placeholder:i.placeholder||'', aria:i.getAttribute('aria-label')||''
        })).filter(x=>x.value)""")
        print("\nVisible input/textarea values:")
        for x in inputs:
            print(" ", json.dumps(x))

        # Mira el HTML completo de cualquier elemento <code> o <pre>
        codes = page.evaluate("""() => Array.from(document.querySelectorAll('code,pre,[class*="code"],[class*="snippet"]')).map(e=>e.innerText).filter(Boolean).slice(0,20)""")
        print("\nCode-like blocks:")
        for c in codes:
            print(" >>>", c[:300])

if __name__ == "__main__":
    main()

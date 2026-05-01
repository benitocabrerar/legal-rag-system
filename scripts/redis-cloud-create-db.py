"""
Crea una nueva DB free en Redis Cloud usando Playwright via CDP.
Estrategia:
  1. Click "New database"
  2. Elegir Essentials > Free 30MB
  3. Nombre: poweria-legal
  4. Crear
  5. Esperar a que aparezca, abrir detalles, copiar Public endpoint + default user password
"""
from playwright.sync_api import sync_playwright, expect
import time, json, re, sys

def main():
    with sync_playwright() as p:
        browser = p.chromium.connect_over_cdp("http://localhost:9222")
        ctx = browser.contexts[0]
        page = None
        for pg in ctx.pages:
            if "redislabs" in pg.url or "redis.com" in pg.url:
                page = pg; break
        if not page:
            print("No Redis tab found"); sys.exit(1)
        page.bring_to_front()
        print("Start URL:", page.url)

        # Click "New database"
        try:
            btn = page.get_by_role("button", name=re.compile(r"New database", re.I)).first
            btn.click(timeout=10000)
            print("Clicked New database")
        except Exception as e:
            print("Try link instead:", e)
            page.get_by_text("New database", exact=False).first.click()

        time.sleep(4)
        page.screenshot(path="scripts/_redis-step1-newdb.png")
        print("URL after newdb:", page.url)

        # Print all visible button/text on this page for diagnostics
        body = page.locator("body").inner_text()
        with open("scripts/_redis-step1.txt", "w", encoding="utf-8") as f:
            f.write(body)
        print("---STEP1 BODY (first 1500)---")
        print(body[:1500])

if __name__ == "__main__":
    main()

"""Abre el dashboard y hace click en el caso demo para mostrar el modal IA."""
from playwright.sync_api import sync_playwright
import time

with sync_playwright() as p:
    browser = p.chromium.connect_over_cdp("http://localhost:9222")
    ctx = browser.contexts[0]

    target = None
    for pg in ctx.pages:
        if "localhost:3000" in pg.url:
            target = pg; break
    if not target:
        target = ctx.new_page()
    target.bring_to_front()
    target.goto("http://localhost:3000/dashboard", wait_until="networkidle")
    time.sleep(3)

    # Buscar la card del caso "Operación Cumbre Andina"
    try:
        card = target.locator("article", has_text="Operación Cumbre Andina").first
        card.scroll_into_view_if_needed()
        time.sleep(1)
        card.click()
        print("✓ click en caso Operación Cumbre Andina")
    except Exception as e:
        print("err:", e)

    time.sleep(4)
    target.screenshot(path="scripts/_demo-case-modal.png", full_page=False)
    print("URL:", target.url)
    print("screenshot saved scripts/_demo-case-modal.png")

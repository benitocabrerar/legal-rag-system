from playwright.sync_api import sync_playwright

with sync_playwright() as p:
    browser = p.chromium.connect_over_cdp("http://localhost:9222")
    ctx = browser.contexts[0]
    # buscar pestaña ya abierta de localhost:3000
    target = None
    for pg in ctx.pages:
        if "localhost:3000" in pg.url:
            target = pg; break
    if not target:
        target = ctx.new_page()
    target.bring_to_front()
    target.goto("http://localhost:3000/admin/embeddings", wait_until="domcontentloaded")
    print("URL:", target.url)

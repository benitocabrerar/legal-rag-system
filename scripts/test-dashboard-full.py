"""E2E completo: limpia state → login backup admin → navega varias páginas → reporta errores."""
from playwright.sync_api import sync_playwright
import time, json

with sync_playwright() as p:
    browser = p.chromium.connect_over_cdp("http://localhost:9222")
    ctx = browser.contexts[0]

    # Reset cookies de localhost
    ctx.clear_cookies()

    page = ctx.new_page()
    page.set_default_timeout(20000)

    errors = []
    network_errs = []
    page.on("pageerror", lambda e: errors.append(f"pageerror: {e}"))
    page.on("console", lambda m: errors.append(f"console.{m.type}: {m.text}") if m.type in ("error", "warning") else None)
    page.on("response", lambda r: network_errs.append(f"{r.status} {r.request.method} {r.url}") if r.status >= 400 else None)

    # 1) Login
    print("=== 1. Login ===")
    page.goto("http://localhost:3000/login", wait_until="networkidle")
    page.locator('input[type="email"]').first.fill("benitocabrera@hotmail.com")
    page.locator('input[type="password"]').first.fill("Benitomz2026$")
    page.locator('button[type="submit"]').first.click()
    try:
        page.wait_for_url("**/dashboard**", timeout=15000)
        print("  reached /dashboard")
    except Exception as e:
        print("  FAIL: stayed at", page.url)

    # 2) Navegar a páginas
    PAGES = [
        ("/dashboard", "Dashboard"),
        ("/dashboard/cases", "Cases"),
        ("/dashboard/calendar", "Calendar"),
        ("/dashboard/tasks", "Tasks"),
        ("/dashboard/settings", "Settings"),
        ("/dashboard/settings/password", "Password change"),
        ("/admin", "Admin home"),
        ("/admin/users", "Admin users"),
    ]
    print("\n=== 2. Navegación ===")
    for path, label in PAGES:
        page.goto(f"http://localhost:3000{path}", wait_until="domcontentloaded")
        time.sleep(1.5)
        title = page.title()
        url = page.url
        flag = "OK" if path in url else f"redirected->{url}"
        print(f"  {path:42s} {flag}")

    print("\n=== 3. Errors capturados ===")
    auth_errs = [e for e in errors if "auth" in e.lower() or "401" in e or "403" in e]
    if auth_errs:
        for e in auth_errs[-10:]: print("  AUTH:", e[:200])
    else:
        print("  (sin errores de auth)")

    print("\n=== 4. Network 4xx/5xx ===")
    real = [n for n in network_errs if "icon-" not in n and "manifest" not in n]
    if real:
        for n in real[-15:]: print(" ", n)
    else:
        print("  (todo limpio)")

    print(f"\nTotal console errors/warnings: {len(errors)}, network 4xx+: {len(network_errs)}")

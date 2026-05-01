"""
E2E login test contra http://localhost:3000/login usando Playwright via CDP.
"""
from playwright.sync_api import sync_playwright
import time, sys, json

def main():
    with sync_playwright() as p:
        browser = p.chromium.connect_over_cdp("http://localhost:9222")
        ctx = browser.contexts[0]
        page = ctx.new_page()
        page.set_default_timeout(15000)

        console_msgs = []
        page.on("console", lambda m: console_msgs.append(f"[{m.type}] {m.text}"))
        page.on("pageerror", lambda e: console_msgs.append(f"[pageerror] {e}"))

        # Capturar requests de auth
        net = []
        def on_response(resp):
            url = resp.url
            if "/auth/" in url or "/api/v1/" in url or "supabase.co" in url:
                net.append(f"{resp.status} {resp.request.method} {url}")
        page.on("response", on_response)

        print("1) Navigate to /login")
        page.goto("http://localhost:3000/login", wait_until="domcontentloaded")
        page.wait_for_load_state("networkidle", timeout=15000)
        page.screenshot(path="scripts/_login-1-page.png")

        print("2) Fill credentials")
        # Buscar input email
        page.locator('input[type="email"], input[name="email"], input[id*="email" i]').first.fill("benitocabrerar@gmail.com")
        page.locator('input[type="password"]').first.fill("Temporal2026!")
        page.screenshot(path="scripts/_login-2-filled.png")

        print("3) Submit")
        # buscar button submit
        try:
            page.get_by_role("button", name=lambda n: "iniciar" in (n or "").lower() or "login" in (n or "").lower() or "sign in" in (n or "").lower()).first.click()
        except Exception:
            page.locator('button[type="submit"]').first.click()

        # Wait for navigation
        try:
            page.wait_for_url("**/dashboard**", timeout=15000)
            print("✓ Redirected to dashboard")
        except Exception as e:
            print("Did not reach /dashboard:", e)
            print("Current URL:", page.url)

        time.sleep(2)
        page.screenshot(path="scripts/_login-3-after.png", full_page=True)
        print("\nFinal URL:", page.url)
        print("\n=== Console / pageerror ===")
        for m in console_msgs[-20:]: print(" ", m)
        print("\n=== Network (auth/api) ===")
        for n in net: print(" ", n)

        # Si llegó a dashboard, verifica localStorage o sesión
        try:
            ls = page.evaluate("() => ({token: localStorage.getItem('token'), user: localStorage.getItem('user'), sb: Object.keys(localStorage).filter(k=>k.startsWith('sb-'))})")
            print("\n=== localStorage ===")
            print(json.dumps(ls, indent=2))
        except: pass

if __name__ == "__main__":
    main()

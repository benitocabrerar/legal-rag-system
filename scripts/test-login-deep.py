"""E2E full: login UI + verifica /me + /cases ahora autenticados con JWT Supabase."""
from playwright.sync_api import sync_playwright
import time, json, sys

def main():
    with sync_playwright() as p:
        browser = p.chromium.connect_over_cdp("http://localhost:9222")
        ctx = browser.contexts[0]
        page = ctx.new_page()
        page.set_default_timeout(15000)

        net = []
        page.on("response", lambda r: net.append(f"{r.status} {r.request.method} {r.url}") if any(x in r.url for x in ["/auth/", "/api/v1/", "supabase.co"]) else None)
        errors = []
        page.on("pageerror", lambda e: errors.append(f"pageerror: {e}"))

        page.goto("http://localhost:3000/login", wait_until="networkidle")
        page.locator('input[type="email"]').first.fill("benitocabrerar@gmail.com")
        page.locator('input[type="password"]').first.fill("Temporal2026!")
        page.locator('button[type="submit"]').first.click()

        try:
            page.wait_for_url("**/dashboard**", timeout=15000)
        except Exception as e:
            print("did not reach dashboard:", e)
            print("URL:", page.url)
            sys.exit(1)

        print("Reached dashboard")
        time.sleep(3)
        print("Final URL:", page.url)

        # Hit /api/v1/auth/supabase/me from inside the page (same cookies/token)
        result = page.evaluate(r"""async () => {
            const sb = window.localStorage;
            const skeys = Object.keys(localStorage).filter(k=>k.startsWith('sb-'));
            // get token from supabase cookie via global client
            try {
              const resp = await fetch('http://localhost:8000/api/v1/auth/supabase/me', {
                headers: { 'Content-Type':'application/json' }
              });
              return { status: resp.status, body: await resp.text(), skeys };
            } catch(e) { return { error: String(e) }; }
        }""")
        print("\nDirect /me without auth header (expecting 401):", json.dumps(result, indent=2)[:500])

        # Now try with token from supabase session
        result2 = page.evaluate(r"""async () => {
            // Use the global supabase client we created (might not be exposed)
            // Read directly from cookie or use module
            const cookies = document.cookie;
            return { cookies, lsKeys: Object.keys(localStorage) };
        }""")
        print("\nClient state:", json.dumps(result2, indent=2)[:600])

        # Try via the app's axios (which has the interceptor)
        result3 = page.evaluate(r"""async () => {
            // Trigger axios call by fetching a known endpoint
            // Use window fetch + read sb token from localstorage
            const tk = Object.keys(localStorage).filter(k=>k.endsWith('-auth-token')).map(k=>localStorage.getItem(k));
            let token = null;
            if (tk.length) {
              try {
                const parsed = JSON.parse(tk[0]);
                token = parsed.access_token || parsed[0]?.access_token;
              } catch {}
            }
            if (!token) return { error: 'no token in localStorage', keys: Object.keys(localStorage) };
            const r = await fetch('http://localhost:8000/api/v1/auth/supabase/me', {
              headers: { 'Authorization': 'Bearer ' + token }
            });
            return { status: r.status, body: await r.text() };
        }""")
        print("\nWith Bearer from localStorage:", json.dumps(result3, indent=2)[:800])

        print("\n=== Network ===")
        for n in net[-15:]: print(" ", n)
        print("\n=== Errors ===")
        for e in errors: print(" ", e)

if __name__ == "__main__":
    main()

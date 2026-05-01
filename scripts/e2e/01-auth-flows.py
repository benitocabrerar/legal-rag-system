"""
TEST SUITE 01: Flujos de autenticación.

Cubre:
  T01.1  Login email/password (admin backup)
  T01.2  Login con sesión persistente tras reload
  T01.3  Logout limpia cookies + redirige a /login
  T01.4  /dashboard sin sesión → redirect a /login server-side
  T01.5  Token JWT contiene custom claims correctos
  T01.6  Backend /me responde con role admin
  T01.7  Login con credenciales inválidas → error visible
  T01.8  Refresh token funcional
"""
from playwright.sync_api import sync_playwright
import time, json, os, sys, subprocess
from pathlib import Path

BASE = Path(__file__).parent.parent.parent
EVID = BASE / "test-results" / "evidence"
SHOTS = BASE / "test-results" / "screenshots"
EVID.mkdir(parents=True, exist_ok=True)
SHOTS.mkdir(parents=True, exist_ok=True)

ADMIN_EMAIL = "benitocabrera@hotmail.com"
ADMIN_PWD = "Benitomz2026$"

results = []

def record(test_id, name, passed, details=""):
    icon = "PASS" if passed else "FAIL"
    print(f"  [{icon}] {test_id} {name}")
    if details:
        for line in str(details).splitlines()[:5]:
            print(f"        {line[:200]}")
    results.append({"id": test_id, "name": name, "passed": passed, "details": str(details)[:500]})

with sync_playwright() as p:
    browser = p.chromium.connect_over_cdp("http://localhost:9222")
    ctx = browser.contexts[0]
    ctx.clear_cookies()

    # ---- T01.4: /dashboard sin sesión ----
    page = ctx.new_page()
    page.set_default_timeout(15000)
    print("\n=== T01.4: /dashboard sin sesión bouncea a /login ===")
    page.goto("http://localhost:3000/dashboard", wait_until="domcontentloaded")
    time.sleep(1)
    landed = page.url
    record("T01.4", "redirect server-side a /login", "/login" in landed, f"final_url={landed}")
    page.screenshot(path=str(SHOTS / "01-04-bounce-to-login.png"))

    # ---- T01.7: Login con credenciales inválidas ----
    print("\n=== T01.7: Login con password incorrecto muestra error ===")
    page.goto("http://localhost:3000/login", wait_until="networkidle")
    page.locator('input[type="email"]').first.fill(ADMIN_EMAIL)
    page.locator('input[type="password"]').first.fill("WRONG_PASSWORD_999")
    page.locator('button[type="submit"]').first.click()
    time.sleep(3)
    body = page.locator("body").inner_text()
    has_error = ("invalid" in body.lower() or "incorrect" in body.lower() or "credenciales" in body.lower() or "Error" in body)
    record("T01.7", "muestra error con credenciales malas", has_error and "/login" in page.url, f"body_includes_error={has_error}")
    page.screenshot(path=str(SHOTS / "01-07-wrong-password.png"))

    # ---- T01.1: Login OK ----
    print("\n=== T01.1: Login email/password OK ===")
    page.locator('input[type="password"]').first.fill("")
    page.locator('input[type="password"]').first.fill(ADMIN_PWD)
    page.locator('button[type="submit"]').first.click()
    try:
        page.wait_for_url("**/dashboard**", timeout=15000)
        record("T01.1", "redirect a /dashboard", True, page.url)
    except Exception as e:
        record("T01.1", "redirect a /dashboard", False, str(e))
    page.screenshot(path=str(SHOTS / "01-01-login-success.png"))
    time.sleep(2)

    # ---- T01.5: JWT con custom claims ----
    print("\n=== T01.5: JWT contiene user_role + plan_tier ===")
    claims = page.evaluate(r"""() => {
        const cookies = document.cookie.split(';');
        const sb = cookies.find(c => c.includes('-auth-token'));
        if (!sb) return null;
        // El cookie está en base64 y contiene un objeto JSON con access_token
        try {
          const value = decodeURIComponent(sb.split('=')[1].trim());
          // 'base64-' prefix de @supabase/ssr
          let raw = value.startsWith('base64-') ? value.slice(7) : value;
          const decoded = atob(raw);
          const obj = JSON.parse(decoded);
          const tok = obj.access_token || obj[0]?.access_token;
          if (!tok) return null;
          const payload = JSON.parse(atob(tok.split('.')[1].replace(/-/g,'+').replace(/_/g,'/')));
          return { user_role: payload.user_role, plan_tier: payload.plan_tier, email: payload.email, sub: payload.sub };
        } catch (e) { return { error: e.message }; }
    }""")
    ok = claims and claims.get("user_role") == "admin" and claims.get("plan_tier") == "premium"
    record("T01.5", "user_role=admin plan_tier=premium", ok, json.dumps(claims))

    # ---- T01.6: Backend /me ----
    print("\n=== T01.6: Backend /api/v1/auth/supabase/me responde admin ===")
    me = page.evaluate(r"""async () => {
        const cookies = document.cookie.split(';').map(c=>c.trim());
        const sb = cookies.find(c => c.includes('-auth-token'));
        const value = decodeURIComponent(sb.split('=')[1]);
        let raw = value.startsWith('base64-') ? value.slice(7) : value;
        const obj = JSON.parse(atob(raw));
        const tok = obj.access_token;
        const r = await fetch('http://localhost:8000/api/v1/auth/supabase/me', { headers: { Authorization: 'Bearer '+tok } });
        return { status: r.status, body: await r.json() };
    }""")
    ok = me.get("status") == 200 and me.get("body", {}).get("user", {}).get("role") == "admin"
    record("T01.6", "/me devuelve role=admin", ok, json.dumps(me))

    # ---- T01.2: Sesión persiste tras reload ----
    print("\n=== T01.2: Sesión persiste tras reload ===")
    page.reload(wait_until="networkidle")
    time.sleep(2)
    record("T01.2", "tras reload sigue en /dashboard", "/dashboard" in page.url, page.url)

    # ---- T01.8: Refresh token ----
    print("\n=== T01.8: Refresh token endpoint funciona ===")
    refresh_test = page.evaluate(r"""async () => {
        const cookies = document.cookie.split(';').map(c=>c.trim());
        const sb = cookies.find(c => c.includes('-auth-token'));
        const value = decodeURIComponent(sb.split('=')[1]);
        let raw = value.startsWith('base64-') ? value.slice(7) : value;
        const obj = JSON.parse(atob(raw));
        const refreshTok = obj.refresh_token;
        const url = 'https://lmnzzcqqegqugphcnmew.supabase.co/auth/v1/token?grant_type=refresh_token';
        const r = await fetch(url, {
          method: 'POST',
          headers: { apikey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imxtbnp6Y3FxZWdxdWdwaGNubWV3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc1MDMwMzAsImV4cCI6MjA5MzA3OTAzMH0.nYj_Xbut6K0y0TmPHR_BcCgFeeFi8DDHutSlnjPFBZY', 'Content-Type': 'application/json' },
          body: JSON.stringify({ refresh_token: refreshTok })
        });
        return { status: r.status };
    }""")
    record("T01.8", "refresh_token grant funciona", refresh_test.get("status") == 200, json.dumps(refresh_test))

    # ---- T01.3: Logout ----
    print("\n=== T01.3: Logout limpia cookies + bouncea ===")
    # Click user menu
    try:
        page.locator('button:has(svg.lucide-chevron-down)').first.click(timeout=5000)
        time.sleep(1)
        page.get_by_text("Cerrar Sesión").first.click()
        time.sleep(3)
    except Exception as e:
        record("T01.3", "click logout", False, f"click err: {e}")
    sb_cookies = [c["name"] for c in ctx.cookies() if c["name"].startswith("sb-")]
    at_login = "/login" in page.url
    record("T01.3", "cookies limpias + en /login", not sb_cookies and at_login, f"cookies={sb_cookies} url={page.url}")
    page.screenshot(path=str(SHOTS / "01-03-after-logout.png"))

    # Save results
    with open(EVID / "01-auth-flows.json", "w", encoding="utf-8") as f:
        json.dump(results, f, indent=2, ensure_ascii=False)

    passed = sum(1 for r in results if r["passed"])
    total = len(results)
    print(f"\n=== Suite 01 · {passed}/{total} passed ===")
    sys.exit(0 if passed == total else 1)

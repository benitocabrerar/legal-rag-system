"""SUITE 08: Visual walkthrough — screenshot de cada página principal."""
from playwright.sync_api import sync_playwright
import time, json
from pathlib import Path

BASE = Path(__file__).parent.parent.parent
SHOTS = BASE / "test-results" / "screenshots"
EVID = BASE / "test-results" / "evidence"
SHOTS.mkdir(parents=True, exist_ok=True)

PAGES = [
    ("/login",                          "01-login"),
    ("/register",                       "02-register"),
    ("/dashboard",                      "03-dashboard"),
    ("/dashboard/cases",                "04-cases"),
    ("/dashboard/calendar",             "05-calendar"),
    ("/dashboard/tasks",                "06-tasks"),
    ("/dashboard/finance",              "07-finance"),
    ("/dashboard/settings",             "08-settings"),
    ("/dashboard/settings/password",    "09-password"),
    ("/dashboard/admin",                "10-dashboard-admin"),
    ("/admin",                          "11-admin"),
    ("/admin/users",                    "12-admin-users"),
    ("/admin/specialties",              "13-admin-specialties"),
    ("/admin/audit",                    "14-admin-audit"),
    ("/admin/database",                 "15-admin-database"),
    ("/ai-assistant",                   "16-ai-assistant"),
    ("/search",                         "17-search"),
    ("/analytics",                      "18-analytics"),
    ("/notifications",                  "19-notifications"),
    ("/usage",                          "20-usage"),
    ("/pricing",                        "21-pricing"),
    ("/feedback",                       "22-feedback"),
    ("/summarization",                  "23-summarization"),
]

results = []

with sync_playwright() as p:
    browser = p.chromium.connect_over_cdp("http://localhost:9222")
    ctx = browser.contexts[0]
    ctx.clear_cookies()

    page = ctx.new_page()
    page.set_viewport_size({"width": 1440, "height": 900})
    page.set_default_timeout(15000)

    # Login
    print("Login as admin backup...")
    page.goto("http://localhost:3000/login", wait_until="networkidle")
    page.locator('input[type="email"]').first.fill("benitocabrera@hotmail.com")
    page.locator('input[type="password"]').first.fill("Benitomz2026$")
    page.locator('button[type="submit"]').first.click()
    page.wait_for_url("**/dashboard**", timeout=15000)
    time.sleep(2)
    print("logged in.\n")

    for path, slug in PAGES:
        try:
            page.goto(f"http://localhost:3000{path}", wait_until="domcontentloaded", timeout=15000)
            time.sleep(2)  # for client-side renders
            final = page.url
            ok = path in final
            shot = SHOTS / f"{slug}.png"
            page.screenshot(path=str(shot), full_page=False)
            print(f"  [{'OK' if ok else 'WARN'}] {path:40s} -> {final[:60]}")
            results.append({"path": path, "final_url": final, "ok": ok, "screenshot": shot.name})
        except Exception as e:
            print(f"  [FAIL] {path:40s} {str(e)[:80]}")
            results.append({"path": path, "ok": False, "error": str(e)[:200]})

    with open(EVID / "08-visual-walkthrough.json", "w", encoding="utf-8") as f:
        json.dump(results, f, indent=2)

    ok = sum(1 for r in results if r.get("ok"))
    print(f"\n=== Visual walkthrough: {ok}/{len(results)} reached target URL ===")

"""
Verifica via API + abre Dashboard para confirmación visual.
Mantiene la ventana abierta sin bloquearse en wait_for_event.
"""
from pathlib import Path
import json
import urllib.request
import sys
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[2]
PROJECT_REF = "lmnzzcqqegqugphcnmew"
HOOK_URL = f"https://supabase.com/dashboard/project/{PROJECT_REF}/auth/hooks"

token = (ROOT / ".supabase-access-token").read_text().strip()

# Verificación API
req = urllib.request.Request(
    f"https://api.supabase.com/v1/projects/{PROJECT_REF}/config/auth",
    headers={
        "Authorization": f"Bearer {token}",
        "User-Agent": "supabase-cli/2.90.0",
        "Accept": "application/json",
    },
)
cfg = json.loads(urllib.request.urlopen(req, timeout=15).read())
enabled = cfg.get("hook_custom_access_token_enabled")
uri = cfg.get("hook_custom_access_token_uri")

print()
print("=" * 60)
print("  Estado del hook (vía Management API):")
print(f"    enabled : {enabled}")
print(f"    uri     : {uri}")
print("=" * 60)

if not enabled:
    print("[FAIL] hook NO activado — algo se desconfiguró")
    sys.exit(2)

print("[OK] hook ACTIVO en BD")
print()
print(f"Abriendo browser en: {HOOK_URL}")
print("La ventana queda abierta 90 segundos para que la veas.")
print("Si necesitas más tiempo, ejecuta el script de nuevo.")
print()

with sync_playwright() as p:
    browser = p.chromium.launch(headless=False)
    ctx = browser.new_context(viewport={"width": 1500, "height": 950})
    page = ctx.new_page()
    page.goto(HOOK_URL)
    # No esperamos eventos — solo dejamos la ventana visible
    try:
        page.wait_for_timeout(90_000)
    except Exception:
        pass
    try:
        browser.close()
    except Exception:
        pass

print("[OK] ventana cerrada")

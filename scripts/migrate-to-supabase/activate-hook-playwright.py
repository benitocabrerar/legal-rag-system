"""
Activa el JWT Custom Access Token Hook vía Playwright (UI Dashboard).

Estrategia:
  1. Lanza Chromium HEADED.
  2. Si no hay sesión Supabase, espera a que el usuario loguee manualmente.
  3. Navega a /auth/hooks y configura:
        Hook type        = Postgres
        Postgres schema  = public
        Postgres function= custom_access_token_hook
        Enabled          = ON
  4. Click Save.
  5. Verifica via Management API que el hook quedó activo.

Uso:
  python scripts/migrate-to-supabase/activate-hook-playwright.py
"""
from __future__ import annotations
import os
import sys
import json
import time
import urllib.request
from pathlib import Path
from playwright.sync_api import sync_playwright, TimeoutError as PWTimeout

ROOT = Path(__file__).resolve().parents[2]
PROJECT_REF = "lmnzzcqqegqugphcnmew"
HOOK_URL = f"https://supabase.com/dashboard/project/{PROJECT_REF}/auth/hooks"
LOGIN_URL = "https://supabase.com/dashboard/sign-in"

def read_token() -> str | None:
    p = ROOT / ".supabase-access-token"
    if p.exists():
        return p.read_text().strip()
    return os.environ.get("SUPABASE_ACCESS_TOKEN")

def verify_hook_via_api(token: str) -> dict:
    req = urllib.request.Request(
        f"https://api.supabase.com/v1/projects/{PROJECT_REF}/config/auth",
        headers={"Authorization": f"Bearer {token}"},
    )
    with urllib.request.urlopen(req, timeout=20) as resp:
        return json.loads(resp.read())

def main() -> int:
    token = read_token()
    if token:
        print(f"[i] token disponible (len={len(token)})")
    else:
        print("[!] no hay token; sólo configuraré via UI sin verificación posterior")

    state_file = ROOT / ".pw-supabase-state.json"

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=False, slow_mo=120)
        ctx_kwargs = {"viewport": {"width": 1400, "height": 900}}
        if state_file.exists():
            ctx_kwargs["storage_state"] = str(state_file)
            print("[i] reusando cookies guardadas de sesión previa")
        ctx = browser.new_context(**ctx_kwargs)
        page = ctx.new_page()

        # 1. Ir directo al panel de hooks
        page.goto(HOOK_URL, wait_until="domcontentloaded")
        page.wait_for_timeout(2000)

        # 2. Si redirige a login, esperar al usuario
        if "/sign-in" in page.url or "auth0" in page.url or "login" in page.url:
            print()
            print("=" * 60)
            print("  Inicia sesión en la ventana del browser")
            print("  Esperando hasta 5 minutos...")
            print("=" * 60)
            try:
                page.wait_for_url(lambda url: PROJECT_REF in url and "/auth/hooks" in url, timeout=300_000)
            except PWTimeout:
                # quizás llegó al dashboard genérico — forzar
                page.goto(HOOK_URL, wait_until="domcontentloaded")
            page.wait_for_timeout(2000)
            ctx.storage_state(path=str(state_file))
            print(f"[i] sesión guardada en {state_file.name}")

        # 3. Esperar a que renderice la lista de hooks
        page.wait_for_load_state("networkidle", timeout=30_000)

        print(f"[i] URL actual: {page.url}")
        print(f"[i] título: {page.title()}")
        page.screenshot(path=str(ROOT / "hook-page-1.png"), full_page=True)
        print(f"[i] screenshot inicial: hook-page-1.png")

        # 4. Localizar el card "Custom Access Token Hook"
        card = page.get_by_text("Custom Access Token", exact=False).first
        try:
            card.wait_for(state="visible", timeout=15_000)
        except PWTimeout:
            print("[!] no encuentro el card 'Custom Access Token'. Revisa hook-page-1.png")
            print("    URL final:", page.url)
            return 2

        # 5. Click sobre la tarjeta para abrir el panel/diálogo de edición
        card.click()
        page.wait_for_timeout(2000)
        page.screenshot(path=str(ROOT / "hook-page-2.png"), full_page=True)
        print("[i] click en card → screenshot: hook-page-2.png")

        # 6. Activar el toggle "Enable"
        toggle_candidates = [
            page.get_by_role("switch"),
            page.locator("button[role='switch']"),
            page.get_by_label("Enable", exact=False),
        ]
        toggle = None
        for cand in toggle_candidates:
            if cand.count() > 0:
                toggle = cand.first
                break
        if toggle is None:
            print("[!] no encuentro el toggle Enable. Revisa hook-page-2.png")
            return 3

        is_checked = toggle.get_attribute("aria-checked") in ("true", "1")
        if not is_checked:
            toggle.click()
            page.wait_for_timeout(800)
            print("[+] toggle activado")
        else:
            print("[i] toggle ya estaba activado")

        # 7. Seleccionar Postgres como tipo (puede ser radio o tab)
        try:
            pg_radio = page.get_by_text("Postgres", exact=True).first
            if pg_radio.is_visible():
                pg_radio.click()
                page.wait_for_timeout(500)
                print("[+] tipo: Postgres")
        except Exception:
            pass

        # 8. Schema = public, Function = custom_access_token_hook
        try:
            schema_select = page.get_by_label("schema", exact=False).first
            schema_select.click()
            page.wait_for_timeout(400)
            page.get_by_role("option", name="public").click()
            page.wait_for_timeout(400)
            print("[+] schema=public")
        except Exception as e:
            print(f"[!] schema selector: {e}")

        try:
            func_select = page.get_by_label("function", exact=False).first
            func_select.click()
            page.wait_for_timeout(400)
            page.get_by_role("option", name="custom_access_token_hook").click()
            page.wait_for_timeout(400)
            print("[+] function=custom_access_token_hook")
        except Exception as e:
            print(f"[!] function selector: {e}")

        page.screenshot(path=str(ROOT / "hook-page-3.png"), full_page=True)

        # 9. Save
        save_btns = [
            page.get_by_role("button", name="Save"),
            page.get_by_role("button", name="Enable hook"),
            page.get_by_role("button", name="Confirm"),
        ]
        clicked = False
        for b in save_btns:
            if b.count() > 0 and b.first.is_visible():
                b.first.click()
                clicked = True
                print(f"[+] click Save")
                break
        if not clicked:
            print("[!] no encuentro botón Save. Revisa hook-page-3.png")

        page.wait_for_timeout(3000)
        page.screenshot(path=str(ROOT / "hook-page-final.png"), full_page=True)

        # 10. Verificar via API
        if token:
            try:
                cfg = verify_hook_via_api(token)
                enabled = cfg.get("hook_custom_access_token_enabled")
                uri = cfg.get("hook_custom_access_token_uri")
                print()
                print("=" * 60)
                print(f"  hook_custom_access_token_enabled: {enabled}")
                print(f"  hook_custom_access_token_uri:     {uri}")
                print("=" * 60)
                if enabled and uri and "custom_access_token_hook" in (uri or ""):
                    print("✓ HOOK ACTIVADO CORRECTAMENTE")
                    return 0
                else:
                    print("✗ Hook NO activado todavía. Mira hook-page-final.png")
                    return 4
            except Exception as e:
                print(f"[!] verificación API falló: {e}")

        print("[i] termina manualmente revisando los screenshots si hizo falta")
        browser.close()
        return 0

if __name__ == "__main__":
    sys.exit(main())

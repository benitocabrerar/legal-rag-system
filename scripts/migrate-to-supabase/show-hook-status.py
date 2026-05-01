"""
Abre el Dashboard de Hooks y deja la ventana visible para confirmación visual.
El hook ya fue activado vía Management API. Esto es solo para que lo veas.
"""
from playwright.sync_api import sync_playwright

PROJECT_REF = "lmnzzcqqegqugphcnmew"
URL = f"https://supabase.com/dashboard/project/{PROJECT_REF}/auth/hooks"

with sync_playwright() as p:
    browser = p.chromium.launch(headless=False)
    ctx = browser.new_context(viewport={"width": 1400, "height": 900})
    page = ctx.new_page()
    page.goto(URL)
    print()
    print("=" * 60)
    print("  Browser abierto en:")
    print(f"  {URL}")
    print()
    print("  Si aún no estás logueado, hazlo en esa ventana.")
    print("  Cuando llegues al panel de hooks, deberías ver:")
    print("    Custom Access Token Hook · Enabled (verde)")
    print("    Function: public.custom_access_token_hook")
    print()
    print("  Cierra la ventana cuando termines de revisar.")
    print("=" * 60)

    # Bloquear hasta que el usuario cierre la ventana
    try:
        page.wait_for_event("close", timeout=600_000)
    except Exception:
        pass
    browser.close()

"""Click el botón Google en /login y verifica que redirige a Google con los params correctos."""
from playwright.sync_api import sync_playwright
import time, sys

def main():
    with sync_playwright() as p:
        browser = p.chromium.connect_over_cdp("http://localhost:9222")
        ctx = browser.contexts[0]
        page = ctx.new_page()
        page.set_default_timeout(15000)

        # Forzar logout para empezar limpio
        page.goto("http://localhost:3000/login", wait_until="networkidle")
        page.evaluate(r"""async () => {
          // limpiar localStorage y cookies de supabase si existen
          try {
            const sb = window['__supabase'] || null;
          } catch {}
          // sign out via supabase client si está cargado
          try {
            const m = await import('/_next/static/chunks/main-app.js').catch(()=>null);
          } catch {}
          // best-effort: borrar cookies sb-
          document.cookie.split(';').forEach(c => {
            const eq = c.indexOf('=');
            const name = eq > -1 ? c.substr(0,eq).trim() : c.trim();
            if (name.startsWith('sb-')) document.cookie = name + '=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
          });
        }""")
        page.reload(wait_until="networkidle")

        # Click "Continuar con Google"
        page.get_by_text("Continuar con Google", exact=False).first.click()
        time.sleep(3)
        url = page.url
        print("After Google click, URL:", url[:200])

        # Validar que llegó a Google con los params correctos
        ok = "accounts.google.com" in url and "client_id=250570870786-" in url and "redirect_uri=https%3A%2F%2Flmnzzcqqegqugphcnmew.supabase.co" in url
        print("Google OAuth redirect OK:", ok)
        if not ok:
            print("-- params expected: accounts.google.com, client_id=250570870786-..., redirect_uri=https://lmnzzcqqegqugphcnmew.supabase.co/auth/v1/callback")

        # Cerrar la pestaña — no completamos el login para no dejar al user logueado en otra cuenta
        page.close()

if __name__ == "__main__":
    main()

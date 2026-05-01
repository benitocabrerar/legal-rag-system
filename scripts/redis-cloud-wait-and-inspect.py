"""
Conecta a Chrome via CDP (port 9222), espera a que el user esté logueado en
Redis Cloud y muestra qué DBs hay. Si no hay ninguna, espera a que el user
clique 'New database' y reporta el resultado para que el siguiente script
extraiga credenciales.
"""
from playwright.sync_api import sync_playwright
import time, sys

def main():
    with sync_playwright() as p:
        browser = p.chromium.connect_over_cdp("http://localhost:9222")
        ctx = browser.contexts[0]
        # Encuentra la pestaña de redislabs
        page = None
        for pg in ctx.pages:
            if "redis" in pg.url.lower():
                page = pg
                break
        if not page:
            page = ctx.new_page()
            page.goto("https://app.redislabs.com/")

        page.bring_to_front()
        print("URL:", page.url)
        print("Title:", page.title())

        # Espera login si está en login page
        for i in range(60):  # hasta 5 min
            url = page.url
            print(f"[{i*5}s] url={url}")
            if "/login" not in url and "auth" not in url.lower():
                # llegó al dashboard
                break
            time.sleep(5)
        else:
            print("Login no detectado en 5 min, abortando")
            sys.exit(1)

        print("\n--- Logueado, URL final:", page.url)
        time.sleep(3)
        # Captura HTML de la página principal para ver qué DBs hay
        html = page.content()
        with open("scripts/_redis-dashboard.html", "w", encoding="utf-8") as f:
            f.write(html)
        print("Saved scripts/_redis-dashboard.html")

        # Toma screenshot
        page.screenshot(path="scripts/_redis-dashboard.png", full_page=True)
        print("Saved scripts/_redis-dashboard.png")

        # Busca textos típicos de "no databases" o tabla de DBs
        body_text = page.locator("body").inner_text()
        print("\n--- Body text (first 800) ---")
        print(body_text[:800])

if __name__ == "__main__":
    main()

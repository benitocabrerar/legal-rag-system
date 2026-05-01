"""
Extrae endpoint público y password del default user.
"""
from playwright.sync_api import sync_playwright
import time, re, sys, json

def find_redis_page(ctx):
    for pg in ctx.pages:
        if "redislabs" in pg.url or "redis.com" in pg.url:
            return pg
    return None

def main():
    with sync_playwright() as p:
        browser = p.chromium.connect_over_cdp("http://localhost:9222")
        ctx = browser.contexts[0]
        page = find_redis_page(ctx)
        if not page: sys.exit(1)
        page.bring_to_front()

        # Asegurar que estamos en Configuration tab
        if "view-bdb" not in page.url:
            print("Navigating to db config")
            page.goto("https://app.redislabs.com/#/databases/14256819/subscription/3243042/view-bdb/configuration")
            time.sleep(5)

        # Scroll to top
        page.evaluate("window.scrollTo(0, 0)")
        time.sleep(1)
        page.screenshot(path="scripts/_redis-creds-top.png", full_page=True)

        # Buscar Public endpoint en el body
        body = page.locator("body").inner_text()
        with open("scripts/_redis-creds-body.txt", "w", encoding="utf-8") as f:
            f.write(body)

        # Extraer endpoint con regex
        endpoint_match = re.search(r"(redis-\d+\.[a-z0-9.-]*redns\.redis-cloud\.com:\d+)", body)
        if endpoint_match:
            print("Endpoint:", endpoint_match.group(1))
        else:
            # buscar por patrón general
            m2 = re.search(r"([a-z0-9.-]+\.redis-cloud\.com:\d+)", body)
            if m2: print("Endpoint:", m2.group(1))
            else: print("Endpoint NOT found in body")

        # Buscar el botón "Copy" cerca de "Default user password" y revelar password.
        # Primero el "Show" o icon-eye cerca de la password.
        # Estrategia: localizar texto "Default user password" y buscar input adyacente.
        try:
            pwd_section = page.get_by_text(re.compile(r"Default user password", re.I)).first
            pwd_section.scroll_into_view_if_needed()
            time.sleep(1)
            page.screenshot(path="scripts/_redis-creds-pwdarea.png", full_page=True)
        except Exception as e:
            print("pwd section not found:", e)

        # Intentar click en el icono show/eye junto al password
        # Busca todos los buttons con aria-label "Show" o "View"
        for sel in [
            'button[aria-label*="show" i]',
            'button[aria-label*="reveal" i]',
            'button[aria-label*="view" i]',
            '[role="button"][aria-label*="show" i]',
        ]:
            btns = page.locator(sel)
            cnt = btns.count()
            if cnt > 0:
                print(f"Found {cnt} buttons matching {sel}")
                for i in range(cnt):
                    try:
                        btns.nth(i).click(timeout=2000)
                        print(f"  clicked {i}")
                        time.sleep(0.5)
                    except: pass

        time.sleep(2)
        # Re-leer body después de revelar
        body2 = page.locator("body").inner_text()
        with open("scripts/_redis-creds-body-revealed.txt", "w", encoding="utf-8") as f:
            f.write(body2)

        # buscar password con heurística (string de 16-64 chars sin espacios)
        # cerca del texto "Default user password"
        idx = body2.find("Default user password")
        if idx >= 0:
            chunk = body2[idx:idx+800]
            print("\n--- chunk near pwd ---")
            print(chunk)

        # Capturar inputs: password fields rendered como type=password tienen valor accesible vía JS
        pwd_values = page.evaluate("""() => {
            const inputs = Array.from(document.querySelectorAll('input'));
            return inputs.map(i => ({
                type: i.type,
                name: i.name || '',
                id: i.id || '',
                placeholder: i.placeholder || '',
                value: i.value,
                ariaLabel: i.getAttribute('aria-label') || ''
            })).filter(x => x.value || x.type === 'password');
        }""")
        print("\n--- input fields with values ---")
        print(json.dumps(pwd_values, indent=2))

        page.screenshot(path="scripts/_redis-creds-final.png", full_page=True)

if __name__ == "__main__":
    main()

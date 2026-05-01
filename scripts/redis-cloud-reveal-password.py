"""
Modal de Connect ya abierto. Buscar el toggle "show password" y revelar.
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

        # Si modal cerrado, reabrir
        body = page.locator("body").inner_text()
        if "redis-cli -u redis://default:" not in body:
            print("Modal closed, reopening")
            page.get_by_role("button", name=re.compile(r"^Connect$", re.I)).first.click()
            time.sleep(3)

        # Try to click any toggle button near the password
        # Estrategia: buscar SVG con clase eye o button con aria-label
        toggles = page.evaluate("""() => {
            const btns = Array.from(document.querySelectorAll('button,svg,[role="button"]'));
            return btns
              .filter(b => /eye|show|reveal|visibility/i.test(b.outerHTML))
              .map(b => ({tag:b.tagName, html:b.outerHTML.slice(0,200)}));
        }""")
        print("Eye-like elements found:", len(toggles))
        for t in toggles[:5]: print(" ", t)

        # Mejor: buscar el <button> que está justo después del password masked
        # En la mayoría de UIs hay <input type=password> con un eye toggle adyacente.
        # Vamos a localizar el bloque que contiene "redis://default:" y encontrar el botón.
        clicked = page.evaluate("""() => {
            // Encuentra todos los nodos texto con 'redis://default:'
            const all = document.querySelectorAll('*');
            for (const el of all) {
              if (el.children.length === 0 && /redis:\\/\\/default:/.test(el.textContent || '')) {
                // walk up looking for a button sibling
                let parent = el;
                for (let i = 0; i < 5 && parent; i++) {
                  const btn = parent.querySelector('button, [role="button"]');
                  if (btn) {
                    btn.click();
                    return {clicked:true, tag:btn.tagName, html:btn.outerHTML.slice(0,200)};
                  }
                  parent = parent.parentElement;
                }
              }
            }
            return {clicked:false};
        }""")
        print("eval click result:", clicked)
        time.sleep(1)

        # Generic: click ALL buttons inside the modal that look like icons (no text)
        buttons_in_modal = page.evaluate("""() => {
            const modals = document.querySelectorAll('[role="dialog"], .modal, [class*="Modal"], [class*="modal"]');
            const targets = modals.length ? Array.from(modals) : [document.body];
            const results = [];
            for (const root of targets) {
              const btns = root.querySelectorAll('button');
              for (const b of btns) {
                const txt = (b.innerText||'').trim();
                if (!txt && b.querySelector('svg')) {
                  try { b.click(); results.push(b.outerHTML.slice(0,150)); } catch {}
                }
              }
            }
            return results;
        }""")
        print(f"Clicked {len(buttons_in_modal)} icon-only buttons in modal")
        time.sleep(2)

        page.screenshot(path="scripts/_redis-revealed.png", full_page=True)

        codes = page.evaluate("""() => Array.from(document.querySelectorAll('code,pre,[class*="code"],[class*="snippet"]')).map(e=>e.innerText).filter(Boolean)""")
        print("\nCode blocks now:")
        for c in codes[:10]:
            print(" >>>", c[:400])

        # Final regex
        body2 = page.locator("body").inner_text()
        with open("scripts/_redis-modal-revealed.txt", "w", encoding="utf-8") as f:
            f.write(body2)
        m = re.search(r"redis://default:([^@\s\*]+)@", body2)
        if m and "*" not in m.group(1):
            print("\n✅ PASSWORD:", m.group(1))
        else:
            print("\n❌ Still masked or not found")

if __name__ == "__main__":
    main()

"""Cambiar maxmemory-policy a noeviction via UI Redis Cloud."""
from playwright.sync_api import sync_playwright
import time, sys, re

def main():
    with sync_playwright() as p:
        browser = p.chromium.connect_over_cdp("http://localhost:9222")
        ctx = browser.contexts[0]
        page = None
        for pg in ctx.pages:
            if "redislabs" in pg.url:
                page = pg; break
        if not page:
            page = ctx.new_page()
        page.bring_to_front()

        # Ir a config de la DB
        page.goto("https://app.redislabs.com/#/databases/14256819/subscription/3243042/view-bdb/configuration")
        time.sleep(5)

        # Click "Edit"
        try:
            page.get_by_role("button", name=re.compile(r"^Edit$", re.I)).first.click(timeout=8000)
            print("clicked Edit")
        except Exception as e:
            print("Edit not found:", e)
            page.screenshot(path="scripts/_redis-evict-1.png", full_page=True)
            sys.exit(1)
        time.sleep(3)
        page.screenshot(path="scripts/_redis-evict-2-edit.png", full_page=True)

        # Localizar dropdown "Data eviction policy"
        body = page.locator("body").inner_text()
        if "Data eviction policy" not in body:
            print("eviction section not found")
            sys.exit(1)

        # Heuristic: buscar el campo eviction policy y abrirlo
        try:
            policy = page.get_by_text("Data eviction policy").first
            policy.scroll_into_view_if_needed()
            time.sleep(1)
            # hay un combobox/dropdown justo debajo
            page.evaluate(r"""() => {
                const all = Array.from(document.querySelectorAll('*'));
                for (const el of all) {
                  if ((el.textContent||'').trim() === 'Data eviction policy') {
                    let parent = el.parentElement;
                    for (let i=0;i<6;i++) {
                      if (!parent) break;
                      const trigger = parent.querySelector('[role="combobox"],[role="button"],button,select');
                      if (trigger) { trigger.click(); return 'clicked '+trigger.tagName; }
                      parent = parent.parentElement;
                    }
                  }
                }
                return 'no trigger';
            }""")
        except Exception as e:
            print("policy click err:", e)
        time.sleep(2)
        page.screenshot(path="scripts/_redis-evict-3-dropdown.png", full_page=True)

        # Click "noeviction"
        try:
            page.get_by_text(re.compile(r"^noeviction$", re.I)).first.click(timeout=5000)
            print("selected noeviction")
        except Exception as e:
            print("noeviction option err:", e)

        time.sleep(2)
        page.screenshot(path="scripts/_redis-evict-4-selected.png", full_page=True)

        # Click Save
        try:
            page.get_by_role("button", name=re.compile(r"^Save", re.I)).first.click(timeout=5000)
            print("clicked Save")
        except Exception as e:
            print("save err:", e)

        time.sleep(8)
        page.screenshot(path="scripts/_redis-evict-5-saved.png", full_page=True)
        print("Done. URL:", page.url)

if __name__ == "__main__":
    main()

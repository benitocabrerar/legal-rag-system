"""Abre /login en una pestaña visible y trae la ventana al frente."""
from playwright.sync_api import sync_playwright

with sync_playwright() as p:
    browser = p.chromium.connect_over_cdp("http://localhost:9222")
    ctx = browser.contexts[0]
    page = ctx.new_page()
    page.set_viewport_size({"width": 1440, "height": 900})
    page.goto("http://localhost:3000/login", wait_until="domcontentloaded")
    page.bring_to_front()
    print("Tab abierta:", page.url)
    print("Title:", page.title())

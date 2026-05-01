/* eslint-disable */
/**
 * Smoke test del dashboard /admin/payhub.
 * Asume frontend en :3000 y backend en :8000 con seeds de pagos demo.
 *   node scripts/e2e-admin-payhub.cjs
 */
const { chromium } = require('playwright');
const path = require('path');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();

  console.log('🌐 GET /admin/payhub (sin login → debería redirigir)');
  await page.goto('http://localhost:3000/admin/payhub', { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(2000);
  console.log('   URL final:', page.url());
  await page.screenshot({ path: path.join(__dirname, '..', 'e2e-screenshots', 'admin-payhub-noauth.png'), fullPage: true });
  console.log('📸 admin-payhub-noauth.png');

  await browser.close();
  console.log('\n✅ E2E básico completado. Para validación con login, usar la sesión de Chromium real.');
})().catch((e) => { console.error(e); process.exit(1); });

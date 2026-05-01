/* eslint-disable */
/**
 * E2E test del nuevo landing pricing + formulario institucional.
 * Usa Playwright (ya instalado vía dependencia indirecta).
 *   node scripts/e2e-pricing-test.cjs
 */
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const FRONTEND_URL = process.env.E2E_FRONTEND_URL || 'http://localhost:3000';
const SCREENSHOTS_DIR = path.join(__dirname, '..', 'e2e-screenshots');

const TIMESTAMP = new Date().toISOString().replace(/[:.]/g, '-');
const TEST_LEAD = {
  name: `E2E Test ${TIMESTAMP}`,
  email: 'francisecuador1+e2e@gmail.com',
  phone: '+593 99 999 9999',
  organization: 'COGNITEX QA Test Firm',
  seats: '20-50',
  message: `Solicitud generada automáticamente por test E2E ${TIMESTAMP}.\n\nVerificar que llegue email y se persista en contact_inquiries.`,
};

const checks = [];
function check(name, ok, detail) {
  checks.push({ name, ok, detail });
  console.log(`${ok ? '✅' : '❌'} ${name}${detail ? ` — ${detail}` : ''}`);
}

(async () => {
  if (!fs.existsSync(SCREENSHOTS_DIR)) fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });

  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    locale: 'es-EC',
  });
  const page = await ctx.newPage();

  // Capturar errores de consola (excluir warnings ruidosos)
  const jsErrors = [];
  page.on('pageerror', (err) => jsErrors.push(err.message));
  page.on('console', (msg) => {
    if (msg.type() === 'error' && !msg.text().includes('favicon')) {
      jsErrors.push(`[console] ${msg.text()}`);
    }
  });

  // Capturar request al backend
  let contactResponseStatus = null;
  let contactResponseBody = null;
  page.on('response', async (resp) => {
    if (resp.url().includes('/api/contact-sales') && resp.request().method() === 'POST') {
      contactResponseStatus = resp.status();
      try {
        contactResponseBody = await resp.json();
      } catch (_e) {
        contactResponseBody = null;
      }
    }
  });

  console.log(`\n🌐 Cargando ${FRONTEND_URL}...\n`);
  await page.goto(FRONTEND_URL, { waitUntil: 'networkidle', timeout: 60000 });

  // ====== TEST 1: Pricing tiers visibles ======
  console.log('\n--- TEST 1: 5 tiers visibles + Institucional ---');
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight / 2));
  await page.waitForTimeout(500);

  // h3 con "Gratis", "Starter", "Pro", "Pro Max", "Studio"
  const tierTitles = await page.$$eval('h3', (els) =>
    els.map((e) => e.textContent?.trim()).filter(Boolean)
  );
  for (const tier of ['Gratis', 'Starter', 'Pro', 'Pro Max', 'Studio']) {
    const found = tierTitles.some((t) => t === tier);
    check(`Tier "${tier}" presente`, found, found ? '' : `tiers vistos: ${tierTitles.join(', ')}`);
  }

  // Institucional card — usar innerText (más estable, ignora <style>/<script>)
  const instText = (await page.evaluate(() => document.body.innerText)) || '';
  const hasInst = instText.toLowerCase().includes('institucional');
  const hasName = instText.includes('Francisco Jacome');
  check(
    'Sección Institucional presente',
    hasInst && hasName,
    `Institucional=${hasInst} FranciscoJacome=${hasName}`
  );
  check('Email francisecuador1@gmail.com visible', instText?.includes('francisecuador1@gmail.com'));
  check('Teléfono +593 98 396 4333 visible', instText?.includes('+593 98 396 4333'));
  check('Empresa COGNITEX visible', instText?.includes('COGNITEX'));

  // Screenshot full page
  await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '01-landing-full.png'), fullPage: true });
  console.log('📸 01-landing-full.png');

  // ====== TEST 2: Botón WhatsApp tiene URL correcta ======
  console.log('\n--- TEST 2: WhatsApp / Tel CTAs ---');
  const wppHref = await page.getAttribute('a[href*="wa.me"]', 'href');
  check('Link WhatsApp existe', !!wppHref, wppHref || 'no encontrado');
  check(
    'Link WhatsApp apunta al número correcto',
    wppHref?.includes('593983964333'),
    wppHref || ''
  );
  const telHref = await page.getAttribute('a[href^="tel:"]', 'href');
  check('Link tel: existe', !!telHref, telHref || '');
  check('Link tel: apunta a +593983964333', telHref === 'tel:+593983964333', telHref || '');

  // ====== TEST 3: Abrir modal de formulario ======
  console.log('\n--- TEST 3: Abrir modal y enviar formulario ---');
  const formButton = page.locator('button:has-text("Enviar formulario por correo")');
  await formButton.scrollIntoViewIfNeeded();
  await formButton.click();
  await page.waitForTimeout(800);

  // Modal abre — verificar
  const modalVisible = await page.locator('text=Solicitar cotización').isVisible();
  check('Modal de formulario se abre', modalVisible);
  await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '02-modal-open.png'), fullPage: false });
  console.log('📸 02-modal-open.png');

  // Llenar form
  await page.fill('input[name="name"]', TEST_LEAD.name);
  await page.fill('input[name="email"]', TEST_LEAD.email);
  await page.fill('input[name="phone"]', TEST_LEAD.phone);
  await page.fill('input[name="organization"]', TEST_LEAD.organization);
  await page.selectOption('select[name="seats"]', TEST_LEAD.seats);
  await page.fill('textarea[name="message"]', TEST_LEAD.message);
  await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '03-modal-filled.png'), fullPage: false });
  console.log('📸 03-modal-filled.png');

  // Submit + esperar respuesta del backend
  await Promise.all([
    page.waitForResponse(
      (r) => r.url().includes('/api/contact-sales') && r.request().method() === 'POST',
      { timeout: 30000 }
    ),
    page.click('button[type="submit"]'),
  ]);
  await page.waitForTimeout(1500);

  check(
    'Backend respondió 200',
    contactResponseStatus === 200,
    `status=${contactResponseStatus} body=${JSON.stringify(contactResponseBody).slice(0, 200)}`
  );
  check(
    'Backend devolvió leadId',
    !!contactResponseBody?.leadId,
    `leadId=${contactResponseBody?.leadId || '(none)'}`
  );

  // Pantalla de confirmación
  const confirmVisible = await page
    .locator('text=¡Solicitud enviada!')
    .isVisible()
    .catch(() => false);
  check('Pantalla de confirmación visible', confirmVisible);
  await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '04-modal-success.png'), fullPage: false });
  console.log('📸 04-modal-success.png');

  // ====== TEST 4: errores JS en consola ======
  console.log('\n--- TEST 4: Sin errores JS críticos ---');
  check('Sin errores JS en consola', jsErrors.length === 0, jsErrors.slice(0, 3).join(' | '));

  // ====== Resumen ======
  console.log('\n========================================================');
  const passed = checks.filter((c) => c.ok).length;
  const failed = checks.filter((c) => !c.ok).length;
  console.log(`📊 RESULTADO: ${passed}/${checks.length} checks aprobados (${failed} fallos)`);
  if (failed > 0) {
    console.log('\nFallos:');
    checks.filter((c) => !c.ok).forEach((c) => console.log(`   ❌ ${c.name}: ${c.detail || ''}`));
  }
  console.log(`\n📸 Screenshots en: ${SCREENSHOTS_DIR}`);
  console.log('========================================================\n');

  await browser.close();
  process.exit(failed > 0 ? 1 : 0);
})().catch((err) => {
  console.error('FATAL:', err);
  process.exit(2);
});

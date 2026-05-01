/* eslint-disable */
/**
 * E2E test del switcher de idioma global.
 *   node scripts/e2e-i18n-test.cjs
 */
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const FRONTEND_URL = process.env.E2E_FRONTEND_URL || 'http://localhost:3000';
const SCREENSHOTS_DIR = path.join(__dirname, '..', 'e2e-screenshots');

const checks = [];
function check(name, ok, detail) {
  checks.push({ name, ok, detail });
  console.log(`${ok ? '✅' : '❌'} ${name}${detail ? ` — ${detail}` : ''}`);
}

(async () => {
  if (!fs.existsSync(SCREENSHOTS_DIR)) fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });

  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, locale: 'es-EC' });
  const page = await ctx.newPage();

  console.log(`\n🌐 Cargando ${FRONTEND_URL}...\n`);
  await page.goto(FRONTEND_URL, { waitUntil: 'networkidle', timeout: 60000 });
  await page.waitForTimeout(800); // dejar que zustand-persist + i18n init terminen

  // ============ TEST 1: Switcher visible ============
  console.log('--- TEST 1: LanguageSwitcher visible ---');
  const switcherCount = await page.locator('button:has-text("ES"), button:has-text("EN")').count();
  check('Botones ES/EN presentes', switcherCount >= 2, `count=${switcherCount}`);

  // ============ TEST 2: Idioma por defecto = ES ============
  console.log('\n--- TEST 2: Idioma por defecto es Español ---');
  let bodyText = await page.evaluate(() => document.body.innerText);
  check('Hero "Sistema de asistencia legal"', bodyText.includes('Sistema de asistencia legal'));
  check('"Características" visible', bodyText.includes('Características'));
  check('"Crear Cuenta" visible', bodyText.includes('Crear Cuenta'));
  check('"Planes diseñados" visible', bodyText.includes('Planes diseñados'));
  check('"MÁS POPULAR" visible', bodyText.includes('MÁS POPULAR'));
  check('"Empezar Pro" visible', bodyText.includes('Empezar Pro'));
  check('Institutional "INSTITUCIONAL" visible', bodyText.includes('INSTITUCIONAL'));

  // <html lang="es">
  const htmlLangEs = await page.getAttribute('html', 'lang');
  check('Atributo <html lang="es">', htmlLangEs === 'es', `lang=${htmlLangEs}`);

  await page.screenshot({ path: path.join(SCREENSHOTS_DIR, 'i18n-01-spanish.png'), fullPage: true });
  console.log('📸 i18n-01-spanish.png');

  // ============ TEST 3: Cambiar a inglés ============
  console.log('\n--- TEST 3: Cambiar a English ---');
  const enButton = page.locator('button:has-text("EN")').first();
  await enButton.click();
  await page.waitForTimeout(800); // re-render + dynamic import

  bodyText = await page.evaluate(() => document.body.innerText);
  check('Hero "AI-powered legal" visible', bodyText.includes('AI-powered legal'));
  check('"Features" visible', bodyText.includes('Features'));
  check('"Create Account" visible', bodyText.includes('Create Account'));
  check('"Plans designed" visible', bodyText.includes('Plans designed'));
  check('"MOST POPULAR" visible', bodyText.includes('MOST POPULAR'));
  check('"Start Pro" visible', bodyText.includes('Start Pro'));
  check('Institutional "INSTITUTIONAL" visible', bodyText.includes('INSTITUTIONAL'));
  check('Texto Spanish desapareció ("MÁS POPULAR" no presente)', !bodyText.includes('MÁS POPULAR'));

  const htmlLangEn = await page.getAttribute('html', 'lang');
  check('Atributo <html lang="en"> después del switch', htmlLangEn === 'en', `lang=${htmlLangEn}`);

  await page.screenshot({ path: path.join(SCREENSHOTS_DIR, 'i18n-02-english.png'), fullPage: true });
  console.log('📸 i18n-02-english.png');

  // ============ TEST 4: Persistencia entre recargas ============
  console.log('\n--- TEST 4: Persistencia tras reload ---');
  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForTimeout(800);
  bodyText = await page.evaluate(() => document.body.innerText);
  check('Persiste inglés tras reload (Features visible)', bodyText.includes('Features'));
  check('No reverte a Características', !bodyText.includes('Características'));

  const htmlLangAfterReload = await page.getAttribute('html', 'lang');
  check('<html lang="en"> persiste tras reload', htmlLangAfterReload === 'en', `lang=${htmlLangAfterReload}`);

  // ============ TEST 5: Volver a español ============
  console.log('\n--- TEST 5: Volver a Español ---');
  const esButton = page.locator('button:has-text("ES")').first();
  await esButton.click();
  await page.waitForTimeout(800);
  bodyText = await page.evaluate(() => document.body.innerText);
  check('Vuelve a "Características"', bodyText.includes('Características'));
  check('"Features" desaparece', !bodyText.includes('Features'));

  // ============ Resumen ============
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

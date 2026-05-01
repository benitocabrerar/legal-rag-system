/* eslint-disable */
/**
 * E2E test extendido: valida que las páginas migradas (login, register, pricing)
 * cambien de idioma correctamente con el switcher global.
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

async function setLocale(page, locale) {
  await page.evaluate((loc) => {
    localStorage.setItem('i18n-storage', JSON.stringify({ state: { locale: loc }, version: 0 }));
  }, locale);
}

async function checkPage(page, url, title, mustContainEs, mustContainEn) {
  console.log(`\n--- ${title} (${url}) ---`);

  // Cargar la página primero (para tener acceso a localStorage)
  await page.goto(`${FRONTEND_URL}${url}`, { waitUntil: 'networkidle', timeout: 60000 });
  await page.waitForTimeout(500);

  // Force ES y recargar
  await setLocale(page, 'es');
  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForTimeout(800);
  let body = await page.evaluate(() => document.body.innerText);
  for (const phrase of mustContainEs) {
    check(`[ES] "${phrase}" presente en ${url}`, body.includes(phrase));
  }

  // Switch to EN via switcher button
  const enButton = page.locator('button:has-text("EN")').first();
  await enButton.click();
  await page.waitForTimeout(800);
  body = await page.evaluate(() => document.body.innerText);
  for (const phrase of mustContainEn) {
    check(`[EN] "${phrase}" presente en ${url}`, body.includes(phrase));
  }
}

(async () => {
  if (!fs.existsSync(SCREENSHOTS_DIR)) fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });

  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, locale: 'es-EC' });
  const page = await ctx.newPage();

  // /login
  await checkPage(page, '/login', 'Login page',
    ['Iniciar sesión', 'Correo electrónico', 'Contraseña'],
    ['Sign in', 'Email', 'Password']
  );
  await page.screenshot({ path: path.join(SCREENSHOTS_DIR, 'i18n-login-en.png'), fullPage: true });

  // /register
  await checkPage(page, '/register', 'Register page',
    ['Crear cuenta', 'Nombre completo', 'Confirmar contraseña'],
    ['Create account', 'Full name', 'Confirm password']
  );
  await page.screenshot({ path: path.join(SCREENSHOTS_DIR, 'i18n-register-en.png'), fullPage: true });

  // /pricing — necesita login, pero la página renderiza fallback si no hay
  await checkPage(page, '/pricing', 'Pricing page',
    ['Planes de Suscripción', 'Volver al Dashboard', 'Mensual', 'Anual'],
    ['Subscription Plans', 'Back to Dashboard', 'Monthly', 'Annual']
  );
  await page.screenshot({ path: path.join(SCREENSHOTS_DIR, 'i18n-pricing-en.png'), fullPage: true });

  // Resumen
  console.log('\n========================================================');
  const passed = checks.filter((c) => c.ok).length;
  const failed = checks.filter((c) => !c.ok).length;
  console.log(`📊 RESULTADO: ${passed}/${checks.length} checks aprobados (${failed} fallos)`);
  if (failed > 0) {
    console.log('\nFallos:');
    checks.filter((c) => !c.ok).forEach((c) => console.log(`   ❌ ${c.name}`));
  }
  console.log(`\n📸 Screenshots en: ${SCREENSHOTS_DIR}`);
  console.log('========================================================\n');

  await browser.close();
  process.exit(failed > 0 ? 1 : 0);
})().catch((err) => {
  console.error('FATAL:', err);
  process.exit(2);
});

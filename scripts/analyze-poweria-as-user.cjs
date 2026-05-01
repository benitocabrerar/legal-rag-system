/* eslint-disable */
/**
 * Login en Poweria + walkthrough completo con Playwright.
 * Sesión persistente: la 1ª vez te logueás manualmente, después la reusa.
 *
 *   node scripts/analyze-poweria-as-user.cjs
 */
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const BASE = 'http://localhost:3000';
const PROFILE_DIR = path.join(__dirname, '..', '.poweria-session');
const STATE_FILE = path.join(PROFILE_DIR, 'state.json');
const SCREENSHOTS = path.join(__dirname, '..', 'e2e-screenshots', 'poweria-walkthrough');

const TARGETS = [
  { url: '/dashboard',         label: '01-dashboard' },
  { url: '/pricing',           label: '02-pricing' },
  { url: '/account/billing',   label: '03-billing' },
  { url: '/admin/payhub',      label: '04-admin-payhub' },
  { url: '/dashboard/settings', label: '05-settings' },
];

(async () => {
  fs.mkdirSync(PROFILE_DIR, { recursive: true });
  fs.mkdirSync(SCREENSHOTS, { recursive: true });

  console.log('🚀 Lanzando Chromium headed (visible)…');
  const browser = await chromium.launch({
    headless: false,
    args: ['--start-maximized', '--disable-blink-features=AutomationControlled'],
  });
  const ctx = await browser.newContext({
    viewport: null,
    locale: 'es-EC',
    storageState: fs.existsSync(STATE_FILE) ? STATE_FILE : undefined,
  });
  const page = await ctx.newPage();

  // Capturar errores
  const consoleErrors = [];
  const networkErrors = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error' && !msg.text().includes('favicon')) {
      consoleErrors.push({ url: page.url(), msg: msg.text().slice(0, 240) });
    }
  });
  page.on('response', (resp) => {
    if (resp.status() >= 400 && !/favicon|hot-update|_next\/static/.test(resp.url())) {
      networkErrors.push({ url: resp.url(), status: resp.status(), pageUrl: page.url() });
    }
  });

  // 1) Login
  console.log('\n📍 Navegando a /login…');
  await page.goto(`${BASE}/login`, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForTimeout(1500);

  const isOnDashboard = () => page.url().includes('/dashboard');
  if (!isOnDashboard()) {
    console.log('🔐 ════════════════════════════════════════════════════════════');
    console.log('   Ingresá tu correo + contraseña en la ventana de Chromium.');
    console.log('   (También podés usar "Continuar con Google".)');
    console.log('   Esperando hasta 5 min a que aterrices en /dashboard…');
    console.log('   ════════════════════════════════════════════════════════════');

    await page.waitForFunction(
      () => window.location.pathname.startsWith('/dashboard'),
      { timeout: 5 * 60_000 }
    ).catch(() => {});

    if (isOnDashboard()) {
      console.log('✅ Login detectado.');
      await ctx.storageState({ path: STATE_FILE });
      console.log(`💾 Sesión guardada (${STATE_FILE})`);
    } else {
      console.error('❌ Timeout esperando login.');
      await browser.close();
      process.exit(2);
    }
  } else {
    console.log('✅ Sesión previa válida — saltando login.');
  }

  // 2) Walkthrough de pantallas
  console.log('\n📸 Walkthrough de pantallas:');
  const findings = [];

  for (const t of TARGETS) {
    console.log(`\n   → ${t.url}`);
    const errBefore = consoleErrors.length;
    const netErrBefore = networkErrors.length;
    await page.goto(`${BASE}${t.url}`, { waitUntil: 'networkidle', timeout: 60000 }).catch(() => {});
    await page.waitForTimeout(2200);
    const finalUrl = page.url();
    const screenshotPath = path.join(SCREENSHOTS, `${t.label}.png`);
    await page.screenshot({ path: screenshotPath, fullPage: true });
    const newConsole = consoleErrors.slice(errBefore);
    const newNet = networkErrors.slice(netErrBefore);
    findings.push({
      target: t.url,
      finalUrl,
      screenshot: path.relative(path.join(__dirname, '..'), screenshotPath),
      consoleErrors: newConsole,
      networkErrors: newNet,
    });
    console.log(`     URL final: ${finalUrl}`);
    console.log(`     console.error: ${newConsole.length}, network ≥4xx: ${newNet.length}`);
    console.log(`     📸 ${screenshotPath}`);
  }

  // 3) Inspección rápida del dashboard (estado del usuario)
  console.log('\n🔎 Inspección rápida (dashboard):');
  await page.goto(`${BASE}/dashboard`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1500);

  const userInfo = await page.evaluate(() => {
    try {
      const tok = localStorage.getItem('token');
      const userRaw = localStorage.getItem('user');
      const user = userRaw ? JSON.parse(userRaw) : null;
      return { hasToken: !!tok, user };
    } catch (_e) {
      return { hasToken: false, user: null };
    }
  });
  console.log('   user (localStorage):', JSON.stringify(userInfo, null, 2));

  // 4) Reporte
  const report = {
    base: BASE,
    runAt: new Date().toISOString(),
    user: userInfo,
    targets: findings,
    summary: {
      console_errors_total: consoleErrors.length,
      network_4xx_5xx_total: networkErrors.length,
    },
  };
  const reportPath = path.join(SCREENSHOTS, 'report.json');
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2), 'utf8');
  console.log(`\n💾 Reporte JSON: ${reportPath}`);

  // Imprimir resumen final
  console.log('\n========================================================');
  console.log('📊 RESUMEN');
  console.log('========================================================');
  console.log(`   Pantallas visitadas: ${findings.length}`);
  console.log(`   Errores console:     ${consoleErrors.length}`);
  console.log(`   Errores network:     ${networkErrors.length}`);
  if (consoleErrors.length > 0) {
    console.log('\nERRORES CONSOLE (top 10):');
    consoleErrors.slice(0, 10).forEach((e, i) => console.log(`   [${i + 1}] ${e.msg}`));
  }
  if (networkErrors.length > 0) {
    console.log('\nERRORES NETWORK (top 15):');
    networkErrors.slice(0, 15).forEach((e, i) =>
      console.log(`   [${i + 1}] ${e.status} ${e.url.slice(0, 100)}`)
    );
  }

  console.log('\n✅ Análisis completo. Cerrá la ventana cuando quieras.');
  console.log('   (El navegador queda 60s abierto para que veas)');
  await page.waitForTimeout(60_000);
  await browser.close();
})().catch((err) => {
  console.error('FATAL:', err.message);
  process.exit(1);
});

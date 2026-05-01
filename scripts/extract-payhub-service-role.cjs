/* eslint-disable */
/**
 * Extrae el service_role key del proyecto payhub desde el dashboard de Supabase
 * usando Playwright. Sesión persistente en .chrome-cdp-profile/ → solo logueas
 * la primera vez.
 *
 *   node scripts/extract-payhub-service-role.cjs
 */
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const PROJECT_REF = 'ufklwvhgueejtlzwzzhi';
const API_URL = `https://supabase.com/dashboard/project/${PROJECT_REF}/settings/api-keys`;
const API_URL_LEGACY = `https://supabase.com/dashboard/project/${PROJECT_REF}/settings/api`;
const PROFILE_DIR = path.join(__dirname, '..', '.chrome-cdp-profile');
const ENV_FILE = path.join(__dirname, '..', '.env');

(async () => {
  if (!fs.existsSync(PROFILE_DIR)) fs.mkdirSync(PROFILE_DIR, { recursive: true });

  console.log('🚀 Lanzando Chromium (headed, non-persistent)...');

  const browser = await chromium.launch({
    headless: false,
    args: ['--disable-blink-features=AutomationControlled', '--start-maximized'],
  });
  const ctx = await browser.newContext({
    viewport: null,
    storageState: fs.existsSync(path.join(PROFILE_DIR, 'state.json'))
      ? path.join(PROFILE_DIR, 'state.json')
      : undefined,
  });
  const page = await ctx.newPage();

  // Intentar URL nueva primero, fallback a legacy
  console.log(`📍 Navegando a ${API_URL}`);
  await page.goto(API_URL, { waitUntil: 'domcontentloaded', timeout: 60000 });

  // Detectar login: el redirect de Supabase preserva el query "next" pero la
  // URL final es /dashboard/sign-in. Detectamos por URL Y por presencia de
  // form de login.
  await page.waitForTimeout(2000);  // dejar que se completen redirects
  const isLoginPage = async () => {
    const u = page.url();
    if (/sign-?in|login|auth/i.test(u)) return true;
    // Detectar por DOM
    const hasSignInForm = await page.locator('text=/Welcome back|Sign in to your account/i').first().isVisible().catch(() => false);
    return hasSignInForm;
  };

  if (await isLoginPage()) {
    console.log('');
    console.log('🔐 ════════════════════════════════════════════════════════════');
    console.log('   NECESITO QUE TE LOGUEES EN LA VENTANA DE PLAYWRIGHT QUE ABRÍ');
    console.log('   ════════════════════════════════════════════════════════════');
    console.log('   (Es un Chromium nuevo, separado de tu Chrome normal)');
    console.log('   Url actual: ' + page.url());
    console.log('   Esperando hasta 5 min a que aterrices en /project/' + PROJECT_REF + '/...');
    console.log('');
    await page.waitForFunction(
      (ref) => window.location.pathname.includes(`/project/${ref}`)
              && !/sign-?in|login|auth/i.test(window.location.pathname),
      PROJECT_REF,
      { timeout: 5 * 60_000 }
    ).catch(() => {});
    const stillLogin = await isLoginPage();
    if (!stillLogin) {
      console.log('✅ Login detectado, continuando...');
      try {
        await ctx.storageState({ path: path.join(PROFILE_DIR, 'state.json') });
        console.log('💾 Sesión guardada (storageState) para futuras corridas.');
      } catch (_e) {}
    } else {
      console.error('❌ Timeout esperando login. Saliendo.');
      await browser.close();
      process.exit(4);
    }
  }

  // Asegurar que estemos en la página correcta de API keys
  if (!/api[\-_]?keys?/i.test(page.url())) {
    console.log('📍 Navegando a página de API keys...');
    await page.goto(API_URL, { waitUntil: 'domcontentloaded', timeout: 60000 });
  }
  await page.waitForTimeout(4000);

  // Hacer click en el tab "Legacy anon, service_role API keys"
  console.log('📑 Cambiando a tab "Legacy anon, service_role API keys"...');
  try {
    const legacyTab = page.locator('text=/Legacy.*service[_ ]?role/i').first();
    await legacyTab.click({ timeout: 5000 });
    await page.waitForTimeout(2500);
  } catch (e) {
    console.log('   (tab no encontrado, asumiendo UI antigua)');
  }

  // Click en cualquier botón "Reveal" visible
  console.log('👁️  Revelando service_role key...');
  const revealButtons = await page.locator('button:has-text("Reveal")').all();
  for (const b of revealButtons) {
    try { await b.click({ timeout: 1500 }); await page.waitForTimeout(300); } catch (_e) {}
  }
  await page.waitForTimeout(1000);
  // Tomar screenshot final para depurar si falla
  await page.screenshot({ path: path.join(__dirname, '..', 'e2e-screenshots', 'payhub-after-reveal.png'), fullPage: true });

  // Buscar botón "Reveal" / "Show" del service_role + extraer
  console.log('🔍 Buscando service_role key en la página...');

  // Strategy 1: nueva UI con tabs Service Keys
  const candidates = [
    'button:has-text("Reveal")',
    'button:has-text("Show")',
    'button[aria-label*="Reveal"]',
    'button[aria-label*="Show"]',
    'button:has-text("service_role")',
  ];

  let serviceKey = null;

  // Recorrer botones Reveal y matchear el contenedor que diga "service_role"
  const allButtons = await page.locator('button').all();
  for (const btn of allButtons) {
    const txt = await btn.textContent().catch(() => '');
    if (!txt) continue;
    if (/reveal|show/i.test(txt)) {
      // mirar contenedor cercano
      const container = await btn.evaluateHandle((el) => {
        let cur = el;
        for (let i = 0; i < 6; i++) {
          if (!cur.parentElement) break;
          cur = cur.parentElement;
          if (/service[_\s]?role|secret/i.test(cur.textContent || '')) return cur;
        }
        return null;
      });
      const containerText = await container.evaluate?.((el) => el ? el.textContent : '').catch(() => '');
      if (containerText && /service[_\s]?role|secret/i.test(containerText)) {
        await btn.click().catch(() => {});
        await page.waitForTimeout(800);
      }
    }
  }

  // Buscar el JWT pattern (eyJ...) cuyo payload tenga role=service_role
  serviceKey = await page.evaluate(() => {
    const jwtRe = /eyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}/;
    const candidates = new Set();
    // Recopilar todos los JWT visibles en la página
    const allEls = Array.from(document.querySelectorAll('input, textarea, code, span, div, pre'));
    for (const el of allEls) {
      const text = (el.value || '') || (el.textContent || '');
      const m = text.match(jwtRe);
      if (m) candidates.add(m[0]);
    }
    // Decodificar payload de cada candidato y elegir el que tenga role=service_role
    for (const tok of candidates) {
      try {
        const payload = JSON.parse(atob(tok.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
        if (payload.role === 'service_role') return tok;
      } catch (_e) {}
    }
    return null;
  });

  if (!serviceKey) {
    console.log('⚠️  No se pudo extraer automáticamente. Tomando screenshot para revisar...');
    await page.screenshot({ path: path.join(__dirname, '..', 'e2e-screenshots', 'payhub-api-page.png'), fullPage: true });
    console.log('📸 e2e-screenshots/payhub-api-page.png');
    console.log('\n👆 Si ves el service_role en pantalla, copialo manualmente al .env (PAYHUB_SUPABASE_SERVICE_ROLE_KEY).');
    console.log('   El navegador queda abierto 30s para que veas la página.');
    await page.waitForTimeout(30000);
    await ctx.close();
    process.exit(2);
  }

  console.log(`✅ service_role extraído: ${serviceKey.slice(0, 30)}...${serviceKey.slice(-10)}`);

  // Validar payload del JWT (debe decir "role":"service_role")
  try {
    const payload = JSON.parse(Buffer.from(serviceKey.split('.')[1], 'base64').toString('utf8'));
    if (payload.role !== 'service_role') {
      console.error(`❌ El JWT extraído tiene role="${payload.role}", esperaba "service_role"`);
      await ctx.close();
      process.exit(3);
    }
    if (payload.ref !== PROJECT_REF) {
      console.error(`❌ El JWT es del proyecto "${payload.ref}", esperaba "${PROJECT_REF}"`);
      await ctx.close();
      process.exit(3);
    }
    console.log('✅ JWT válido (role=service_role, ref=' + payload.ref + ')');
  } catch (err) {
    console.error('⚠️  No pude parsear el JWT, continuando de todos modos:', err.message);
  }

  // Escribir al .env
  let env = fs.readFileSync(ENV_FILE, 'utf8');
  if (/^PAYHUB_SUPABASE_SERVICE_ROLE_KEY=/m.test(env)) {
    env = env.replace(/^PAYHUB_SUPABASE_SERVICE_ROLE_KEY=.*$/m, `PAYHUB_SUPABASE_SERVICE_ROLE_KEY=${serviceKey}`);
  } else {
    env += `\nPAYHUB_SUPABASE_SERVICE_ROLE_KEY=${serviceKey}\n`;
  }
  fs.writeFileSync(ENV_FILE, env, 'utf8');
  console.log(`💾 Escrito en ${ENV_FILE}`);

  // Save session for future runs
  try {
    await ctx.storageState({ path: path.join(PROFILE_DIR, 'state.json') });
  } catch (_e) {}
  await ctx.close();
  await browser.close();
  console.log('\n✅ Listo. Reiniciá el backend de Poweria para que cargue la nueva env var.');
})().catch((err) => {
  console.error('❌ FATAL:', err.message);
  process.exit(1);
});

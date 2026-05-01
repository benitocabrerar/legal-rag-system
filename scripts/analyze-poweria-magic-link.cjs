/* eslint-disable */
/**
 * Login automático en Poweria usando Supabase Admin API → magic link →
 * Playwright. NO requiere contraseña; usa service_role para emitir el link.
 *
 *   node --env-file=.env scripts/analyze-poweria-magic-link.cjs
 */
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const USER_EMAIL = process.env.POWERIA_TEST_EMAIL || 'benitocabrerar@gmail.com';
const FRONTEND = 'http://localhost:3000';
const SCREENSHOTS = path.join(__dirname, '..', 'e2e-screenshots', 'poweria-walkthrough');
fs.mkdirSync(SCREENSHOTS, { recursive: true });

const TARGETS = [
  { url: '/dashboard',         label: '01-dashboard' },
  { url: '/pricing',           label: '02-pricing' },
  { url: '/account/billing',   label: '03-billing' },
  { url: '/admin/payhub',      label: '04-admin-payhub' },
  { url: '/dashboard/settings', label: '05-settings' },
];

async function generateMagicLink() {
  if (!SUPABASE_URL || !SERVICE_KEY) {
    throw new Error('SUPABASE_URL/SUPABASE_SERVICE_ROLE_KEY no configurados');
  }
  const res = await fetch(`${SUPABASE_URL}/auth/v1/admin/generate_link`, {
    method: 'POST',
    headers: {
      apikey: SERVICE_KEY,
      Authorization: `Bearer ${SERVICE_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      type: 'magiclink',
      email: USER_EMAIL,
      options: { redirect_to: `${FRONTEND}/dashboard` },
    }),
  });
  if (!res.ok) {
    throw new Error(`generate_link ${res.status}: ${await res.text()}`);
  }
  const data = await res.json();
  return data.action_link || (data.properties && data.properties.action_link);
}

(async () => {
  console.log(`🔑 Generando magic link admin para ${USER_EMAIL}…`);
  const actionLink = await generateMagicLink();
  if (!actionLink) throw new Error('No se obtuvo action_link');
  console.log(`✅ Link emitido (1 uso, expira pronto): ${actionLink.slice(0, 90)}…\n`);

  console.log('🚀 Lanzando Chromium headed…');
  const browser = await chromium.launch({
    headless: false,
    args: ['--start-maximized', '--disable-blink-features=AutomationControlled'],
  });
  const ctx = await browser.newContext({ viewport: null, locale: 'es-EC' });
  const page = await ctx.newPage();

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

  // 1) Consumir el magic link
  console.log('📍 Abriendo magic link…');
  await page.goto(actionLink, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForTimeout(4000);

  // 2) Capturar tokens del fragment
  const tokens = await page.evaluate(() => {
    const hash = window.location.hash.startsWith('#') ? window.location.hash.slice(1) : window.location.hash;
    const p = new URLSearchParams(hash);
    return {
      access_token: p.get('access_token'),
      refresh_token: p.get('refresh_token'),
      expires_in: parseInt(p.get('expires_in') || '3600', 10),
    };
  });
  if (!tokens.access_token) throw new Error('No access_token en el fragment del magic link');

  // 3) Decodificar payload del JWT
  const payload = JSON.parse(Buffer.from(tokens.access_token.split('.')[1], 'base64').toString('utf8'));
  const projectRef = SUPABASE_URL.match(/https:\/\/([^.]+)\.supabase\.co/)?.[1];

  // 4) Construir el objeto de sesión que espera @supabase/ssr
  const session = {
    access_token: tokens.access_token,
    refresh_token: tokens.refresh_token,
    expires_in: tokens.expires_in,
    expires_at: Math.floor(Date.now() / 1000) + tokens.expires_in,
    token_type: 'bearer',
    user: payload,
  };

  // 5) Setear cookies en formato @supabase/ssr (chunked base64)
  const cookieName = `sb-${projectRef}-auth-token`;
  const cookieValue = 'base64-' + Buffer.from(JSON.stringify(session)).toString('base64');

  // Si el valor es > 4096 chars, hay que dividir en cookies .0 .1 …
  const MAX = 3500;
  const cookies = [];
  if (cookieValue.length <= MAX) {
    cookies.push({ name: cookieName, value: cookieValue, domain: 'localhost', path: '/', httpOnly: false, sameSite: 'Lax' });
  } else {
    for (let i = 0; i * MAX < cookieValue.length; i++) {
      cookies.push({
        name: `${cookieName}.${i}`,
        value: cookieValue.slice(i * MAX, (i + 1) * MAX),
        domain: 'localhost', path: '/', httpOnly: false, sameSite: 'Lax',
      });
    }
  }
  await ctx.addCookies(cookies);
  console.log(`🍪 ${cookies.length} cookie(s) Supabase inyectada(s).`);

  // 6) Inyectar también en localStorage por si algún componente lo usa
  await page.evaluate(({ ref, sess }) => {
    localStorage.setItem(`sb-${ref}-auth-token`, JSON.stringify(sess));
    localStorage.setItem('token', sess.access_token);
    localStorage.setItem('user', JSON.stringify({
      id: sess.user.sub,
      email: sess.user.email,
      name: sess.user.user_metadata?.full_name || sess.user.user_metadata?.name || 'User',
      role: sess.user.user_role || sess.user.legacy_role || 'authenticated',
    }));
  }, { ref: projectRef, sess: session });

  console.log(`✅ Sesión inyectada · ${payload.email} · role=${payload.user_role || payload.legacy_role}`);

  // 7) Navegar a /dashboard con la sesión activa
  await page.goto(`${FRONTEND}/dashboard`, { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(3000);

  if (page.url().includes('/login')) {
    console.error('❌ Aún redirige a /login. URL:', page.url());
    console.error('   Tomando screenshot de debug…');
    await page.screenshot({ path: path.join(SCREENSHOTS, '00-login-fail.png'), fullPage: true });
    await browser.close();
    process.exit(3);
  }
  console.log('✅ Dashboard cargado:', page.url());

  // 2) Walkthrough
  console.log('\n📸 Walkthrough:');
  const findings = [];
  for (const t of TARGETS) {
    console.log(`\n   → ${t.url}`);
    const eb = consoleErrors.length;
    const nb = networkErrors.length;
    await page.goto(`${FRONTEND}${t.url}`, { waitUntil: 'networkidle', timeout: 60000 }).catch(() => {});
    await page.waitForTimeout(2500);
    const finalUrl = page.url();
    const ssp = path.join(SCREENSHOTS, `${t.label}.png`);
    await page.screenshot({ path: ssp, fullPage: true });
    const newC = consoleErrors.slice(eb);
    const newN = networkErrors.slice(nb);
    findings.push({ target: t.url, finalUrl, screenshot: ssp, consoleErrors: newC, networkErrors: newN });
    console.log(`     finalUrl: ${finalUrl}`);
    console.log(`     console.error: ${newC.length}, network ≥4xx: ${newN.length}`);
  }

  // 3) localStorage / role inspection
  const userInfo = await page.evaluate(() => {
    try {
      const tok = localStorage.getItem('token');
      const userRaw = localStorage.getItem('user');
      const user = userRaw ? JSON.parse(userRaw) : null;
      return { hasToken: !!tok, user };
    } catch { return { hasToken: false, user: null }; }
  });
  console.log('\n🔎 user (localStorage):', JSON.stringify(userInfo, null, 2));

  // 4) Reporte
  const report = {
    user_email: USER_EMAIL,
    runAt: new Date().toISOString(),
    user: userInfo,
    targets: findings.map(f => ({ ...f, screenshot: path.relative(path.join(__dirname, '..'), f.screenshot) })),
    summary: {
      console_errors: consoleErrors.length,
      network_errors: networkErrors.length,
    },
  };
  const reportPath = path.join(SCREENSHOTS, 'report.json');
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2), 'utf8');
  console.log(`\n💾 Reporte: ${reportPath}`);

  console.log('\n========================================================');
  console.log('📊 RESUMEN');
  console.log('========================================================');
  console.log(`   Pantallas: ${findings.length}`);
  console.log(`   Console errors: ${consoleErrors.length}`);
  console.log(`   Network 4xx/5xx: ${networkErrors.length}`);
  if (consoleErrors.length > 0) {
    console.log('\n❌ CONSOLE ERRORS (top 10):');
    [...new Set(consoleErrors.map(e => e.msg))].slice(0, 10).forEach((m, i) => console.log(`   [${i+1}] ${m}`));
  }
  if (networkErrors.length > 0) {
    console.log('\n❌ NETWORK ≥4xx (top 15):');
    networkErrors.slice(0, 15).forEach((e, i) => console.log(`   [${i+1}] ${e.status} ${e.url.slice(0, 100)} (en ${e.pageUrl.replace(FRONTEND,'')})`));
  }

  await browser.close();
  console.log('\n✅ Análisis cerrado.');
})().catch((err) => {
  console.error('FATAL:', err.message);
  process.exit(1);
});

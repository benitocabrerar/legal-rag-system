/* eslint-disable */
/**
 * Tour guiado de Poweria con login automático.
 * Login vía magic link admin de Supabase → recorrido por las 5 pantallas
 * con pausas de 6s para que veas cada una → deja el navegador abierto.
 *
 *   node --env-file=.env scripts/poweria-tour.cjs
 *
 * Cierra la ventana de Chromium cuando termines.
 */
const { chromium } = require('playwright');
const path = require('path');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const USER_EMAIL = process.env.POWERIA_TEST_EMAIL || 'benitocabrerar@gmail.com';
const FRONTEND = 'http://localhost:3000';

const TOUR = [
  { url: '/dashboard',         title: '🏠 Dashboard · panel de control' },
  { url: '/pricing',           title: '💳 Pricing · planes desde el Hub (features traducidos)' },
  { url: '/account/billing',   title: '🧾 Billing · plan actual desde JWT + historial Hub' },
  { url: '/admin/payhub',      title: '🏦 Payments Hub Admin · MRR ya no dice Próximamente' },
  { url: '/dashboard/settings',title: '⚙️ Settings · País + Datos abogado + 2FA' },
];

async function generateMagicLink() {
  const res = await fetch(`${SUPABASE_URL}/auth/v1/admin/generate_link`, {
    method: 'POST',
    headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ type: 'magiclink', email: USER_EMAIL, options: { redirect_to: `${FRONTEND}/dashboard` } }),
  });
  if (!res.ok) throw new Error(`generate_link ${res.status}: ${await res.text()}`);
  const data = await res.json();
  return data.action_link || data.properties?.action_link;
}

(async () => {
  console.log('\n🎬 ════════════════════════════════════════════════════');
  console.log('   TOUR DE POWERIA · LOGIN AUTOMÁTICO + WALKTHROUGH');
  console.log('════════════════════════════════════════════════════════\n');

  console.log(`🔑 Generando magic link para ${USER_EMAIL}…`);
  const link = await generateMagicLink();
  console.log('✅ Link generado.\n');

  console.log('🚀 Abriendo Chromium (visible · maximizado)…');
  const browser = await chromium.launch({
    headless: false,
    args: ['--start-maximized', '--disable-blink-features=AutomationControlled'],
  });
  const ctx = await browser.newContext({ viewport: null, locale: 'es-EC' });
  const page = await ctx.newPage();

  // Consumir magic link
  await page.goto(link, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForTimeout(3500);

  // Capturar tokens del fragment + inyectar como cookies @supabase/ssr
  const tokens = await page.evaluate(() => {
    const p = new URLSearchParams((window.location.hash || '').slice(1));
    return {
      access_token: p.get('access_token'),
      refresh_token: p.get('refresh_token'),
      expires_in: parseInt(p.get('expires_in') || '3600', 10),
    };
  });
  if (!tokens.access_token) throw new Error('No access_token');

  const payload = JSON.parse(Buffer.from(tokens.access_token.split('.')[1], 'base64').toString('utf8'));
  const ref = SUPABASE_URL.match(/https:\/\/([^.]+)\.supabase\.co/)?.[1];
  const session = {
    access_token: tokens.access_token,
    refresh_token: tokens.refresh_token,
    expires_in: tokens.expires_in,
    expires_at: Math.floor(Date.now() / 1000) + tokens.expires_in,
    token_type: 'bearer',
    user: payload,
  };
  const cookieValue = 'base64-' + Buffer.from(JSON.stringify(session)).toString('base64');
  const MAX = 3500;
  const cookies = [];
  if (cookieValue.length <= MAX) {
    cookies.push({ name: `sb-${ref}-auth-token`, value: cookieValue, domain: 'localhost', path: '/', httpOnly: false, sameSite: 'Lax' });
  } else {
    for (let i = 0; i * MAX < cookieValue.length; i++) {
      cookies.push({
        name: `sb-${ref}-auth-token.${i}`,
        value: cookieValue.slice(i * MAX, (i + 1) * MAX),
        domain: 'localhost', path: '/', httpOnly: false, sameSite: 'Lax',
      });
    }
  }
  await ctx.addCookies(cookies);

  await page.evaluate(({ ref, sess }) => {
    localStorage.setItem(`sb-${ref}-auth-token`, JSON.stringify(sess));
    localStorage.setItem('token', sess.access_token);
    localStorage.setItem('user', JSON.stringify({
      id: sess.user.sub,
      email: sess.user.email,
      name: sess.user.user_metadata?.full_name || 'User',
      role: sess.user.user_role || sess.user.legacy_role || 'authenticated',
      plan_tier: sess.user.plan_tier || sess.user.legacy_plan_tier,
    }));
  }, { ref, sess: session });

  console.log(`✅ Sesión activa · ${payload.email} · ${payload.user_role || payload.legacy_role}\n`);

  // Tour guiado
  console.log('🎬 Iniciando tour. Mirá la ventana del navegador…\n');

  for (const stop of TOUR) {
    console.log(`   👉 ${stop.title}`);
    await page.goto(`${FRONTEND}${stop.url}`, { waitUntil: 'networkidle', timeout: 45000 }).catch(() => {});
    await page.waitForTimeout(6000); // 6 seg para que el usuario vea
  }

  // Volver a /dashboard y dejar abierto
  console.log('\n   🔚 Volviendo a /dashboard. La ventana queda abierta.');
  await page.goto(`${FRONTEND}/dashboard`, { waitUntil: 'networkidle' });

  console.log('\n════════════════════════════════════════════════════════');
  console.log('  ✅ Tour completado · sesión activa');
  console.log('  📍 Estás en /dashboard como benitocabrerar@gmail.com');
  console.log('  🖱️  Podés navegar libremente. Cerrá la ventana cuando');
  console.log('      termines (el script seguirá vivo hasta entonces).');
  console.log('════════════════════════════════════════════════════════\n');

  // Mantener abierto: esperar hasta que el usuario cierre
  await new Promise((resolve) => {
    const interval = setInterval(async () => {
      try {
        if (browser.contexts().length === 0) {
          clearInterval(interval);
          resolve();
        } else {
          // Verificar si la página sigue viva
          await page.title().catch(() => {
            clearInterval(interval);
            resolve();
          });
        }
      } catch { clearInterval(interval); resolve(); }
    }, 3000);
  });

  console.log('🛑 Ventana cerrada. Saliendo del script.');
  await browser.close().catch(() => {});
})().catch((err) => {
  console.error('FATAL:', err.message);
  process.exit(1);
});

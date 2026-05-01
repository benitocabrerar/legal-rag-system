/**
 * Smoke-test de rutas autenticadas con JWT Supabase.
 * 1. Login → recibe access_token
 * 2. GET a una lista de rutas representativas
 * 3. Reporta status code de cada una
 */
require('dotenv').config();

const BASE = 'http://localhost:8000/api/v1';
const ROUTES = [
  ['GET', '/auth/supabase/me'],
  ['GET', '/cases'],
  ['GET', '/legal-documents'],
  ['GET', '/tasks'],
  ['GET', '/notifications/logs'],
  ['GET', '/finance/invoices'],
  ['GET', '/calendar/events'],
  ['GET', '/admin/users'],
  ['GET', '/billing/invoices'],
  ['GET', '/auth/2fa/status'],
];

(async () => {
  const url = process.env.SUPABASE_URL;
  const anon = process.env.SUPABASE_ANON_KEY;
  const r = await fetch(`${url}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers: { apikey: anon, 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'benitocabrerar@gmail.com', password: 'Temporal2026!' }),
  });
  const d = await r.json();
  if (!r.ok) { console.error('Login failed:', d); process.exit(1); }
  const tok = d.access_token;
  console.log(`Login OK · user=${d.user.email} role=admin\n`);

  console.log(`${'Route'.padEnd(40)} ${'Status'.padEnd(8)} Notes`);
  console.log('-'.repeat(80));

  let ok = 0, fail = 0, notFound = 0;
  for (const [method, path] of ROUTES) {
    try {
      const res = await fetch(`${BASE}${path}`, {
        method,
        headers: { Authorization: `Bearer ${tok}` },
      });
      const status = res.status;
      let notes = '';
      if (status === 200) { ok++; }
      else if (status === 404) { notFound++; notes = 'route may not exist (skip)'; }
      else if (status === 401) { fail++; notes = 'AUTH FAILED'; }
      else if (status === 403) { fail++; notes = 'forbidden (role?)'; }
      else if (status >= 500) { fail++; notes = 'server error'; const t = await res.text(); notes += ' ' + t.slice(0, 80); }
      else { notes = '(non-200, non-404, see body)'; const t = await res.text(); notes += ' ' + t.slice(0, 60); }
      console.log(`${(method+' '+path).padEnd(40)} ${String(status).padEnd(8)} ${notes}`);
    } catch (e) {
      fail++;
      console.log(`${(method+' '+path).padEnd(40)} ERR      ${e.message}`);
    }
  }

  console.log('\n--- Summary ---');
  console.log(`OK (200):   ${ok}`);
  console.log(`Not found:  ${notFound}`);
  console.log(`Failed:     ${fail}`);
  process.exit(fail > 0 ? 1 : 0);
})().catch(e => { console.error('FATAL', e); process.exit(1); });

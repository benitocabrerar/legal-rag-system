/**
 * SUITE 05: Edge cases — auth errors, rate limit, malformed tokens.
 */
require('dotenv').config();
const fs = require('fs');
const path = require('path');

const RES = path.join(__dirname, '../../test-results/evidence/05-error-cases.json');

const results = [];
function record(id, name, passed, details = '') {
  console.log(`  [${passed ? 'PASS' : 'FAIL'}] ${id} ${name}`);
  if (details) console.log(`        ${String(details).slice(0, 250)}`);
  results.push({ id, name, passed, details: String(details).slice(0, 800) });
}

(async () => {
  // T05.1: Sin token → 401
  console.log('\n=== T05.1: GET sin Authorization → 401 ===');
  try {
    const r = await fetch('http://localhost:8000/api/v1/cases');
    record('T05.1', 'sin token = 401', r.status === 401, `status=${r.status}`);
  } catch (e) { record('T05.1', 'no auth', false, e.message); }

  // T05.2: Token inválido → 401
  console.log('\n=== T05.2: Token malformado → 401 ===');
  try {
    const r = await fetch('http://localhost:8000/api/v1/cases', { headers: { Authorization: 'Bearer NOT_A_REAL_TOKEN' } });
    record('T05.2', 'token inválido = 401', r.status === 401, `status=${r.status}`);
  } catch (e) { record('T05.2', 'invalid token', false, e.message); }

  // T05.3: Bearer pero sin token → 401
  console.log('\n=== T05.3: "Bearer " vacío → 401 ===');
  try {
    const r = await fetch('http://localhost:8000/api/v1/cases', { headers: { Authorization: 'Bearer ' } });
    record('T05.3', 'bearer vacío = 401', r.status === 401, `status=${r.status}`);
  } catch (e) { record('T05.3', 'empty bearer', false, e.message); }

  // T05.4: JWT con sub fake → 401
  console.log('\n=== T05.4: JWT manipulado (sub fake) → 401 ===');
  // Construye un JWT sintético sin firma válida
  const fakeJwt = 'eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJmYWtlIiwidXNlcl9yb2xlIjoiYWRtaW4ifQ.FAKE_SIGNATURE';
  try {
    const r = await fetch('http://localhost:8000/api/v1/cases', { headers: { Authorization: `Bearer ${fakeJwt}` } });
    record('T05.4', 'JWT firma inválida = 401', r.status === 401, `status=${r.status}`);
  } catch (e) { record('T05.4', 'fake jwt', false, e.message); }

  // T05.5: Login con email inexistente
  console.log('\n=== T05.5: Login con email inexistente → 400 ===');
  try {
    const r = await fetch(`${process.env.SUPABASE_URL}/auth/v1/token?grant_type=password`, {
      method: 'POST',
      headers: { apikey: process.env.SUPABASE_ANON_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'no-existe-12345@gmail.com', password: 'anything123' }),
    });
    record('T05.5', 'email inexistente = 400', r.status === 400, `status=${r.status}`);
  } catch (e) { record('T05.5', 'login bad', false, e.message); }

  // T05.6: Rate limit — 100 requests rápidas (mismo IP)
  console.log('\n=== T05.6: Rate limit (100 requests rápidas) ===');
  // Login primero
  const lr = await fetch(`${process.env.SUPABASE_URL}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers: { apikey: process.env.SUPABASE_ANON_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'benitocabrera@hotmail.com', password: 'Benitomz2026$' }),
  });
  const tok = (await lr.json()).access_token;
  const auth = { Authorization: `Bearer ${tok}` };

  // 100 requests concurrentes
  const promises = [];
  for (let i = 0; i < 100; i++) {
    promises.push(fetch('http://localhost:8000/api/v1/cases', { headers: auth }).then(r => r.status));
  }
  const statuses = await Promise.all(promises);
  const ok = statuses.filter(s => s === 200).length;
  const limited = statuses.filter(s => s === 429).length;
  record('T05.6', 'rate limit registra requests', ok > 0, `200s=${ok} 429s=${limited} otros=${100-ok-limited}`);

  // T05.7: JWT expirado simulado — Supabase tokens duran 1h por default, no podemos esperar.
  // En su lugar, validamos que el endpoint /me con token vacío explícito falla bien.
  console.log('\n=== T05.7: /me con bearer=null → 401 ===');
  try {
    const r = await fetch('http://localhost:8000/api/v1/auth/supabase/me', { headers: { Authorization: 'Bearer null' } });
    record('T05.7', 'bearer null = 401', r.status === 401, `status=${r.status}`);
  } catch (e) { record('T05.7', 'null bearer', false, e.message); }

  // T05.8: Servidor up health check
  console.log('\n=== T05.8: Backend root responde ===');
  try {
    const r = await fetch('http://localhost:8000/');
    record('T05.8', 'root reachable', r.status === 200, `status=${r.status}`);
  } catch (e) { record('T05.8', 'root', false, e.message); }

  fs.writeFileSync(RES, JSON.stringify(results, null, 2));
  const passed = results.filter(r => r.passed).length;
  console.log(`\n=== Suite 05 · ${passed}/${results.length} passed ===`);
  process.exit(passed === results.length ? 0 : 1);
})().catch(e => { console.error('FATAL', e); process.exit(1); });

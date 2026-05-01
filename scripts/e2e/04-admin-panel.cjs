/**
 * SUITE 04: Admin endpoints + 403 para no-admin.
 */
require('dotenv').config();
const fs = require('fs');
const path = require('path');

const RES = path.join(__dirname, '../../test-results/evidence/04-admin-panel.json');
const ADMIN_EMAIL = 'benitocabrera@hotmail.com';
const ADMIN_PWD = 'Benitomz2026$';

const results = [];
function record(id, name, passed, details = '') {
  console.log(`  [${passed ? 'PASS' : 'FAIL'}] ${id} ${name}`);
  if (details) console.log(`        ${String(details).slice(0, 250)}`);
  results.push({ id, name, passed, details: String(details).slice(0, 800) });
}

(async () => {
  // Login admin
  const lr = await fetch(`${process.env.SUPABASE_URL}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers: { apikey: process.env.SUPABASE_ANON_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: ADMIN_EMAIL, password: ADMIN_PWD }),
  });
  const adminTok = (await lr.json()).access_token;
  const adminAuth = { Authorization: `Bearer ${adminTok}`, 'Content-Type': 'application/json' };

  // Crear user no-admin temporal para el test 403
  const TS = Date.now();
  const tempEmail = `temp-test-${TS}@gmail.com`;
  const tempPwd = 'TempUser2026!';

  console.log('\n=== Setup: crear user no-admin temporal ===');
  let tempId;
  try {
    const r = await fetch(`${process.env.SUPABASE_URL}/auth/v1/admin/users`, {
      method: 'POST',
      headers: {
        apikey: process.env.SUPABASE_SERVICE_ROLE_KEY,
        Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email: tempEmail, password: tempPwd, email_confirm: true }),
    });
    const d = await r.json();
    tempId = d.id;
    console.log(`  created temp user ${tempId}`);
  } catch (e) {
    console.log('  err creating temp user:', e.message);
  }

  // Login como temp
  const lr2 = await fetch(`${process.env.SUPABASE_URL}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers: { apikey: process.env.SUPABASE_ANON_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: tempEmail, password: tempPwd }),
  });
  const tempTok = (await lr2.json()).access_token;
  const tempAuth = { Authorization: `Bearer ${tempTok}`, 'Content-Type': 'application/json' };

  // Endpoints admin
  const ENDPOINTS = [
    ['/api/v1/admin/users',       'lista users'],
    ['/api/v1/admin/specialties', 'lista specialties'],
    ['/api/v1/admin/plans/stats', 'plans stats'],
    ['/api/v1/admin/quotas',      'lista quotas'],
    ['/api/v1/admin/audit',       'audit logs'],
  ];

  console.log('\n=== Admin (con role=admin) ===');
  for (let i = 0; i < ENDPOINTS.length; i++) {
    const [ep, label] = ENDPOINTS[i];
    try {
      const r = await fetch(`http://localhost:8000${ep}`, { headers: adminAuth });
      record(`T04.${i+1}`, `admin GET ${ep}`, r.status === 200, `${label}: status=${r.status}`);
    } catch (e) { record(`T04.${i+1}`, `admin GET ${ep}`, false, e.message); }
  }

  console.log('\n=== No-admin (debe recibir 403) ===');
  for (let i = 0; i < ENDPOINTS.length; i++) {
    const [ep, label] = ENDPOINTS[i];
    try {
      const r = await fetch(`http://localhost:8000${ep}`, { headers: tempAuth });
      record(`T04.${6+i}`, `non-admin GET ${ep} → 403`, r.status === 403, `status=${r.status}`);
    } catch (e) { record(`T04.${6+i}`, `non-admin GET ${ep}`, false, e.message); }
  }

  // T04.11: Promover user a admin via PATCH
  if (tempId) {
    console.log('\n=== Promoción de role via admin endpoint ===');
    try {
      const r = await fetch(`http://localhost:8000/api/v1/admin/users/${tempId}`, {
        method: 'PATCH',
        headers: adminAuth,
        body: JSON.stringify({ role: 'admin' }),
      });
      record('T04.11', 'admin promueve user a admin', r.status === 200 || r.status === 204, `${r.status}`);

      // Verificar el nuevo JWT del user promovido lleva user_role=admin
      const lr3 = await fetch(`${process.env.SUPABASE_URL}/auth/v1/token?grant_type=password`, {
        method: 'POST',
        headers: { apikey: process.env.SUPABASE_ANON_KEY, 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: tempEmail, password: tempPwd }),
      });
      const newSess = await lr3.json();
      const claims = JSON.parse(Buffer.from(newSess.access_token.split('.')[1], 'base64url').toString());
      record('T04.12', 'JWT del user reflecta nuevo role=admin', claims.user_role === 'admin', `user_role=${claims.user_role}`);
    } catch (e) { record('T04.11', 'promote', false, e.message); }
  }

  // Cleanup
  if (tempId) {
    try {
      await fetch(`${process.env.SUPABASE_URL}/auth/v1/admin/users/${tempId}`, {
        method: 'DELETE',
        headers: { apikey: process.env.SUPABASE_SERVICE_ROLE_KEY, Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}` },
      });
      console.log('  cleanup: temp user deleted');
    } catch {}
  }

  fs.writeFileSync(RES, JSON.stringify(results, null, 2));
  const passed = results.filter(r => r.passed).length;
  console.log(`\n=== Suite 04 · ${passed}/${results.length} passed ===`);
  process.exit(passed === results.length ? 0 : 1);
})().catch(e => { console.error('FATAL', e); process.exit(1); });

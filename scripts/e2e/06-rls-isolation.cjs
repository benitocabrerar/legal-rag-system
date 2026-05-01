/**
 * SUITE 06: RLS isolation.
 * Crea 2 users, cada uno crea cases. Verifica que User A NO puede leer
 * cases de User B (ni via backend ni via Supabase REST con su token).
 */
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

const RES = path.join(__dirname, '../../test-results/evidence/06-rls-isolation.json');

const results = [];
function record(id, name, passed, details = '') {
  console.log(`  [${passed ? 'PASS' : 'FAIL'}] ${id} ${name}`);
  if (details) console.log(`        ${String(details).slice(0, 250)}`);
  results.push({ id, name, passed, details: String(details).slice(0, 800) });
}

async function createUser(email, pwd) {
  const r = await fetch(`${process.env.SUPABASE_URL}/auth/v1/admin/users`, {
    method: 'POST',
    headers: {
      apikey: process.env.SUPABASE_SERVICE_ROLE_KEY,
      Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ email, password: pwd, email_confirm: true }),
  });
  const d = await r.json();
  return d.id;
}

async function login(email, pwd) {
  const r = await fetch(`${process.env.SUPABASE_URL}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers: { apikey: process.env.SUPABASE_ANON_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password: pwd }),
  });
  const d = await r.json();
  return d.access_token;
}

async function deleteUser(id) {
  await fetch(`${process.env.SUPABASE_URL}/auth/v1/admin/users/${id}`, {
    method: 'DELETE',
    headers: { apikey: process.env.SUPABASE_SERVICE_ROLE_KEY, Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}` },
  });
}

(async () => {
  const TS = Date.now();
  const userA = { email: `rls-a-${TS}@gmail.com`, pwd: 'RlsA2026!' };
  const userB = { email: `rls-b-${TS}@gmail.com`, pwd: 'RlsB2026!' };

  console.log('\n=== Setup: 2 users ===');
  userA.id = await createUser(userA.email, userA.pwd);
  userB.id = await createUser(userB.email, userB.pwd);
  console.log(`  A=${userA.id}\n  B=${userB.id}`);

  userA.tok = await login(userA.email, userA.pwd);
  userB.tok = await login(userB.email, userB.pwd);

  const supaA = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: `Bearer ${userA.tok}` } },
    auth: { persistSession: false },
  });
  const supaB = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: `Bearer ${userB.tok}` } },
    auth: { persistSession: false },
  });

  // T06.1: User A crea un caso via backend
  console.log('\n=== T06.1: User A crea caso via backend ===');
  let caseA;
  try {
    const r = await fetch('http://localhost:8000/api/v1/cases', {
      method: 'POST',
      headers: { Authorization: `Bearer ${userA.tok}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: 'Case A', clientName: 'CA', caseType: 'CIVIL', status: 'active', priority: 'medium' }),
    });
    const d = await r.json();
    caseA = d.case?.id;
    record('T06.1', 'A crea caso', !!caseA, `id=${caseA}`);
  } catch (e) { record('T06.1', 'A crea caso', false, e.message); }

  // T06.2: User B intenta leer caso de A via backend (debe NO incluirlo en su lista)
  console.log('\n=== T06.2: User B no ve caso de A en su lista ===');
  try {
    const r = await fetch('http://localhost:8000/api/v1/cases', {
      headers: { Authorization: `Bearer ${userB.tok}` },
    });
    const d = await r.json();
    const list = d.cases || d.items || d;
    const found = Array.isArray(list) && list.some(c => c.id === caseA);
    record('T06.2', 'B no ve caso de A en /cases', !found, `B count=${Array.isArray(list)?list.length:'?'} containsA=${found}`);
  } catch (e) { record('T06.2', 'B lista', false, e.message); }

  // T06.3: User B intenta leer caseA por id directo (404 esperado por filtro userId)
  console.log('\n=== T06.3: User B GET /cases/<idA> debe ser 404/403 ===');
  if (caseA) {
    try {
      const r = await fetch(`http://localhost:8000/api/v1/cases/${caseA}`, {
        headers: { Authorization: `Bearer ${userB.tok}` },
      });
      record('T06.3', 'B no puede leer caso de A', r.status === 404 || r.status === 403, `status=${r.status}`);
    } catch (e) { record('T06.3', 'B GET A', false, e.message); }
  }

  // T06.4: RLS directa via Supabase REST: userB anon-key con su token
  console.log('\n=== T06.4: RLS directa - User B query a public.cases ===');
  try {
    const { data, error } = await supaB.from('cases').select('id, user_id').eq('id', caseA).maybeSingle();
    record('T06.4', 'User B no puede SELECT caseA via Supabase', !data, `data=${JSON.stringify(data)} err=${error?.message}`);
  } catch (e) { record('T06.4', 'RLS query', false, e.message); }

  // T06.5: User B intenta UPDATE caseA via Supabase
  console.log('\n=== T06.5: User B no puede UPDATE caso de A ===');
  try {
    const { error, data } = await supaB.from('cases').update({ title: 'Hacked!' }).eq('id', caseA).select();
    record('T06.5', 'B UPDATE caseA bloqueado', !data || data.length === 0, `data=${JSON.stringify(data)} err=${error?.message}`);
  } catch (e) { record('T06.5', 'B UPDATE', false, e.message); }

  // T06.6: User A todavía puede leer su propio caso
  console.log('\n=== T06.6: A sigue viendo su caso (sanity) ===');
  try {
    const { data, error } = await supaA.from('cases').select('id').eq('id', caseA).maybeSingle();
    record('T06.6', 'A puede leer su caseA', !!data && !error, `data=${JSON.stringify(data)} err=${error?.message}`);
  } catch (e) { record('T06.6', 'A sanity', false, e.message); }

  // T06.7: Verifica RLS en otra tabla — tasks (Pattern A)
  console.log('\n=== T06.7: Tasks RLS — A crea, B no ve ===');
  let taskA;
  try {
    const r = await fetch('http://localhost:8000/api/v1/tasks', {
      method: 'POST',
      headers: { Authorization: `Bearer ${userA.tok}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: 'Task A', priority: 'MEDIUM', status: 'TODO' }),
    });
    taskA = (await r.json()).id;
  } catch {}
  if (taskA) {
    try {
      const r = await fetch('http://localhost:8000/api/v1/tasks', {
        headers: { Authorization: `Bearer ${userB.tok}` },
      });
      const list = await r.json();
      const found = Array.isArray(list) && list.some(t => t.id === taskA);
      record('T06.7', 'B no ve task de A', !found, `B count=${Array.isArray(list)?list.length:'?'}`);
    } catch (e) { record('T06.7', 'B tasks list', false, e.message); }
  }

  // Cleanup
  console.log('\n=== Cleanup ===');
  if (caseA) {
    await fetch(`http://localhost:8000/api/v1/cases/${caseA}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${userA.tok}` },
    });
  }
  if (taskA) {
    await fetch(`http://localhost:8000/api/v1/tasks/${taskA}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${userA.tok}` },
    });
  }
  await deleteUser(userA.id);
  await deleteUser(userB.id);

  fs.writeFileSync(RES, JSON.stringify(results, null, 2));
  const passed = results.filter(r => r.passed).length;
  console.log(`\n=== Suite 06 · ${passed}/${results.length} passed ===`);
  process.exit(passed === results.length ? 0 : 1);
})().catch(e => { console.error('FATAL', e); process.exit(1); });

/**
 * SUITE 07: AI assistant + Search.
 * Cubre endpoints sin gastar mucho en OpenAI.
 */
require('dotenv').config();
const fs = require('fs');
const path = require('path');

const RES = path.join(__dirname, '../../test-results/evidence/07-ai-search.json');
const results = [];
function record(id, name, passed, details = '') {
  console.log(`  [${passed ? 'PASS' : 'FAIL'}] ${id} ${name}`);
  if (details) console.log(`        ${String(details).slice(0, 250)}`);
  results.push({ id, name, passed, details: String(details).slice(0, 800) });
}

(async () => {
  const lr = await fetch(`${process.env.SUPABASE_URL}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers: { apikey: process.env.SUPABASE_ANON_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'benitocabrera@hotmail.com', password: 'Benitomz2026$' }),
  });
  const tok = (await lr.json()).access_token;
  const auth = { Authorization: `Bearer ${tok}`, 'Content-Type': 'application/json' };

  // T07.1: Listar conversaciones AI
  console.log('\n=== T07.1: GET /api/v1/api/ai/conversations ===');
  try {
    const r = await fetch('http://localhost:8000/api/v1/api/ai/conversations', { headers: auth });
    record('T07.1', 'list conversations', r.status === 200, `status=${r.status}`);
  } catch (e) { record('T07.1', 'list conv', false, e.message); }

  // T07.2: SEARCH_BACKEND=rpc — /search/legal
  console.log('\n=== T07.2: POST /api/v1/search/legal (RPC) ===');
  try {
    const r = await fetch('http://localhost:8000/api/v1/search/legal', {
      method: 'POST', headers: auth,
      body: JSON.stringify({ query: 'test query', limit: 5 }),
    });
    const t = await r.text();
    // 200 (con resultados vacíos) o 400 (validation) son aceptables; 500 no.
    record('T07.2', '/search/legal responde sin 500', r.status < 500, `status=${r.status} body=${t.slice(0, 100)}`);
  } catch (e) { record('T07.2', '/search/legal', false, e.message); }

  // T07.3: query route
  console.log('\n=== T07.3: POST /api/v1/query — placeholder corpus vacío ===');
  try {
    const r = await fetch('http://localhost:8000/api/v1/query', {
      method: 'POST', headers: auth,
      body: JSON.stringify({ query: 'test', topK: 3 }),
    });
    const t = await r.text();
    record('T07.3', '/query no 500', r.status < 500, `status=${r.status} body=${t.slice(0, 150)}`);
  } catch (e) { record('T07.3', '/query', false, e.message); }

  // T07.4: ai conversation create — solo crea, no genera (gasto mínimo)
  console.log('\n=== T07.4: POST /api/v1/api/ai/conversation crea registro ===');
  try {
    const r = await fetch('http://localhost:8000/api/v1/api/ai/conversation', {
      method: 'POST', headers: auth,
      body: JSON.stringify({ title: 'Test conv ' + Date.now() }),
    });
    record('T07.4', 'create conversation', r.status === 200 || r.status === 201, `status=${r.status}`);
  } catch (e) { record('T07.4', 'create conv', false, e.message); }

  // T07.5: Verificar que el RPC search_legal_chunks existe en Supabase
  console.log('\n=== T07.5: RPC search_legal_chunks existe ===');
  try {
    const fs2 = require('fs');
    const T = fs2.readFileSync('.supabase-access-token', 'utf8').trim();
    const r = await fetch('https://api.supabase.com/v1/projects/lmnzzcqqegqugphcnmew/database/query', {
      method: 'POST',
      headers: { Authorization: `Bearer ${T}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: "SELECT proname FROM pg_proc WHERE proname IN ('search_legal_chunks','search_user_documents','custom_access_token_hook')" }),
    });
    const d = await r.json();
    const names = d.map(x => x.proname);
    record('T07.5', '3 RPCs presentes', names.length >= 3, JSON.stringify(names));
  } catch (e) { record('T07.5', 'rpc check', false, e.message); }

  fs.writeFileSync(RES, JSON.stringify(results, null, 2));
  const passed = results.filter(r => r.passed).length;
  console.log(`\n=== Suite 07 · ${passed}/${results.length} passed ===`);
  process.exit(passed === results.length ? 0 : 1);
})().catch(e => { console.error('FATAL', e); process.exit(1); });

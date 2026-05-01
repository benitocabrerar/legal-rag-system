/**
 * SUITE 02: CRUD de cases, tasks, calendar events.
 *
 * Cada entidad: CREATE → LIST → READ → UPDATE → DELETE.
 * Cubre la cadena UI→backend→Prisma→Supabase.
 */
require('dotenv').config();
const fs = require('fs');
const path = require('path');

const BASE = 'http://localhost:8000/api/v1';
const RES = path.join(__dirname, '../../test-results/evidence/02-crud-entities.json');
const ADMIN_EMAIL = 'benitocabrera@hotmail.com';
const ADMIN_PWD = 'Benitomz2026$';

const results = [];
function record(id, name, passed, details = '') {
  console.log(`  [${passed ? 'PASS' : 'FAIL'}] ${id} ${name}`);
  if (details) console.log(`        ${String(details).slice(0, 250)}`);
  results.push({ id, name, passed, details: String(details).slice(0, 800) });
}

(async () => {
  // Login
  const lr = await fetch(`${process.env.SUPABASE_URL}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers: { apikey: process.env.SUPABASE_ANON_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: ADMIN_EMAIL, password: ADMIN_PWD }),
  });
  const { access_token: tok } = await lr.json();
  const auth = { Authorization: `Bearer ${tok}`, 'Content-Type': 'application/json' };

  // ============ CASES ============
  console.log('\n=== T02.1-5: CASES CRUD ===');
  let caseId;
  try {
    const r = await fetch(`${BASE}/cases`, {
      method: 'POST', headers: auth,
      body: JSON.stringify({
        title: 'Test Case E2E ' + Date.now(),
        description: 'Created by automated test',
        clientName: 'Cliente Test',
        caseType: 'CIVIL',
        status: 'active',
        priority: 'medium',
      }),
    });
    const d = await r.json();
    caseId = d.case?.id || d.id;
    record('T02.1', 'CREATE case', r.status === 201 || r.status === 200, `${r.status} id=${caseId} body=${JSON.stringify(d).slice(0,150)}`);
  } catch (e) { record('T02.1', 'CREATE case', false, e.message); }

  try {
    const r = await fetch(`${BASE}/cases`, { headers: auth });
    const d = await r.json();
    const list = d.cases || d.items || d;
    const found = Array.isArray(list) && list.some(c => c.id === caseId);
    record('T02.2', 'LIST cases incluye el creado', r.status === 200 && found, `${r.status} count=${Array.isArray(list)?list.length:'?'}`);
  } catch (e) { record('T02.2', 'LIST cases', false, e.message); }

  if (caseId) {
    try {
      const r = await fetch(`${BASE}/cases/${caseId}`, { headers: auth });
      record('T02.3', 'READ case por id', r.status === 200, r.status);
    } catch (e) { record('T02.3', 'READ case', false, e.message); }

    try {
      const r = await fetch(`${BASE}/cases/${caseId}`, {
        method: 'PATCH', headers: auth,
        body: JSON.stringify({ priority: 'high' }),
      });
      record('T02.4', 'UPDATE case priority', r.status === 200, r.status);
    } catch (e) { record('T02.4', 'UPDATE case', false, e.message); }

    try {
      const r = await fetch(`${BASE}/cases/${caseId}`, { method: 'DELETE', headers: auth });
      record('T02.5', 'DELETE case', r.status === 200 || r.status === 204, r.status);
    } catch (e) { record('T02.5', 'DELETE case', false, e.message); }
  }

  // ============ TASKS ============
  console.log('\n=== T02.6-9: TASKS CRUD ===');
  let taskId;
  try {
    const r = await fetch(`${BASE}/tasks`, {
      method: 'POST', headers: auth,
      body: JSON.stringify({
        title: 'Test Task ' + Date.now(),
        description: 'Automated',
        priority: 'MEDIUM',
        status: 'TODO',
      }),
    });
    const d = await r.json();
    taskId = d.task?.id || d.id;
    record('T02.6', 'CREATE task', r.status === 201 || r.status === 200, `${r.status} id=${taskId}`);
  } catch (e) { record('T02.6', 'CREATE task', false, e.message); }

  try {
    const r = await fetch(`${BASE}/tasks`, { headers: auth });
    record('T02.7', 'LIST tasks', r.status === 200, r.status);
  } catch (e) { record('T02.7', 'LIST tasks', false, e.message); }

  if (taskId) {
    try {
      const r = await fetch(`${BASE}/tasks/${taskId}`, {
        method: 'PATCH', headers: auth,
        body: JSON.stringify({ status: 'IN_PROGRESS' }),
      });
      record('T02.8', 'UPDATE task status', r.status === 200, r.status);
    } catch (e) { record('T02.8', 'UPDATE task', false, e.message); }

    try {
      const r = await fetch(`${BASE}/tasks/${taskId}`, { method: 'DELETE', headers: auth });
      record('T02.9', 'DELETE task', r.status === 200 || r.status === 204, r.status);
    } catch (e) { record('T02.9', 'DELETE task', false, e.message); }
  }

  // ============ CALENDAR EVENTS ============
  console.log('\n=== T02.10-13: CALENDAR EVENTS CRUD ===');
  let eventId;
  try {
    const r = await fetch(`${BASE}/events`, {
      method: 'POST', headers: auth,
      body: JSON.stringify({
        title: 'Test Event ' + Date.now(),
        type: 'MEETING',
        startTime: new Date(Date.now() + 86400000).toISOString(),
        endTime: new Date(Date.now() + 90000000).toISOString(),
      }),
    });
    const d = await r.json();
    eventId = d.event?.id || d.id;
    record('T02.10', 'CREATE event', r.status === 201 || r.status === 200, `${r.status} id=${eventId}`);
  } catch (e) { record('T02.10', 'CREATE event', false, e.message); }

  try {
    const r = await fetch(`${BASE}/events`, { headers: auth });
    record('T02.11', 'LIST events', r.status === 200, r.status);
  } catch (e) { record('T02.11', 'LIST events', false, e.message); }

  if (eventId) {
    try {
      const r = await fetch(`${BASE}/events/${eventId}`, {
        method: 'PATCH', headers: auth,
        body: JSON.stringify({ title: 'Test Event UPDATED' }),
      });
      record('T02.12', 'UPDATE event', r.status === 200, r.status);
    } catch (e) { record('T02.12', 'UPDATE event', false, e.message); }

    try {
      const r = await fetch(`${BASE}/events/${eventId}`, { method: 'DELETE', headers: auth });
      record('T02.13', 'DELETE event', r.status === 200 || r.status === 204, r.status);
    } catch (e) { record('T02.13', 'DELETE event', false, e.message); }
  }

  // Save
  fs.writeFileSync(RES, JSON.stringify(results, null, 2));
  const passed = results.filter(r => r.passed).length;
  console.log(`\n=== Suite 02 · ${passed}/${results.length} passed ===`);
  process.exit(passed === results.length ? 0 : 1);
})().catch(e => { console.error('FATAL', e); process.exit(1); });

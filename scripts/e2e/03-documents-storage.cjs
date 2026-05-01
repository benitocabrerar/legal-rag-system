/**
 * SUITE 03: Documents + Storage.
 * Sube un PDF de test a Supabase Storage via backend, lista, descarga, elimina.
 */
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

const RES = path.join(__dirname, '../../test-results/evidence/03-documents-storage.json');
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
  const session = await lr.json();
  const tok = session.access_token;
  const userId = session.user.id;

  // Cliente Supabase con el token del user (respeta RLS)
  const supa = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: `Bearer ${tok}` } },
    auth: { persistSession: false },
  });

  // Crear PDF dummy
  const tmpFile = path.join(__dirname, '../../test-results/evidence/_test.pdf');
  fs.writeFileSync(tmpFile, Buffer.from('%PDF-1.4\n%fake test pdf\n', 'utf8'));

  // T03.1: Upload directo al bucket legal-documents
  console.log('\n=== T03.1: Upload directo a Supabase Storage ===');
  const buf = fs.readFileSync(tmpFile);
  const key = `${userId}/test-${Date.now()}.pdf`;
  try {
    const { data, error } = await supa.storage.from('legal-documents').upload(key, buf, {
      contentType: 'application/pdf',
    });
    record('T03.1', 'upload PDF a legal-documents', !error, error?.message || `key=${data?.path}`);
  } catch (e) { record('T03.1', 'upload PDF', false, e.message); }

  // T03.2: List
  console.log('\n=== T03.2: List archivos del user en bucket ===');
  try {
    const { data, error } = await supa.storage.from('legal-documents').list(userId);
    const found = data?.some(f => f.name.startsWith('test-'));
    record('T03.2', `list ${userId}/`, !error && found, error?.message || `count=${data?.length}`);
  } catch (e) { record('T03.2', 'list', false, e.message); }

  // T03.3: Download
  console.log('\n=== T03.3: Download archivo subido ===');
  try {
    const { data, error } = await supa.storage.from('legal-documents').download(key);
    record('T03.3', 'download key', !error && data, error?.message || `size=${data?.size}`);
  } catch (e) { record('T03.3', 'download', false, e.message); }

  // T03.4: Signed URL
  console.log('\n=== T03.4: Signed URL para descarga directa ===');
  try {
    const { data, error } = await supa.storage.from('legal-documents').createSignedUrl(key, 60);
    record('T03.4', 'createSignedUrl', !error && data?.signedUrl, error?.message || (data?.signedUrl?.slice(0,80) + '...'));
  } catch (e) { record('T03.4', 'signedUrl', false, e.message); }

  // T03.5: Avatar bucket público
  console.log('\n=== T03.5: Upload a user-avatars (bucket público) ===');
  const avatarKey = `${userId}/avatar-${Date.now()}.png`;
  // PNG mínimo válido
  const tinyPng = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR4nGNgYGD4DwABBAEAfbLI3wAAAABJRU5ErkJggg==', 'base64');
  try {
    const { error } = await supa.storage.from('user-avatars').upload(avatarKey, tinyPng, {
      contentType: 'image/png',
    });
    record('T03.5', 'upload avatar PNG', !error, error?.message || avatarKey);
  } catch (e) { record('T03.5', 'upload avatar', false, e.message); }

  // T03.6: Cleanup
  console.log('\n=== T03.6: DELETE archivos creados ===');
  try {
    const { error: e1 } = await supa.storage.from('legal-documents').remove([key]);
    const { error: e2 } = await supa.storage.from('user-avatars').remove([avatarKey]);
    record('T03.6', 'cleanup ambos buckets', !e1 && !e2, (e1?.message || '') + (e2?.message || ''));
  } catch (e) { record('T03.6', 'cleanup', false, e.message); }

  // T03.7: Backend route documents
  console.log('\n=== T03.7: Backend /api/v1/documents/case/:caseId responde ===');
  try {
    // Necesitamos un caseId. Crear uno temporal.
    const cr = await fetch('http://localhost:8000/api/v1/cases', {
      method: 'POST',
      headers: { Authorization: `Bearer ${tok}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: 'Tmp', clientName: 'C', caseType: 'CIVIL', status: 'active', priority: 'medium' }),
    });
    const cd = await cr.json();
    const caseId = cd.case?.id;
    if (caseId) {
      const lr2 = await fetch(`http://localhost:8000/api/v1/documents/case/${caseId}`, {
        headers: { Authorization: `Bearer ${tok}` },
      });
      record('T03.7', 'GET /documents/case/:id', lr2.status === 200, `status=${lr2.status}`);
      // cleanup
      await fetch(`http://localhost:8000/api/v1/cases/${caseId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${tok}` },
      });
    } else {
      record('T03.7', 'no se pudo crear caso temporal', false, JSON.stringify(cd).slice(0, 200));
    }
  } catch (e) { record('T03.7', '/documents endpoint', false, e.message); }

  fs.writeFileSync(RES, JSON.stringify(results, null, 2));
  const passed = results.filter(r => r.passed).length;
  console.log(`\n=== Suite 03 · ${passed}/${results.length} passed ===`);
  process.exit(passed === results.length ? 0 : 1);
})().catch(e => { console.error('FATAL', e); process.exit(1); });

/* eslint-disable */
/**
 * E2E test del sistema multi-país.
 *   node scripts/e2e-jurisdictions-test.cjs
 */
const path = require('path');
const fs = require('fs');

const checks = [];
function check(name, ok, detail) {
  checks.push({ name, ok, detail });
  console.log(`${ok ? '✅' : '❌'} ${name}${detail ? ` — ${detail}` : ''}`);
}

const BACKEND = process.env.E2E_BACKEND_URL || 'http://localhost:8000';

(async () => {
  // ===== TEST 1: GET /jurisdictions público =====
  console.log('\n--- TEST 1: GET /api/v1/jurisdictions (público) ---');
  const r1 = await fetch(`${BACKEND}/api/v1/jurisdictions`);
  check('Endpoint responde 200', r1.status === 200, `status=${r1.status}`);
  const d1 = await r1.json();
  check('Devuelve array jurisdictions', Array.isArray(d1.jurisdictions), `tipo=${typeof d1.jurisdictions}`);
  check('Solo Ecuador activo', d1.jurisdictions.length === 1 && d1.jurisdictions[0].code === 'EC');
  check('Ecuador es default', d1.jurisdictions[0]?.is_default === true);
  check('Tiene bandera 🇪🇨', d1.jurisdictions[0]?.flag_emoji === '🇪🇨');
  check('Tiene name_es y name_en', !!d1.jurisdictions[0]?.name_es && !!d1.jurisdictions[0]?.name_en);

  // ===== TEST 2: PUT /jurisdictions/me sin auth = 401 =====
  console.log('\n--- TEST 2: PUT /jurisdictions/me sin token (debe 401) ---');
  const r2 = await fetch(`${BACKEND}/api/v1/jurisdictions/me`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ countryCode: 'EC' }),
  });
  check('Sin auth → 401', r2.status === 401, `status=${r2.status}`);

  // ===== TEST 3: validar que la frontend page renderice country selector =====
  console.log('\n--- TEST 3: Selector renderiza en /dashboard/settings (visual) ---');
  console.log('   (omitido en este script — validación visual con Playwright opcional)');

  // ===== Resumen =====
  console.log('\n========================================================');
  const passed = checks.filter((c) => c.ok).length;
  const failed = checks.filter((c) => !c.ok).length;
  console.log(`📊 RESULTADO: ${passed}/${checks.length} checks aprobados (${failed} fallos)`);
  if (failed > 0) {
    console.log('\nFallos:');
    checks.filter((c) => !c.ok).forEach((c) => console.log(`   ❌ ${c.name}: ${c.detail || ''}`));
  }
  console.log('========================================================\n');
  process.exit(failed > 0 ? 1 : 0);
})().catch((err) => {
  console.error('FATAL:', err);
  process.exit(2);
});

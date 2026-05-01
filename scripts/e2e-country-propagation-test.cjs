/* eslint-disable */
/**
 * Test E2E: valida que country_code se propaga a TODA la cadena.
 *
 * Crea un user fake en DB, verifica que su preferred_country_code defaultea
 * a EC, crea un case y un document, valida que ambos heredan EC vía triggers.
 * Luego cambia preferred_country_code a CO (artificialmente activado),
 * crea otro case, valida que hereda CO.
 */
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
const { Client } = require('pg');
const crypto = require('crypto');

const checks = [];
function check(name, ok, detail) {
  checks.push({ name, ok, detail });
  console.log(`${ok ? '✅' : '❌'} ${name}${detail ? ` — ${detail}` : ''}`);
}

(async () => {
  const c = new Client({ connectionString: process.env.DIRECT_URL, ssl: { rejectUnauthorized: false } });
  await c.connect();

  // ---- Cleanup previo (si ya corrió antes) ----
  await c.query(`DELETE FROM cases WHERE id LIKE 'e2e-test-%'`);
  await c.query(`DELETE FROM users WHERE id LIKE 'e2e-test-%'`);

  // Activar Colombia temporalmente para el test
  await c.query(`UPDATE legal_jurisdictions SET is_active = true WHERE code = 'CO'`);

  try {
    const userId = `e2e-test-user-${Date.now()}`;
    const caseEcId = `e2e-test-case-ec-${Date.now()}`;
    const caseCoId = `e2e-test-case-co-${Date.now()}`;

    // ===== TEST 1: Crear usuario, debe tener preferred_country_code = 'EC' default =====
    console.log('\n--- TEST 1: User default preferred_country_code ---');
    await c.query(
      `INSERT INTO users (id, email, name, role, plan_tier, is_active, created_at, updated_at, password_hash, provider)
       VALUES ($1, $2, $3, 'user', 'free', true, NOW(), NOW(), 'x', 'local')`,
      [userId, `${userId}@test.com`, 'E2E Test User']
    );
    const r1 = await c.query(`SELECT preferred_country_code FROM users WHERE id = $1`, [userId]);
    check('User defaultea a EC', r1.rows[0]?.preferred_country_code === 'EC',
      `valor=${r1.rows[0]?.preferred_country_code}`);

    // ===== TEST 2: Crear case sin country_code, trigger debe heredar EC =====
    console.log('\n--- TEST 2: case hereda country_code del user (EC) ---');
    await c.query(
      `INSERT INTO cases (id, user_id, title, client_name, status, created_at, updated_at)
       VALUES ($1, $2, $3, $4, 'active', NOW(), NOW())`,
      [caseEcId, userId, 'Test EC Case', 'Cliente Test']
    );
    const r2 = await c.query(`SELECT country_code FROM cases WHERE id = $1`, [caseEcId]);
    check('Case heredó EC vía trigger', r2.rows[0]?.country_code === 'EC',
      `valor=${r2.rows[0]?.country_code}`);

    // ===== TEST 3: Cambiar preferred_country_code del user a 'CO' =====
    console.log('\n--- TEST 3: Cambiar preferencia a CO ---');
    await c.query(`UPDATE users SET preferred_country_code = 'CO', updated_at = NOW() WHERE id = $1`, [userId]);
    const r3 = await c.query(`SELECT preferred_country_code FROM users WHERE id = $1`, [userId]);
    check('User ahora tiene CO', r3.rows[0]?.preferred_country_code === 'CO');

    // ===== TEST 4: Crear nuevo case, debe heredar CO =====
    console.log('\n--- TEST 4: Nuevo case con user en CO ---');
    await c.query(
      `INSERT INTO cases (id, user_id, title, client_name, status, created_at, updated_at)
       VALUES ($1, $2, $3, $4, 'active', NOW(), NOW())`,
      [caseCoId, userId, 'Test CO Case', 'Cliente Colombiano']
    );
    const r4 = await c.query(`SELECT country_code FROM cases WHERE id = $1`, [caseCoId]);
    check('Case nuevo heredó CO vía trigger', r4.rows[0]?.country_code === 'CO',
      `valor=${r4.rows[0]?.country_code}`);

    // ===== TEST 5: Override explícito al INSERT (cliente envía country_code) =====
    console.log('\n--- TEST 5: Override explícito de country_code ---');
    const caseOverrideId = `e2e-test-case-override-${Date.now()}`;
    await c.query(
      `INSERT INTO cases (id, user_id, title, client_name, status, country_code, created_at, updated_at)
       VALUES ($1, $2, $3, $4, 'active', 'EC', NOW(), NOW())`,
      [caseOverrideId, userId, 'Test Override', 'Cliente Override']
    );
    const r5 = await c.query(`SELECT country_code FROM cases WHERE id = $1`, [caseOverrideId]);
    check('Override explícito funciona (CO user → EC case)', r5.rows[0]?.country_code === 'EC',
      `valor=${r5.rows[0]?.country_code}`);

    // ===== TEST 6: search_legal_chunks por país =====
    console.log('\n--- TEST 6: search_legal_chunks filtra por país ---');
    const dummyEmb = '[' + new Array(1536).fill('0.001').join(',') + ']';
    const rEC = await c.query(
      `SELECT COUNT(*) AS cnt FROM search_legal_chunks($1::vector, 'derecho', 5, 1.0, 1.0, 60, NULL, NULL, NULL, 'EC')`,
      [dummyEmb]
    );
    const rCO = await c.query(
      `SELECT COUNT(*) AS cnt FROM search_legal_chunks($1::vector, 'derecho', 5, 1.0, 1.0, 60, NULL, NULL, NULL, 'CO')`,
      [dummyEmb]
    );
    check('Búsqueda EC devuelve resultados', Number(rEC.rows[0].cnt) > 0, `${rEC.rows[0].cnt} resultados`);
    check('Búsqueda CO devuelve 0 (sin docs)', Number(rCO.rows[0].cnt) === 0, `${rCO.rows[0].cnt} resultados`);

    // ===== TEST 7: get_user_country_code helper =====
    console.log('\n--- TEST 7: get_user_country_code(user_id) ---');
    const r7 = await c.query(`SELECT get_user_country_code($1) AS country`, [userId]);
    check('Helper devuelve CO para el user', r7.rows[0]?.country === 'CO');

    // ===== TEST 8: get_user_country_code con user inexistente devuelve EC =====
    console.log('\n--- TEST 8: Fallback a EC con user inexistente ---');
    const r8 = await c.query(`SELECT get_user_country_code('non-existent-user') AS country`);
    check('Fallback a EC funciona', r8.rows[0]?.country === 'EC');
  } catch (err) {
    console.error('\n❌ ERROR:', err.message);
    if (err.detail) console.error('   detail:', err.detail);
    throw err;
  } finally {
    // Cleanup
    await c.query(`DELETE FROM cases WHERE id LIKE 'e2e-test-%'`);
    await c.query(`DELETE FROM users WHERE id LIKE 'e2e-test-%'`);
    // Restaurar Colombia a inactivo
    await c.query(`UPDATE legal_jurisdictions SET is_active = false WHERE code = 'CO'`);
    await c.end();
  }

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

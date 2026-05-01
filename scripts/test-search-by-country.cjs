/* eslint-disable */
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
const { Client } = require('pg');

(async () => {
  const c = new Client({ connectionString: process.env.DIRECT_URL, ssl: { rejectUnauthorized: false } });
  await c.connect();

  // Embedding ficticio (vector de 1536 floats con valor 0.001) para validar firma.
  // En producción real se genera con OpenAI text-embedding-3-small.
  const dummyEmbedding = '[' + new Array(1536).fill('0.001').join(',') + ']';

  // Test 1: search EC (default) — debería traer chunks
  console.log('\n🔍 Test 1: search filter_country_code=EC (default)\n');
  const r1 = await c.query(
    `SELECT chunk_id, legal_document_id, country_code, norm_title, LEFT(content, 60) AS content_preview
     FROM search_legal_chunks($1::vector, $2, 3, 1.0, 1.0, 60, NULL, NULL, NULL, 'EC')`,
    [dummyEmbedding, 'derecho']
  );
  console.table(r1.rows);

  // Test 2: search CO — debería estar vacío (no hay docs de Colombia aún)
  console.log('\n🔍 Test 2: search filter_country_code=CO (sin docs aún)\n');
  const r2 = await c.query(
    `SELECT chunk_id, country_code, norm_title
     FROM search_legal_chunks($1::vector, $2, 3, 1.0, 1.0, 60, NULL, NULL, NULL, 'CO')`,
    [dummyEmbedding, 'derecho']
  );
  console.log(`Resultados CO: ${r2.rows.length} (esperado 0 hasta que activemos Colombia)`);

  // Test 3: get_active_jurisdictions
  console.log('\n📋 Test 3: get_active_jurisdictions()\n');
  const r3 = await c.query(`SELECT * FROM get_active_jurisdictions()`);
  console.table(r3.rows);

  await c.end();
  console.log('\n✅ Todos los tests pasaron.\n');
})().catch((e) => {
  console.error('❌', e.message);
  process.exit(1);
});

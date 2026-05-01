/* eslint-disable */
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

const SQL_PATH = path.join(__dirname, '..', 'supabase', 'migrations', '0011_country_code_propagation.sql');

async function main() {
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
  const url = process.env.DIRECT_URL || process.env.DATABASE_URL;
  const client = new Client({ connectionString: url, ssl: { rejectUnauthorized: false } });
  console.log('🔌 Conectando...');
  await client.connect();
  const sql = fs.readFileSync(SQL_PATH, 'utf8');
  console.log(`📝 Ejecutando 0011 (${sql.length} bytes)...\n`);
  try {
    await client.query(sql);
    console.log('\n✅ Aplicada.\n');

    const r1 = await client.query(`
      SELECT 'cases' AS tabla, country_code, COUNT(*) AS rows
      FROM cases GROUP BY country_code
      UNION ALL
      SELECT 'documents', country_code, COUNT(*)
      FROM documents GROUP BY country_code
      UNION ALL
      SELECT 'legal_documents', country_code, COUNT(*)
      FROM legal_documents GROUP BY country_code
      ORDER BY tabla, country_code
    `);
    console.table(r1.rows);

    const r2 = await client.query(`
      SELECT trigger_name, event_object_table
      FROM information_schema.triggers
      WHERE trigger_name LIKE 'trg_%set_country_code'
      ORDER BY event_object_table
    `);
    console.log('\nTriggers activos:');
    console.table(r2.rows);
  } catch (err) {
    console.error('❌', err.message);
    if (err.detail) console.error('   detail:', err.detail);
    process.exit(1);
  } finally {
    await client.end();
  }
}
main().catch((e) => { console.error(e); process.exit(1); });

/* eslint-disable */
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

const SQL_PATH = path.join(__dirname, '..', 'supabase', 'migrations', '0010_multi_country_support.sql');

async function main() {
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
  const url = process.env.DIRECT_URL || process.env.DATABASE_URL;
  if (!url) throw new Error('DIRECT_URL/DATABASE_URL no configurada');

  const client = new Client({ connectionString: url, ssl: { rejectUnauthorized: false } });
  console.log('🔌 Conectando con DIRECT_URL...');
  await client.connect();
  console.log('✅ Conectado\n');

  const sql = fs.readFileSync(SQL_PATH, 'utf8');
  console.log(`📝 Ejecutando migración 0010 (${sql.length} bytes)...\n`);

  try {
    await client.query(sql);
    console.log('\n✅ Migración aplicada exitosamente.\n');

    // Verificación: listar jurisdicciones
    const j = await client.query(`
      SELECT code, name_es, name_en, flag_emoji, is_active, is_default, default_currency, legal_system
      FROM legal_jurisdictions ORDER BY display_order
    `);
    console.log('📋 Jurisdicciones registradas:');
    console.table(j.rows);

    // Verificar columna en legal_documents
    const ld = await client.query(`
      SELECT country_code, COUNT(*) AS docs
      FROM legal_documents
      GROUP BY country_code
      ORDER BY country_code
    `);
    console.log('\n📋 legal_documents agrupado por country_code:');
    console.table(ld.rows);

    // Verificar columna en users
    const u = await client.query(`
      SELECT preferred_country_code, COUNT(*) AS users
      FROM users
      GROUP BY preferred_country_code
      ORDER BY preferred_country_code
    `);
    console.log('\n📋 users.preferred_country_code:');
    console.table(u.rows);

    // Probar la RPC helper
    const helper = await client.query(`SELECT * FROM get_active_jurisdictions()`);
    console.log('\n📋 get_active_jurisdictions() (lo que verá el usuario):');
    console.table(helper.rows);

    // Verificar que la RPC firma cambió
    const fn = await client.query(`
      SELECT pronargs, pg_get_function_identity_arguments(oid) AS args
      FROM pg_proc
      WHERE proname = 'search_legal_chunks' AND pronamespace = 'public'::regnamespace
    `);
    console.log('\n📋 search_legal_chunks() firma actualizada:');
    console.table(fn.rows);
  } catch (err) {
    console.error('\n❌ Error en migración:', err.message);
    if (err.detail) console.error('   detail:', err.detail);
    if (err.hint) console.error('   hint:', err.hint);
    process.exit(1);
  } finally {
    await client.end();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

/* eslint-disable */
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

const SQL_PATH = path.join(__dirname, '..', 'supabase', 'migrations', '0009_subscription_plans_reseed.sql');

async function main() {
  // Disable strict TLS verification for Supabase (self-signed in chain)
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
  const url = process.env.DIRECT_URL || process.env.DATABASE_URL;
  if (!url) throw new Error('DIRECT_URL/DATABASE_URL no configurada');

  const client = new Client({
    connectionString: url,
    ssl: { rejectUnauthorized: false },
  });

  console.log('🔌 Conectando con DIRECT_URL (session mode)...');
  await client.connect();
  console.log('✅ Conectado\n');

  const sql = fs.readFileSync(SQL_PATH, 'utf8');
  console.log(`📝 Ejecutando migración 0009 (${sql.length} bytes)...\n`);

  try {
    // Ejecutar todo el archivo en una sola transacción.
    // node-postgres acepta múltiples statements en client.query().
    await client.query(sql);
    console.log('\n✅ Migración aplicada exitosamente.');

    // Verificar planes
    const { rows } = await client.query(
      `SELECT code, name, price_monthly_usd, monthly_queries, documents_limit, is_active
       FROM subscription_plans
       WHERE is_active = true
       ORDER BY display_order`
    );
    console.log('\n📋 Planes activos:');
    console.table(rows);

    // Verificar tabla contact_inquiries
    const { rows: tableRows } = await client.query(
      `SELECT column_name, data_type FROM information_schema.columns
       WHERE table_name = 'contact_inquiries' ORDER BY ordinal_position`
    );
    console.log(`\n📋 Tabla contact_inquiries (${tableRows.length} columnas):`);
    console.table(tableRows);
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

/* eslint-disable */
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
const { Client } = require('pg');
(async () => {
  const c = new Client({ connectionString: process.env.DIRECT_URL, ssl: { rejectUnauthorized: false } });
  await c.connect();
  const r = await c.query(`
    SELECT pronargs, pg_get_function_identity_arguments(oid) AS args, oid
    FROM pg_proc
    WHERE proname = 'search_legal_chunks'
      AND pronamespace = 'public'::regnamespace
  `);
  console.log('Variantes existentes de search_legal_chunks:');
  console.table(r.rows);
  await c.end();
})();

const { Client } = require('pg');
require('dotenv').config();

(async () => {
  const c = new Client({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
  await c.connect();
  try {
    const cnt = await c.query('SELECT COUNT(*)::int AS n FROM public.users');
    console.log('count:', cnt.rows[0].n);

    const cols = await c.query(`
      SELECT column_name, data_type, character_maximum_length, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_schema='public' AND table_name='users'
      ORDER BY ordinal_position
    `);
    console.log('\nschema public.users:');
    for (const r of cols.rows) console.log(' ', r.column_name.padEnd(28), r.data_type, r.is_nullable === 'NO' ? 'NOT NULL' : '');

    const sample = await c.query(`
      SELECT id, email, name,
             LEFT(COALESCE(password_hash,''), 7) AS pwd_prefix,
             LENGTH(COALESCE(password_hash,'')) AS pwd_len,
             role, plan_tier, provider, google_id, two_factor_enabled, created_at
      FROM public.users
      ORDER BY created_at ASC
      LIMIT 10
    `);
    console.log('\nsample users:');
    for (const r of sample.rows) console.log(' ', JSON.stringify(r));

    const idShape = await c.query(`SELECT MIN(LENGTH(id)) lo, MAX(LENGTH(id)) hi FROM public.users`);
    console.log('\nid length range:', idShape.rows[0]);
  } finally {
    await c.end();
  }
})().catch(e => { console.error('ERR', e.message); process.exit(1); });

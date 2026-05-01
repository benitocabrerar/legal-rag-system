const fs = require('fs');
const { Client } = require('pg');
require('dotenv').config();

const TOKEN = fs.readFileSync('.supabase-access-token', 'utf8').trim();
const REF = 'lmnzzcqqegqugphcnmew';

async function sb(query) {
  const r = await fetch(`https://api.supabase.com/v1/projects/${REF}/database/query`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query }),
  });
  const txt = await r.text();
  if (!r.ok) throw new Error(`SB ${r.status}: ${txt}`);
  return JSON.parse(txt);
}

(async () => {
  const c = new Client({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
  await c.connect();

  // Lista de tablas que tienen rows en Render
  const { rows: tables } = await c.query(`
    SELECT table_name
    FROM information_schema.tables
    WHERE table_schema='public' AND table_type='BASE TABLE'
    ORDER BY table_name
  `);

  console.log('Table'.padEnd(40), 'Render'.padEnd(10), 'Supabase'.padEnd(10), 'Action');
  console.log('-'.repeat(80));
  const toMigrate = [];
  for (const { table_name: t } of tables) {
    let render, supa;
    try {
      const r = await c.query(`SELECT COUNT(*)::int n FROM "public"."${t}"`);
      render = r.rows[0].n;
    } catch (e) { render = 'ERR'; }
    try {
      const r = await sb(`SELECT COUNT(*)::int n FROM public."${t}"`);
      supa = r[0].n;
    } catch (e) { supa = 'ERR'; }
    const action = render > 0 && supa < render ? `MIGRATE ${render - (typeof supa === 'number' ? supa : 0)}` : (render === 0 ? 'empty' : 'ok');
    console.log(t.padEnd(40), String(render).padEnd(10), String(supa).padEnd(10), action);
    if (action.startsWith('MIGRATE')) toMigrate.push({ t, render, supa });
  }
  await c.end();

  console.log('\n=== Tablas con datos a migrar ===');
  for (const x of toMigrate) console.log(`  ${x.t}: render=${x.render} supabase=${x.supa}`);
})().catch(e => { console.error('ERR', e.message); process.exit(1); });

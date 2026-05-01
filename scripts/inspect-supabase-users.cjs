const fs = require('fs');
const TOKEN = fs.readFileSync('.supabase-access-token', 'utf8').trim();
const REF = 'lmnzzcqqegqugphcnmew';

async function q(sql) {
  const r = await fetch(`https://api.supabase.com/v1/projects/${REF}/database/query`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query: sql }),
  });
  const txt = await r.text();
  if (!r.ok) throw new Error(`${r.status} ${txt}`);
  return JSON.parse(txt);
}

(async () => {
  console.log('=== auth.users count ===');
  console.log(await q('SELECT COUNT(*)::int AS n FROM auth.users'));

  console.log('\n=== public.users count ===');
  console.log(await q('SELECT COUNT(*)::int AS n FROM public.users'));

  console.log('\n=== public.users id type ===');
  console.log(await q(`
    SELECT column_name, data_type
    FROM information_schema.columns
    WHERE table_schema='public' AND table_name='users' AND column_name IN ('id','email','password_hash','role','plan_tier','provider','google_id')
    ORDER BY ordinal_position
  `));

  console.log('\n=== triggers on auth.users ===');
  console.log(await q(`
    SELECT trigger_name, event_manipulation, action_timing, action_statement
    FROM information_schema.triggers
    WHERE event_object_schema='auth' AND event_object_table='users'
  `));

  console.log('\n=== existing public.users (any pre-seeded) ===');
  console.log(await q(`SELECT id, email, role, plan_tier, provider FROM public.users LIMIT 10`));

  console.log('\n=== existing auth.users ===');
  console.log(await q(`SELECT id, email, created_at FROM auth.users LIMIT 10`));
})().catch(e => { console.error('ERR', e.message); process.exit(1); });

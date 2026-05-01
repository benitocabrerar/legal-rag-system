/**
 * Import users from Render Postgres → Supabase auth.users + public.users
 *
 * Estrategia:
 *  1. Lee users de Render (DATABASE_URL).
 *  2. Para cada user, INSERT en auth.users via Supabase Management API REST query.
 *     - id = mismo UUID que Render
 *     - encrypted_password = bcrypt válido O NULL si el hash no es bcrypt válido
 *     - email_confirmed_at = now() para permitir login inmediato
 *     - raw_user_meta_data lleva name, legacy_role, legacy_plan_tier, legacy_provider
 *     - raw_app_meta_data lleva provider y providers
 *  3. El trigger handle_new_auth_user() crea row en public.users con defaults.
 *  4. UPDATE public.users con todos los campos legacy de Render.
 *  5. Verificación final.
 *
 * Idempotente: ON CONFLICT (id) DO UPDATE en auth.users; UPDATE matched en public.users.
 */
const fs = require('fs');
const { Client } = require('pg');
require('dotenv').config();

const TOKEN = fs.readFileSync('.supabase-access-token', 'utf8').trim();
const REF = 'lmnzzcqqegqugphcnmew';

const BCRYPT_RE = /^\$2[aby]\$\d{2}\$.{53}$/;

async function sb(query, params = []) {
  const r = await fetch(`https://api.supabase.com/v1/projects/${REF}/database/query`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, parameters: params }),
  });
  const txt = await r.text();
  if (!r.ok) throw new Error(`SB ${r.status}: ${txt}`);
  return JSON.parse(txt);
}

function sqlLit(v) {
  if (v === null || v === undefined) return 'NULL';
  if (typeof v === 'boolean') return v ? 'true' : 'false';
  if (typeof v === 'number') return Number.isFinite(v) ? String(v) : 'NULL';
  if (v instanceof Date) return `'${v.toISOString()}'::timestamptz`;
  if (Array.isArray(v)) {
    return `ARRAY[${v.map(x => sqlLit(x)).join(',')}]::text[]`;
  }
  if (typeof v === 'object') {
    return `'${JSON.stringify(v).replace(/'/g, "''")}'::jsonb`;
  }
  return `'${String(v).replace(/'/g, "''")}'`;
}

(async () => {
  const c = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });
  await c.connect();

  const { rows: users } = await c.query(`
    SELECT id, email, name, password_hash, role, plan_tier, is_active, last_login,
           storage_used_mb, total_queries, avatar_url, phone_number, address, city, country,
           created_at, updated_at, provider, google_id,
           two_factor_enabled, two_factor_secret, two_factor_backup_codes, two_factor_verified_at,
           bar_number, law_firm, specialization, license_state, bio, language, timezone, theme,
           email_notifications, marketing_emails
    FROM public.users
    ORDER BY created_at ASC
  `);
  await c.end();
  console.log(`Render users to process: ${users.length}\n`);

  let inserted = 0, skipped = 0;
  for (const u of users) {
    const pwdValid = BCRYPT_RE.test(u.password_hash || '');
    const encryptedPw = pwdValid ? u.password_hash : null;
    const provider = u.provider || 'email';
    const meta = {
      name: u.name || null,
      legacy_role: u.role,
      legacy_plan_tier: u.plan_tier,
      legacy_provider: u.provider,
      legacy_imported_at: new Date().toISOString(),
    };
    const appMeta = {
      provider,
      providers: [provider],
    };

    console.log(`-- ${u.email} (id=${u.id}) pwd_valid=${pwdValid}`);

    // 1. Upsert auth.users
    // IMPORTANTE: confirmation_token, recovery_token, email_change_token_*,
    // phone_change_*, reauthentication_token DEBEN ser '' (no NULL), o gotrue
    // falla con "Database error finding user" en cualquier auth flow.
    const authSql = `
      INSERT INTO auth.users (
        id, instance_id, aud, role, email, encrypted_password,
        email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
        created_at, updated_at,
        is_super_admin, is_anonymous,
        confirmation_token, recovery_token, email_change_token_new,
        email_change, phone_change, phone_change_token,
        email_change_token_current, reauthentication_token
      ) VALUES (
        ${sqlLit(u.id)}::uuid,
        '00000000-0000-0000-0000-000000000000'::uuid,
        'authenticated',
        'authenticated',
        ${sqlLit(u.email)},
        ${sqlLit(encryptedPw)},
        ${sqlLit(u.created_at)},
        ${sqlLit(appMeta)},
        ${sqlLit(meta)},
        ${sqlLit(u.created_at)},
        ${sqlLit(u.updated_at)},
        false,
        false,
        '', '', '', '', '', '', '', ''
      )
      ON CONFLICT (id) DO UPDATE SET
        email = EXCLUDED.email,
        encrypted_password = EXCLUDED.encrypted_password,
        email_confirmed_at = EXCLUDED.email_confirmed_at,
        raw_app_meta_data = EXCLUDED.raw_app_meta_data,
        raw_user_meta_data = EXCLUDED.raw_user_meta_data,
        updated_at = EXCLUDED.updated_at
      RETURNING id, email;
    `;

    try {
      const r1 = await sb(authSql);
      console.log('   auth.users:', r1[0]);
    } catch (e) {
      console.log('   ERR auth.users:', e.message);
      skipped++;
      continue;
    }

    // 2. UPDATE public.users with full legacy data (trigger already created skeleton)
    const updSql = `
      UPDATE public.users SET
        name = ${sqlLit(u.name)},
        password_hash = ${sqlLit(u.password_hash)},
        role = ${sqlLit(u.role)},
        plan_tier = ${sqlLit(u.plan_tier)},
        is_active = ${sqlLit(u.is_active)},
        last_login = ${sqlLit(u.last_login)},
        storage_used_mb = ${sqlLit(u.storage_used_mb)},
        total_queries = ${sqlLit(u.total_queries)},
        avatar_url = ${sqlLit(u.avatar_url)},
        phone_number = ${sqlLit(u.phone_number)},
        address = ${sqlLit(u.address)},
        city = ${sqlLit(u.city)},
        country = ${sqlLit(u.country)},
        provider = ${sqlLit(u.provider)},
        google_id = ${sqlLit(u.google_id)},
        two_factor_enabled = ${sqlLit(u.two_factor_enabled)},
        two_factor_secret = ${sqlLit(u.two_factor_secret)},
        two_factor_backup_codes = ${sqlLit(u.two_factor_backup_codes)},
        two_factor_verified_at = ${sqlLit(u.two_factor_verified_at)},
        bar_number = ${sqlLit(u.bar_number)},
        law_firm = ${sqlLit(u.law_firm)},
        specialization = ${sqlLit(u.specialization)},
        license_state = ${sqlLit(u.license_state)},
        bio = ${sqlLit(u.bio)},
        language = ${sqlLit(u.language)},
        timezone = ${sqlLit(u.timezone)},
        theme = ${sqlLit(u.theme)},
        email_notifications = ${sqlLit(u.email_notifications)},
        marketing_emails = ${sqlLit(u.marketing_emails)},
        created_at = ${sqlLit(u.created_at)},
        updated_at = ${sqlLit(u.updated_at)}
      WHERE id = ${sqlLit(u.id)}
      RETURNING id, email, role, plan_tier;
    `;
    try {
      const r2 = await sb(updSql);
      console.log('   public.users:', r2[0]);
      inserted++;
    } catch (e) {
      console.log('   ERR public.users:', e.message);
      skipped++;
    }
  }

  console.log(`\nDone. inserted/updated=${inserted} skipped=${skipped}`);

  // Final verification
  console.log('\n=== Verification ===');
  console.log('auth.users:', await sb(`
    SELECT id, email, encrypted_password IS NOT NULL AS has_pwd, email_confirmed_at IS NOT NULL AS confirmed,
           raw_user_meta_data->>'name' AS name
    FROM auth.users ORDER BY created_at
  `));
  console.log('\npublic.users:', await sb(`
    SELECT id, email, role, plan_tier, provider, two_factor_enabled FROM public.users ORDER BY created_at
  `));
})().catch(e => { console.error('FATAL', e); process.exit(1); });

/**
 * Aplica migrations 0001-0008 al proyecto Supabase cloud vía Management API HTTPS.
 *
 * Bypassa el problema de IPv6/pooler-not-ready en proyectos recién creados:
 * usa `POST https://api.supabase.com/v1/projects/{ref}/database/query`
 * que solo requiere conectividad HTTPS al control plane.
 *
 * Requiere:
 *   - SUPABASE_PROJECT_REF en .env
 *   - SUPABASE_ACCESS_TOKEN env var (o archivo .supabase-access-token en root)
 *
 * Idempotente: cada migration está escrita con `if not exists` / `do $$ ... end $$`
 * y `drop policy if exists ... create policy ...`.
 */
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

const ROOT = resolve(process.cwd());
const MIGRATIONS_DIR = resolve(ROOT, 'supabase/migrations');

const PROJECT_REF = process.env.SUPABASE_PROJECT_REF;
let ACCESS_TOKEN = process.env.SUPABASE_ACCESS_TOKEN;

if (!ACCESS_TOKEN && existsSync(resolve(ROOT, '.supabase-access-token'))) {
  ACCESS_TOKEN = readFileSync(resolve(ROOT, '.supabase-access-token'), 'utf8').trim();
}

if (!PROJECT_REF) throw new Error('SUPABASE_PROJECT_REF no configurada');
if (!ACCESS_TOKEN) throw new Error('SUPABASE_ACCESS_TOKEN no disponible');

const API = `https://api.supabase.com/v1/projects/${PROJECT_REF}/database/query`;

async function runQuery(sql: string, label: string): Promise<void> {
  const resp = await fetch(API, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${ACCESS_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query: sql }),
  });
  const text = await resp.text();
  if (!resp.ok) {
    console.error(`✗ ${label}\n${text}`);
    throw new Error(`HTTP ${resp.status}`);
  }
  console.log(`✓ ${label}`);
}

async function fetchAppliedMigrations(): Promise<Set<string>> {
  await runQuery(
    `create schema if not exists _migration_tracking;
     create table if not exists _migration_tracking.applied (
       name text primary key,
       applied_at timestamptz default now()
     );`,
    'init tracking table'
  );
  const resp = await fetch(API, {
    method: 'POST',
    headers: { Authorization: `Bearer ${ACCESS_TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query: 'select name from _migration_tracking.applied' }),
  });
  const rows = (await resp.json()) as Array<{ name: string }>;
  return new Set(Array.isArray(rows) ? rows.map((r) => r.name) : []);
}

async function markApplied(name: string) {
  await runQuery(
    `insert into _migration_tracking.applied (name) values ('${name.replace(/'/g, "''")}')
     on conflict (name) do nothing`,
    `track ${name}`
  );
}

async function main() {
  const force = process.argv.includes('--force');

  const applied = force ? new Set<string>() : await fetchAppliedMigrations();
  console.log(`\n${applied.size} migrations ya aplicadas previamente`);

  const files = readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith('.sql'))
    .sort();

  const pending = files.filter((f) => !applied.has(f));
  console.log(`Aplicando ${pending.length} migrations a proyecto ${PROJECT_REF}\n`);

  for (const f of files) {
    if (applied.has(f)) { console.log(`· ${f} (ya aplicada)`); continue; }
    const sql = readFileSync(resolve(MIGRATIONS_DIR, f), 'utf8');
    if (!sql.trim()) continue;
    try {
      await runQuery(sql, f);
      await markApplied(f);
    } catch (err) {
      console.error(`Falló en ${f}:`, (err as Error).message);
      process.exit(1);
    }
  }

  console.log('\n=== Health check ===\n');
  const healthQuery = 'select public.migration_health_check() as h;';
  const resp = await fetch(API, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${ACCESS_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query: healthQuery }),
  });
  const json = await resp.json();
  console.log(JSON.stringify(json, null, 2));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

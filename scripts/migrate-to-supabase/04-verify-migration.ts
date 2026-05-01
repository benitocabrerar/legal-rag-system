/**
 * Script 04 — Verificación de la migración Supabase.
 *
 * Llama a public.migration_health_check() y reporta el estado.
 * Exit code 0 si todo OK, 1 si algo crítico falta.
 *
 * Uso:
 *   tsx scripts/migrate-to-supabase/04-verify-migration.ts
 */
import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const SUPABASE_URL = need('SUPABASE_URL');
const SERVICE_ROLE_KEY = need('SUPABASE_SERVICE_ROLE_KEY');

interface HealthReport {
  extensions_ok: boolean;
  extensions_count: number;
  rls_enabled_tables: number;
  vector_columns: number;
  hnsw_indexes: number;
  rpc_search_exists: boolean;
  jwt_hook_exists: boolean;
  auth_sync_trigger: boolean;
  storage_buckets: number;
  reembed_legal_pending: number;
  reembed_legal_done: number;
  ready_for_phase_2: boolean;
  ready_for_phase_4: boolean;
}

async function main() {
  const sb = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data, error } = await sb.rpc('migration_health_check');
  if (error) {
    console.error('✗ no pude llamar migration_health_check:', error.message);
    console.error('  asegúrate de haber aplicado migrations/0008_verification.sql');
    process.exit(2);
  }

  const r = data as HealthReport;
  const checks: Array<[string, boolean, string]> = [
    ['Extensiones (vector, pg_trgm, pgcrypto)', r.extensions_ok, `${r.extensions_count}/3`],
    ['Tablas con RLS habilitado', r.rls_enabled_tables >= 20, `${r.rls_enabled_tables}`],
    ['Columnas vector(1536)', r.vector_columns >= 2, `${r.vector_columns}`],
    ['Índices HNSW', r.hnsw_indexes >= 2, `${r.hnsw_indexes}`],
    ['RPC search_legal_chunks', r.rpc_search_exists, ''],
    ['JWT custom hook', r.jwt_hook_exists, ''],
    ['Trigger auth.users → public.users', r.auth_sync_trigger, ''],
    ['Buckets de Storage', r.storage_buckets === 3, `${r.storage_buckets}/3`],
  ];

  console.log('\n=== Migration Health Check ===\n');
  let failed = 0;
  for (const [name, ok, info] of checks) {
    const icon = ok ? '✓' : '✗';
    const tag = info ? `(${info})` : '';
    console.log(`${icon} ${name} ${tag}`);
    if (!ok) failed++;
  }

  console.log('\n=== Re-embedding ===');
  const total = r.reembed_legal_done + Math.max(0, r.reembed_legal_pending);
  if (total > 0) {
    const pct = ((r.reembed_legal_done / total) * 100).toFixed(1);
    console.log(`  legal_document_chunks: ${r.reembed_legal_done}/${total} (${pct}%)`);
    if (r.reembed_legal_pending > 0) {
      console.log(`  → ${r.reembed_legal_pending} pendientes. Correr: npm run migrate:supabase:reembed`);
    }
  } else {
    console.log('  (sin chunks legales todavía)');
  }

  console.log('\n=== Veredicto por fase ===');
  console.log(`  Listo para Fase 2 (RLS + Auth): ${r.ready_for_phase_2 ? 'SÍ ✓' : 'NO ✗'}`);
  console.log(`  Listo para Fase 4 (Cutover):    ${r.ready_for_phase_4 ? 'SÍ ✓' : 'NO ✗'}`);

  process.exit(failed > 0 ? 1 : 0);
}

function need(name: string): string {
  const v = process.env[name];
  if (!v) {
    console.error(`✗ ${name} es requerida`);
    process.exit(2);
  }
  return v;
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

-- =============================================================================
-- Migration 0008 — Función de health-check de la migración
-- =============================================================================
-- Devuelve un JSON con el estado de cada componente crítico, para poder
-- verificar desde fuera (script 04-verify-migration.ts) si la migración está
-- aplicada y consistente.
-- =============================================================================

create or replace function public.migration_health_check()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  result jsonb := '{}'::jsonb;
  ext_count int;
  rls_count int;
  vector_cols_count int;
  hnsw_count int;
  rpc_exists boolean;
  hook_exists boolean;
  trigger_exists boolean;
  bucket_count int;
  pending_reembed bigint;
  done_reembed bigint;
begin
  -- 1. Extensiones críticas
  select count(*) into ext_count
  from pg_extension
  where extname in ('vector','pg_trgm','pgcrypto');

  result := jsonb_set(result, '{extensions_ok}', to_jsonb(ext_count >= 3));
  result := jsonb_set(result, '{extensions_count}', to_jsonb(ext_count));

  -- 2. Tablas con RLS habilitado
  select count(*) into rls_count
  from pg_class c
  join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public'
    and c.relkind = 'r'
    and c.relrowsecurity = true;

  result := jsonb_set(result, '{rls_enabled_tables}', to_jsonb(rls_count));

  -- 3. Columnas embedding_v vector(1536)
  select count(*) into vector_cols_count
  from information_schema.columns
  where table_schema = 'public'
    and column_name = 'embedding_v'
    and udt_name = 'vector';

  result := jsonb_set(result, '{vector_columns}', to_jsonb(vector_cols_count));

  -- 4. Índices HNSW
  select count(*) into hnsw_count
  from pg_indexes
  where schemaname = 'public'
    and indexdef ilike '%using hnsw%';

  result := jsonb_set(result, '{hnsw_indexes}', to_jsonb(hnsw_count));

  -- 5. RPC de búsqueda existe
  select exists (
    select 1 from pg_proc p
    join pg_namespace n on p.pronamespace = n.oid
    where n.nspname = 'public' and p.proname = 'search_legal_chunks'
  ) into rpc_exists;
  result := jsonb_set(result, '{rpc_search_exists}', to_jsonb(rpc_exists));

  -- 6. Custom Access Token Hook existe
  select exists (
    select 1 from pg_proc p
    join pg_namespace n on p.pronamespace = n.oid
    where n.nspname = 'public' and p.proname = 'custom_access_token_hook'
  ) into hook_exists;
  result := jsonb_set(result, '{jwt_hook_exists}', to_jsonb(hook_exists));

  -- 7. Trigger auth.users → public.users
  select exists (
    select 1 from pg_trigger
    where tgname = 'on_auth_user_created'
  ) into trigger_exists;
  result := jsonb_set(result, '{auth_sync_trigger}', to_jsonb(trigger_exists));

  -- 8. Buckets de Storage
  begin
    select count(*) into bucket_count from storage.buckets
    where id in ('legal-documents','user-avatars','backups');
  exception when undefined_table then
    bucket_count := -1;  -- storage schema no instalado (CI con schema mínimo)
  end;
  result := jsonb_set(result, '{storage_buckets}', to_jsonb(bucket_count));

  -- 9. Progreso de re-embedding
  begin
    select count(*) into pending_reembed
      from public.legal_document_chunks where embedding_v is null;
    select count(*) into done_reembed
      from public.legal_document_chunks where embedding_v is not null;
    result := jsonb_set(result, '{reembed_legal_pending}', to_jsonb(pending_reembed));
    result := jsonb_set(result, '{reembed_legal_done}', to_jsonb(done_reembed));
  exception when undefined_column then
    result := jsonb_set(result, '{reembed_legal_pending}', to_jsonb(-1));
  end;

  -- 10. Veredicto agregado
  result := jsonb_set(result, '{ready_for_phase_2}', to_jsonb(
    ext_count >= 3 and vector_cols_count >= 2 and hnsw_count >= 2 and rpc_exists
  ));
  result := jsonb_set(result, '{ready_for_phase_4}', to_jsonb(
    ext_count >= 3 and vector_cols_count >= 2 and hnsw_count >= 2 and rpc_exists
    and hook_exists and trigger_exists and rls_count >= 20
  ));

  return result;
end;
$$;

grant execute on function public.migration_health_check() to authenticated, service_role;

comment on function public.migration_health_check is
  'Health check de la migración Supabase. Llamar via supabase.rpc(''migration_health_check'') o select migration_health_check();';

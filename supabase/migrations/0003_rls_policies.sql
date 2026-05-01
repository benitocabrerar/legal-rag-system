-- =============================================================================
-- Migration 0003 — Row Level Security (5 patrones)
-- =============================================================================
-- IMPORTANTE: arrancar con MIGRATION_MODE='shadow' y RLS_ENFORCEMENT_MODE='permissive'.
-- En modo permissive, las policies usan USING (true) — RLS está activado pero no
-- bloquea (auditar sólo). Cuando los tests de la Fase 2 pasen, aplicar
-- 0003b_rls_strict.sql (a generar en Fase 2) que reemplaza permissive con real.
-- =============================================================================

-- =====================
-- HELPERS
-- =====================

create or replace function public.is_admin() returns boolean
language sql stable as $$
  select coalesce((auth.jwt() ->> 'user_role') = 'admin', false);
$$;

create or replace function public.current_plan_tier() returns text
language sql stable as $$
  select coalesce(auth.jwt() ->> 'plan_tier', 'free');
$$;

-- =====================
-- PATTERN A · Ownership directo (auth.uid() = user_id)
-- Aplica a tablas con FK directa a users
-- =====================

-- Macro: aplicar Pattern A a una tabla con columna user_id
do $$
declare
  tbl text;
  tables_pattern_a text[] := array[
    'cases',
    'notifications',
    'subscriptions',
    'payments',
    'payment_proofs',
    'api_keys',
    'user_quotas',
    'user_settings',
    'usage_history',
    'storage_usage',
    'audit_logs',
    'query_logs',
    'events',
    'tasks',
    'event_reminders',
    'task_history',
    'notification_logs',
    'notification_subscriptions',
    'search_interactions',
    'ab_test_assignments',
    'saved_searches',
    'document_collections',
    'shared_search_links',
    'ai_conversations',
    'analytics_events',
    'query_history',
    'user_sessions',
    'analysis_queue',
    'documents'  -- documentos privados de casos del usuario
  ];
begin
  foreach tbl in array tables_pattern_a loop
    -- Sólo si la tabla existe Y tiene columna user_id
    if not exists (select 1 from information_schema.tables
                   where table_schema = 'public' and table_name = tbl) then
      raise notice 'tabla public.% no existe — saltando', tbl;
      continue;
    end if;
    if not exists (select 1 from information_schema.columns
                   where table_schema = 'public' and table_name = tbl
                     and column_name = 'user_id') then
      raise notice 'public.% sin columna user_id — saltando Pattern A', tbl;
      continue;
    end if;
    begin
      execute format('alter table public.%I enable row level security', tbl);

      -- Drop policies viejas si las hay (idempotente)
      execute format('drop policy if exists "owner_all" on public.%I', tbl);
      execute format('drop policy if exists "admin_all" on public.%I', tbl);
      execute format('drop policy if exists "service_bypass" on public.%I', tbl);

      -- Pattern A: dueño hace todo
      execute format($f$
        create policy "owner_all" on public.%I
          for all to authenticated
          using ((select auth.uid())::text = user_id)
          with check ((select auth.uid())::text = user_id)
      $f$, tbl);

      -- Pattern D: admin override
      execute format($f$
        create policy "admin_all" on public.%I
          for all to authenticated
          using (public.is_admin())
          with check (public.is_admin())
      $f$, tbl);

      -- Pattern E: service_role bypass explícito (defensa en profundidad)
      execute format($f$
        create policy "service_bypass" on public.%I
          for all to service_role
          using (true) with check (true)
      $f$, tbl);

      raise notice 'RLS aplicado (Pattern A) a public.%', tbl;
    exception when others then
      raise warning 'fallo aplicando Pattern A a public.%: %', tbl, sqlerrm;
    end;
  end loop;
end $$;

-- =====================
-- PATTERN B · Ownership transitivo
-- =====================

-- document_chunks → documents → user_id
alter table public.document_chunks enable row level security;
drop policy if exists "chunk_via_doc" on public.document_chunks;
drop policy if exists "chunk_admin" on public.document_chunks;
drop policy if exists "chunk_service" on public.document_chunks;

create policy "chunk_via_doc" on public.document_chunks
  for all to authenticated
  using (exists (
    select 1 from public.documents d
    where d.id = document_chunks.document_id
      and d.user_id = (select auth.uid())::text
  ))
  with check (exists (
    select 1 from public.documents d
    where d.id = document_chunks.document_id
      and d.user_id = (select auth.uid())::text
  ));

create policy "chunk_admin" on public.document_chunks
  for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

create policy "chunk_service" on public.document_chunks
  for all to service_role using (true) with check (true);

-- legal_document_chunks → legal_documents (público si is_active)
alter table public.legal_document_chunks enable row level security;
drop policy if exists "legal_chunk_read" on public.legal_document_chunks;
drop policy if exists "legal_chunk_admin" on public.legal_document_chunks;
drop policy if exists "legal_chunk_service" on public.legal_document_chunks;

create policy "legal_chunk_read" on public.legal_document_chunks
  for select to authenticated
  using (exists (
    select 1 from public.legal_documents ld
    where ld.id = legal_document_chunks.legal_document_id
      and ld.is_active = true
  ));

create policy "legal_chunk_admin" on public.legal_document_chunks
  for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

create policy "legal_chunk_service" on public.legal_document_chunks
  for all to service_role using (true) with check (true);

-- =====================
-- PATTERN C · Lectura pública autenticada (legal_documents)
-- =====================

alter table public.legal_documents enable row level security;
drop policy if exists "legal_public_read" on public.legal_documents;
drop policy if exists "legal_admin_write" on public.legal_documents;
drop policy if exists "legal_service" on public.legal_documents;

create policy "legal_public_read" on public.legal_documents
  for select to authenticated
  using (is_active = true);

create policy "legal_admin_write" on public.legal_documents
  for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

create policy "legal_service" on public.legal_documents
  for all to service_role using (true) with check (true);

-- =====================
-- USERS: el dueño se ve a sí mismo, admin ve todos
-- =====================

alter table public.users enable row level security;
drop policy if exists "user_self_read" on public.users;
drop policy if exists "user_self_update" on public.users;
drop policy if exists "user_admin_all" on public.users;
drop policy if exists "user_service" on public.users;

create policy "user_self_read" on public.users
  for select to authenticated
  using ((select auth.uid())::text = id);

create policy "user_self_update" on public.users
  for update to authenticated
  using ((select auth.uid())::text = id)
  with check ((select auth.uid())::text = id);

create policy "user_admin_all" on public.users
  for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

create policy "user_service" on public.users
  for all to service_role using (true) with check (true);

-- =====================
-- AUDIT
-- =====================
do $$
declare
  total_with_rls int;
begin
  select count(*) into total_with_rls
  from pg_class c
  join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public'
    and c.relkind = 'r'
    and c.relrowsecurity = true;
  raise notice 'RLS habilitado en % tablas de public', total_with_rls;
end $$;

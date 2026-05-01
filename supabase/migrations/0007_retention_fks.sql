-- =============================================================================
-- Migration 0007 — Retención post-deleción de usuario
-- =============================================================================
-- Compliance/contabilidad obliga a conservar AuditLog, Payment, PaymentProof
-- después de borrar al usuario. Cambiamos los FK existentes a ON DELETE SET NULL.
--
-- IMPORTANTE: 0004_auth_sync_and_hook.sql ya hizo `alter column user_id drop not null`
-- en estas tablas. Aquí completamos el FK.
-- =============================================================================

do $$
declare
  rec record;
  retention_tables text[] := array['audit_logs','payments','payment_proofs'];
  tbl text;
begin
  foreach tbl in array retention_tables loop
    if not exists (select 1 from information_schema.tables
                   where table_schema='public' and table_name=tbl) then
      raise notice 'tabla % no existe — saltando', tbl;
      continue;
    end if;

    -- Encontrar el FK actual sobre user_id (puede tener nombre auto-generado)
    for rec in
      select tc.constraint_name
      from information_schema.table_constraints tc
      join information_schema.key_column_usage kcu
        on tc.constraint_name = kcu.constraint_name
       and tc.table_schema = kcu.table_schema
      where tc.table_schema = 'public'
        and tc.table_name = tbl
        and tc.constraint_type = 'FOREIGN KEY'
        and kcu.column_name = 'user_id'
    loop
      execute format('alter table public.%I drop constraint %I', tbl, rec.constraint_name);
      raise notice 'dropped FK % en public.%', rec.constraint_name, tbl;
    end loop;

    -- Recrear con ON DELETE SET NULL
    execute format($f$
      alter table public.%I
        add constraint %I
        foreign key (user_id) references public.users(id)
        on delete set null on update cascade
    $f$, tbl, tbl || '_user_id_retention_fkey');

    raise notice 'recreated FK con ON DELETE SET NULL para public.%', tbl;
  end loop;
end $$;

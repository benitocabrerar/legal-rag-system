-- =============================================================================
-- Migration 0004 — Sync auth.users ↔ public.users + Custom Access Token Hook
-- =============================================================================
-- Estrategia id-match: public.users.id = auth.users.id (mismo UUID).
-- - Importa usuarios existentes de public.users a auth.users (one-shot).
-- - Trigger AFTER INSERT en auth.users → crea row en public.users si no existe.
-- - Custom Access Token Hook inyecta `user_role` y `plan_tier` en el JWT.
-- =============================================================================

-- =====================
-- ONE-SHOT: importar public.users → auth.users
-- =====================
-- Idempotente: ON CONFLICT DO NOTHING. bcrypt $2a$/$2b$ es compatible con auth.users.
-- ⚠️  Ejecutar UNA SOLA VEZ y verificar count antes y después.

-- Skipped en proyecto vacío: no hay public.users para importar todavía.
-- Reactivar tras restaurar pg_dump de Render.
do $$ begin
  if exists (select 1 from public.users limit 1) then
    insert into auth.users (
      id, email, encrypted_password, email_confirmed_at, created_at, updated_at,
      raw_app_meta_data, raw_user_meta_data, aud, role
    )
    select
      u.id::uuid,
      u.email,
      u.password_hash,
      coalesce(u.last_login, u.created_at, now()),
      u.created_at,
      u.updated_at,
      jsonb_build_object(
        'provider', case when u.google_id is not null then 'google' else 'email' end,
        'providers', case
          when u.google_id is not null then array['email','google']
          else array['email']
        end
      ),
      jsonb_build_object('name', u.name, 'avatar_url', u.avatar_url),
      'authenticated',
      'authenticated'
    from public.users u
    where u.password_hash is not null
    on conflict (id) do nothing;

    insert into auth.identities (
      id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at
    )
    select
      gen_random_uuid(),
      u.id::uuid,
      u.google_id,
      jsonb_build_object('sub', u.google_id, 'email', u.email, 'email_verified', true),
      'google',
      now(), now(), now()
    from public.users u
    where u.google_id is not null
    on conflict do nothing;
  end if;
end $$;

-- =====================
-- TRIGGER: nuevos signups → public.users
-- =====================
create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.users (id, email, name, role, plan_tier, is_active, provider, created_at, updated_at)
  values (
    new.id::text,
    new.email,
    coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
    'user',
    'free',
    true,
    coalesce(new.raw_app_meta_data->>'provider', 'email'),
    now(), now()
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute function public.handle_new_auth_user();

-- =====================
-- CUSTOM ACCESS TOKEN HOOK
-- Inyecta user_role + plan_tier en el JWT. Se invoca en cada token issued.
-- Activar manualmente en Dashboard → Authentication → Hooks.
-- =====================
create or replace function public.custom_access_token_hook(event jsonb)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  claims jsonb := coalesce(event->'claims', '{}'::jsonb);
  u record;
begin
  select role, plan_tier
    into u
    from public.users
    where id = (event->>'user_id');

  if found then
    claims := jsonb_set(claims, '{user_role}', to_jsonb(coalesce(u.role, 'user')));
    claims := jsonb_set(claims, '{plan_tier}', to_jsonb(coalesce(u.plan_tier, 'free')));
  else
    claims := jsonb_set(claims, '{user_role}', '"user"'::jsonb);
    claims := jsonb_set(claims, '{plan_tier}', '"free"'::jsonb);
  end if;

  return jsonb_set(event, '{claims}', claims);
end;
$$;

grant execute on function public.custom_access_token_hook to supabase_auth_admin;
revoke execute on function public.custom_access_token_hook from authenticated, anon, public;

comment on function public.custom_access_token_hook is
  'Activar en Dashboard → Authentication → Hooks → Custom Access Token (después de aplicar esta migration).';

-- =====================
-- FK INTEGRITY: public.users.id debe coincidir con auth.users.id
-- =====================
-- public.users.id es text (Prisma String); auth.users.id es uuid.
-- No se puede crear FK directo entre tipos incompatibles. La integridad
-- la garantizan: (a) trigger handle_new_auth_user que castea uuid→text,
-- (b) en cleanup post-deletion, ON DELETE de auth.users requiere un trigger.
create or replace function public.cascade_auth_user_delete()
returns trigger language plpgsql security definer set search_path = public as $f$
begin
  delete from public.users where id = old.id::text;
  return old;
end;
$f$;

drop trigger if exists on_auth_user_deleted on auth.users;
create trigger on_auth_user_deleted
  after delete on auth.users
  for each row execute function public.cascade_auth_user_delete();

-- =====================
-- RETENTION: AuditLog y Payment NO deben cascade-delete con el user
-- =====================
-- Compliance/contabilidad obliga retención post-deleción de usuario.
-- Cambiar el FK existente de ON DELETE CASCADE a ON DELETE SET NULL.

do $$
declare
  tbl text;
  retention_tables text[] := array['audit_logs', 'payments', 'payment_proofs'];
begin
  foreach tbl in array retention_tables loop
    if exists (select 1 from information_schema.tables
               where table_schema='public' and table_name=tbl) then
      -- Permitir user_id NULL en estas tablas (registro huérfano post-deletion)
      execute format('alter table public.%I alter column user_id drop not null', tbl);
      raise notice 'Retention configurada para public.% (user_id puede ser NULL)', tbl;
    end if;
  end loop;
end $$;

-- Nota: el FK con ON DELETE SET NULL se reescribirá en una migration posterior
-- (requiere drop + recreate del constraint, riesgoso si hay locks). En Fase 2.

-- =============================================================================
-- Migration 0006 — Buckets de Storage + RLS policies
-- =============================================================================
-- Crea los 3 buckets que reemplazan a S3:
--   legal-documents    (público de lectura, escritura admin)
--   user-avatars       (público de lectura, escritura por dueño)
--   backups            (privado, solo service_role)
--
-- Las policies viven en storage.objects (esquema gestionado por Supabase Storage).
-- =============================================================================

-- ==========================================================================
-- BUCKETS
-- ==========================================================================
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('legal-documents', 'legal-documents', false, 52428800,  -- 50 MB
   array['application/pdf','text/plain',
         'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
         'application/msword'])
on conflict (id) do update set
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('user-avatars', 'user-avatars', true, 5242880,           -- 5 MB
   array['image/png','image/jpeg','image/webp'])
on conflict (id) do update set
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

insert into storage.buckets (id, name, public, file_size_limit)
values ('backups', 'backups', false, null)
on conflict (id) do nothing;

-- ==========================================================================
-- POLICIES · legal-documents
-- ==========================================================================
-- Convención de keys: <legal_document_id>/<filename>.<ext>
-- Lectura: cualquier usuario autenticado (lo mismo que tabla legal_documents).
-- Escritura: solo admin.
drop policy if exists "legal_docs_read" on storage.objects;
drop policy if exists "legal_docs_admin_write" on storage.objects;
drop policy if exists "legal_docs_service" on storage.objects;

create policy "legal_docs_read" on storage.objects
  for select to authenticated
  using (bucket_id = 'legal-documents');

create policy "legal_docs_admin_write" on storage.objects
  for all to authenticated
  using (bucket_id = 'legal-documents' and public.is_admin())
  with check (bucket_id = 'legal-documents' and public.is_admin());

create policy "legal_docs_service" on storage.objects
  for all to service_role
  using (bucket_id = 'legal-documents')
  with check (bucket_id = 'legal-documents');

-- ==========================================================================
-- POLICIES · user-avatars
-- ==========================================================================
-- Convención de keys: <user_id>/<filename>
-- Lectura: público (para que <img src> funcione sin auth).
-- Escritura: el dueño en su propio path.
drop policy if exists "avatars_public_read" on storage.objects;
drop policy if exists "avatars_owner_write" on storage.objects;

create policy "avatars_public_read" on storage.objects
  for select to anon, authenticated
  using (bucket_id = 'user-avatars');

create policy "avatars_owner_write" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'user-avatars'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

create policy "avatars_owner_update" on storage.objects
  for update to authenticated
  using (
    bucket_id = 'user-avatars'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  )
  with check (
    bucket_id = 'user-avatars'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

create policy "avatars_owner_delete" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'user-avatars'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

-- ==========================================================================
-- POLICIES · backups
-- ==========================================================================
-- Acceso EXCLUSIVO a service_role (workers de backup).
drop policy if exists "backups_service_only" on storage.objects;
create policy "backups_service_only" on storage.objects
  for all to service_role
  using (bucket_id = 'backups')
  with check (bucket_id = 'backups');

-- =============================================================================
-- Migration 0002 — Columnas vector(1536) e índices HNSW
-- =============================================================================
-- Estrategia: añadir columnas paralelas `embedding_v` para permitir re-embedding
-- progresivo SIN downtime. La columna `embedding` jsonb actual queda intacta.
-- Un job batch (scripts/migrate-to-supabase/02-reembed.ts) llena `embedding_v`.
-- Cuando todas las filas tienen `embedding_v IS NOT NULL`:
--   1. Cambiar app para leer de `embedding_v`
--   2. Drop column `embedding`
--   3. Rename `embedding_v` → `embedding`
-- =============================================================================

-- ----- legal_document_chunks (corpus principal RAG) -----
alter table public.legal_document_chunks
  add column if not exists embedding_v vector(1536);

-- HNSW: m=16 (conexiones por nodo), ef_construction=64 (calidad de build).
-- vector_cosine_ops: distancia coseno (<=>). Cambiar a vector_ip_ops si normalizan.
create index if not exists idx_ldc_embedding_hnsw
  on public.legal_document_chunks
  using hnsw (embedding_v vector_cosine_ops)
  with (m = 16, ef_construction = 64);

-- FTS español para hybrid search (RRF). Idempotente vía CREATE INDEX IF NOT EXISTS.
create index if not exists idx_ldc_content_fts
  on public.legal_document_chunks
  using gin (to_tsvector('spanish', content));

-- Trigram para fuzzy matching de números de norma, citas, etc.
create index if not exists idx_ldc_content_trgm
  on public.legal_document_chunks
  using gin (content gin_trgm_ops);

-- ----- document_chunks (documentos privados de casos) -----
alter table public.document_chunks
  add column if not exists embedding_v vector(1536);

create index if not exists idx_dc_embedding_hnsw
  on public.document_chunks
  using hnsw (embedding_v vector_cosine_ops)
  with (m = 16, ef_construction = 64);

create index if not exists idx_dc_content_fts
  on public.document_chunks
  using gin (to_tsvector('spanish', content));

-- ----- Índices auxiliares para FTS sobre documentos completos -----
create index if not exists idx_legal_documents_fts
  on public.legal_documents
  using gin (
    to_tsvector('spanish',
      coalesce(norm_title, '') || ' ' || coalesce(content, '')
    )
  );

-- ----- Tracking de re-embedding -----
-- Tabla auxiliar para auditar el progreso del job batch.
create table if not exists public.reembed_progress (
  id              uuid primary key default gen_random_uuid(),
  table_name      text not null,
  chunk_id        uuid not null,
  status          text not null check (status in ('pending','processing','done','failed')),
  model           text not null default 'text-embedding-3-small',
  started_at      timestamptz,
  completed_at    timestamptz,
  error_message   text,
  created_at      timestamptz default now(),
  unique (table_name, chunk_id)
);

create index if not exists idx_reembed_status
  on public.reembed_progress (status, table_name);

comment on table public.reembed_progress is
  'Tracking del job de re-embedding masivo (scripts/migrate-to-supabase/02-reembed.ts). Eliminar tras Fase 1.';

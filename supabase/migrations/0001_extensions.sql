-- =============================================================================
-- Migration 0001 — Extensiones gestionadas por Supabase
-- =============================================================================
-- Fase 1 del plan de migración. Idempotente.
-- =============================================================================

create extension if not exists "uuid-ossp";    -- gen_random_uuid() ya viene con pgcrypto
create extension if not exists pgcrypto;       -- hashing, gen_random_bytes
create extension if not exists vector;         -- pgvector — embeddings nativos
create extension if not exists pg_trgm;        -- similitud léxica (LIKE acelerado)
create extension if not exists btree_gin;      -- índices compuestos GIN + btree
create extension if not exists pg_stat_statements; -- observability de queries

-- pg_cron sólo en Pro+: programar jobs (re-embedding nocturno, vacuum)
-- create extension if not exists pg_cron;

-- pgmq: cola de mensajes nativa (alternativa futura a BullMQ)
-- create extension if not exists pgmq;

-- Verificación
do $$
begin
  if not exists (select 1 from pg_extension where extname = 'vector') then
    raise exception 'vector extension no instalada';
  end if;
  raise notice 'extensiones core listas: vector, pg_trgm, pgcrypto';
end $$;

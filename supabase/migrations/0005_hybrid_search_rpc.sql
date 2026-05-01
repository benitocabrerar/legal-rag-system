-- =============================================================================
-- Migration 0005 — RPC unificada de búsqueda híbrida (RRF)
-- =============================================================================
-- Reemplaza los 3 pipelines actuales:
--   - routes/query.ts (cosine en JS sobre 1.000 chunks)
--   - orchestration/unified-search-orchestrator.ts (ILIKE)
--   - orchestration/queryRouter.ts (raw SQL roto por jsonb<=>vector)
-- por una sola función SQL invocable desde el cliente Supabase con RPC.
-- =============================================================================

-- =====================
-- Hybrid search: semantic (HNSW) + keyword (FTS spanish) fusionados con RRF
-- =====================
create or replace function public.search_legal_chunks(
  query_embedding   vector(1536),
  query_text        text,
  match_count       int default 20,
  semantic_weight   float default 1.0,
  keyword_weight    float default 1.0,
  rrf_k             int default 60,
  filter_doc_id     uuid default null,
  filter_norm_type  text default null,
  filter_jurisdiction text default null
)
returns table (
  chunk_id          uuid,
  legal_document_id uuid,
  norm_title        text,
  content           text,
  rrf_score         float,
  semantic_rank     int,
  keyword_rank      int,
  semantic_distance float
)
language plpgsql
stable
parallel safe
security invoker  -- respeta RLS del caller
as $$
begin
  return query
  with semantic as (
    select
      ldc.id,
      ldc.legal_document_id,
      ldc.embedding_v <=> query_embedding as distance,
      row_number() over (order by ldc.embedding_v <=> query_embedding) as r
    from public.legal_document_chunks ldc
    join public.legal_documents ld on ld.id = ldc.legal_document_id
    where ld.is_active = true
      and ldc.embedding_v is not null
      and (filter_doc_id is null or ldc.legal_document_id = filter_doc_id)
      and (filter_norm_type is null or ld.norm_type::text = filter_norm_type)
      and (filter_jurisdiction is null or ld.jurisdiction::text = filter_jurisdiction)
    order by ldc.embedding_v <=> query_embedding
    limit greatest(match_count * 3, 60)
  ),
  keyword as (
    select
      ldc.id,
      ldc.legal_document_id,
      row_number() over (
        order by ts_rank_cd(
          to_tsvector('spanish', ldc.content),
          websearch_to_tsquery('spanish', query_text)
        ) desc
      ) as r
    from public.legal_document_chunks ldc
    join public.legal_documents ld on ld.id = ldc.legal_document_id
    where ld.is_active = true
      and to_tsvector('spanish', ldc.content) @@ websearch_to_tsquery('spanish', query_text)
      and (filter_doc_id is null or ldc.legal_document_id = filter_doc_id)
      and (filter_norm_type is null or ld.norm_type::text = filter_norm_type)
      and (filter_jurisdiction is null or ld.jurisdiction::text = filter_jurisdiction)
    limit greatest(match_count * 3, 60)
  ),
  fused as (
    select
      coalesce(s.id, k.id) as id,
      coalesce(s.legal_document_id, k.legal_document_id) as legal_document_id,
      (semantic_weight * (1.0 / (rrf_k + coalesce(s.r, 9999))))
        + (keyword_weight * (1.0 / (rrf_k + coalesce(k.r, 9999)))) as score,
      s.r as srank,
      k.r as krank,
      s.distance as sdist
    from semantic s
    full outer join keyword k on s.id = k.id
  )
  select
    f.id,
    f.legal_document_id,
    ld.norm_title,
    ldc.content,
    f.score,
    f.srank::int,
    f.krank::int,
    f.sdist
  from fused f
  join public.legal_document_chunks ldc on ldc.id = f.id
  join public.legal_documents ld on ld.id = f.legal_document_id
  order by f.score desc
  limit match_count;
end;
$$;

comment on function public.search_legal_chunks is
  'Búsqueda híbrida (semantic HNSW + keyword FTS) con Reciprocal Rank Fusion. '
  'Llamar via supabase.rpc(''search_legal_chunks'', { query_embedding, query_text, ... }).';

-- =====================
-- Variante para documentos privados (caso de usuario)
-- =====================
create or replace function public.search_user_documents(
  query_embedding vector(1536),
  query_text      text,
  match_count     int default 20,
  filter_case_id  uuid default null
)
returns table (
  chunk_id    uuid,
  document_id uuid,
  title       text,
  content     text,
  rrf_score   float
)
language plpgsql
stable
parallel safe
security invoker
as $$
begin
  return query
  with sem as (
    select dc.id, dc.document_id,
           row_number() over (order by dc.embedding_v <=> query_embedding) as r
    from public.document_chunks dc
    join public.documents d on d.id = dc.document_id
    where dc.embedding_v is not null
      and (filter_case_id is null or d.case_id = filter_case_id)
    order by dc.embedding_v <=> query_embedding
    limit greatest(match_count * 3, 60)
  ),
  kw as (
    select dc.id, dc.document_id,
           row_number() over (
             order by ts_rank_cd(
               to_tsvector('spanish', dc.content),
               websearch_to_tsquery('spanish', query_text)
             ) desc
           ) as r
    from public.document_chunks dc
    join public.documents d on d.id = dc.document_id
    where to_tsvector('spanish', dc.content) @@ websearch_to_tsquery('spanish', query_text)
      and (filter_case_id is null or d.case_id = filter_case_id)
    limit greatest(match_count * 3, 60)
  )
  select
    coalesce(sem.id, kw.id),
    coalesce(sem.document_id, kw.document_id),
    d.title,
    dc.content,
    (1.0 / (60 + coalesce(sem.r, 9999))) + (1.0 / (60 + coalesce(kw.r, 9999))) as score
  from sem
  full outer join kw on sem.id = kw.id
  join public.document_chunks dc on dc.id = coalesce(sem.id, kw.id)
  join public.documents d on d.id = dc.document_id
  order by score desc
  limit match_count;
end;
$$;

-- =====================
-- Permissions
-- =====================
grant execute on function public.search_legal_chunks(vector, text, int, float, float, int, uuid, text, text)
  to authenticated, anon;
grant execute on function public.search_user_documents(vector, text, int, uuid)
  to authenticated;

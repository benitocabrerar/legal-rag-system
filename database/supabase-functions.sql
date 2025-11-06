-- ============================================================================
-- Supabase Functions for Legal RAG System
-- ============================================================================
-- Vector similarity search functions for legal documents and case documents

-- ============================================================================
-- 1. Search Legal Documents by Vector Similarity
-- ============================================================================

CREATE OR REPLACE FUNCTION match_legal_documents(
  query_embedding vector(3072),
  match_threshold float DEFAULT 0.7,
  match_count int DEFAULT 5,
  filter_jurisdiction text DEFAULT NULL,
  filter_type text DEFAULT NULL
)
RETURNS TABLE (
  id uuid,
  document_id uuid,
  content text,
  chunk_index int,
  similarity float,
  document_title text,
  document_type text,
  jurisdiction text,
  metadata jsonb
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    ldc.id,
    ldc.document_id,
    ldc.content,
    ldc.chunk_index,
    1 - (ldc.embedding <=> query_embedding) AS similarity,
    ld.title AS document_title,
    ld.type::text AS document_type,
    ld.jurisdiction,
    ldc.metadata
  FROM legal_document_chunks ldc
  JOIN legal_documents ld ON ldc.document_id = ld.id
  WHERE
    (1 - (ldc.embedding <=> query_embedding)) > match_threshold
    AND (filter_jurisdiction IS NULL OR ld.jurisdiction = filter_jurisdiction)
    AND (filter_type IS NULL OR ld.type::text = filter_type)
  ORDER BY ldc.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- Example usage:
-- SELECT * FROM match_legal_documents(
--   query_embedding := '[0.1, 0.2, ...]'::vector(3072),
--   match_threshold := 0.75,
--   match_count := 10,
--   filter_jurisdiction := 'Ecuador'
-- );

-- ============================================================================
-- 2. Search Case Documents by Vector Similarity
-- ============================================================================

CREATE OR REPLACE FUNCTION match_case_documents(
  case_id uuid,
  query_embedding vector(3072),
  match_threshold float DEFAULT 0.7,
  match_count int DEFAULT 5
)
RETURNS TABLE (
  id uuid,
  document_id uuid,
  content text,
  chunk_index int,
  page_number int,
  similarity float,
  document_name text,
  metadata jsonb
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    cdc.id,
    cdc.document_id,
    cdc.content,
    cdc.chunk_index,
    cdc.page_number,
    1 - (cdc.embedding <=> query_embedding) AS similarity,
    cd.original_name AS document_name,
    cdc.metadata
  FROM case_document_chunks cdc
  JOIN case_documents cd ON cdc.document_id = cd.id
  WHERE
    cd.case_id = match_case_documents.case_id
    AND (1 - (cdc.embedding <=> query_embedding)) > match_threshold
  ORDER BY cdc.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- Example usage:
-- SELECT * FROM match_case_documents(
--   case_id := '123e4567-e89b-12d3-a456-426614174000',
--   query_embedding := '[0.1, 0.2, ...]'::vector(3072),
--   match_threshold := 0.75,
--   match_count := 5
-- );

-- ============================================================================
-- 3. Hybrid Search: Combine Vector + Full-Text Search
-- ============================================================================

CREATE OR REPLACE FUNCTION hybrid_search_legal_documents(
  query_text text,
  query_embedding vector(3072),
  match_threshold float DEFAULT 0.7,
  match_count int DEFAULT 5,
  vector_weight float DEFAULT 0.7  -- 0.7 vector, 0.3 full-text
)
RETURNS TABLE (
  id uuid,
  document_id uuid,
  content text,
  chunk_index int,
  combined_score float,
  vector_similarity float,
  text_rank float,
  document_title text,
  metadata jsonb
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  WITH vector_search AS (
    SELECT
      ldc.id,
      ldc.document_id,
      ldc.content,
      ldc.chunk_index,
      (1 - (ldc.embedding <=> query_embedding)) AS similarity,
      ldc.metadata
    FROM legal_document_chunks ldc
    WHERE (1 - (ldc.embedding <=> query_embedding)) > match_threshold
  ),
  text_search AS (
    SELECT
      ldc.id,
      ts_rank(to_tsvector('spanish', ldc.content), plainto_tsquery('spanish', query_text)) AS rank
    FROM legal_document_chunks ldc
    WHERE to_tsvector('spanish', ldc.content) @@ plainto_tsquery('spanish', query_text)
  )
  SELECT
    vs.id,
    vs.document_id,
    vs.content,
    vs.chunk_index,
    (vs.similarity * vector_weight + COALESCE(ts.rank, 0) * (1 - vector_weight)) AS combined_score,
    vs.similarity AS vector_similarity,
    COALESCE(ts.rank, 0) AS text_rank,
    ld.title AS document_title,
    vs.metadata
  FROM vector_search vs
  LEFT JOIN text_search ts ON vs.id = ts.id
  JOIN legal_documents ld ON vs.document_id = ld.id
  ORDER BY combined_score DESC
  LIMIT match_count;
END;
$$;

-- Example usage:
-- SELECT * FROM hybrid_search_legal_documents(
--   query_text := 'derecho laboral ecuatoriano',
--   query_embedding := '[0.1, 0.2, ...]'::vector(3072),
--   match_threshold := 0.70,
--   match_count := 10,
--   vector_weight := 0.7
-- );

-- ============================================================================
-- 4. Get Similar Document Chunks (for finding related content)
-- ============================================================================

CREATE OR REPLACE FUNCTION get_similar_chunks(
  source_chunk_id uuid,
  match_threshold float DEFAULT 0.8,
  match_count int DEFAULT 5
)
RETURNS TABLE (
  id uuid,
  content text,
  similarity float,
  document_title text
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    ldc2.id,
    ldc2.content,
    1 - (ldc1.embedding <=> ldc2.embedding) AS similarity,
    ld.title AS document_title
  FROM legal_document_chunks ldc1
  CROSS JOIN legal_document_chunks ldc2
  JOIN legal_documents ld ON ldc2.document_id = ld.id
  WHERE
    ldc1.id = source_chunk_id
    AND ldc2.id != source_chunk_id
    AND (1 - (ldc1.embedding <=> ldc2.embedding)) > match_threshold
  ORDER BY ldc1.embedding <=> ldc2.embedding
  LIMIT match_count;
END;
$$;

-- ============================================================================
-- 5. Search with Filters and Ranking
-- ============================================================================

CREATE OR REPLACE FUNCTION search_legal_documents_advanced(
  query_embedding vector(3072),
  match_threshold float DEFAULT 0.7,
  match_count int DEFAULT 10,
  filter_jurisdiction text DEFAULT NULL,
  filter_types text[] DEFAULT NULL,
  filter_category text DEFAULT NULL,
  min_date timestamp DEFAULT NULL,
  max_date timestamp DEFAULT NULL
)
RETURNS TABLE (
  id uuid,
  document_id uuid,
  content text,
  similarity float,
  document_title text,
  document_type text,
  jurisdiction text,
  category text,
  publication_date timestamp,
  official_code text
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    ldc.id,
    ldc.document_id,
    ldc.content,
    1 - (ldc.embedding <=> query_embedding) AS similarity,
    ld.title AS document_title,
    ld.type::text AS document_type,
    ld.jurisdiction,
    ld.category,
    ld.publication_date,
    ld.official_code
  FROM legal_document_chunks ldc
  JOIN legal_documents ld ON ldc.document_id = ld.id
  WHERE
    (1 - (ldc.embedding <=> query_embedding)) > match_threshold
    AND (filter_jurisdiction IS NULL OR ld.jurisdiction = filter_jurisdiction)
    AND (filter_types IS NULL OR ld.type::text = ANY(filter_types))
    AND (filter_category IS NULL OR ld.category = filter_category)
    AND (min_date IS NULL OR ld.publication_date >= min_date)
    AND (max_date IS NULL OR ld.publication_date <= max_date)
  ORDER BY ldc.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- ============================================================================
-- 6. Analytics: Get Document Usage Stats
-- ============================================================================

CREATE OR REPLACE FUNCTION get_document_search_stats(
  document_id_param uuid
)
RETURNS TABLE (
  document_id uuid,
  document_title text,
  total_chunks int,
  avg_chunk_length int
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    ld.id AS document_id,
    ld.title AS document_title,
    COUNT(ldc.id)::int AS total_chunks,
    AVG(LENGTH(ldc.content))::int AS avg_chunk_length
  FROM legal_documents ld
  LEFT JOIN legal_document_chunks ldc ON ld.id = ldc.document_id
  WHERE ld.id = document_id_param
  GROUP BY ld.id, ld.title;
END;
$$;

-- ============================================================================
-- Indexes for Performance
-- ============================================================================

-- Vector indexes using IVFFlat
-- This provides fast approximate nearest neighbor search and supports high dimensions

CREATE INDEX IF NOT EXISTS legal_document_chunks_embedding_idx
ON legal_document_chunks
USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);

CREATE INDEX IF NOT EXISTS case_document_chunks_embedding_idx
ON case_document_chunks
USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);

-- Full-text search indexes
CREATE INDEX IF NOT EXISTS legal_document_chunks_content_fts_idx
ON legal_document_chunks
USING gin(to_tsvector('spanish', content));

CREATE INDEX IF NOT EXISTS case_document_chunks_content_fts_idx
ON case_document_chunks
USING gin(to_tsvector('spanish', content));

-- Compound indexes for common queries
CREATE INDEX IF NOT EXISTS legal_documents_jurisdiction_type_idx
ON legal_documents(jurisdiction, type);

CREATE INDEX IF NOT EXISTS legal_documents_category_idx
ON legal_documents(category);

CREATE INDEX IF NOT EXISTS case_documents_case_id_status_idx
ON case_documents(case_id, processing_status);

-- ============================================================================
-- Comments for Documentation
-- ============================================================================

COMMENT ON FUNCTION match_legal_documents IS
'Vector similarity search for legal documents. Returns top N most similar chunks.';

COMMENT ON FUNCTION match_case_documents IS
'Vector similarity search within a specific case. Returns relevant chunks from case documents.';

COMMENT ON FUNCTION hybrid_search_legal_documents IS
'Combines vector similarity with full-text search for better results. Adjustable weights.';

COMMENT ON FUNCTION get_similar_chunks IS
'Find similar chunks to a given chunk. Useful for "related content" features.';

COMMENT ON FUNCTION search_legal_documents_advanced IS
'Advanced search with multiple filters: jurisdiction, type, category, date range.';

-- ============================================================================
-- Testing Queries (commented out)
-- ============================================================================

/*
-- Test vector search
SELECT * FROM match_legal_documents(
  query_embedding := (SELECT embedding FROM legal_document_chunks LIMIT 1),
  match_threshold := 0.7,
  match_count := 5
);

-- Test case document search
SELECT * FROM match_case_documents(
  case_id := (SELECT id FROM cases LIMIT 1),
  query_embedding := (SELECT embedding FROM case_document_chunks LIMIT 1),
  match_threshold := 0.7,
  match_count := 5
);

-- Test hybrid search
SELECT * FROM hybrid_search_legal_documents(
  query_text := 'código civil',
  query_embedding := (SELECT embedding FROM legal_document_chunks LIMIT 1),
  match_threshold := 0.7,
  match_count := 10,
  vector_weight := 0.7
);
*/

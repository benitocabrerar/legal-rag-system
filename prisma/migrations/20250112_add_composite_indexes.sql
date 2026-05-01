-- =====================================================
-- FASE 2: DATABASE INDEX OPTIMIZATION
-- Migration: Composite Indexes for Query Performance
-- Target: 10x performance improvement
-- Date: 2025-01-12
-- =====================================================

-- Drop existing single-column indexes to recreate as composite
DROP INDEX IF EXISTS "LegalDocument_normType_idx";
DROP INDEX IF EXISTS "LegalDocument_legalHierarchy_idx";
DROP INDEX IF EXISTS "LegalDocument_jurisdiction_idx";
DROP INDEX IF EXISTS "LegalDocument_publicationType_idx";
DROP INDEX IF EXISTS "LegalDocument_documentState_idx";
DROP INDEX IF EXISTS "LegalDocument_publicationDate_idx";

-- =====================================================
-- COMPOSITE INDEXES FOR COMMON QUERY PATTERNS
-- =====================================================

-- Most common query pattern: normType + legalHierarchy + isActive
CREATE INDEX "idx_documents_type_hierarchy_active"
ON "LegalDocument"(
    "normType",
    "legalHierarchy",
    "isActive"
) WHERE "isActive" = true;

-- Date range queries with filters
CREATE INDEX "idx_documents_date_type_active"
ON "LegalDocument"(
    "publicationDate" DESC,
    "normType",
    "isActive"
) WHERE "isActive" = true;

-- Jurisdiction-based queries
CREATE INDEX "idx_documents_jurisdiction_hierarchy"
ON "LegalDocument"(
    "jurisdiction",
    "legalHierarchy",
    "isActive"
) WHERE "isActive" = true;

-- Document state queries with hierarchy
CREATE INDEX "idx_documents_state_hierarchy_active"
ON "LegalDocument"(
    "documentState",
    "legalHierarchy",
    "isActive"
) WHERE "isActive" = true;

-- =====================================================
-- FULL-TEXT SEARCH INDEXES (PostgreSQL GIN)
-- =====================================================

-- Full-text search on normTitle (Spanish language)
CREATE INDEX "idx_documents_title_fts"
ON "LegalDocument"
USING GIN(to_tsvector('spanish', "normTitle"));

-- Full-text search on content (Spanish language)
CREATE INDEX "idx_documents_content_fts"
ON "LegalDocument"
USING GIN(to_tsvector('spanish', "content"));

-- Combined full-text search (normTitle + content)
CREATE INDEX "idx_documents_combined_fts"
ON "LegalDocument"
USING GIN(
    to_tsvector('spanish', COALESCE("normTitle", '') || ' ' || COALESCE("content", ''))
);

-- =====================================================
-- ARRAY & JSON FIELD INDEXES
-- =====================================================

-- Keywords array search (GIN index)
CREATE INDEX "idx_documents_keywords_gin"
ON "LegalDocument"
USING GIN("keywords");

-- =====================================================
-- SORTING PERFORMANCE INDEXES
-- =====================================================

-- Created at sorting (with active filter)
CREATE INDEX "idx_documents_created_active"
ON "LegalDocument"("createdAt" DESC, "isActive")
WHERE "isActive" = true;

-- Updated at sorting (with active filter)
CREATE INDEX "idx_documents_updated_active"
ON "LegalDocument"("updatedAt" DESC, "isActive")
WHERE "isActive" = true;

-- View count sorting (for popular documents)
CREATE INDEX "idx_documents_viewcount_active"
ON "LegalDocument"("viewCount" DESC, "isActive")
WHERE "isActive" = true;

-- Download count sorting
CREATE INDEX "idx_documents_downloadcount_active"
ON "LegalDocument"("downloadCount" DESC, "isActive")
WHERE "isActive" = true;

-- =====================================================
-- DATE RANGE OPTIMIZATION INDEXES
-- =====================================================

-- Publication date range with active filter
CREATE INDEX "idx_documents_pubdate_range"
ON "LegalDocument"("publicationDate")
WHERE "isActive" = true AND "publicationDate" IS NOT NULL;

-- Last reform date range with active filter
CREATE INDEX "idx_documents_reformdate_range"
ON "LegalDocument"("lastReformDate")
WHERE "isActive" = true AND "lastReformDate" IS NOT NULL;

-- =====================================================
-- CHUNK TABLE OPTIMIZATION
-- =====================================================

-- Composite index for chunk queries (documentId + position)
CREATE INDEX "idx_chunks_document_position"
ON "LegalDocumentChunk"("legalDocumentId", "position" ASC);

-- Embedding search optimization (for vector similarity)
-- Note: This assumes you're using pgvector extension
CREATE INDEX "idx_chunks_embedding_ivfflat"
ON "LegalDocumentChunk"
USING ivfflat ("embedding" vector_cosine_ops)
WITH (lists = 100);

-- =====================================================
-- UPLOADER FOREIGN KEY OPTIMIZATION
-- =====================================================

-- Optimize joins with uploader table
CREATE INDEX "idx_documents_uploader_created"
ON "LegalDocument"("uploadedBy", "createdAt" DESC);

-- =====================================================
-- PARTIAL INDEXES FOR SPECIFIC USE CASES
-- =====================================================

-- Only active documents (most common filter)
CREATE INDEX "idx_documents_active_only"
ON "LegalDocument"("id")
WHERE "isActive" = true;

-- Recently updated documents (last 30 days)
CREATE INDEX "idx_documents_recent_updates"
ON "LegalDocument"("updatedAt" DESC)
WHERE "isActive" = true
  AND "updatedAt" >= NOW() - INTERVAL '30 days';

-- Documents with high engagement
CREATE INDEX "idx_documents_high_engagement"
ON "LegalDocument"("viewCount" DESC, "downloadCount" DESC)
WHERE "isActive" = true
  AND ("viewCount" > 10 OR "downloadCount" > 5);

-- =====================================================
-- STATISTICS UPDATE FOR QUERY PLANNER
-- =====================================================

-- Update table statistics for better query planning
ANALYZE "LegalDocument";
ANALYZE "LegalDocumentChunk";
ANALYZE "User";

-- =====================================================
-- VERIFICATION QUERIES
-- =====================================================

-- Verify indexes were created successfully
DO $$
DECLARE
    index_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO index_count
    FROM pg_indexes
    WHERE tablename IN ('LegalDocument', 'LegalDocumentChunk')
      AND schemaname = 'public'
      AND indexname LIKE 'idx_%';

    RAISE NOTICE 'Total custom indexes created: %', index_count;
END $$;

-- Show index sizes for monitoring
SELECT
    schemaname,
    tablename,
    indexname,
    pg_size_pretty(pg_relation_size(indexrelid)) as index_size
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
  AND tablename IN ('LegalDocument', 'LegalDocumentChunk')
ORDER BY pg_relation_size(indexrelid) DESC;

-- =====================================================
-- MIGRATION COMPLETE
-- Expected Performance Improvement: 10x on filtered queries
-- Expected Index Storage Overhead: ~15-20% of table size
-- =====================================================

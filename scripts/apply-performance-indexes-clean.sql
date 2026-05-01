-- ============================================================================
-- Phase 10 - Week 3: Performance Optimization Indexes
-- ============================================================================

-- Composite index for active document search by jurisdiction and type
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_legal_documents_composite_search
ON "LegalDocument"(jurisdiction, document_type, publication_date DESC, status)
WHERE status = 'ACTIVE';

-- Full-text search index for Spanish content (title)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_legal_documents_fts_title
ON "LegalDocument" USING gin(to_tsvector('spanish', title));

-- Full-text search index for Spanish content (content)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_legal_documents_fts_content
ON "LegalDocument" USING gin(to_tsvector('spanish', content));

-- Composite index for chunk retrieval by document
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_document_chunks_composite
ON "DocumentChunk"(document_id, chunk_index)
WHERE is_active = true;

-- Index for full-text search in chunks
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_document_chunks_fts
ON "DocumentChunk" USING gin(to_tsvector('spanish', content));

-- User email lookup (most common authentication query)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_email
ON "User"(email)
WHERE email IS NOT NULL;

-- Update table statistics
ANALYZE "LegalDocument";
ANALYZE "DocumentChunk";
ANALYZE "User";

-- ============================================================================
-- PostgreSQL Extensions for Legal RAG System
-- ============================================================================
-- Run this script after creating your database to enable required extensions

-- UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Vector similarity search
CREATE EXTENSION IF NOT EXISTS vector;

-- Full-text search with trigrams
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Verify extensions are installed
SELECT
    extname as "Extension Name",
    extversion as "Version"
FROM pg_extension
WHERE extname IN ('uuid-ossp', 'vector', 'pg_trgm')
ORDER BY extname;

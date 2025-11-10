-- =====================================================
-- RAG Enhancement Migration
-- Adds support for document structure, articles, summaries, and query caching
-- =====================================================

-- Add metadata columns to legal_documents table
ALTER TABLE legal_documents ADD COLUMN IF NOT EXISTS total_articles INTEGER;
ALTER TABLE legal_documents ADD COLUMN IF NOT EXISTS total_sections INTEGER;
ALTER TABLE legal_documents ADD COLUMN IF NOT EXISTS total_chapters INTEGER;
ALTER TABLE legal_documents ADD COLUMN IF NOT EXISTS page_count INTEGER;
ALTER TABLE legal_documents ADD COLUMN IF NOT EXISTS word_count INTEGER;
ALTER TABLE legal_documents ADD COLUMN IF NOT EXISTS document_structure JSONB;
ALTER TABLE legal_documents ADD COLUMN IF NOT EXISTS table_of_contents JSONB;
ALTER TABLE legal_documents ADD COLUMN IF NOT EXISTS summary_text TEXT;
ALTER TABLE legal_documents ADD COLUMN IF NOT EXISTS key_entities JSONB;
ALTER TABLE legal_documents ADD COLUMN IF NOT EXISTS cross_references JSONB;
ALTER TABLE legal_documents ADD COLUMN IF NOT EXISTS last_analyzed_at TIMESTAMP;
ALTER TABLE legal_documents ADD COLUMN IF NOT EXISTS analysis_version VARCHAR(20);

-- Create indexes for new columns
CREATE INDEX IF NOT EXISTS idx_legal_documents_total_articles ON legal_documents(total_articles);
CREATE INDEX IF NOT EXISTS idx_legal_documents_analysis_version ON legal_documents(analysis_version);
CREATE INDEX IF NOT EXISTS idx_legal_documents_last_analyzed ON legal_documents(last_analyzed_at);

-- =====================================================
-- Legal Document Sections Table
-- =====================================================
CREATE TABLE IF NOT EXISTS legal_document_sections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  legal_document_id UUID NOT NULL REFERENCES legal_documents(id) ON DELETE CASCADE,
  parent_section_id UUID REFERENCES legal_document_sections(id) ON DELETE CASCADE,
  section_type VARCHAR(50) NOT NULL CHECK (section_type IN ('title', 'chapter', 'section', 'article', 'paragraph')),
  section_number VARCHAR(50),
  section_title TEXT,
  content TEXT,
  start_page INTEGER,
  end_page INTEGER,
  word_count INTEGER,
  level INTEGER NOT NULL DEFAULT 0,
  display_order INTEGER NOT NULL,
  metadata JSONB,
  embedding JSONB,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT valid_level CHECK (level >= 0),
  CONSTRAINT valid_display_order CHECK (display_order >= 0)
);

-- Create indexes for sections
CREATE INDEX IF NOT EXISTS idx_legal_document_sections_document ON legal_document_sections(legal_document_id);
CREATE INDEX IF NOT EXISTS idx_legal_document_sections_parent ON legal_document_sections(parent_section_id);
CREATE INDEX IF NOT EXISTS idx_legal_document_sections_type ON legal_document_sections(section_type);
CREATE INDEX IF NOT EXISTS idx_legal_document_sections_order ON legal_document_sections(display_order);

-- =====================================================
-- Legal Document Articles Table
-- =====================================================
CREATE TABLE IF NOT EXISTS legal_document_articles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  legal_document_id UUID NOT NULL REFERENCES legal_documents(id) ON DELETE CASCADE,
  article_number INTEGER NOT NULL,
  article_number_text VARCHAR(50) NOT NULL,
  article_title TEXT,
  article_content TEXT NOT NULL,
  chapter_id UUID REFERENCES legal_document_sections(id) ON DELETE SET NULL,
  section_id UUID REFERENCES legal_document_sections(id) ON DELETE SET NULL,
  word_count INTEGER,
  referenced_articles JSONB,
  keywords JSONB,
  embedding JSONB,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT unique_article_per_document UNIQUE(legal_document_id, article_number_text),
  CONSTRAINT valid_article_number CHECK (article_number >= 0)
);

-- Create indexes for articles
CREATE INDEX IF NOT EXISTS idx_legal_document_articles_document ON legal_document_articles(legal_document_id);
CREATE INDEX IF NOT EXISTS idx_legal_document_articles_number ON legal_document_articles(article_number);
CREATE INDEX IF NOT EXISTS idx_legal_document_articles_number_text ON legal_document_articles(article_number_text);
CREATE INDEX IF NOT EXISTS idx_legal_document_articles_chapter ON legal_document_articles(chapter_id);
CREATE INDEX IF NOT EXISTS idx_legal_document_articles_section ON legal_document_articles(section_id);

-- Full-text search index for article content
CREATE INDEX IF NOT EXISTS idx_legal_document_articles_content_fts
  ON legal_document_articles USING gin(to_tsvector('spanish', article_content));

-- =====================================================
-- Legal Document Summaries Table
-- =====================================================
CREATE TABLE IF NOT EXISTS legal_document_summaries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  legal_document_id UUID NOT NULL REFERENCES legal_documents(id) ON DELETE CASCADE,
  summary_type VARCHAR(50) NOT NULL CHECK (summary_type IN ('executive', 'chapter', 'section', 'technical', 'user')),
  summary_level VARCHAR(50) CHECK (summary_level IN ('document', 'chapter', 'section', 'article')),
  reference_id UUID,
  summary_text TEXT NOT NULL,
  key_points JSONB,
  embedding JSONB,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT valid_summary_combination CHECK (
    (summary_level = 'document' AND reference_id IS NULL) OR
    (summary_level != 'document' AND reference_id IS NOT NULL) OR
    summary_level IS NULL
  )
);

-- Create indexes for summaries
CREATE INDEX IF NOT EXISTS idx_legal_document_summaries_document ON legal_document_summaries(legal_document_id);
CREATE INDEX IF NOT EXISTS idx_legal_document_summaries_type ON legal_document_summaries(summary_type);
CREATE INDEX IF NOT EXISTS idx_legal_document_summaries_level ON legal_document_summaries(summary_level);
CREATE INDEX IF NOT EXISTS idx_legal_document_summaries_reference ON legal_document_summaries(reference_id);

-- Full-text search index for summary content
CREATE INDEX IF NOT EXISTS idx_legal_document_summaries_text_fts
  ON legal_document_summaries USING gin(to_tsvector('spanish', summary_text));

-- =====================================================
-- Query Templates Table
-- =====================================================
CREATE TABLE IF NOT EXISTS query_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pattern VARCHAR(500) NOT NULL,
  query_type VARCHAR(50) NOT NULL CHECK (query_type IN ('metadata', 'content', 'navigation', 'comparison', 'summary', 'generated')),
  response_template TEXT,
  required_fields JSONB,
  priority INTEGER DEFAULT 50 CHECK (priority >= 0 AND priority <= 100),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT valid_pattern_length CHECK (length(pattern) > 0)
);

-- Create indexes for query templates
CREATE INDEX IF NOT EXISTS idx_query_templates_type ON query_templates(query_type);
CREATE INDEX IF NOT EXISTS idx_query_templates_priority ON query_templates(priority DESC);
CREATE INDEX IF NOT EXISTS idx_query_templates_active ON query_templates(is_active) WHERE is_active = true;

-- =====================================================
-- Query Cache Table
-- =====================================================
CREATE TABLE IF NOT EXISTS query_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  query_hash VARCHAR(64) NOT NULL UNIQUE,
  query_text TEXT NOT NULL,
  query_type VARCHAR(50),
  response_text TEXT NOT NULL,
  response_metadata JSONB,
  source_documents JSONB,
  hit_count INTEGER DEFAULT 1 CHECK (hit_count >= 0),
  ttl_seconds INTEGER DEFAULT 86400 CHECK (ttl_seconds > 0),
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  last_accessed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT valid_expiry CHECK (expires_at > created_at)
);

-- Create indexes for query cache
CREATE UNIQUE INDEX IF NOT EXISTS idx_query_cache_hash ON query_cache(query_hash);
CREATE INDEX IF NOT EXISTS idx_query_cache_expires ON query_cache(expires_at);
CREATE INDEX IF NOT EXISTS idx_query_cache_hit_count ON query_cache(hit_count DESC);
CREATE INDEX IF NOT EXISTS idx_query_cache_type ON query_cache(query_type);
CREATE INDEX IF NOT EXISTS idx_query_cache_last_accessed ON query_cache(last_accessed_at DESC);

-- Clean up expired cache entries periodically (can be run as a cron job)
-- CREATE OR REPLACE FUNCTION cleanup_expired_cache() RETURNS void AS $$
-- BEGIN
--   DELETE FROM query_cache WHERE expires_at < NOW();
-- END;
-- $$ LANGUAGE plpgsql;

-- =====================================================
-- Query Expansion Table (for storing generated alternative queries)
-- =====================================================
CREATE TABLE IF NOT EXISTS query_expansions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  original_query TEXT NOT NULL,
  expanded_query TEXT NOT NULL,
  expansion_type VARCHAR(50) CHECK (expansion_type IN ('synonym', 'related', 'broader', 'narrower', 'translation')),
  confidence_score FLOAT CHECK (confidence_score >= 0 AND confidence_score <= 1),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_query_expansions_original ON query_expansions USING hash(original_query);

-- =====================================================
-- Document Analysis Queue (for tracking analysis status)
-- =====================================================
CREATE TABLE IF NOT EXISTS document_analysis_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES legal_documents(id) ON DELETE CASCADE,
  status VARCHAR(50) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  priority INTEGER DEFAULT 50 CHECK (priority >= 0 AND priority <= 100),
  retry_count INTEGER DEFAULT 0 CHECK (retry_count >= 0),
  error_message TEXT,
  started_at TIMESTAMP,
  completed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT unique_document_queue UNIQUE(document_id)
);

CREATE INDEX IF NOT EXISTS idx_document_analysis_queue_status ON document_analysis_queue(status);
CREATE INDEX IF NOT EXISTS idx_document_analysis_queue_priority ON document_analysis_queue(priority DESC, created_at ASC);

-- =====================================================
-- Add vector extension if not exists (for PostgreSQL with pgvector)
-- =====================================================
-- CREATE EXTENSION IF NOT EXISTS vector;

-- If using pgvector, convert JSONB embeddings to vector type:
-- ALTER TABLE legal_document_chunks ADD COLUMN IF NOT EXISTS embedding_vector vector(1536);
-- ALTER TABLE legal_document_articles ADD COLUMN IF NOT EXISTS embedding_vector vector(1536);
-- ALTER TABLE legal_document_sections ADD COLUMN IF NOT EXISTS embedding_vector vector(1536);
-- ALTER TABLE legal_document_summaries ADD COLUMN IF NOT EXISTS embedding_vector vector(1536);

-- Create vector indexes for similarity search (if using pgvector):
-- CREATE INDEX IF NOT EXISTS idx_chunks_embedding_vector ON legal_document_chunks USING ivfflat (embedding_vector vector_cosine_ops) WITH (lists = 100);
-- CREATE INDEX IF NOT EXISTS idx_articles_embedding_vector ON legal_document_articles USING ivfflat (embedding_vector vector_cosine_ops) WITH (lists = 100);
-- CREATE INDEX IF NOT EXISTS idx_sections_embedding_vector ON legal_document_sections USING ivfflat (embedding_vector vector_cosine_ops) WITH (lists = 100);
-- CREATE INDEX IF NOT EXISTS idx_summaries_embedding_vector ON legal_document_summaries USING ivfflat (embedding_vector vector_cosine_ops) WITH (lists = 100);

-- =====================================================
-- Create helper functions
-- =====================================================

-- Function to update last_analyzed_at timestamp
CREATE OR REPLACE FUNCTION update_document_analysis_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.last_analyzed_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update last_analyzed_at
DROP TRIGGER IF EXISTS update_legal_documents_analysis_timestamp ON legal_documents;
CREATE TRIGGER update_legal_documents_analysis_timestamp
  BEFORE UPDATE OF document_structure, table_of_contents, summary_text
  ON legal_documents
  FOR EACH ROW
  EXECUTE FUNCTION update_document_analysis_timestamp();

-- Function to calculate document statistics
CREATE OR REPLACE FUNCTION calculate_document_stats(doc_id UUID)
RETURNS TABLE(
  total_articles INTEGER,
  total_sections INTEGER,
  total_chapters INTEGER,
  avg_article_length INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(DISTINCT a.id)::INTEGER as total_articles,
    COUNT(DISTINCT s.id)::INTEGER FILTER (WHERE s.section_type = 'section') as total_sections,
    COUNT(DISTINCT s.id)::INTEGER FILTER (WHERE s.section_type = 'chapter') as total_chapters,
    AVG(a.word_count)::INTEGER as avg_article_length
  FROM legal_documents ld
  LEFT JOIN legal_document_articles a ON ld.id = a.legal_document_id
  LEFT JOIN legal_document_sections s ON ld.id = s.legal_document_id
  WHERE ld.id = doc_id
  GROUP BY ld.id;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- Insert default query templates
-- =====================================================
INSERT INTO query_templates (pattern, query_type, response_template, required_fields, priority)
VALUES
  ('cuántos?\s+artículos?\s+tiene', 'metadata', 'El documento tiene {totalArticles} artículos.', '["totalArticles"]'::jsonb, 90),
  ('estructura\s+de(?:l)?\s+documento', 'metadata', 'La estructura del documento es: {structure}', '["documentStructure"]'::jsonb, 85),
  ('artículo\s+\d+', 'navigation', 'El artículo {articleNumber} dice: {articleContent}', '["articleNumber", "articleContent"]'::jsonb, 95),
  ('resumen\s+de(?:l)?\s+', 'summary', 'Resumen: {summaryText}', '["summaryText"]'::jsonb, 80),
  ('diferencia\s+entre', 'comparison', 'Comparación: {comparisonResult}', '["comparisonResult"]'::jsonb, 75)
ON CONFLICT DO NOTHING;

-- =====================================================
-- Grant permissions (adjust as needed for your setup)
-- =====================================================
-- GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO your_app_user;
-- GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO your_app_user;
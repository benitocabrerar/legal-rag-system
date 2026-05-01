-- Phase 6: Web Scraping Infrastructure
-- Migration 006: Add scraping tables for Firecrawl integration

-- ============================================================================
-- TABLE: legal_sources
-- Purpose: Configure Ecuadorian legal sources to scrape
-- ============================================================================
CREATE TABLE IF NOT EXISTS legal_sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id VARCHAR(100) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  url TEXT NOT NULL,
  type VARCHAR(50) NOT NULL CHECK (type IN ('primary', 'secondary', 'tertiary')),
  priority INTEGER DEFAULT 1 CHECK (priority >= 1 AND priority <= 10),
  frequency VARCHAR(50) NOT NULL CHECK (frequency IN ('daily', 'weekly', 'biweekly', 'monthly')),
  cron_expression VARCHAR(100),
  is_active BOOLEAN DEFAULT true,
  last_scraped_at TIMESTAMP,
  config JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Index for quick lookups
CREATE INDEX IF NOT EXISTS idx_legal_sources_source_id ON legal_sources(source_id);
CREATE INDEX IF NOT EXISTS idx_legal_sources_type ON legal_sources(type);
CREATE INDEX IF NOT EXISTS idx_legal_sources_is_active ON legal_sources(is_active);
CREATE INDEX IF NOT EXISTS idx_legal_sources_frequency ON legal_sources(frequency);

-- ============================================================================
-- TABLE: scraped_documents
-- Purpose: Store documents scraped from legal sources
-- ============================================================================
CREATE TABLE IF NOT EXISTS scraped_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id UUID REFERENCES legal_sources(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  title TEXT,
  content TEXT,
  markdown TEXT,
  html TEXT,
  metadata JSONB DEFAULT '{}',
  hash VARCHAR(64) NOT NULL,
  version INTEGER DEFAULT 1,
  status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  extracted_at TIMESTAMP DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),

  -- Ensure unique combination of URL and hash (for versioning)
  UNIQUE(url, hash)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_scraped_documents_source_id ON scraped_documents(source_id);
CREATE INDEX IF NOT EXISTS idx_scraped_documents_url ON scraped_documents(url);
CREATE INDEX IF NOT EXISTS idx_scraped_documents_hash ON scraped_documents(hash);
CREATE INDEX IF NOT EXISTS idx_scraped_documents_status ON scraped_documents(status);
CREATE INDEX IF NOT EXISTS idx_scraped_documents_extracted_at ON scraped_documents(extracted_at DESC);

-- Full-text search index on title and content
CREATE INDEX IF NOT EXISTS idx_scraped_documents_title_fts ON scraped_documents USING GIN (to_tsvector('spanish', COALESCE(title, '')));
CREATE INDEX IF NOT EXISTS idx_scraped_documents_content_fts ON scraped_documents USING GIN (to_tsvector('spanish', COALESCE(content, '')));

-- JSONB index for metadata queries
CREATE INDEX IF NOT EXISTS idx_scraped_documents_metadata ON scraped_documents USING GIN (metadata);

-- ============================================================================
-- TABLE: document_versions
-- Purpose: Track changes in legal documents over time
-- ============================================================================
CREATE TABLE IF NOT EXISTS document_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID REFERENCES scraped_documents(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  previous_hash VARCHAR(64),
  current_hash VARCHAR(64) NOT NULL,
  change_type VARCHAR(50) CHECK (change_type IN ('created', 'updated', 'deleted', 'unchanged')),
  changes_detected JSONB DEFAULT '{}',
  version_number INTEGER NOT NULL,
  detected_at TIMESTAMP DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_document_versions_document_id ON document_versions(document_id);
CREATE INDEX IF NOT EXISTS idx_document_versions_url ON document_versions(url);
CREATE INDEX IF NOT EXISTS idx_document_versions_change_type ON document_versions(change_type);
CREATE INDEX IF NOT EXISTS idx_document_versions_detected_at ON document_versions(detected_at DESC);

-- ============================================================================
-- TABLE: scraping_jobs
-- Purpose: Track scraping job execution history
-- ============================================================================
CREATE TABLE IF NOT EXISTS scraping_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id VARCHAR(100) NOT NULL,
  source_id UUID REFERENCES legal_sources(id) ON DELETE CASCADE,
  status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'success', 'failed', 'cancelled')),
  documents_found INTEGER DEFAULT 0,
  documents_scraped INTEGER DEFAULT 0,
  documents_failed INTEGER DEFAULT 0,
  errors JSONB DEFAULT '[]',
  started_at TIMESTAMP,
  completed_at TIMESTAMP,
  duration_ms INTEGER,
  next_run_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_scraping_jobs_job_id ON scraping_jobs(job_id);
CREATE INDEX IF NOT EXISTS idx_scraping_jobs_source_id ON scraping_jobs(source_id);
CREATE INDEX IF NOT EXISTS idx_scraping_jobs_status ON scraping_jobs(status);
CREATE INDEX IF NOT EXISTS idx_scraping_jobs_started_at ON scraping_jobs(started_at DESC);
CREATE INDEX IF NOT EXISTS idx_scraping_jobs_next_run_at ON scraping_jobs(next_run_at);

-- ============================================================================
-- TRIGGER: Update updated_at timestamp
-- ============================================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply trigger to all tables
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_legal_sources_updated_at') THEN
    CREATE TRIGGER update_legal_sources_updated_at
      BEFORE UPDATE ON legal_sources
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_scraped_documents_updated_at') THEN
    CREATE TRIGGER update_scraped_documents_updated_at
      BEFORE UPDATE ON scraped_documents
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_scraping_jobs_updated_at') THEN
    CREATE TRIGGER update_scraping_jobs_updated_at
      BEFORE UPDATE ON scraping_jobs
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END$$;

-- ============================================================================
-- INITIAL DATA: Insert Ecuadorian legal sources
-- ============================================================================
INSERT INTO legal_sources (source_id, name, url, type, priority, frequency, cron_expression, is_active, config)
VALUES
  -- PRIMARY SOURCES
  (
    'registro-oficial',
    'Registro Oficial del Ecuador',
    'https://www.registroficial.gob.ec',
    'primary',
    1,
    'daily',
    '0 6 * * *',
    true,
    '{"searchPattern": "*.pdf", "maxDepth": 3, "includeSubdomains": false, "documentTypes": ["law", "decree", "regulation", "resolution"], "extractMetadata": true}'::jsonb
  ),
  (
    'asamblea-nacional',
    'Asamblea Nacional del Ecuador',
    'https://www.asambleanacional.gob.ec',
    'primary',
    1,
    'weekly',
    '0 7 * * 1',
    true,
    '{"searchPattern": "ley|proyecto", "maxDepth": 2, "includeSubdomains": false, "documentTypes": ["law", "bill", "reform"], "extractMetadata": true}'::jsonb
  ),
  (
    'corte-constitucional',
    'Corte Constitucional del Ecuador',
    'https://www.corteconstitucional.gob.ec',
    'primary',
    1,
    'weekly',
    '0 8 * * 2',
    true,
    '{"searchPattern": "sentencia|jurisprudencia", "maxDepth": 2, "includeSubdomains": false, "documentTypes": ["ruling", "jurisprudence"], "extractMetadata": true}'::jsonb
  ),

  -- SECONDARY SOURCES
  (
    'corte-nacional',
    'Corte Nacional de Justicia',
    'https://www.cortenacional.gob.ec',
    'secondary',
    2,
    'weekly',
    '0 9 * * 3',
    true,
    '{"searchPattern": "sentencia|resolución", "maxDepth": 2, "includeSubdomains": false, "documentTypes": ["ruling", "resolution"], "extractMetadata": true}'::jsonb
  ),
  (
    'consejo-judicatura',
    'Consejo de la Judicatura',
    'https://www.funcionjudicial.gob.ec',
    'secondary',
    2,
    'biweekly',
    '0 10 1,15 * *',
    true,
    '{"searchPattern": "resolución|circular", "maxDepth": 2, "includeSubdomains": false, "documentTypes": ["resolution", "circular"], "extractMetadata": true}'::jsonb
  ),
  (
    'defensoria-pueblo',
    'Defensoría del Pueblo',
    'https://www.dpe.gob.ec',
    'secondary',
    2,
    'monthly',
    '0 11 1 * *',
    true,
    '{"searchPattern": "informe|resolución", "maxDepth": 2, "includeSubdomains": false, "documentTypes": ["report", "resolution"], "extractMetadata": true}'::jsonb
  ),
  (
    'contraloria',
    'Contraloría General del Estado',
    'https://www.contraloria.gob.ec',
    'secondary',
    2,
    'monthly',
    '0 12 5 * *',
    true,
    '{"searchPattern": "informe|acuerdo", "maxDepth": 2, "includeSubdomains": false, "documentTypes": ["report", "agreement"], "extractMetadata": true}'::jsonb
  ),

  -- TERTIARY SOURCES
  (
    'sri',
    'Servicio de Rentas Internas',
    'https://www.sri.gob.ec',
    'tertiary',
    3,
    'monthly',
    '0 13 10 * *',
    true,
    '{"searchPattern": "circular|resolución", "maxDepth": 2, "includeSubdomains": false, "documentTypes": ["circular", "resolution"], "extractMetadata": true}'::jsonb
  ),
  (
    'superintendencia-companias',
    'Superintendencia de Compañías',
    'https://www.supercias.gob.ec',
    'tertiary',
    3,
    'monthly',
    '0 14 15 * *',
    true,
    '{"searchPattern": "resolución|circular", "maxDepth": 2, "includeSubdomains": false, "documentTypes": ["resolution", "circular"], "extractMetadata": true}'::jsonb
  ),
  (
    'superintendencia-bancos',
    'Superintendencia de Bancos',
    'https://www.superbancos.gob.ec',
    'tertiary',
    3,
    'monthly',
    '0 15 20 * *',
    true,
    '{"searchPattern": "resolución|circular", "maxDepth": 2, "includeSubdomains": false, "documentTypes": ["resolution", "circular"], "extractMetadata": true}'::jsonb
  )
ON CONFLICT (source_id) DO NOTHING;

-- ============================================================================
-- COMMENTS
-- ============================================================================
COMMENT ON TABLE legal_sources IS 'Configuration for Ecuadorian legal sources to scrape';
COMMENT ON TABLE scraped_documents IS 'Documents scraped from legal sources with full content';
COMMENT ON TABLE document_versions IS 'Version history tracking for legal documents';
COMMENT ON TABLE scraping_jobs IS 'Execution history and monitoring for scraping jobs';

COMMENT ON COLUMN legal_sources.type IS 'Source type: primary (highest authority), secondary (institutions), tertiary (regulatory agencies)';
COMMENT ON COLUMN legal_sources.frequency IS 'Scraping frequency: daily, weekly, biweekly, monthly';
COMMENT ON COLUMN legal_sources.cron_expression IS 'Cron expression for scheduling (Ecuador timezone: America/Guayaquil)';
COMMENT ON COLUMN legal_sources.config IS 'JSON configuration: searchPattern, maxDepth, documentTypes, extractMetadata';

COMMENT ON COLUMN scraped_documents.hash IS 'SHA-256 hash of document content for change detection';
COMMENT ON COLUMN scraped_documents.version IS 'Version number, incremented when content changes';
COMMENT ON COLUMN scraped_documents.metadata IS 'Extracted legal metadata: documentType, institution, jurisdiction, etc.';

COMMENT ON COLUMN document_versions.change_type IS 'Type of change: created, updated, deleted, unchanged';
COMMENT ON COLUMN document_versions.changes_detected IS 'JSON diff of changes between versions';

COMMENT ON COLUMN scraping_jobs.duration_ms IS 'Job execution duration in milliseconds';
COMMENT ON COLUMN scraping_jobs.errors IS 'Array of error messages if job failed';

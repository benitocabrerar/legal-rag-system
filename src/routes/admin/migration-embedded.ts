import { FastifyInstance } from 'fastify';
import { PrismaClient } from '@prisma/client';
import { Client } from 'pg';

const MIGRATION_SQL = `-- =====================================================
-- Document Analysis and Notification System Tables
-- =====================================================

-- Table for storing document analysis queue and results
CREATE TABLE IF NOT EXISTS analysis_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL,
  document_type VARCHAR(50) NOT NULL CHECK (document_type IN ('LegalDocument', 'Document')),
  job_type VARCHAR(50) NOT NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'pending',
  priority INTEGER DEFAULT 0,
  attempts INTEGER DEFAULT 0,
  max_attempts INTEGER DEFAULT 3,

  -- Job data
  job_data JSONB,
  result JSONB,
  error_message TEXT,

  -- Timing
  scheduled_at TIMESTAMPTZ,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  failed_at TIMESTAMPTZ,
  processing_time_ms INTEGER,

  -- Metadata
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_analysis_queue_document_id ON analysis_queue(document_id);
CREATE INDEX idx_analysis_queue_status ON analysis_queue(status);
CREATE INDEX idx_analysis_queue_priority ON analysis_queue(priority DESC);
CREATE INDEX idx_analysis_queue_scheduled ON analysis_queue(scheduled_at);

-- Table for document registry and hierarchy
CREATE TABLE IF NOT EXISTS document_registry (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL,
  document_type VARCHAR(50) NOT NULL CHECK (document_type IN ('LegalDocument', 'Document')),

  -- Hierarchy information
  parent_id UUID REFERENCES document_registry(id) ON DELETE CASCADE,
  hierarchy_level INTEGER NOT NULL DEFAULT 0,
  hierarchy_path TEXT NOT NULL,
  display_order INTEGER DEFAULT 0,

  -- Document metadata
  title TEXT NOT NULL,
  category VARCHAR(100),
  tags TEXT[],

  -- Version control
  version VARCHAR(50),
  is_current_version BOOLEAN DEFAULT true,
  superseded_by UUID REFERENCES document_registry(id),
  version_date TIMESTAMPTZ,

  -- Access control
  is_public BOOLEAN DEFAULT false,
  access_level VARCHAR(50) DEFAULT 'authenticated',
  restricted_to_roles TEXT[],

  -- Search optimization
  search_vector tsvector,
  keywords TEXT[],

  -- Statistics
  view_count INTEGER DEFAULT 0,
  reference_count INTEGER DEFAULT 0,
  last_accessed TIMESTAMPTZ,

  -- Timestamps
  registered_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(document_id, document_type, version)
);

CREATE INDEX idx_registry_document ON document_registry(document_id, document_type);
CREATE INDEX idx_registry_parent ON document_registry(parent_id);
CREATE INDEX idx_registry_hierarchy ON document_registry(hierarchy_path);
CREATE INDEX idx_registry_search ON document_registry USING GIN(search_vector);
CREATE INDEX idx_registry_tags ON document_registry USING GIN(tags);
CREATE INDEX idx_registry_current ON document_registry(is_current_version) WHERE is_current_version = true;

-- Table for document cross-references
CREATE TABLE IF NOT EXISTS document_references (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_document_id UUID NOT NULL,
  source_document_type VARCHAR(50) NOT NULL,
  target_document_id UUID,
  target_document_type VARCHAR(50),

  -- Reference details
  reference_type VARCHAR(50) NOT NULL, -- cites, amends, repeals, implements, etc.
  reference_text TEXT,
  reference_location TEXT, -- article number, section, etc.

  -- Validation
  is_valid BOOLEAN DEFAULT true,
  validation_date TIMESTAMPTZ,
  validation_error TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_references_source ON document_references(source_document_id, source_document_type);
CREATE INDEX idx_references_target ON document_references(target_document_id, target_document_type);
CREATE INDEX idx_references_type ON document_references(reference_type);

-- Table for legal document articles (structured storage)
CREATE TABLE IF NOT EXISTS legal_document_articles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  legal_document_id TEXT NOT NULL REFERENCES legal_documents(id) ON DELETE CASCADE,

  -- Article identification
  article_number INTEGER NOT NULL,
  article_number_text VARCHAR(50), -- For articles like "23-A"
  article_title TEXT,

  -- Content
  article_content TEXT NOT NULL,
  word_count INTEGER,

  -- Structure
  parent_section_id UUID,
  display_order INTEGER,
  hierarchy_level INTEGER DEFAULT 4,

  -- Analysis results
  summary TEXT,
  keywords JSONB,
  entities JSONB,
  referenced_articles JSONB,

  -- Embeddings for different strategies
  embedding JSONB,
  summary_embedding JSONB,
  query_embedding JSONB,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_articles_document ON legal_document_articles(legal_document_id);
CREATE INDEX idx_articles_number ON legal_document_articles(article_number);
CREATE INDEX idx_articles_parent ON legal_document_articles(parent_section_id);

-- Table for legal document sections (titles, chapters, sections)
CREATE TABLE IF NOT EXISTS legal_document_sections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  legal_document_id TEXT NOT NULL REFERENCES legal_documents(id) ON DELETE CASCADE,

  -- Section identification
  section_type VARCHAR(50) NOT NULL, -- title, chapter, section
  section_number VARCHAR(50) NOT NULL,
  section_title TEXT,

  -- Hierarchy
  parent_section_id UUID REFERENCES legal_document_sections(id) ON DELETE CASCADE,
  level INTEGER NOT NULL,
  hierarchy_path TEXT,
  display_order INTEGER,

  -- Content
  content TEXT,
  word_count INTEGER,

  -- Analysis
  summary TEXT,
  embedding JSONB,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_sections_document ON legal_document_sections(legal_document_id);
CREATE INDEX idx_sections_type ON legal_document_sections(section_type);
CREATE INDEX idx_sections_parent ON legal_document_sections(parent_section_id);
CREATE INDEX idx_sections_hierarchy ON legal_document_sections(hierarchy_path);

-- Table for document summaries at different levels
CREATE TABLE IF NOT EXISTS legal_document_summaries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  legal_document_id TEXT NOT NULL REFERENCES legal_documents(id) ON DELETE CASCADE,

  -- Summary details
  summary_type VARCHAR(50) NOT NULL, -- executive, chapter, section, technical
  summary_level VARCHAR(50) NOT NULL, -- document, chapter, section, article
  summary_text TEXT NOT NULL,

  -- Associated structure element
  section_id UUID REFERENCES legal_document_sections(id) ON DELETE CASCADE,
  article_id UUID REFERENCES legal_document_articles(id) ON DELETE CASCADE,

  -- Metadata
  key_points JSONB,
  confidence_score FLOAT,

  -- Embeddings
  embedding JSONB,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_summaries_document ON legal_document_summaries(legal_document_id);
CREATE INDEX idx_summaries_type ON legal_document_summaries(summary_type);
CREATE INDEX idx_summaries_level ON legal_document_summaries(summary_level);

-- Table for query templates (for improved search)
CREATE TABLE IF NOT EXISTS query_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pattern TEXT NOT NULL,
  query_type VARCHAR(50) NOT NULL,
  response_template TEXT,

  -- Associated documents
  document_ids UUID[],
  document_types VARCHAR(50)[],

  -- Metadata
  required_fields JSONB,
  optional_fields JSONB,
  priority INTEGER DEFAULT 50,

  -- Usage statistics
  use_count INTEGER DEFAULT 0,
  success_rate FLOAT,
  avg_response_time_ms INTEGER,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_query_templates_type ON query_templates(query_type);
CREATE INDEX idx_query_templates_priority ON query_templates(priority DESC);

-- Table for document processing history
CREATE TABLE IF NOT EXISTS document_processing_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL,
  document_type VARCHAR(50) NOT NULL,

  -- Processing details
  process_type VARCHAR(50) NOT NULL,
  process_version VARCHAR(20),

  -- Results
  status VARCHAR(50) NOT NULL,
  results JSONB,
  error_details JSONB,

  -- Metrics
  processing_time_ms INTEGER,
  tokens_used INTEGER,
  embeddings_generated INTEGER,
  chunks_created INTEGER,

  -- Timestamps
  started_at TIMESTAMPTZ NOT NULL,
  completed_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_processing_history_document ON document_processing_history(document_id, document_type);
CREATE INDEX idx_processing_history_status ON document_processing_history(status);
CREATE INDEX idx_processing_history_date ON document_processing_history(created_at DESC);

-- Enhanced notification tables
CREATE TABLE IF NOT EXISTS notification_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,

  -- Subscription preferences
  subscription_type VARCHAR(50) NOT NULL, -- document_upload, analysis_complete, etc.
  channel VARCHAR(50) NOT NULL, -- email, in_app, sms, webhook

  -- Filters
  document_types TEXT[],
  categories TEXT[],
  keywords TEXT[],

  -- Configuration
  is_active BOOLEAN DEFAULT true,
  frequency VARCHAR(50) DEFAULT 'immediate', -- immediate, daily, weekly
  quiet_hours_start TIME,
  quiet_hours_end TIME,

  -- Webhook configuration (if channel = webhook)
  webhook_url TEXT,
  webhook_secret TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_subscriptions_user ON notification_subscriptions(user_id);
CREATE INDEX idx_subscriptions_type ON notification_subscriptions(subscription_type);
CREATE INDEX idx_subscriptions_active ON notification_subscriptions(is_active) WHERE is_active = true;

-- Table for notification queue
CREATE TABLE IF NOT EXISTS notification_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Notification details
  template_id TEXT REFERENCES notification_templates(id),
  channel VARCHAR(50) NOT NULL,
  recipient_id UUID,
  recipient_email TEXT,
  recipient_phone TEXT,

  -- Content
  subject TEXT,
  body TEXT NOT NULL,
  data JSONB,

  -- Scheduling
  priority VARCHAR(20) DEFAULT 'normal',
  scheduled_at TIMESTAMPTZ,

  -- Status
  status VARCHAR(50) DEFAULT 'pending',
  attempts INTEGER DEFAULT 0,
  max_attempts INTEGER DEFAULT 3,

  -- Results
  sent_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  failed_at TIMESTAMPTZ,
  error_message TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_notification_queue_status ON notification_queue(status);
CREATE INDEX idx_notification_queue_scheduled ON notification_queue(scheduled_at) WHERE status = 'pending';
CREATE INDEX idx_notification_queue_priority ON notification_queue(priority);

-- Function to update search vectors
CREATE OR REPLACE FUNCTION update_document_search_vector() RETURNS trigger AS $$
BEGIN
  NEW.search_vector :=
    setweight(to_tsvector('spanish', coalesce(NEW.title, '')), 'A') ||
    setweight(to_tsvector('spanish', coalesce(NEW.category, '')), 'B') ||
    setweight(to_tsvector('spanish', coalesce(array_to_string(NEW.tags, ' '), '')), 'C') ||
    setweight(to_tsvector('spanish', coalesce(array_to_string(NEW.keywords, ' '), '')), 'D');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_document_registry_search
  BEFORE INSERT OR UPDATE ON document_registry
  FOR EACH ROW EXECUTE FUNCTION update_document_search_vector();

-- Function to maintain document hierarchy
CREATE OR REPLACE FUNCTION maintain_document_hierarchy() RETURNS trigger AS $$
DECLARE
  parent_path TEXT;
  parent_level INTEGER;
BEGIN
  IF NEW.parent_id IS NOT NULL THEN
    SELECT hierarchy_path, hierarchy_level INTO parent_path, parent_level
    FROM document_registry WHERE id = NEW.parent_id;

    NEW.hierarchy_path := parent_path || '/' || NEW.id::TEXT;
    NEW.hierarchy_level := parent_level + 1;
  ELSE
    NEW.hierarchy_path := '/' || NEW.id::TEXT;
    NEW.hierarchy_level := 0;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER maintain_hierarchy
  BEFORE INSERT OR UPDATE ON document_registry
  FOR EACH ROW EXECUTE FUNCTION maintain_document_hierarchy();

-- Grant permissions removed (not applicable to Render PostgreSQL)`;

export async function migrationRoutesEmbedded(app: FastifyInstance) {
  const prisma = new PrismaClient();

  // Endpoint temporal para aplicar migración (ELIMINAR DESPUÉS DE USO)
  app.post('/migration/apply-embedded', async (request, reply) => {
    try {
      // Verificar secret de seguridad
      const { secret } = request.body as { secret?: string };
      const MIGRATION_SECRET = process.env.MIGRATION_SECRET || 'temp-migration-secret-12345';

      if (secret !== MIGRATION_SECRET) {
        return reply.code(403).send({ error: 'Forbidden - Invalid secret' });
      }

      app.log.info('🔄 Iniciando aplicación de migración (embedded SQL)...');

      // Ejecutar la migración usando pg Client directamente
      app.log.info('⚙️  Ejecutando migración SQL con pg Client...');

      const client = new Client({
        connectionString: process.env.DATABASE_URL,
      });

      try {
        await client.connect();
        app.log.info('   Conectado a la base de datos');

        // Execute the entire SQL script at once
        await client.query(MIGRATION_SQL);
        app.log.info('✅ Migración SQL ejecutada exitosamente!');

        await client.end();
      } catch (error) {
        await client.end().catch(() => {});
        throw error;
      }

      // Verificar que las tablas se crearon
      app.log.info('🔍 Verificando tablas creadas...');
      const tables = await prisma.$queryRaw<Array<{ table_name: string }>>`
        SELECT table_name
        FROM information_schema.tables
        WHERE table_schema = 'public'
        AND (
          table_name LIKE '%analysis%' OR
          table_name LIKE '%registry%' OR
          table_name LIKE '%notification%' OR
          table_name LIKE '%legal_document_%'
        )
        ORDER BY table_name;
      `;

      app.log.info(`✅ ${tables.length} nuevas tablas encontradas`);

      return reply.code(200).send({
        success: true,
        message: 'Migración completada exitosamente',
        tablesCreated: tables.length,
        tables: tables.map(t => t.table_name),
        nextSteps: [
          'Ejecutar localmente: npx prisma generate',
          'Configurar Redis (ver ESTADO_IMPLEMENTACION.md)',
          'Configurar variables de entorno',
          'Integrar el sistema en server.ts',
          '⚠️ ELIMINAR este endpoint /admin/migration después de uso'
        ]
      });

    } catch (error) {
      app.log.error('❌ Error aplicando migración:', error);
      return reply.code(500).send({
        error: 'Error aplicando migración',
        details: error instanceof Error ? error.message : String(error)
      });
    }
  });

  // Endpoint para verificar estado de migración
  app.get('/migration/status', async (request, reply) => {
    try {
      const tables = await prisma.$queryRaw<Array<{ table_name: string }>>`
        SELECT table_name
        FROM information_schema.tables
        WHERE table_schema = 'public'
        AND (
          table_name LIKE '%analysis%' OR
          table_name LIKE '%registry%' OR
          table_name LIKE '%notification%' OR
          table_name LIKE '%legal_document_%'
        )
        ORDER BY table_name;
      `;

      const expectedTables = [
        'analysis_queue',
        'document_processing_history',
        'document_references',
        'document_registry',
        'legal_document_articles',
        'legal_document_sections',
        'legal_document_summaries',
        'notification_queue',
        'notification_subscriptions',
        'query_templates'
      ];

      const foundTables = tables.map(t => t.table_name);
      const missingTables = expectedTables.filter(t => !foundTables.includes(t));

      return reply.code(200).send({
        migrationApplied: missingTables.length === 0,
        tablesFound: tables.length,
        tablesExpected: expectedTables.length,
        tables: foundTables,
        missingTables
      });

    } catch (error) {
      return reply.code(500).send({
        error: 'Error checking migration status',
        details: error instanceof Error ? error.message : String(error)
      });
    }
  });
}

-- ============================================================================
-- Script de Inicialización Completa - Legal RAG System
-- ============================================================================
-- Este script crea todas las tablas, extensiones, índices y funciones necesarias

-- ============================================================================
-- 1. EXTENSIONES
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS pg_trgm;

\echo '✅ Extensiones habilitadas'

-- ============================================================================
-- 2. TABLAS
-- ============================================================================

-- Users table
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  name VARCHAR(255) NOT NULL,
  role VARCHAR(50) DEFAULT 'USER',
  phone_number VARCHAR(50),
  avatar_url TEXT,
  organization_id UUID,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  last_login_at TIMESTAMP,
  email_verified_at TIMESTAMP
);

-- Organizations table
CREATE TABLE IF NOT EXISTS organizations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(255) UNIQUE NOT NULL,
  domain VARCHAR(255),
  settings JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Subscriptions table
CREATE TABLE IF NOT EXISTS subscriptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  organization_id UUID UNIQUE REFERENCES organizations(id) ON DELETE CASCADE,
  plan VARCHAR(50) DEFAULT 'FREE',
  status VARCHAR(50) DEFAULT 'ACTIVE',
  stripe_customer_id VARCHAR(255) UNIQUE,
  stripe_subscription_id VARCHAR(255) UNIQUE,
  stripe_price_id VARCHAR(255),
  current_period_start TIMESTAMP,
  current_period_end TIMESTAMP,
  cancel_at_period_end BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  canceled_at TIMESTAMP
);

-- Cases table
CREATE TABLE IF NOT EXISTS cases (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title VARCHAR(500) NOT NULL,
  case_number VARCHAR(255),
  case_type VARCHAR(255) NOT NULL,
  status VARCHAR(50) DEFAULT 'ACTIVE',
  plaintiff TEXT,
  defendant TEXT,
  filing_date TIMESTAMP,
  closure_date TIMESTAMP,
  description TEXT,
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Legal Documents table
CREATE TABLE IF NOT EXISTS legal_documents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  type VARCHAR(50) NOT NULL,
  jurisdiction VARCHAR(255) DEFAULT 'Ecuador',
  category VARCHAR(255),
  content TEXT NOT NULL,
  summary TEXT,
  source_url TEXT,
  official_code VARCHAR(255),
  publication_date TIMESTAMP,
  effective_date TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Legal Document Chunks table with vector embeddings
CREATE TABLE IF NOT EXISTS legal_document_chunks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  document_id UUID NOT NULL REFERENCES legal_documents(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  chunk_index INTEGER NOT NULL,
  embedding vector(3072),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT NOW()
);

-- Case Documents table
CREATE TABLE IF NOT EXISTS case_documents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  case_id UUID NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
  filename VARCHAR(500) NOT NULL,
  original_name VARCHAR(500) NOT NULL,
  mime_type VARCHAR(255) NOT NULL,
  file_size INTEGER NOT NULL,
  storage_url TEXT NOT NULL,
  processing_status VARCHAR(50) DEFAULT 'PENDING',
  extracted_text TEXT,
  uploaded_at TIMESTAMP DEFAULT NOW(),
  processed_at TIMESTAMP
);

-- Case Document Chunks table with vector embeddings
CREATE TABLE IF NOT EXISTS case_document_chunks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  document_id UUID NOT NULL REFERENCES case_documents(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  chunk_index INTEGER NOT NULL,
  embedding vector(3072),
  metadata JSONB DEFAULT '{}',
  page_number INTEGER,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Conversations table
CREATE TABLE IF NOT EXISTS conversations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  case_id UUID REFERENCES cases(id) ON DELETE SET NULL,
  title VARCHAR(500) DEFAULT 'New Conversation',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Messages table
CREATE TABLE IF NOT EXISTS messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  role VARCHAR(50) NOT NULL,
  content TEXT NOT NULL,
  sources JSONB DEFAULT '[]',
  model VARCHAR(255),
  prompt_tokens INTEGER,
  completion_tokens INTEGER,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Usage Metrics table
CREATE TABLE IF NOT EXISTS usage_metrics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  metric_type VARCHAR(255) NOT NULL,
  value INTEGER NOT NULL,
  metadata JSONB DEFAULT '{}',
  recorded_at TIMESTAMP DEFAULT NOW()
);

-- API Keys table
CREATE TABLE IF NOT EXISTS api_keys (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  key_hash TEXT UNIQUE NOT NULL,
  prefix VARCHAR(50) NOT NULL,
  scopes TEXT[] DEFAULT '{}',
  is_active BOOLEAN DEFAULT TRUE,
  last_used_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  expires_at TIMESTAMP
);

\echo '✅ Tablas creadas'

-- ============================================================================
-- 3. ÍNDICES
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_cases_user_id ON cases(user_id);
CREATE INDEX IF NOT EXISTS idx_cases_status ON cases(user_id, status);
CREATE INDEX IF NOT EXISTS idx_legal_documents_jurisdiction ON legal_documents(jurisdiction, type);
CREATE INDEX IF NOT EXISTS idx_legal_documents_category ON legal_documents(category);
CREATE INDEX IF NOT EXISTS idx_case_documents_case_id ON case_documents(case_id);
CREATE INDEX IF NOT EXISTS idx_case_documents_status ON case_documents(case_id, processing_status);
CREATE INDEX IF NOT EXISTS idx_conversations_user_id ON conversations(user_id);
CREATE INDEX IF NOT EXISTS idx_conversations_case_id ON conversations(case_id);
CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_usage_metrics_user_id ON usage_metrics(user_id, metric_type, recorded_at);
CREATE INDEX IF NOT EXISTS idx_api_keys_user_id ON api_keys(user_id);

-- Vector indexes using IVFFlat (supports more dimensions than HNSW)
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

\echo '✅ Índices creados'

\echo ''
\echo '========================================='
\echo '✅ Schema inicializado exitosamente'
\echo '========================================='
\echo ''
\echo 'Próximo paso: Ejecutar funciones vectoriales'
\echo 'Comando: psql $DATABASE_URL -f database/supabase-functions.sql'
\echo ''

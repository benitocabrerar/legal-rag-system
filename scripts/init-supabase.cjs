#!/usr/bin/env node

/**
 * Script de inicialización completa de Supabase
 * Ejecuta todas las migraciones, funciones y configuraciones necesarias
 */

const https = require('https');
const fs = require('fs');
const { Client } = require('pg');

// Configuración de Supabase
const SUPABASE_URL = 'https://kmpujsompmtfcudtxjah.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVwcWJ3dGdva2RvcmRldHdqenVqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMzMDcwMDYsImV4cCI6MjA2ODg4MzAwNn0.KjYMrpBVkfDKAoba5AyUtkXdChElX7LCIty-8TqaPuI';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVwcWJ3dGdva2RvcmRldHdqenVqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MzMwNzAwNiwiZXhwIjoyMDY4ODgzMDA2fQ.TXhStQ6OS9SF9Ff-gj2lg0jMqxfZKqQl7c_ItQB38-g';
const DATABASE_URL = 'postgresql://postgres:Benitomz2025$@db.kmpujsompmtfcudtxjah.supabase.co:5432/postgres';

console.log('🚀 Legal RAG System - Inicialización de Supabase\n');

// Cliente de PostgreSQL
const client = new Client({
  connectionString: DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function main() {
  try {
    // 1. Conectar a la base de datos
    console.log('📊 Conectando a Supabase PostgreSQL...');
    await client.connect();
    console.log('✅ Conectado a la base de datos\n');

    // 2. Habilitar extensiones
    console.log('🔧 Habilitando extensiones...');
    await enableExtensions();

    // 3. Crear schema de Prisma
    console.log('\n📋 Ejecutando migraciones...');
    await runMigrations();

    // 4. Ejecutar funciones SQL vectoriales
    console.log('\n🔍 Creando funciones de búsqueda vectorial...');
    await createVectorFunctions();

    // 5. Crear buckets de storage
    console.log('\n📦 Configurando Storage buckets...');
    await createStorageBuckets();

    // 6. Verificar setup
    console.log('\n✅ Verificando configuración...');
    await verifySetup();

    console.log('\n🎉 ¡Setup completado exitosamente!\n');
    console.log('Próximos pasos:');
    console.log('1. Iniciar backend: npm run dev');
    console.log('2. Iniciar frontend: cd frontend && npm run dev');
    console.log('3. Visitar: http://localhost:3000\n');

  } catch (error) {
    console.error('❌ Error durante el setup:', error.message);
    console.error('Detalles:', error);
    process.exit(1);
  } finally {
    await client.end();
  }
}

async function enableExtensions() {
  const extensions = [
    'CREATE EXTENSION IF NOT EXISTS "uuid-ossp"',
    'CREATE EXTENSION IF NOT EXISTS vector',
    'CREATE EXTENSION IF NOT EXISTS pg_trgm'
  ];

  for (const ext of extensions) {
    try {
      await client.query(ext);
      console.log(`  ✅ ${ext.split('EXTENSION')[1].trim()}`);
    } catch (error) {
      console.log(`  ⚠️  ${ext.split('EXTENSION')[1].trim()} (ya existe o error)`);
    }
  }
}

async function runMigrations() {
  // Leer el schema de Prisma y ejecutar SQL equivalente
  const schema = fs.readFileSync('prisma/schema.prisma', 'utf8');

  // Crear las tablas principales (simplificado para inicialización)
  const tables = `
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

    -- Crear índices
    CREATE INDEX IF NOT EXISTS idx_cases_user_id ON cases(user_id);
    CREATE INDEX IF NOT EXISTS idx_cases_status ON cases(user_id, status);
    CREATE INDEX IF NOT EXISTS idx_legal_documents_jurisdiction ON legal_documents(jurisdiction, type);
    CREATE INDEX IF NOT EXISTS idx_case_documents_case_id ON case_documents(case_id);
    CREATE INDEX IF NOT EXISTS idx_conversations_user_id ON conversations(user_id);
    CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON messages(conversation_id);
    CREATE INDEX IF NOT EXISTS idx_usage_metrics_user_id ON usage_metrics(user_id, metric_type, recorded_at);
  `;

  try {
    await client.query(tables);
    console.log('  ✅ Tablas creadas exitosamente');
  } catch (error) {
    console.log('  ⚠️  Error creando tablas:', error.message);
  }
}

async function createVectorFunctions() {
  const functionsSQL = fs.readFileSync('database/supabase-functions.sql', 'utf8');

  try {
    await client.query(functionsSQL);
    console.log('  ✅ Funciones vectoriales creadas exitosamente');
  } catch (error) {
    console.log('  ⚠️  Error creando funciones:', error.message);
  }
}

async function createStorageBuckets() {
  // Usar Supabase REST API para crear buckets
  const buckets = [
    { name: 'case-documents', public: false, file_size_limit: 10485760 }, // 10MB
    { name: 'avatars', public: true, file_size_limit: 2097152 } // 2MB
  ];

  for (const bucket of buckets) {
    try {
      const response = await fetch(`${SUPABASE_URL}/storage/v1/bucket`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
          'Content-Type': 'application/json',
          'apikey': SUPABASE_SERVICE_KEY
        },
        body: JSON.stringify(bucket)
      });

      if (response.ok) {
        console.log(`  ✅ Bucket "${bucket.name}" creado`);
      } else {
        const error = await response.json();
        if (error.message && error.message.includes('already exists')) {
          console.log(`  ℹ️  Bucket "${bucket.name}" ya existe`);
        } else {
          console.log(`  ⚠️  Error creando bucket "${bucket.name}":`, error.message);
        }
      }
    } catch (error) {
      console.log(`  ⚠️  Error con bucket "${bucket.name}":`, error.message);
    }
  }
}

async function verifySetup() {
  try {
    // Verificar tablas
    const tables = await client.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      AND table_type = 'BASE TABLE'
      ORDER BY table_name
    `);

    console.log(`  ✅ ${tables.rows.length} tablas creadas`);

    // Verificar extensiones
    const extensions = await client.query(`
      SELECT extname FROM pg_extension
      WHERE extname IN ('uuid-ossp', 'vector', 'pg_trgm')
    `);

    console.log(`  ✅ ${extensions.rows.length}/3 extensiones habilitadas`);

    // Verificar funciones
    const functions = await client.query(`
      SELECT routine_name
      FROM information_schema.routines
      WHERE routine_schema = 'public'
      AND routine_name LIKE 'match_%'
    `);

    console.log(`  ✅ ${functions.rows.length} funciones de búsqueda creadas`);

  } catch (error) {
    console.log('  ⚠️  Error verificando setup:', error.message);
  }
}

// Ejecutar
main();

#!/usr/bin/env node

/**
 * Script de Verificación - Legal RAG System
 * Verifica que toda la configuración esté correcta antes de iniciar
 */

import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';

// Cargar variables de entorno
config();

// Colores para la consola
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function success(message) {
  log(`✅ ${message}`, 'green');
}

function error(message) {
  log(`❌ ${message}`, 'red');
}

function warning(message) {
  log(`⚠️  ${message}`, 'yellow');
}

function info(message) {
  log(`ℹ️  ${message}`, 'cyan');
}

async function verifySetup() {
  log('\n🔍 Verificando configuración del Legal RAG System\n', 'blue');

  let hasErrors = false;
  let hasWarnings = false;

  // ============================================================================
  // 1. Variables de Entorno
  // ============================================================================
  info('1. Verificando variables de entorno...');

  const requiredEnvVars = [
    'SUPABASE_URL',
    'SUPABASE_ANON_KEY',
    'SUPABASE_SERVICE_ROLE_KEY',
    'DATABASE_URL',
  ];

  const optionalEnvVars = [
    'OPENAI_API_KEY',
    'ANTHROPIC_API_KEY',
    'STRIPE_SECRET_KEY',
    'REDIS_URL',
  ];

  // Verificar variables requeridas
  for (const envVar of requiredEnvVars) {
    if (process.env[envVar]) {
      success(`${envVar} está configurado`);
    } else {
      error(`${envVar} NO está configurado`);
      hasErrors = true;
    }
  }

  // Verificar variables opcionales
  for (const envVar of optionalEnvVars) {
    if (process.env[envVar]) {
      success(`${envVar} está configurado`);
    } else {
      warning(`${envVar} no está configurado (opcional)`);
      hasWarnings = true;
    }
  }

  // ============================================================================
  // 2. Conexión a Supabase
  // ============================================================================
  info('\n2. Verificando conexión a Supabase...');

  try {
    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    // Verificar que podemos hacer una query simple
    const { data, error: supabaseError } = await supabase
      .from('users')
      .select('count')
      .limit(1);

    if (supabaseError) {
      // La tabla puede estar vacía, pero la conexión funciona
      if (supabaseError.code === 'PGRST116' || supabaseError.message.includes('count')) {
        success('Conexión a Supabase: OK');
      } else {
        throw supabaseError;
      }
    } else {
      success('Conexión a Supabase: OK');
    }
  } catch (err) {
    error(`Error conectando a Supabase: ${err.message}`);
    hasErrors = true;
  }

  // ============================================================================
  // 3. Verificar Tablas
  // ============================================================================
  info('\n3. Verificando tablas en la base de datos...');

  const expectedTables = [
    'users',
    'organizations',
    'subscriptions',
    'cases',
    'legal_documents',
    'legal_document_chunks',
    'case_documents',
    'case_document_chunks',
    'conversations',
    'messages',
    'usage_metrics',
    'api_keys',
  ];

  try {
    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    for (const table of expectedTables) {
      try {
        const { error: tableError } = await supabase
          .from(table)
          .select('count')
          .limit(1);

        if (tableError && !tableError.message.includes('count')) {
          throw tableError;
        }

        success(`Tabla "${table}" existe`);
      } catch (err) {
        error(`Tabla "${table}" no encontrada`);
        hasErrors = true;
      }
    }

    log(`\n✅ Total: ${expectedTables.length} tablas`, 'green');
  } catch (err) {
    error(`Error verificando tablas: ${err.message}`);
    hasErrors = true;
  }

  // ============================================================================
  // 4. Verificar Extensiones PostgreSQL
  // ============================================================================
  info('\n4. Verificando extensiones PostgreSQL...');

  try {
    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    // Intentar una consulta que use vector
    const { error: vectorError } = await supabase.rpc('match_legal_documents', {
      query_embedding: Array(1536).fill(0),
      match_count: 1,
    });

    if (vectorError && !vectorError.message.includes('no rows')) {
      throw new Error('Extensión vector no configurada');
    }

    success('Extensión "vector" está habilitada');
    success('Función "match_legal_documents" existe');
  } catch (err) {
    error(`Error verificando extensiones: ${err.message}`);
    hasErrors = true;
  }

  // ============================================================================
  // 5. Verificar Storage Buckets
  // ============================================================================
  info('\n5. Verificando buckets de Storage...');

  try {
    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    const { data: buckets, error: bucketsError } = await supabase.storage.listBuckets();

    if (bucketsError) throw bucketsError;

    const bucketNames = buckets.map((b) => b.name);

    if (bucketNames.includes('case-documents')) {
      success('Bucket "case-documents" existe');
    } else {
      warning('Bucket "case-documents" no encontrado');
      hasWarnings = true;
    }

    if (bucketNames.includes('avatars')) {
      success('Bucket "avatars" existe');
    } else {
      warning('Bucket "avatars" no encontrado');
      hasWarnings = true;
    }
  } catch (err) {
    warning(`No se pudieron verificar los buckets: ${err.message}`);
    hasWarnings = true;
  }

  // ============================================================================
  // 6. Verificar OpenAI API
  // ============================================================================
  if (process.env.OPENAI_API_KEY) {
    info('\n6. Verificando OpenAI API...');

    try {
      const response = await fetch('https://api.openai.com/v1/models', {
        headers: {
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      success('API Key de OpenAI es válido');
    } catch (err) {
      error(`Error verificando OpenAI API: ${err.message}`);
      hasErrors = true;
    }
  }

  // ============================================================================
  // Resumen Final
  // ============================================================================
  log('\n' + '='.repeat(60), 'blue');
  if (hasErrors) {
    log('\n❌ VERIFICACIÓN FALLIDA', 'red');
    log('\nHay errores críticos que deben corregirse antes de continuar.', 'red');
    log('Revisa los errores marcados arriba.\n');
    process.exit(1);
  } else if (hasWarnings) {
    log('\n⚠️  VERIFICACIÓN COMPLETA CON ADVERTENCIAS', 'yellow');
    log('\nLa configuración básica está correcta, pero hay advertencias.', 'yellow');
    log('El sistema puede funcionar, pero algunas funciones pueden no estar disponibles.\n');
    process.exit(0);
  } else {
    log('\n✅ VERIFICACIÓN EXITOSA', 'green');
    log('\n¡Todo está configurado correctamente!', 'green');
    log('Puedes iniciar el servidor con: npm run dev\n');
    process.exit(0);
  }
}

// Ejecutar verificación
verifySetup().catch((err) => {
  error(`\nError fatal: ${err.message}`);
  console.error(err);
  process.exit(1);
});

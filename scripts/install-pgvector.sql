-- ============================================================================
-- INSTALACIÓN DE PGVECTOR Y CONVERSIÓN DE EMBEDDINGS
-- ============================================================================
-- Este script debe ejecutarse desde el SSH del backend de Render
-- Comando: psql $DATABASE_URL -f scripts/install-pgvector.sql
-- ============================================================================

\echo '🚀 Iniciando instalación de pgvector...'

-- ============================================================================
-- PASO 1: Crear extensión pgvector
-- ============================================================================
\echo '📦 Instalando extensión pgvector...'
CREATE EXTENSION IF NOT EXISTS vector;
\echo '✅ Extensión pgvector instalada'

-- ============================================================================
-- PASO 2: Agregar columnas de tipo vector
-- ============================================================================
\echo ''
\echo '🔄 Agregando columnas de tipo vector...'

-- Legal document chunks
ALTER TABLE legal_document_chunks
ADD COLUMN IF NOT EXISTS embedding_vector vector(1536);
\echo '  ✓ Columna embedding_vector agregada a legal_document_chunks'

-- ============================================================================
-- PASO 3: Convertir embeddings existentes de JSONB a vector
-- ============================================================================
\echo ''
\echo '🔄 Convirtiendo embeddings existentes...'
\echo '  (Esto puede tardar un momento dependiendo del tamaño de la base de datos)'

-- Convertir embeddings de legal_document_chunks
UPDATE legal_document_chunks
SET embedding_vector = ('['||
    replace(replace(embedding::text, '{', ''), '}', '') ||
    ']')::vector
WHERE embedding IS NOT NULL
  AND embedding_vector IS NULL;

\echo '  ✓ Embeddings convertidos en legal_document_chunks'

-- ============================================================================
-- PASO 4: Crear índices vectoriales para búsqueda eficiente
-- ============================================================================
\echo ''
\echo '📊 Creando índices vectoriales...'

-- Índice para legal_document_chunks
-- Usamos HNSW para mejor rendimiento en búsquedas
CREATE INDEX IF NOT EXISTS idx_legal_document_chunks_embedding_vector
ON legal_document_chunks
USING hnsw (embedding_vector vector_cosine_ops);

\echo '  ✓ Índice vectorial creado para legal_document_chunks'

-- ============================================================================
-- PASO 5: Verificar instalación
-- ============================================================================
\echo ''
\echo '🔍 Verificando instalación...'

-- Verificar que la extensión está instalada
SELECT
  'Extension installed: ' ||
  CASE WHEN COUNT(*) > 0 THEN '✅ pgvector' ELSE '❌ pgvector NOT installed' END
FROM pg_extension
WHERE extname = 'vector';

-- Contar embeddings convertidos
SELECT
  '✅ Embeddings convertidos: ' || COUNT(*) || ' de ' ||
  (SELECT COUNT(*) FROM legal_document_chunks WHERE embedding IS NOT NULL) || ' chunks'
FROM legal_document_chunks
WHERE embedding_vector IS NOT NULL;

\echo ''
\echo '✅ INSTALACIÓN COMPLETADA EXITOSAMENTE'
\echo ''
\echo '📝 Notas importantes:'
\echo '  1. La columna original "embedding" (JSONB) se mantiene como respaldo'
\echo '  2. La búsqueda semántica ahora usa "embedding_vector" (vector type)'
\echo '  3. El índice HNSW permite búsquedas vectoriales eficientes'
\echo ''

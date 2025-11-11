-- ============================================================================
-- CORRECCIÓN DE CONVERSIÓN DE EMBEDDINGS
-- ============================================================================
-- Los embeddings están almacenados como [[...]] pero pgvector necesita [...]
-- Este script extrae el array interno correctamente
-- ============================================================================

\echo '🔄 Corrigiendo conversión de embeddings...'

-- Verificar estructura del embedding
\echo ''
\echo 'Verificando estructura actual de embeddings...'
SELECT
  'Estructura: ' ||
  CASE
    WHEN jsonb_typeof(embedding) = 'array' THEN 'Array'
    ELSE jsonb_typeof(embedding)
  END as tipo,
  'Longitud exterior: ' || jsonb_array_length(embedding) as longitud,
  'Tipo interior: ' || jsonb_typeof(embedding->0) as tipo_interior
FROM legal_document_chunks
WHERE embedding IS NOT NULL
LIMIT 1;

\echo ''
\echo 'Convirtiendo embeddings de JSONB a vector...'
\echo 'Esto puede tardar un momento...'

-- Convertir embeddings: extraer el primer elemento del array exterior
-- embedding es [[...]] entonces embedding->0 es [...]
UPDATE legal_document_chunks
SET embedding_vector = (embedding->0)::text::vector
WHERE embedding IS NOT NULL
  AND jsonb_typeof(embedding) = 'array'
  AND jsonb_array_length(embedding) > 0;

\echo ''
\echo '✅ Conversión completada'

-- Verificar resultados
\echo ''
\echo '🔍 Verificando conversión...'

SELECT
  'Total chunks: ' || COUNT(*) as total,
  'Con embedding JSONB: ' || COUNT(*) FILTER (WHERE embedding IS NOT NULL) as con_jsonb,
  'Con embedding_vector: ' || COUNT(*) FILTER (WHERE embedding_vector IS NOT NULL) as con_vector
FROM legal_document_chunks;

-- Verificar dimensiones del vector
SELECT
  'Dimensiones del vector: ' || vector_dims(embedding_vector) as dimensiones
FROM legal_document_chunks
WHERE embedding_vector IS NOT NULL
LIMIT 1;

\echo ''
\echo '✅ CONVERSIÓN COMPLETADA EXITOSAMENTE'
\echo ''

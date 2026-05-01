-- ============================================================================
-- POWERIA Legal - LegalDocumentPart Table Migration
-- Tabla para división automática de documentos grandes en partes
-- ============================================================================

-- Crear tabla LegalDocumentPart (solo si no existe)
CREATE TABLE IF NOT EXISTS "LegalDocumentPart" (
  "id" TEXT NOT NULL,
  "parent_document_id" TEXT NOT NULL,
  "part_number" INTEGER NOT NULL,
  "total_parts" INTEGER NOT NULL,
  "start_page" INTEGER NOT NULL,
  "end_page" INTEGER NOT NULL,
  "content" TEXT NOT NULL,
  "file_size_mb" DOUBLE PRECISION NOT NULL,
  "is_processed" BOOLEAN NOT NULL DEFAULT false,
  "processing_status" TEXT,
  "metadata" JSONB,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "LegalDocumentPart_pkey" PRIMARY KEY ("id")
);

-- Crear índices para mejorar rendimiento
CREATE INDEX IF NOT EXISTS "LegalDocumentPart_parent_document_id_idx"
  ON "LegalDocumentPart"("parent_document_id");

CREATE INDEX IF NOT EXISTS "LegalDocumentPart_part_number_idx"
  ON "LegalDocumentPart"("part_number");

CREATE INDEX IF NOT EXISTS "LegalDocumentPart_is_processed_idx"
  ON "LegalDocumentPart"("is_processed");

-- Crear foreign key constraint (si LegalDocument existe)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_name = 'LegalDocument'
  ) THEN
    ALTER TABLE "LegalDocumentPart"
      DROP CONSTRAINT IF EXISTS "LegalDocumentPart_parent_document_id_fkey";

    ALTER TABLE "LegalDocumentPart"
      ADD CONSTRAINT "LegalDocumentPart_parent_document_id_fkey"
      FOREIGN KEY ("parent_document_id")
      REFERENCES "LegalDocument"("id")
      ON DELETE CASCADE
      ON UPDATE CASCADE;
  END IF;
END $$;

-- Crear trigger para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_legal_document_part_updated_at ON "LegalDocumentPart";

CREATE TRIGGER update_legal_document_part_updated_at
  BEFORE UPDATE ON "LegalDocumentPart"
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- Verificación
-- ============================================================================

-- Verificar que la tabla se creó correctamente
SELECT
  'LegalDocumentPart table created successfully' as status,
  COUNT(*) as row_count
FROM "LegalDocumentPart";

-- Listar columnas de la tabla
SELECT
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'LegalDocumentPart'
ORDER BY ordinal_position;

-- ============================================================================
-- USO:
-- ============================================================================
-- Para ejecutar esta migración:
--
-- Opción 1 - psql:
--   psql -U usuario -d nombre_bd -f migration-legal-document-part.sql
--
-- Opción 2 - En tu aplicación:
--   Copia el contenido y ejecútalo con Prisma.$executeRawUnsafe()
--
-- ============================================================================

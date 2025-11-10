-- ============================================================================
-- MIGRATION: Enhance Legal Documents System
-- Date: 2025-11-09
-- Description: Add new fields and enums for legal document management
-- ============================================================================

-- STEP 1: Create new ENUMs
-- ----------------------------------------------------------------------------

CREATE TYPE "NormType" AS ENUM (
  'CONSTITUTIONAL_NORM',
  'ORGANIC_LAW',
  'ORDINARY_LAW',
  'ORGANIC_CODE',
  'ORDINARY_CODE',
  'REGULATION_GENERAL',
  'REGULATION_EXECUTIVE',
  'ORDINANCE_MUNICIPAL',
  'ORDINANCE_METROPOLITAN',
  'RESOLUTION_ADMINISTRATIVE',
  'RESOLUTION_JUDICIAL',
  'ADMINISTRATIVE_AGREEMENT',
  'INTERNATIONAL_TREATY',
  'JUDICIAL_PRECEDENT'
);

CREATE TYPE "LegalHierarchy" AS ENUM (
  'CONSTITUCION',
  'TRATADOS_INTERNACIONALES_DDHH',
  'LEYES_ORGANICAS',
  'LEYES_ORDINARIAS',
  'CODIGOS_ORGANICOS',
  'CODIGOS_ORDINARIOS',
  'REGLAMENTOS',
  'ORDENANZAS',
  'RESOLUCIONES',
  'ACUERDOS_ADMINISTRATIVOS'
);

CREATE TYPE "PublicationType" AS ENUM (
  'ORDINARIO',
  'SUPLEMENTO',
  'SEGUNDO_SUPLEMENTO',
  'SUPLEMENTO_ESPECIAL',
  'EDICION_CONSTITUCIONAL'
);

CREATE TYPE "DocumentState" AS ENUM (
  'ORIGINAL',
  'REFORMADO'
);

-- STEP 2: Add new columns to legal_documents table
-- ----------------------------------------------------------------------------

-- First, add new columns with NULL allowed for existing data
ALTER TABLE "legal_documents"
  ADD COLUMN IF NOT EXISTS "norm_type" "NormType",
  ADD COLUMN IF NOT EXISTS "norm_title" VARCHAR(500),
  ADD COLUMN IF NOT EXISTS "legal_hierarchy" "LegalHierarchy",
  ADD COLUMN IF NOT EXISTS "publication_type" "PublicationType",
  ADD COLUMN IF NOT EXISTS "publication_number" VARCHAR(100),
  ADD COLUMN IF NOT EXISTS "publication_date" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "document_state" "DocumentState" DEFAULT 'ORIGINAL',
  ADD COLUMN IF NOT EXISTS "last_reform_date" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "reform_history" JSONB,
  ADD COLUMN IF NOT EXISTS "jurisdiction" VARCHAR(200),
  ADD COLUMN IF NOT EXISTS "effective_from_date" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "keywords" TEXT[],
  ADD COLUMN IF NOT EXISTS "related_norms" TEXT[],
  ADD COLUMN IF NOT EXISTS "attachments" JSONB;

-- STEP 3: Create indexes for new columns
-- ----------------------------------------------------------------------------

CREATE INDEX IF NOT EXISTS "idx_legal_documents_norm_type" ON "legal_documents"("norm_type");
CREATE INDEX IF NOT EXISTS "idx_legal_documents_legal_hierarchy" ON "legal_documents"("legal_hierarchy");
CREATE INDEX IF NOT EXISTS "idx_legal_documents_publication_type" ON "legal_documents"("publication_type");
CREATE INDEX IF NOT EXISTS "idx_legal_documents_document_state" ON "legal_documents"("document_state");
CREATE INDEX IF NOT EXISTS "idx_legal_documents_publication_date" ON "legal_documents"("publication_date");
CREATE INDEX IF NOT EXISTS "idx_legal_documents_last_reform_date" ON "legal_documents"("last_reform_date");

-- STEP 4: Create legal_document_revisions table
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS "legal_document_revisions" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
  "legal_document_id" TEXT NOT NULL,
  "revision_number" INTEGER NOT NULL,
  "revision_type" VARCHAR(50) NOT NULL,
  "description" TEXT,
  "previous_content" TEXT,
  "new_content" TEXT,
  "changed_by" TEXT NOT NULL,
  "approved_by" TEXT,
  "effective_date" TIMESTAMP(3) NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "legal_document_revisions_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "legal_document_revisions_document_fkey"
    FOREIGN KEY ("legal_document_id")
    REFERENCES "legal_documents"("id")
    ON DELETE CASCADE,
  CONSTRAINT "legal_document_revisions_unique"
    UNIQUE ("legal_document_id", "revision_number")
);

CREATE INDEX IF NOT EXISTS "idx_legal_document_revisions_document_id"
  ON "legal_document_revisions"("legal_document_id");
CREATE INDEX IF NOT EXISTS "idx_legal_document_revisions_effective_date"
  ON "legal_document_revisions"("effective_date");

-- STEP 5: Data Migration - Transform existing data
-- ----------------------------------------------------------------------------

-- Create temporary migration function
CREATE OR REPLACE FUNCTION migrate_legal_documents_data()
RETURNS void AS $$
BEGIN
  -- Update existing documents with mapped values
  UPDATE "legal_documents"
  SET
    -- Map title to norm_title
    "norm_title" = COALESCE("norm_title", "title"),

    -- Map category to legal_hierarchy based on old values
    "legal_hierarchy" = CASE
      WHEN "category" = 'constitution' THEN 'CONSTITUCION'::LegalHierarchy
      WHEN "category" = 'law' THEN 'LEYES_ORDINARIAS'::LegalHierarchy
      WHEN "category" = 'code' THEN 'CODIGOS_ORDINARIOS'::LegalHierarchy
      WHEN "category" = 'regulation' THEN 'REGLAMENTOS'::LegalHierarchy
      WHEN "category" = 'jurisprudence' THEN 'RESOLUCIONES'::LegalHierarchy
      ELSE 'LEYES_ORDINARIAS'::LegalHierarchy -- Default fallback
    END,

    -- Infer norm_type based on category and title patterns
    "norm_type" = CASE
      WHEN "category" = 'constitution' THEN 'CONSTITUTIONAL_NORM'::NormType
      WHEN "category" = 'law' AND "title" ILIKE '%orgánica%' THEN 'ORGANIC_LAW'::NormType
      WHEN "category" = 'law' THEN 'ORDINARY_LAW'::NormType
      WHEN "category" = 'code' AND "title" ILIKE '%orgánico%' THEN 'ORGANIC_CODE'::NormType
      WHEN "category" = 'code' THEN 'ORDINARY_CODE'::NormType
      WHEN "category" = 'regulation' AND "title" ILIKE '%ejecutivo%' THEN 'REGULATION_EXECUTIVE'::NormType
      WHEN "category" = 'regulation' THEN 'REGULATION_GENERAL'::NormType
      WHEN "category" = 'jurisprudence' THEN 'JUDICIAL_PRECEDENT'::NormType
      ELSE 'ORDINARY_LAW'::NormType -- Default fallback
    END,

    -- Extract publication info from metadata if available
    "publication_number" = COALESCE(
      "publication_number",
      ("metadata"->>'number')::VARCHAR(100)
    ),

    -- Extract jurisdiction from metadata if available
    "jurisdiction" = COALESCE(
      "jurisdiction",
      ("metadata"->>'jurisdiction')::VARCHAR(200)
    ),

    -- Set document_state (all existing documents are assumed original)
    "document_state" = COALESCE("document_state", 'ORIGINAL'::DocumentState)

  WHERE "norm_type" IS NULL OR "legal_hierarchy" IS NULL;

  -- Extract year from metadata and convert to publication_date if possible
  UPDATE "legal_documents"
  SET "publication_date" =
    CASE
      WHEN ("metadata"->>'year') IS NOT NULL THEN
        make_date(("metadata"->>'year')::INTEGER, 1, 1)
      ELSE NULL
    END
  WHERE "publication_date" IS NULL AND ("metadata"->>'year') IS NOT NULL;

END;
$$ LANGUAGE plpgsql;

-- Execute the migration function
SELECT migrate_legal_documents_data();

-- Drop the temporary function
DROP FUNCTION IF EXISTS migrate_legal_documents_data();

-- STEP 6: Set NOT NULL constraints for required fields
-- ----------------------------------------------------------------------------

-- After migration, make required fields NOT NULL
-- Note: We keep these as separate statements to allow rollback if needed

ALTER TABLE "legal_documents"
  ALTER COLUMN "norm_type" SET NOT NULL,
  ALTER COLUMN "norm_title" SET NOT NULL,
  ALTER COLUMN "legal_hierarchy" SET NOT NULL;

-- STEP 7: Create audit log entry for this migration
-- ----------------------------------------------------------------------------

INSERT INTO "audit_logs" (
  "id",
  "action",
  "entity",
  "entity_id",
  "changes",
  "success",
  "created_at"
) VALUES (
  gen_random_uuid(),
  'SCHEMA_MIGRATION',
  'legal_documents',
  NULL,
  jsonb_build_object(
    'migration', 'legal_documents_enhancement',
    'version', '2.0.0',
    'changes', ARRAY[
      'Added norm_type enum field',
      'Added norm_title field',
      'Changed category to legal_hierarchy',
      'Added publication fields',
      'Added document state tracking',
      'Created revisions table'
    ]
  ),
  true,
  CURRENT_TIMESTAMP
);

-- ============================================================================
-- ROLLBACK SCRIPT (Save this separately)
-- ============================================================================

-- To rollback this migration, run:
/*
-- Drop new indexes
DROP INDEX IF EXISTS "idx_legal_documents_norm_type";
DROP INDEX IF EXISTS "idx_legal_documents_legal_hierarchy";
DROP INDEX IF EXISTS "idx_legal_documents_publication_type";
DROP INDEX IF EXISTS "idx_legal_documents_document_state";
DROP INDEX IF EXISTS "idx_legal_documents_publication_date";
DROP INDEX IF EXISTS "idx_legal_documents_last_reform_date";

-- Drop revisions table
DROP TABLE IF EXISTS "legal_document_revisions";

-- Drop new columns
ALTER TABLE "legal_documents"
  DROP COLUMN IF EXISTS "norm_type",
  DROP COLUMN IF EXISTS "norm_title",
  DROP COLUMN IF EXISTS "legal_hierarchy",
  DROP COLUMN IF EXISTS "publication_type",
  DROP COLUMN IF EXISTS "publication_number",
  DROP COLUMN IF EXISTS "publication_date",
  DROP COLUMN IF EXISTS "document_state",
  DROP COLUMN IF EXISTS "last_reform_date",
  DROP COLUMN IF EXISTS "reform_history",
  DROP COLUMN IF EXISTS "jurisdiction",
  DROP COLUMN IF EXISTS "effective_from_date",
  DROP COLUMN IF EXISTS "keywords",
  DROP COLUMN IF EXISTS "related_norms",
  DROP COLUMN IF EXISTS "attachments";

-- Drop new types
DROP TYPE IF EXISTS "NormType";
DROP TYPE IF EXISTS "LegalHierarchy";
DROP TYPE IF EXISTS "PublicationType";
DROP TYPE IF EXISTS "DocumentState";
*/
-- CreateEnum
CREATE TYPE "NormType" AS ENUM ('CONSTITUTIONAL_NORM', 'ORGANIC_LAW', 'ORDINARY_LAW', 'ORGANIC_CODE', 'ORDINARY_CODE', 'REGULATION_GENERAL', 'REGULATION_EXECUTIVE', 'ORDINANCE_MUNICIPAL', 'ORDINANCE_METROPOLITAN', 'RESOLUTION_ADMINISTRATIVE', 'RESOLUTION_JUDICIAL', 'ADMINISTRATIVE_AGREEMENT', 'INTERNATIONAL_TREATY', 'JUDICIAL_PRECEDENT');

-- CreateEnum
CREATE TYPE "LegalHierarchy" AS ENUM ('CONSTITUCION', 'TRATADOS_INTERNACIONALES_DDHH', 'LEYES_ORGANICAS', 'LEYES_ORDINARIAS', 'CODIGOS_ORGANICOS', 'CODIGOS_ORDINARIOS', 'REGLAMENTOS', 'ORDENANZAS', 'RESOLUCIONES', 'ACUERDOS_ADMINISTRATIVOS');

-- CreateEnum
CREATE TYPE "PublicationType" AS ENUM ('ORDINARIO', 'SUPLEMENTO', 'SEGUNDO_SUPLEMENTO', 'SUPLEMENTO_ESPECIAL', 'EDICION_CONSTITUCIONAL');

-- CreateEnum
CREATE TYPE "DocumentState" AS ENUM ('ORIGINAL', 'REFORMADO');

-- CreateEnum
CREATE TYPE "Jurisdiction" AS ENUM ('NACIONAL', 'PROVINCIAL', 'MUNICIPAL', 'INTERNACIONAL');

-- AlterTable: Add new columns (nullable first for existing data)
ALTER TABLE "legal_documents" ADD COLUMN     "norm_type" "NormType",
ADD COLUMN     "norm_title" TEXT,
ADD COLUMN     "legal_hierarchy" "LegalHierarchy",
ADD COLUMN     "publication_type" "PublicationType",
ADD COLUMN     "publication_number" TEXT,
ADD COLUMN     "publication_date" TIMESTAMP(3),
ADD COLUMN     "last_reform_date" TIMESTAMP(3),
ADD COLUMN     "document_state" "DocumentState" DEFAULT 'ORIGINAL',
ADD COLUMN     "jurisdiction" "Jurisdiction" DEFAULT 'NACIONAL',
ALTER COLUMN "title" DROP NOT NULL,
ALTER COLUMN "category" DROP NOT NULL;

-- Migrate existing data
UPDATE "legal_documents"
SET
  "norm_title" = "title",
  "legal_hierarchy" = CASE
    WHEN "category" = 'constitution' THEN 'CONSTITUCION'::"LegalHierarchy"
    WHEN "category" = 'law' THEN 'LEYES_ORDINARIAS'::"LegalHierarchy"
    WHEN "category" = 'code' THEN 'CODIGOS_ORDINARIOS'::"LegalHierarchy"
    WHEN "category" = 'regulation' THEN 'REGLAMENTOS'::"LegalHierarchy"
    WHEN "category" = 'jurisprudence' THEN 'RESOLUCIONES'::"LegalHierarchy"
    ELSE 'LEYES_ORDINARIAS'::"LegalHierarchy"
  END,
  "norm_type" = CASE
    WHEN "category" = 'constitution' THEN 'CONSTITUTIONAL_NORM'::"NormType"
    WHEN "category" = 'law' AND "title" ILIKE '%orgánica%' THEN 'ORGANIC_LAW'::"NormType"
    WHEN "category" = 'law' THEN 'ORDINARY_LAW'::"NormType"
    WHEN "category" = 'code' AND "title" ILIKE '%orgánico%' THEN 'ORGANIC_CODE'::"NormType"
    WHEN "category" = 'code' THEN 'ORDINARY_CODE'::"NormType"
    WHEN "category" = 'regulation' AND "title" ILIKE '%ejecutivo%' THEN 'REGULATION_EXECUTIVE'::"NormType"
    WHEN "category" = 'regulation' THEN 'REGULATION_GENERAL'::"NormType"
    WHEN "category" = 'jurisprudence' THEN 'JUDICIAL_PRECEDENT'::"NormType"
    ELSE 'ORDINARY_LAW'::"NormType"
  END,
  "publication_number" = COALESCE(("metadata"->>'number')::TEXT, ''),
  "document_state" = 'ORIGINAL'::"DocumentState",
  "jurisdiction" = 'NACIONAL'::"Jurisdiction"
WHERE "norm_type" IS NULL;

-- Set NOT NULL constraints for required fields
ALTER TABLE "legal_documents" ALTER COLUMN "norm_type" SET NOT NULL;
ALTER TABLE "legal_documents" ALTER COLUMN "norm_title" SET NOT NULL;
ALTER TABLE "legal_documents" ALTER COLUMN "legal_hierarchy" SET NOT NULL;
ALTER TABLE "legal_documents" ALTER COLUMN "publication_type" SET NOT NULL;
ALTER TABLE "legal_documents" ALTER COLUMN "publication_number" SET NOT NULL;

-- Create indexes for performance
CREATE INDEX "legal_documents_norm_type_idx" ON "legal_documents"("norm_type");
CREATE INDEX "legal_documents_legal_hierarchy_idx" ON "legal_documents"("legal_hierarchy");
CREATE INDEX "legal_documents_jurisdiction_idx" ON "legal_documents"("jurisdiction");
CREATE INDEX "legal_documents_publication_type_idx" ON "legal_documents"("publication_type");
CREATE INDEX "legal_documents_document_state_idx" ON "legal_documents"("document_state");
CREATE INDEX "legal_documents_publication_date_idx" ON "legal_documents"("publication_date");

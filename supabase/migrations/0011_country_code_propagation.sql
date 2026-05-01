-- =====================================================================
-- Migration 0011 — Propagación de country_code a cases y documents
-- =====================================================================
-- Cierra el círculo multi-país (después de 0010):
--   1. cases.country_code (heredado de users.preferred_country_code)
--   2. documents.country_code (heredado del case del documento)
--   3. Triggers BEFORE INSERT para auto-popular si no se especifica
--   4. Backfill explícito de filas existentes
--
-- Idempotente: usa IF NOT EXISTS y CREATE OR REPLACE.
-- =====================================================================

-- =====================================================================
-- 1) cases.country_code
-- =====================================================================
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'cases' AND column_name = 'country_code'
  ) THEN
    ALTER TABLE "cases"
      ADD COLUMN "country_code" TEXT NOT NULL DEFAULT 'EC'
      REFERENCES "legal_jurisdictions"("code");
  END IF;
END $$;

-- Backfill: heredar el preferred_country_code del usuario dueño
UPDATE "cases" c
SET "country_code" = COALESCE(u."preferred_country_code", 'EC')
FROM "users" u
WHERE c."user_id" = u."id"
  AND (c."country_code" IS NULL OR c."country_code" = 'EC');

CREATE INDEX IF NOT EXISTS "cases_country_code_idx"
  ON "cases"("country_code", "user_id");

-- Trigger: auto-popular country_code desde users.preferred_country_code en INSERT
CREATE OR REPLACE FUNCTION public.set_case_country_code()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.country_code IS NULL OR NEW.country_code = '' THEN
    SELECT preferred_country_code INTO NEW.country_code
    FROM public.users
    WHERE id = NEW.user_id
    LIMIT 1;
    NEW.country_code := COALESCE(NEW.country_code, 'EC');
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_cases_set_country_code ON "cases";
CREATE TRIGGER trg_cases_set_country_code
  BEFORE INSERT ON "cases"
  FOR EACH ROW EXECUTE FUNCTION public.set_case_country_code();

-- =====================================================================
-- 2) documents.country_code (documentos privados del usuario, por caso)
-- =====================================================================
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'documents') THEN
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_name = 'documents' AND column_name = 'country_code'
    ) THEN
      ALTER TABLE "documents"
        ADD COLUMN "country_code" TEXT NOT NULL DEFAULT 'EC'
        REFERENCES "legal_jurisdictions"("code");
    END IF;
  END IF;
END $$;

-- Backfill: heredar del case relacionado
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'documents') THEN
    UPDATE "documents" d
    SET "country_code" = COALESCE(c."country_code", 'EC')
    FROM "cases" c
    WHERE d."case_id" = c."id"
      AND (d."country_code" IS NULL OR d."country_code" = 'EC');

    CREATE INDEX IF NOT EXISTS "documents_country_code_idx"
      ON "documents"("country_code");
  END IF;
END $$;

-- Trigger: heredar del case en INSERT de documents
CREATE OR REPLACE FUNCTION public.set_document_country_code()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.country_code IS NULL OR NEW.country_code = '' THEN
    -- Primero intentar desde el case
    IF NEW.case_id IS NOT NULL THEN
      SELECT country_code INTO NEW.country_code
      FROM public.cases
      WHERE id = NEW.case_id
      LIMIT 1;
    END IF;
    -- Fallback al usuario dueño
    IF NEW.country_code IS NULL THEN
      SELECT preferred_country_code INTO NEW.country_code
      FROM public.users
      WHERE id = NEW.user_id
      LIMIT 1;
    END IF;
    NEW.country_code := COALESCE(NEW.country_code, 'EC');
  END IF;
  RETURN NEW;
END;
$$;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'documents') THEN
    DROP TRIGGER IF EXISTS trg_documents_set_country_code ON "documents";
    CREATE TRIGGER trg_documents_set_country_code
      BEFORE INSERT ON "documents"
      FOR EACH ROW EXECUTE FUNCTION public.set_document_country_code();
  END IF;
END $$;

-- =====================================================================
-- 3) Trigger en legal_documents (admin uploads) — heredar del uploader
-- =====================================================================
CREATE OR REPLACE FUNCTION public.set_legal_document_country_code()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.country_code IS NULL OR NEW.country_code = '' THEN
    SELECT preferred_country_code INTO NEW.country_code
    FROM public.users
    WHERE id = NEW.uploaded_by
    LIMIT 1;
    NEW.country_code := COALESCE(NEW.country_code, 'EC');
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_legal_documents_set_country_code ON "legal_documents";
CREATE TRIGGER trg_legal_documents_set_country_code
  BEFORE INSERT ON "legal_documents"
  FOR EACH ROW EXECUTE FUNCTION public.set_legal_document_country_code();

-- =====================================================================
-- 4) Helper RPC: get user's country (con fallback)
-- =====================================================================
CREATE OR REPLACE FUNCTION public.get_user_country_code(p_user_id text DEFAULT NULL)
RETURNS text LANGUAGE plpgsql STABLE SECURITY INVOKER AS $$
DECLARE
  v_uid text;
  v_code text;
BEGIN
  v_uid := COALESCE(p_user_id, (auth.uid())::text);
  IF v_uid IS NULL THEN
    RETURN 'EC';
  END IF;
  SELECT preferred_country_code INTO v_code
  FROM public.users WHERE id = v_uid LIMIT 1;
  RETURN COALESCE(v_code, 'EC');
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_user_country_code(text) TO authenticated, anon;

-- =====================================================================
-- 5) RPC search_user_documents — agregar filtro por país
-- =====================================================================
DROP FUNCTION IF EXISTS public.search_user_documents(vector, text, int, uuid);

CREATE OR REPLACE FUNCTION public.search_user_documents(
  query_embedding vector(1536),
  query_text      text,
  match_count     int   DEFAULT 20,
  filter_case_id  uuid  DEFAULT NULL,
  filter_country_code text DEFAULT NULL
)
RETURNS TABLE (
  chunk_id    text,
  document_id text,
  title       text,
  content     text,
  rrf_score   float,
  country_code text
)
LANGUAGE plpgsql STABLE PARALLEL SAFE SECURITY INVOKER AS $$
DECLARE
  v_country_code text;
BEGIN
  IF filter_country_code IS NOT NULL THEN
    v_country_code := filter_country_code;
  ELSE
    v_country_code := public.get_user_country_code(NULL);
  END IF;

  RETURN QUERY
  WITH sem AS (
    SELECT dc.id, dc.document_id, d.country_code,
           row_number() OVER (ORDER BY dc.embedding_v <=> query_embedding) AS r
    FROM public.document_chunks dc
    JOIN public.documents d ON d.id = dc.document_id
    WHERE dc.embedding_v IS NOT NULL
      AND d.country_code = v_country_code
      AND (filter_case_id IS NULL OR d.case_id = filter_case_id::text)
    ORDER BY dc.embedding_v <=> query_embedding
    LIMIT GREATEST(match_count * 3, 60)
  ),
  kw AS (
    SELECT dc.id, dc.document_id, d.country_code,
           row_number() OVER (
             ORDER BY ts_rank_cd(
               to_tsvector('spanish', dc.content),
               websearch_to_tsquery('spanish', query_text)
             ) DESC
           ) AS r
    FROM public.document_chunks dc
    JOIN public.documents d ON d.id = dc.document_id
    WHERE to_tsvector('spanish', dc.content) @@ websearch_to_tsquery('spanish', query_text)
      AND d.country_code = v_country_code
      AND (filter_case_id IS NULL OR d.case_id = filter_case_id::text)
    LIMIT GREATEST(match_count * 3, 60)
  )
  SELECT
    COALESCE(sem.id, kw.id),
    COALESCE(sem.document_id, kw.document_id),
    d.title,
    dc.content,
    (1.0 / (60 + COALESCE(sem.r, 9999))) + (1.0 / (60 + COALESCE(kw.r, 9999))) AS score,
    COALESCE(sem.country_code, kw.country_code)
  FROM sem
  FULL OUTER JOIN kw ON sem.id = kw.id
  JOIN public.document_chunks dc ON dc.id = COALESCE(sem.id, kw.id)
  JOIN public.documents d ON d.id = dc.document_id
  ORDER BY score DESC
  LIMIT match_count;
END;
$$;

GRANT EXECUTE ON FUNCTION public.search_user_documents(vector, text, int, uuid, text)
  TO authenticated;

-- =====================================================================
-- 5.5) Quitar DEFAULT 'EC' de las columnas para que los triggers BEFORE
-- INSERT puedan distinguir "el caller no especificó" (NULL) de "el caller
-- envió 'EC' explícitamente". PostgreSQL aplica el DEFAULT antes del
-- trigger, lo que impedía que el trigger heredara la preferencia del user.
-- =====================================================================
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns
             WHERE table_name = 'cases' AND column_name = 'country_code') THEN
    ALTER TABLE cases ALTER COLUMN country_code DROP DEFAULT;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns
             WHERE table_name = 'documents' AND column_name = 'country_code') THEN
    ALTER TABLE documents ALTER COLUMN country_code DROP DEFAULT;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns
             WHERE table_name = 'legal_documents' AND column_name = 'country_code') THEN
    ALTER TABLE legal_documents ALTER COLUMN country_code DROP DEFAULT;
  END IF;
END $$;

-- =====================================================================
-- 6) Verificación
-- =====================================================================
DO $$
DECLARE
  cases_with_country INT;
  documents_with_country INT;
  legal_docs_count INT;
BEGIN
  SELECT COUNT(*) INTO cases_with_country FROM cases WHERE country_code IS NOT NULL;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'documents') THEN
    SELECT COUNT(*) INTO documents_with_country FROM documents WHERE country_code IS NOT NULL;
  ELSE
    documents_with_country := -1;
  END IF;
  SELECT COUNT(*) INTO legal_docs_count FROM legal_documents;

  RAISE NOTICE '✓ cases con country_code:        %', cases_with_country;
  RAISE NOTICE '✓ documents con country_code:    %', documents_with_country;
  RAISE NOTICE '✓ legal_documents totales:       %', legal_docs_count;
  RAISE NOTICE '✓ Triggers BEFORE INSERT activos en cases / documents / legal_documents';
END $$;

-- =====================================================================
-- Migration 0010 — Soporte multi-país (jurisdicciones)
-- =====================================================================
-- Habilita expansión a otros países latinoamericanos manteniendo Ecuador
-- como jurisdicción ACTIVA por defecto. Países adicionales se siembran
-- como inactivos para fácil activación en versiones futuras (basta con
-- UPDATE legal_jurisdictions SET is_active = true WHERE code = 'CO').
--
-- Diseño:
--   1. Tabla `legal_jurisdictions` con catálogo ISO-3166 alpha-2.
--   2. Columna `country_code` en `legal_documents` (default 'EC').
--   3. Columna `country_code` en `users.preferred_country_code` (default 'EC').
--   4. RPC `search_legal_chunks` extendida con filtro por país.
--   5. RLS / GRANTs configurados.
--
-- Idempotente: usa CREATE TABLE IF NOT EXISTS y ON CONFLICT.
-- =====================================================================

-- =====================================================================
-- 1) Catálogo de jurisdicciones / países
-- =====================================================================
CREATE TABLE IF NOT EXISTS "legal_jurisdictions" (
  "code" TEXT PRIMARY KEY,                    -- ISO-3166 alpha-2 (EC, CO, MX...)
  "name_es" TEXT NOT NULL,                    -- "Ecuador"
  "name_en" TEXT NOT NULL,                    -- "Ecuador" (English)
  "flag_emoji" TEXT NOT NULL DEFAULT '🌎',    -- Bandera para UI
  "default_language" TEXT NOT NULL DEFAULT 'es',
  "default_currency" TEXT NOT NULL DEFAULT 'USD',
  "iso_3166_alpha3" TEXT,                     -- ECU, COL, MEX...
  "phone_prefix" TEXT,                        -- "+593", "+57"...
  "is_active" BOOLEAN NOT NULL DEFAULT false,
  "is_default" BOOLEAN NOT NULL DEFAULT false,
  "display_order" INTEGER NOT NULL DEFAULT 0,
  "legal_system" TEXT,                        -- "civil_law", "common_law"
  "notes" TEXT,                               -- Notas internas (siguiente versión)
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE "legal_jurisdictions" IS
  'Catálogo de países/jurisdicciones legales. Solo is_active=true se muestran al usuario. EC = default.';

CREATE INDEX IF NOT EXISTS "legal_jurisdictions_active_idx"
  ON "legal_jurisdictions"("is_active", "display_order");

-- Garantizar que solo haya un default
CREATE UNIQUE INDEX IF NOT EXISTS "legal_jurisdictions_one_default_idx"
  ON "legal_jurisdictions"("is_default") WHERE "is_default" = true;

-- =====================================================================
-- 2) Seed con países LATAM + selectos
-- =====================================================================
-- Ecuador es el único ACTIVO (is_active = true) y DEFAULT.
-- Los demás están listos para activarse en versiones futuras.

INSERT INTO "legal_jurisdictions" (code, name_es, name_en, flag_emoji, default_language, default_currency, iso_3166_alpha3, phone_prefix, is_active, is_default, display_order, legal_system) VALUES
  ('EC', 'Ecuador',         'Ecuador',         '🇪🇨', 'es', 'USD', 'ECU', '+593', true,  true,  1, 'civil_law'),
  ('CO', 'Colombia',        'Colombia',        '🇨🇴', 'es', 'COP', 'COL', '+57',  false, false, 2, 'civil_law'),
  ('MX', 'México',          'Mexico',          '🇲🇽', 'es', 'MXN', 'MEX', '+52',  false, false, 3, 'civil_law'),
  ('PE', 'Perú',            'Peru',            '🇵🇪', 'es', 'PEN', 'PER', '+51',  false, false, 4, 'civil_law'),
  ('CL', 'Chile',           'Chile',           '🇨🇱', 'es', 'CLP', 'CHL', '+56',  false, false, 5, 'civil_law'),
  ('AR', 'Argentina',       'Argentina',       '🇦🇷', 'es', 'ARS', 'ARG', '+54',  false, false, 6, 'civil_law'),
  ('VE', 'Venezuela',       'Venezuela',       '🇻🇪', 'es', 'VES', 'VEN', '+58',  false, false, 7, 'civil_law'),
  ('UY', 'Uruguay',         'Uruguay',         '🇺🇾', 'es', 'UYU', 'URY', '+598', false, false, 8, 'civil_law'),
  ('PY', 'Paraguay',        'Paraguay',        '🇵🇾', 'es', 'PYG', 'PRY', '+595', false, false, 9, 'civil_law'),
  ('BO', 'Bolivia',          'Bolivia',         '🇧🇴', 'es', 'BOB', 'BOL', '+591', false, false, 10, 'civil_law'),
  ('CR', 'Costa Rica',      'Costa Rica',      '🇨🇷', 'es', 'CRC', 'CRI', '+506', false, false, 11, 'civil_law'),
  ('PA', 'Panamá',          'Panama',          '🇵🇦', 'es', 'PAB', 'PAN', '+507', false, false, 12, 'civil_law'),
  ('GT', 'Guatemala',       'Guatemala',       '🇬🇹', 'es', 'GTQ', 'GTM', '+502', false, false, 13, 'civil_law'),
  ('DO', 'República Dominicana', 'Dominican Republic', '🇩🇴', 'es', 'DOP', 'DOM', '+1', false, false, 14, 'civil_law'),
  ('SV', 'El Salvador',     'El Salvador',     '🇸🇻', 'es', 'USD', 'SLV', '+503', false, false, 15, 'civil_law'),
  ('HN', 'Honduras',        'Honduras',        '🇭🇳', 'es', 'HNL', 'HND', '+504', false, false, 16, 'civil_law'),
  ('NI', 'Nicaragua',        'Nicaragua',       '🇳🇮', 'es', 'NIO', 'NIC', '+505', false, false, 17, 'civil_law'),
  ('CU', 'Cuba',            'Cuba',            '🇨🇺', 'es', 'CUP', 'CUB', '+53',  false, false, 18, 'civil_law'),
  ('PR', 'Puerto Rico',     'Puerto Rico',     '🇵🇷', 'es', 'USD', 'PRI', '+1',   false, false, 19, 'civil_law'),
  ('BR', 'Brasil',          'Brazil',          '🇧🇷', 'pt', 'BRL', 'BRA', '+55',  false, false, 20, 'civil_law'),
  ('US', 'Estados Unidos',  'United States',   '🇺🇸', 'en', 'USD', 'USA', '+1',   false, false, 21, 'common_law'),
  ('ES', 'España',          'Spain',           '🇪🇸', 'es', 'EUR', 'ESP', '+34',  false, false, 22, 'civil_law')
ON CONFLICT (code) DO UPDATE SET
  name_es = EXCLUDED.name_es,
  name_en = EXCLUDED.name_en,
  flag_emoji = EXCLUDED.flag_emoji,
  default_language = EXCLUDED.default_language,
  default_currency = EXCLUDED.default_currency,
  iso_3166_alpha3 = EXCLUDED.iso_3166_alpha3,
  phone_prefix = EXCLUDED.phone_prefix,
  display_order = EXCLUDED.display_order,
  legal_system = EXCLUDED.legal_system,
  updated_at = NOW();

-- =====================================================================
-- 3) Agregar country_code a legal_documents
-- =====================================================================
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'legal_documents' AND column_name = 'country_code'
  ) THEN
    ALTER TABLE "legal_documents"
      ADD COLUMN "country_code" TEXT NOT NULL DEFAULT 'EC' REFERENCES "legal_jurisdictions"("code");
    -- Backfill explícito (todos los docs existentes son de Ecuador)
    UPDATE "legal_documents" SET "country_code" = 'EC' WHERE "country_code" IS NULL OR "country_code" = '';
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "legal_documents_country_code_idx"
  ON "legal_documents"("country_code", "is_active");

-- =====================================================================
-- 4) Agregar preferred_country_code a users
-- =====================================================================
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'preferred_country_code'
  ) THEN
    ALTER TABLE "users"
      ADD COLUMN "preferred_country_code" TEXT NOT NULL DEFAULT 'EC' REFERENCES "legal_jurisdictions"("code");
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "users_preferred_country_code_idx"
  ON "users"("preferred_country_code");

-- =====================================================================
-- 5) RPC actualizada — filtrar por país (default = preferencia del usuario o 'EC')
-- =====================================================================
-- Nuevo parámetro `filter_country_code`. Si es NULL, usa la preferencia del
-- caller (auth.uid()) o 'EC' como fallback.

-- DROP versión anterior (firma de 9 args). Necesario porque cambia la firma
-- (la nueva tiene 10 args + tipo de retorno extendido con country_code).
-- La firma anterior usa filter_doc_id text (no uuid).
DROP FUNCTION IF EXISTS public.search_legal_chunks(
  vector, text, int, float, float, int, text, text, text
);
-- Por si alguna vez fue creada con uuid también
DROP FUNCTION IF EXISTS public.search_legal_chunks(
  vector, text, int, float, float, int, uuid, text, text
);

CREATE OR REPLACE FUNCTION public.search_legal_chunks(
  query_embedding   vector(1536),
  query_text        text,
  match_count       int     DEFAULT 20,
  semantic_weight   float   DEFAULT 1.0,
  keyword_weight    float   DEFAULT 1.0,
  rrf_k             int     DEFAULT 60,
  filter_doc_id     text    DEFAULT NULL,
  filter_norm_type  text    DEFAULT NULL,
  filter_jurisdiction text  DEFAULT NULL,
  filter_country_code text  DEFAULT NULL
)
RETURNS TABLE (
  chunk_id          text,
  legal_document_id text,
  norm_title        text,
  content           text,
  rrf_score         float,
  semantic_rank     int,
  keyword_rank      int,
  semantic_distance float,
  country_code      text
)
LANGUAGE plpgsql
STABLE
PARALLEL SAFE
SECURITY INVOKER
AS $$
DECLARE
  v_country_code text;
BEGIN
  -- Resolver país: argumento explícito > preferencia del usuario > 'EC'
  IF filter_country_code IS NOT NULL THEN
    v_country_code := filter_country_code;
  ELSE
    BEGIN
      SELECT u.preferred_country_code INTO v_country_code
      FROM public.users u
      WHERE u.id = (auth.uid())::text
      LIMIT 1;
    EXCEPTION WHEN OTHERS THEN
      v_country_code := NULL;
    END;
    v_country_code := COALESCE(v_country_code, 'EC');
  END IF;

  RETURN QUERY
  WITH semantic AS (
    SELECT
      ldc.id,
      ldc.legal_document_id,
      ld.country_code,
      ldc.embedding_v <=> query_embedding AS distance,
      row_number() OVER (ORDER BY ldc.embedding_v <=> query_embedding) AS r
    FROM public.legal_document_chunks ldc
    JOIN public.legal_documents ld ON ld.id = ldc.legal_document_id
    WHERE ld.is_active = true
      AND ldc.embedding_v IS NOT NULL
      AND ld.country_code = v_country_code
      AND (filter_doc_id IS NULL OR ldc.legal_document_id = filter_doc_id)
      AND (filter_norm_type IS NULL OR ld.norm_type::text = filter_norm_type)
      AND (filter_jurisdiction IS NULL OR ld.jurisdiction::text = filter_jurisdiction)
    ORDER BY ldc.embedding_v <=> query_embedding
    LIMIT GREATEST(match_count * 3, 60)
  ),
  keyword AS (
    SELECT
      ldc.id,
      ldc.legal_document_id,
      ld.country_code,
      row_number() OVER (
        ORDER BY ts_rank_cd(
          to_tsvector('spanish', ldc.content),
          websearch_to_tsquery('spanish', query_text)
        ) DESC
      ) AS r
    FROM public.legal_document_chunks ldc
    JOIN public.legal_documents ld ON ld.id = ldc.legal_document_id
    WHERE ld.is_active = true
      AND ld.country_code = v_country_code
      AND to_tsvector('spanish', ldc.content) @@ websearch_to_tsquery('spanish', query_text)
      AND (filter_doc_id IS NULL OR ldc.legal_document_id = filter_doc_id)
      AND (filter_norm_type IS NULL OR ld.norm_type::text = filter_norm_type)
      AND (filter_jurisdiction IS NULL OR ld.jurisdiction::text = filter_jurisdiction)
    LIMIT GREATEST(match_count * 3, 60)
  ),
  fused AS (
    SELECT
      COALESCE(s.id, k.id) AS id,
      COALESCE(s.legal_document_id, k.legal_document_id) AS legal_document_id,
      COALESCE(s.country_code, k.country_code) AS country_code,
      (semantic_weight * (1.0 / (rrf_k + COALESCE(s.r, 9999))))
        + (keyword_weight * (1.0 / (rrf_k + COALESCE(k.r, 9999)))) AS score,
      s.r AS srank,
      k.r AS krank,
      s.distance AS sdist
    FROM semantic s
    FULL OUTER JOIN keyword k ON s.id = k.id
  )
  SELECT
    f.id,
    f.legal_document_id,
    ld.norm_title,
    ldc.content,
    f.score,
    f.srank::int,
    f.krank::int,
    f.sdist,
    f.country_code
  FROM fused f
  JOIN public.legal_document_chunks ldc ON ldc.id = f.id
  JOIN public.legal_documents ld ON ld.id = f.legal_document_id
  ORDER BY f.score DESC
  LIMIT match_count;
END;
$$;

COMMENT ON FUNCTION public.search_legal_chunks IS
  'Búsqueda híbrida (semantic HNSW + keyword FTS) con RRF, filtrada por país. '
  'filter_country_code NULL ⇒ usa users.preferred_country_code o ''EC'' como fallback.';

-- Re-grant con la nueva firma
GRANT EXECUTE ON FUNCTION public.search_legal_chunks(
  vector, text, int, float, float, int, text, text, text, text
) TO authenticated, anon;

-- =====================================================================
-- 6) Helper: lista de jurisdicciones activas (para UI)
-- =====================================================================
CREATE OR REPLACE FUNCTION public.get_active_jurisdictions()
RETURNS TABLE (
  code text,
  name_es text,
  name_en text,
  flag_emoji text,
  default_currency text,
  is_default boolean,
  display_order int
)
LANGUAGE sql
STABLE
SECURITY INVOKER
AS $$
  SELECT j.code, j.name_es, j.name_en, j.flag_emoji, j.default_currency, j.is_default, j.display_order
  FROM public.legal_jurisdictions j
  WHERE j.is_active = true
  ORDER BY j.display_order, j.code;
$$;

GRANT EXECUTE ON FUNCTION public.get_active_jurisdictions() TO authenticated, anon;

-- =====================================================================
-- 7) RLS y GRANTs sobre legal_jurisdictions
-- =====================================================================
ALTER TABLE "legal_jurisdictions" ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "service_role_all_legal_jurisdictions" ON "legal_jurisdictions"
    FOR ALL TO service_role USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "anon_select_active_jurisdictions" ON "legal_jurisdictions"
    FOR SELECT TO anon, authenticated USING (is_active = true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

GRANT SELECT ON "legal_jurisdictions" TO service_role, anon, authenticated;

-- =====================================================================
-- 8) Verificación
-- =====================================================================
DO $$
DECLARE
  active_count INT;
  default_count INT;
  ec_docs INT;
  total_juris INT;
BEGIN
  SELECT COUNT(*) INTO active_count FROM legal_jurisdictions WHERE is_active = true;
  SELECT COUNT(*) INTO default_count FROM legal_jurisdictions WHERE is_default = true;
  SELECT COUNT(*) INTO ec_docs FROM legal_documents WHERE country_code = 'EC';
  SELECT COUNT(*) INTO total_juris FROM legal_jurisdictions;

  RAISE NOTICE '✓ Jurisdicciones totales sembradas:  %', total_juris;
  RAISE NOTICE '✓ Jurisdicciones activas (mostradas): %', active_count;
  RAISE NOTICE '✓ Default jurisdiction:               % (esperaba 1)', default_count;
  RAISE NOTICE '✓ Legal documents en Ecuador:         %', ec_docs;

  IF default_count <> 1 THEN
    RAISE EXCEPTION 'Esperaba exactamente 1 jurisdicción default, encontré %', default_count;
  END IF;
  IF active_count = 0 THEN
    RAISE EXCEPTION 'No hay jurisdicciones activas — al menos EC debería estarlo';
  END IF;
END $$;

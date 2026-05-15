-- ═══════════════════════════════════════════════════════════════════
-- Dominios de corpus — infraestructura multi-jurisdicción
-- Fase 3: preparar la entrada a EE.UU.
--
-- El corpus jurídico deja de ser implícitamente ecuatoriano. Un "dominio
-- de corpus" es un cuerpo de derecho gestionable de forma aislada:
--   - ec-general    → derecho ecuatoriano (el corpus actual)
--   - us-immigration → derecho migratorio federal de EE.UU. (pendiente de ingesta)
--
-- Cada documento de legal_documents queda etiquetado con su dominio. La
-- recuperación RAG puede acotarse a un dominio — el corpus EC y el corpus
-- US no se contaminan entre sí.
--
-- Aplicado en Supabase 2026-05-15 vía MCP.
-- ═══════════════════════════════════════════════════════════════════

-- Registro de dominios de corpus.
CREATE TABLE IF NOT EXISTS public.corpus_domains (
  code           text PRIMARY KEY,
  name           text NOT NULL,
  country_code   text NOT NULL,
  language       text NOT NULL DEFAULT 'es',
  description    text,
  is_active      boolean NOT NULL DEFAULT false,
  is_default     boolean NOT NULL DEFAULT false,
  display_order  integer NOT NULL DEFAULT 100,
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.corpus_domains ENABLE ROW LEVEL SECURITY;

-- Seed: el corpus actual + el dominio de inmigración US (aún sin ingesta).
INSERT INTO public.corpus_domains
  (code, name, country_code, language, description, is_active, is_default, display_order)
VALUES
  ('ec-general', 'Derecho ecuatoriano', 'EC', 'es',
   'Corpus jurídico general del Ecuador: Constitución, códigos, leyes orgánicas y ordinarias, e instrumentos internacionales ratificados.',
   true, true, 1),
  ('us-immigration', 'Inmigración federal EE.UU.', 'US', 'en',
   'Corpus de derecho migratorio federal de Estados Unidos: CFR Título 8, normativa y políticas de USCIS, decisiones de la BIA y Boletín de Visas. Pendiente de ingesta de fuentes.',
   false, false, 2)
ON CONFLICT (code) DO NOTHING;

-- Etiqueta de dominio en cada documento del corpus.
ALTER TABLE public.legal_documents
  ADD COLUMN IF NOT EXISTS corpus_domain text REFERENCES public.corpus_domains(code);

-- Backfill: todo el corpus actual es derecho ecuatoriano.
UPDATE public.legal_documents
   SET corpus_domain = 'ec-general'
 WHERE corpus_domain IS NULL;

CREATE INDEX IF NOT EXISTS idx_legal_documents_corpus_domain
  ON public.legal_documents(corpus_domain);

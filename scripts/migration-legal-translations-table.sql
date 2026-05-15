-- ═══════════════════════════════════════════════════════════════════
-- Traductor Jurídico — tabla
-- Fase 3, núcleo de software: modo bilingüe real español ⇄ inglés.
--
-- Guarda cada traducción jurídica con su glosario de términos. Pensado
-- para el abogado que sirve clientes hispanos en EE.UU. y necesita mover
-- documentos entre el español (fuente) y el inglés (presentación).
--
-- Aplicado en Supabase 2026-05-15 vía MCP.
-- ═══════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.legal_translations (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          text NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  case_id          text,
  source_lang      text NOT NULL CHECK (source_lang IN ('es','en')),
  target_lang      text NOT NULL CHECK (target_lang IN ('es','en')),
  doc_type         text NOT NULL DEFAULT 'general',
  source_text      text NOT NULL,
  translated_text  text,
  glossary         jsonb NOT NULL DEFAULT '[]'::jsonb,
  duration_ms      integer NOT NULL DEFAULT 0,
  created_at       timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_legal_translations_user
  ON public.legal_translations(user_id, created_at DESC);

-- RLS: solo service_role (backend); el frontend pasa por endpoints con JWT.
ALTER TABLE public.legal_translations ENABLE ROW LEVEL SECURITY;

-- ═══════════════════════════════════════════════════════════════════
-- Agente de Trámites — tabla
-- Fase 2, feature 2: autocompletar escritos / trámites tipo del Ecuador
-- con revisión humana obligatoria.
--
-- review_status arranca SIEMPRE en 'borrador'. El trámite no se considera
-- utilizable hasta que el abogado lo revisa y lo marca 'aprobado' — la
-- revisión humana es un requisito del producto, no opcional.
--
-- Aplicado en Supabase 2026-05-15 vía MCP.
-- ═══════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.tramite_runs (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           text NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  case_id           text,
  tramite_key       text NOT NULL,
  tramite_name      text NOT NULL,
  inputs            jsonb NOT NULL DEFAULT '{}'::jsonb,
  draft             text,
  reviewed_content  text,
  review_status     text NOT NULL DEFAULT 'borrador'
                      CHECK (review_status IN ('borrador','aprobado')),
  citations         jsonb NOT NULL DEFAULT '[]'::jsonb,
  used_rag          boolean NOT NULL DEFAULT true,
  duration_ms       integer NOT NULL DEFAULT 0,
  generated_at      timestamptz NOT NULL DEFAULT now(),
  reviewed_at       timestamptz
);
CREATE INDEX IF NOT EXISTS idx_tramite_runs_user ON public.tramite_runs(user_id, generated_at DESC);

-- RLS: solo service_role (backend); el frontend pasa por endpoints con JWT.
ALTER TABLE public.tramite_runs ENABLE ROW LEVEL SECURITY;

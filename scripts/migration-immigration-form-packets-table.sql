-- ═══════════════════════════════════════════════════════════════════
-- Agente de Formularios de Inmigración — tabla
-- Fase 4, feature 1: la "cuña de inmigración".
--
-- Cada fila es un PAQUETE generado para un formulario USCIS (I-130,
-- I-485, N-400, …) a partir de los datos del cliente que carga el
-- abogado. El paquete reúne tres entregables:
--   · form_draft    — borrador del formulario, parte por parte
--   · checklist     — documentos de respaldo a recolectar
--   · filing_guide  — guía de presentación (tasa, dónde, plazos, RFE)
--
-- review_status arranca SIEMPRE en 'borrador'. El paquete NO es
-- presentable hasta que un abogado de inmigración con licencia en
-- EE.UU. lo revisa y lo marca 'revisado'. La revisión humana es un
-- requisito del producto: el agente asiste la preparación, no presta
-- asesoría legal ni presenta nada ante USCIS.
--
-- Aplicado en Supabase 2026-05-15 vía MCP.
-- ═══════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.immigration_form_packets (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           text NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  case_id           text,
  form_key          text NOT NULL,
  form_code         text NOT NULL,
  form_name         text NOT NULL,
  client_name       text,
  inputs            jsonb NOT NULL DEFAULT '{}'::jsonb,
  form_draft        text,
  checklist         jsonb NOT NULL DEFAULT '[]'::jsonb,
  filing_guide      text,
  reviewed_content  text,
  review_status     text NOT NULL DEFAULT 'borrador'
                      CHECK (review_status IN ('borrador','revisado')),
  used_rag          boolean NOT NULL DEFAULT false,
  duration_ms       integer NOT NULL DEFAULT 0,
  generated_at      timestamptz NOT NULL DEFAULT now(),
  reviewed_at       timestamptz
);
CREATE INDEX IF NOT EXISTS idx_imm_form_packets_user
  ON public.immigration_form_packets(user_id, generated_at DESC);

-- RLS: solo service_role (backend); el frontend pasa por endpoints con JWT.
ALTER TABLE public.immigration_form_packets ENABLE ROW LEVEL SECURITY;

-- ═══════════════════════════════════════════════════════════════════
-- Workflow Studio — tablas
-- Aplicado en Supabase 2026-05-15 vía MCP.
-- ═══════════════════════════════════════════════════════════════════

-- Ejecuciones de workflow
CREATE TABLE IF NOT EXISTS public.workflow_runs (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       text NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  template_key  text NOT NULL,
  template_name text NOT NULL,
  status        text NOT NULL DEFAULT 'running'
                  CHECK (status IN ('running','completed','failed')),
  user_input    text,
  case_id       text,
  result        text,
  error_message text,
  duration_ms   integer NOT NULL DEFAULT 0,
  started_at    timestamptz NOT NULL DEFAULT now(),
  completed_at  timestamptz
);
CREATE INDEX IF NOT EXISTS idx_workflow_runs_user ON public.workflow_runs(user_id, started_at DESC);

-- Detalle paso a paso de cada ejecución
CREATE TABLE IF NOT EXISTS public.workflow_run_steps (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id       uuid NOT NULL REFERENCES public.workflow_runs(id) ON DELETE CASCADE,
  step_index   integer NOT NULL,
  step_id      text NOT NULL,
  step_name    text NOT NULL,
  step_type    text NOT NULL,
  status       text NOT NULL DEFAULT 'pending'
                 CHECK (status IN ('pending','running','completed','failed')),
  output       text,
  error_message text,
  duration_ms  integer NOT NULL DEFAULT 0,
  created_at   timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_workflow_steps_run ON public.workflow_run_steps(run_id, step_index);

-- RLS: solo service_role (backend); el frontend pasa por endpoints con JWT.
ALTER TABLE public.workflow_runs       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workflow_run_steps  ENABLE ROW LEVEL SECURITY;

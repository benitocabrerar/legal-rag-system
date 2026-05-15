-- ═══════════════════════════════════════════════════════════════════
-- Poweria Bench — tablas
-- Fase 2, feature 1: benchmark de derecho ecuatoriano.
--
-- Tres tablas:
--   bench_tasks   — el dataset de tareas validadas (se siembra desde código)
--   bench_runs    — cada ejecución del benchmark (snapshot de modelo)
--   bench_results — el resultado por tarea de cada run
--
-- Aplicado en Supabase 2026-05-15 vía MCP.
-- ═══════════════════════════════════════════════════════════════════

-- Dataset de tareas. id es un slug estable (ej. 'laboral-003').
CREATE TABLE IF NOT EXISTS public.bench_tasks (
  id              text PRIMARY KEY,
  category        text NOT NULL,
  difficulty      text NOT NULL
                    CHECK (difficulty IN ('basico','intermedio','avanzado')),
  task_type       text NOT NULL
                    CHECK (task_type IN ('norm_identification','rule_application','citation_accuracy','open_analysis')),
  prompt          text NOT NULL,
  rubric          text NOT NULL,
  expected_norms  jsonb NOT NULL DEFAULT '[]'::jsonb,
  is_active       boolean NOT NULL DEFAULT true,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_bench_tasks_active ON public.bench_tasks(is_active, category);

-- Ejecuciones del benchmark.
CREATE TABLE IF NOT EXISTS public.bench_runs (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  triggered_by     text REFERENCES public.users(id) ON DELETE SET NULL,
  provider         text NOT NULL,
  model            text NOT NULL,
  use_rag          boolean NOT NULL DEFAULT true,
  is_public        boolean NOT NULL DEFAULT false,
  status           text NOT NULL DEFAULT 'running'
                     CHECK (status IN ('running','completed','failed')),
  total_tasks      integer NOT NULL DEFAULT 0,
  completed_tasks  integer NOT NULL DEFAULT 0,
  avg_score        numeric(5,2),
  duration_ms      bigint NOT NULL DEFAULT 0,
  notes            text,
  error_message    text,
  started_at       timestamptz NOT NULL DEFAULT now(),
  completed_at     timestamptz
);
CREATE INDEX IF NOT EXISTS idx_bench_runs_started ON public.bench_runs(started_at DESC);
CREATE INDEX IF NOT EXISTS idx_bench_runs_public  ON public.bench_runs(is_public, status, completed_at DESC);

-- Resultado por tarea.
CREATE TABLE IF NOT EXISTS public.bench_results (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id                uuid NOT NULL REFERENCES public.bench_runs(id) ON DELETE CASCADE,
  task_id               text NOT NULL,
  category              text NOT NULL,
  difficulty            text NOT NULL,
  task_type             text NOT NULL,
  answer                text,
  score                 numeric(5,2),
  verdict               text
                          CHECK (verdict IN ('aprobado','parcial','reprobado')),
  rationale             text,
  norms_expected        integer NOT NULL DEFAULT 0,
  norms_found           integer NOT NULL DEFAULT 0,
  citations_verified    integer NOT NULL DEFAULT 0,
  citations_unverified  integer NOT NULL DEFAULT 0,
  duration_ms           integer NOT NULL DEFAULT 0,
  error_message         text,
  created_at            timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_bench_results_run ON public.bench_results(run_id);

-- RLS: solo service_role (backend). El frontend pasa por endpoints con JWT.
ALTER TABLE public.bench_tasks   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bench_runs    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bench_results ENABLE ROW LEVEL SECURITY;

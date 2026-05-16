-- ═══════════════════════════════════════════════════════════════════
-- Gestión de Precios — historial y soporte
--
-- Panel super-admin de precios: cada cambio de precio de cada plan, en
-- cada ciclo de facturación (mensual/anual), queda registrado en
-- plan_price_history. El precio vigente vive en subscription_plans;
-- editarlo desde el panel actualiza la página de precios y el cobro
-- con tarjeta automáticamente, sin redeploy.
--
-- Aplicado en Supabase 2026-05-15 vía MCP.
-- ═══════════════════════════════════════════════════════════════════

-- Bandera "plan destacado" para la página de precios (badge "Popular").
ALTER TABLE public.subscription_plans
  ADD COLUMN IF NOT EXISTS is_popular boolean NOT NULL DEFAULT false;

-- Historial de precios: append-only. Una fila por cada cambio aplicado.
CREATE TABLE IF NOT EXISTS public.plan_price_history (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id           text NOT NULL,
  plan_code         text NOT NULL,
  billing_cycle     text NOT NULL CHECK (billing_cycle IN ('monthly','yearly')),
  old_price         numeric(10,2) NOT NULL,
  new_price         numeric(10,2) NOT NULL,
  -- absolute  = precio fijado directamente
  -- percentage= ajuste porcentual sobre el precio anterior
  -- bulk      = ajuste porcentual masivo (todos los planes a la vez)
  -- demand    = precio sugerido por señales de oferta/demanda
  -- seed      = carga inicial / reestructura
  change_method     text NOT NULL
                      CHECK (change_method IN ('absolute','percentage','bulk','demand','seed')),
  change_pct        numeric(8,2),
  reason            text,
  changed_by        text,
  changed_by_email  text,
  created_at        timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_plan_price_history_plan
  ON public.plan_price_history(plan_id, created_at DESC);

-- RLS: solo service_role (backend); el panel pasa por endpoints con JWT super-admin.
ALTER TABLE public.plan_price_history ENABLE ROW LEVEL SECURITY;

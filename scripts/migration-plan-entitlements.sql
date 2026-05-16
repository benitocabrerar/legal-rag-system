-- ═══════════════════════════════════════════════════════════════════
-- Entitlements por plan — capacidades y cuotas
--
-- `subscription_plans.entitlements` (jsonb) guarda, por plan, el mapa de
-- capacidades (booleanos) y cuotas (números; -1 = ilimitado). El catálogo
-- de claves vive en código: src/services/entitlements/catalog.ts
--
-- Editar este jsonb desde el panel super-admin (matriz de capacidades) es
-- lo que permite "mover features entre planes" y cobrar distinto, sin
-- redeploy. El enforcement (límite de casos, prueba de 3 días) lee de acá.
--
-- Aplicado en Supabase 2026-05-16 vía MCP.
-- ═══════════════════════════════════════════════════════════════════

ALTER TABLE public.subscription_plans
  ADD COLUMN IF NOT EXISTS entitlements jsonb NOT NULL DEFAULT '{}'::jsonb;

-- Seed inicial de la matriz (6 planes). -1 = ilimitado.
UPDATE public.subscription_plans SET entitlements = '{
  "trial_days":3,"cases":2,"ai_credits":80,"ocr_pages":5,"storage_gb":1,"seats":1,
  "litigation_room":true,"ai_argument_cards":true,"workflow_studio":true,"citation_verification":true,
  "document_generation":true,"tramites_agent":true,"immigration_forms":true,"legal_translator":true,
  "finance_module":true,"ocr_vision":true,"api_access":false,"opus_mode":false,
  "team_workspace":false,"priority_queue":false,"advanced_reports":false
}'::jsonb WHERE code = 'free';

UPDATE public.subscription_plans SET entitlements = '{
  "trial_days":0,"cases":5,"ai_credits":1200,"ocr_pages":10,"storage_gb":3,"seats":1,
  "litigation_room":false,"ai_argument_cards":false,"workflow_studio":true,"citation_verification":true,
  "document_generation":true,"tramites_agent":false,"immigration_forms":false,"legal_translator":false,
  "finance_module":false,"ocr_vision":true,"api_access":false,"opus_mode":false,
  "team_workspace":false,"priority_queue":false,"advanced_reports":false
}'::jsonb WHERE code = 'starter';

UPDATE public.subscription_plans SET entitlements = '{
  "trial_days":0,"cases":20,"ai_credits":3200,"ocr_pages":80,"storage_gb":10,"seats":1,
  "litigation_room":true,"ai_argument_cards":true,"workflow_studio":true,"citation_verification":true,
  "document_generation":true,"tramites_agent":true,"immigration_forms":true,"legal_translator":true,
  "finance_module":true,"ocr_vision":true,"api_access":false,"opus_mode":false,
  "team_workspace":false,"priority_queue":false,"advanced_reports":false
}'::jsonb WHERE code = 'pro';

UPDATE public.subscription_plans SET entitlements = '{
  "trial_days":0,"cases":35,"ai_credits":6000,"ocr_pages":200,"storage_gb":30,"seats":1,
  "litigation_room":true,"ai_argument_cards":true,"workflow_studio":true,"citation_verification":true,
  "document_generation":true,"tramites_agent":true,"immigration_forms":true,"legal_translator":true,
  "finance_module":true,"ocr_vision":true,"api_access":true,"opus_mode":true,
  "team_workspace":false,"priority_queue":true,"advanced_reports":true
}'::jsonb WHERE code = 'pro_max';

UPDATE public.subscription_plans SET entitlements = '{
  "trial_days":0,"cases":50,"ai_credits":14000,"ocr_pages":400,"storage_gb":80,"seats":5,
  "litigation_room":true,"ai_argument_cards":true,"workflow_studio":true,"citation_verification":true,
  "document_generation":true,"tramites_agent":true,"immigration_forms":true,"legal_translator":true,
  "finance_module":true,"ocr_vision":true,"api_access":true,"opus_mode":true,
  "team_workspace":true,"priority_queue":true,"advanced_reports":true
}'::jsonb WHERE code = 'studio';

UPDATE public.subscription_plans SET entitlements = '{
  "trial_days":0,"cases":-1,"ai_credits":-1,"ocr_pages":-1,"storage_gb":-1,"seats":-1,
  "litigation_room":true,"ai_argument_cards":true,"workflow_studio":true,"citation_verification":true,
  "document_generation":true,"tramites_agent":true,"immigration_forms":true,"legal_translator":true,
  "finance_module":true,"ocr_vision":true,"api_access":true,"opus_mode":true,
  "team_workspace":true,"priority_queue":true,"advanced_reports":true
}'::jsonb WHERE code = 'institutional';

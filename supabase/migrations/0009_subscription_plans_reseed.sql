-- =====================================================================
-- Migration 0009 — Reseed subscription_plans con la nueva propuesta
-- de pricing (5 tiers self-serve + Institucional sales-led).
--
-- Tiers:
--   - free       $0     1 caso,  30 queries
--   - starter    $19    10 casos, 150 queries
--   - pro        $49    50 casos, 600 queries  (CAP, no ilimitado)
--   - pro_max    $99    200 casos, 1.200 queries
--   - studio     $249   5 seats / 100 casos / 3.000 queries (equipo)
--   - institutional   sales-led — sin precio en BD, contacto comercial
--
-- Idempotente: usa UPSERT por código.
-- Análisis de costos completo en INFORME_COSTOS_PRICING.html
-- =====================================================================

-- Asegurar columna features de tipo jsonb (ya existe)
-- Limpiar planes obsoletos de seed inicial sin romper FKs:
-- los planes "viejos" se desactivan, no se borran, para no romper
-- subscriptions históricas.
UPDATE "subscription_plans"
SET "is_active" = false, "updated_at" = NOW()
WHERE "code" NOT IN ('free', 'starter', 'pro', 'pro_max', 'studio', 'institutional');

-- =====================================================================
-- FREE
-- =====================================================================
INSERT INTO "subscription_plans" (
  "id", "code", "name", "name_english", "description",
  "price_monthly_usd", "price_yearly_usd",
  "storage_gb", "documents_limit", "monthly_queries", "api_calls_limit",
  "features", "is_active", "display_order",
  "created_at", "updated_at"
) VALUES (
  'plan_free',
  'free',
  'Gratis',
  'Free',
  'Para probar la plataforma — sin tarjeta de crédito',
  0, 0,
  0.05, 5, 30, 100,
  '["1 caso activo","Base legal pública Ecuador","Sin OCR Vision","Sin análisis avanzado","Sin soporte prioritario"]'::jsonb,
  true, 1,
  NOW(), NOW()
)
ON CONFLICT ("code") DO UPDATE SET
  "name" = EXCLUDED."name",
  "name_english" = EXCLUDED."name_english",
  "description" = EXCLUDED."description",
  "price_monthly_usd" = EXCLUDED."price_monthly_usd",
  "price_yearly_usd" = EXCLUDED."price_yearly_usd",
  "storage_gb" = EXCLUDED."storage_gb",
  "documents_limit" = EXCLUDED."documents_limit",
  "monthly_queries" = EXCLUDED."monthly_queries",
  "api_calls_limit" = EXCLUDED."api_calls_limit",
  "features" = EXCLUDED."features",
  "is_active" = true,
  "display_order" = EXCLUDED."display_order",
  "updated_at" = NOW();

-- =====================================================================
-- STARTER  ($19 / mes — abogado independiente)
-- =====================================================================
INSERT INTO "subscription_plans" (
  "id", "code", "name", "name_english", "description",
  "price_monthly_usd", "price_yearly_usd",
  "storage_gb", "documents_limit", "monthly_queries", "api_calls_limit",
  "features", "is_active", "display_order",
  "created_at", "updated_at"
) VALUES (
  'plan_starter',
  'starter',
  'Starter',
  'Starter',
  'Para abogados independientes que empiezan a digitalizar su práctica',
  19, 190,
  2, 50, 150, 1000,
  '["10 casos activos","OCR Vision (10 págs/mes)","Resúmenes ejecutivos IA","Citas verificables","Soporte por email 48h","Anual: 2 meses gratis"]'::jsonb,
  true, 2,
  NOW(), NOW()
)
ON CONFLICT ("code") DO UPDATE SET
  "name" = EXCLUDED."name",
  "name_english" = EXCLUDED."name_english",
  "description" = EXCLUDED."description",
  "price_monthly_usd" = EXCLUDED."price_monthly_usd",
  "price_yearly_usd" = EXCLUDED."price_yearly_usd",
  "storage_gb" = EXCLUDED."storage_gb",
  "documents_limit" = EXCLUDED."documents_limit",
  "monthly_queries" = EXCLUDED."monthly_queries",
  "api_calls_limit" = EXCLUDED."api_calls_limit",
  "features" = EXCLUDED."features",
  "is_active" = true,
  "display_order" = EXCLUDED."display_order",
  "updated_at" = NOW();

-- =====================================================================
-- PRO  ($49 / mes — práctica activa) ⭐ MÁS POPULAR
-- 50 casos, 600 queries (CAP — antes era ilimitado, riesgo de pérdida)
-- =====================================================================
INSERT INTO "subscription_plans" (
  "id", "code", "name", "name_english", "description",
  "price_monthly_usd", "price_yearly_usd",
  "storage_gb", "documents_limit", "monthly_queries", "api_calls_limit",
  "features", "is_active", "display_order",
  "created_at", "updated_at"
) VALUES (
  'plan_pro',
  'pro',
  'Pro',
  'Professional',
  'El plan recomendado para abogados con práctica activa — todas las herramientas de IA',
  49, 490,
  8, 250, 600, 5000,
  '["50 casos activos","OCR Vision (80 págs/mes)","Coherence Check IA","Auto-fill de metadatos IA","Módulo Finanzas + OCR de pagos","Generación de reportes","Análisis avanzado de documentos","Precedentes automáticos","Soporte chat 24h","Anual: 2 meses gratis"]'::jsonb,
  true, 3,
  NOW(), NOW()
)
ON CONFLICT ("code") DO UPDATE SET
  "name" = EXCLUDED."name",
  "name_english" = EXCLUDED."name_english",
  "description" = EXCLUDED."description",
  "price_monthly_usd" = EXCLUDED."price_monthly_usd",
  "price_yearly_usd" = EXCLUDED."price_yearly_usd",
  "storage_gb" = EXCLUDED."storage_gb",
  "documents_limit" = EXCLUDED."documents_limit",
  "monthly_queries" = EXCLUDED."monthly_queries",
  "api_calls_limit" = EXCLUDED."api_calls_limit",
  "features" = EXCLUDED."features",
  "is_active" = true,
  "display_order" = EXCLUDED."display_order",
  "updated_at" = NOW();

-- =====================================================================
-- PRO MAX  ($99 / mes — uso intensivo / power user)
-- =====================================================================
INSERT INTO "subscription_plans" (
  "id", "code", "name", "name_english", "description",
  "price_monthly_usd", "price_yearly_usd",
  "storage_gb", "documents_limit", "monthly_queries", "api_calls_limit",
  "features", "is_active", "display_order",
  "created_at", "updated_at"
) VALUES (
  'plan_pro_max',
  'pro_max',
  'Pro Max',
  'Pro Max',
  'Para abogados de alto volumen — el doble de capacidad que Pro',
  99, 990,
  25, 800, 1200, 15000,
  '["Todo lo de Pro","200 casos activos","OCR Vision (200 págs/mes)","Prioridad en cola IA","API access (5K calls/mes)","Reportes avanzados","Soporte prioritario","Anual: 2 meses gratis"]'::jsonb,
  true, 4,
  NOW(), NOW()
)
ON CONFLICT ("code") DO UPDATE SET
  "name" = EXCLUDED."name",
  "name_english" = EXCLUDED."name_english",
  "description" = EXCLUDED."description",
  "price_monthly_usd" = EXCLUDED."price_monthly_usd",
  "price_yearly_usd" = EXCLUDED."price_yearly_usd",
  "storage_gb" = EXCLUDED."storage_gb",
  "documents_limit" = EXCLUDED."documents_limit",
  "monthly_queries" = EXCLUDED."monthly_queries",
  "api_calls_limit" = EXCLUDED."api_calls_limit",
  "features" = EXCLUDED."features",
  "is_active" = true,
  "display_order" = EXCLUDED."display_order",
  "updated_at" = NOW();

-- =====================================================================
-- STUDIO  ($249 / mes — firma de 2-5 abogados)
-- =====================================================================
INSERT INTO "subscription_plans" (
  "id", "code", "name", "name_english", "description",
  "price_monthly_usd", "price_yearly_usd",
  "storage_gb", "documents_limit", "monthly_queries", "api_calls_limit",
  "features", "is_active", "display_order",
  "created_at", "updated_at"
) VALUES (
  'plan_studio',
  'studio',
  'Studio',
  'Studio',
  'Diseñado para firmas pequeñas que necesitan colaboración real-time',
  249, 2490,
  60, 1500, 3000, 30000,
  '["Todo lo de Pro Max","5 usuarios incluidos","100 casos (cuota equipo)","Cuota IA de equipo (3.000 queries/mes)","OCR Vision (400 págs/mes)","Roles y permisos","Workspace compartido","API access (15K calls/mes)","Panel de administración","Reportes consolidados","Anual: 2 meses gratis"]'::jsonb,
  true, 5,
  NOW(), NOW()
)
ON CONFLICT ("code") DO UPDATE SET
  "name" = EXCLUDED."name",
  "name_english" = EXCLUDED."name_english",
  "description" = EXCLUDED."description",
  "price_monthly_usd" = EXCLUDED."price_monthly_usd",
  "price_yearly_usd" = EXCLUDED."price_yearly_usd",
  "storage_gb" = EXCLUDED."storage_gb",
  "documents_limit" = EXCLUDED."documents_limit",
  "monthly_queries" = EXCLUDED."monthly_queries",
  "api_calls_limit" = EXCLUDED."api_calls_limit",
  "features" = EXCLUDED."features",
  "is_active" = true,
  "display_order" = EXCLUDED."display_order",
  "updated_at" = NOW();

-- =====================================================================
-- INSTITUTIONAL  (cotización sales-led — no se muestra precio)
-- price_monthly_usd = -1 como flag de "contactar ventas"
-- documents_limit / monthly_queries = NULL no permitido,
-- usamos -1 también como sentinel.
-- =====================================================================
INSERT INTO "subscription_plans" (
  "id", "code", "name", "name_english", "description",
  "price_monthly_usd", "price_yearly_usd",
  "storage_gb", "documents_limit", "monthly_queries", "api_calls_limit",
  "features", "is_active", "display_order",
  "created_at", "updated_at"
) VALUES (
  'plan_institutional',
  'institutional',
  'Institucional',
  'Institutional / Enterprise',
  'Para firmas 10+ abogados o instituciones públicas — cotización personalizada',
  -1, -1,
  -1, -1, -1, -1,
  '["Usuarios y cuotas IA personalizadas","SSO / SAML","White-label con dominio propio","SLA 99.9% con soporte dedicado","Despliegue privado / on-premise (opcional)","Capacitación in-house","Onboarding asistido","Auditoría avanzada","Backups personalizados","Facturación corporativa","Contacto: Ing. Francisco Jacome (COGNITEX) — +593 98 396 4333 — francisecuador1@gmail.com"]'::jsonb,
  true, 6,
  NOW(), NOW()
)
ON CONFLICT ("code") DO UPDATE SET
  "name" = EXCLUDED."name",
  "name_english" = EXCLUDED."name_english",
  "description" = EXCLUDED."description",
  "price_monthly_usd" = EXCLUDED."price_monthly_usd",
  "price_yearly_usd" = EXCLUDED."price_yearly_usd",
  "storage_gb" = EXCLUDED."storage_gb",
  "documents_limit" = EXCLUDED."documents_limit",
  "monthly_queries" = EXCLUDED."monthly_queries",
  "api_calls_limit" = EXCLUDED."api_calls_limit",
  "features" = EXCLUDED."features",
  "is_active" = true,
  "display_order" = EXCLUDED."display_order",
  "updated_at" = NOW();

-- =====================================================================
-- Tabla de leads de ventas (formulario institucional)
-- =====================================================================
CREATE TABLE IF NOT EXISTS "contact_inquiries" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  "name" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "phone" TEXT,
  "organization" TEXT,
  "seats" TEXT,
  "message" TEXT,
  "source" TEXT NOT NULL DEFAULT 'landing_institutional',
  "status" TEXT NOT NULL DEFAULT 'new',
  "ip_address" TEXT,
  "user_agent" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "contact_inquiries_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "contact_inquiries_created_at_idx"
  ON "contact_inquiries"("created_at" DESC);
CREATE INDEX IF NOT EXISTS "contact_inquiries_status_idx"
  ON "contact_inquiries"("status");

ALTER TABLE "contact_inquiries" ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "service_role_all_contact_inquiries" ON "contact_inquiries"
    FOR ALL TO service_role USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "anon_insert_contact_inquiries" ON "contact_inquiries"
    FOR INSERT TO anon WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Grants explícitos para que el cliente PostgREST de Supabase pueda
-- operar (los CREATE TABLE en Supabase no conceden permisos a los roles
-- service_role/anon/authenticated por defecto).
GRANT ALL ON "contact_inquiries" TO service_role, anon, authenticated;

-- =====================================================================
-- Verificación
-- =====================================================================
DO $$
DECLARE
  active_count INT;
BEGIN
  SELECT COUNT(*) INTO active_count
  FROM "subscription_plans"
  WHERE "is_active" = true
    AND "code" IN ('free','starter','pro','pro_max','studio','institutional');

  IF active_count <> 6 THEN
    RAISE EXCEPTION 'Esperaba 6 planes activos, encontré %', active_count;
  END IF;
  RAISE NOTICE '✓ 6 planes activos (free/starter/pro/pro_max/studio/institutional) reseed OK';
  RAISE NOTICE '✓ contact_inquiries table lista para recibir leads';
END $$;

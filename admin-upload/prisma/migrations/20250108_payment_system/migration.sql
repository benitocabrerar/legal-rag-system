-- CreateTable
CREATE TABLE "subscription_plans" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "name_english" TEXT NOT NULL,
    "description" TEXT,
    "price_monthly_usd" DOUBLE PRECISION NOT NULL,
    "price_yearly_usd" DOUBLE PRECISION NOT NULL,
    "storage_gb" DOUBLE PRECISION NOT NULL,
    "documents_limit" INTEGER NOT NULL,
    "monthly_queries" INTEGER NOT NULL,
    "api_calls_limit" INTEGER NOT NULL,
    "features" JSONB,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "display_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "subscription_plans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "subscriptions" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "plan_id" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "billing_cycle" TEXT NOT NULL DEFAULT 'monthly',
    "current_period_start" TIMESTAMP(3) NOT NULL,
    "current_period_end" TIMESTAMP(3) NOT NULL,
    "cancel_at_period_end" BOOLEAN NOT NULL DEFAULT false,
    "cancelled_at" TIMESTAMP(3),
    "stripe_subscription_id" TEXT,
    "stripe_customer_id" TEXT,
    "paypal_subscription_id" TEXT,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "subscriptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payments" (
    "id" TEXT NOT NULL,
    "subscription_id" TEXT,
    "user_id" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "method" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "external_id" TEXT,
    "description" TEXT,
    "metadata" JSONB,
    "processing_fee" DOUBLE PRECISION,
    "net_amount" DOUBLE PRECISION,
    "paid_at" TIMESTAMP(3),
    "failed_at" TIMESTAMP(3),
    "refunded_at" TIMESTAMP(3),
    "error_message" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payment_proofs" (
    "id" TEXT NOT NULL,
    "payment_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "file_url" TEXT NOT NULL,
    "file_name" TEXT NOT NULL,
    "file_size" INTEGER NOT NULL,
    "mime_type" TEXT NOT NULL,
    "bank_name" TEXT,
    "account_number" TEXT,
    "reference_number" TEXT,
    "deposit_date" TIMESTAMP(3),
    "notes" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "reviewed_by" TEXT,
    "reviewed_at" TIMESTAMP(3),
    "review_notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payment_proofs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "subscription_plans_code_key" ON "subscription_plans"("code");

-- CreateIndex
CREATE INDEX "subscriptions_user_id_idx" ON "subscriptions"("user_id");

-- CreateIndex
CREATE INDEX "subscriptions_status_idx" ON "subscriptions"("status");

-- CreateIndex
CREATE UNIQUE INDEX "subscriptions_stripe_subscription_id_key" ON "subscriptions"("stripe_subscription_id");

-- CreateIndex
CREATE UNIQUE INDEX "subscriptions_paypal_subscription_id_key" ON "subscriptions"("paypal_subscription_id");

-- CreateIndex
CREATE INDEX "payments_user_id_idx" ON "payments"("user_id");

-- CreateIndex
CREATE INDEX "payments_status_idx" ON "payments"("status");

-- CreateIndex
CREATE INDEX "payments_method_idx" ON "payments"("method");

-- CreateIndex
CREATE INDEX "payments_created_at_idx" ON "payments"("created_at");

-- CreateIndex
CREATE UNIQUE INDEX "payment_proofs_payment_id_key" ON "payment_proofs"("payment_id");

-- CreateIndex
CREATE INDEX "payment_proofs_user_id_idx" ON "payment_proofs"("user_id");

-- CreateIndex
CREATE INDEX "payment_proofs_status_idx" ON "payment_proofs"("status");

-- CreateIndex
CREATE INDEX "payment_proofs_created_at_idx" ON "payment_proofs"("created_at");

-- AddForeignKey
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_plan_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "subscription_plans"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_subscription_id_fkey" FOREIGN KEY ("subscription_id") REFERENCES "subscriptions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_proofs" ADD CONSTRAINT "payment_proofs_payment_id_fkey" FOREIGN KEY ("payment_id") REFERENCES "payments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_proofs" ADD CONSTRAINT "payment_proofs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_proofs" ADD CONSTRAINT "payment_proofs_reviewed_by_fkey" FOREIGN KEY ("reviewed_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Insert default subscription plans
INSERT INTO "subscription_plans" ("id", "code", "name", "name_english", "description", "price_monthly_usd", "price_yearly_usd", "storage_gb", "documents_limit", "monthly_queries", "api_calls_limit", "features", "is_active", "display_order", "created_at", "updated_at") VALUES
('plan-free', 'free', 'Plan Gratuito', 'Free Plan', 'Ideal para probar el sistema con límites básicos', 0, 0, 1, 50, 100, 1000, '["Almacenamiento: 1 GB", "Documentos: 50", "Consultas mensuales: 100", "Soporte por email"]', true, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('plan-basic', 'basic', 'Plan Básico', 'Basic Plan', 'Para abogados independientes con necesidades moderadas', 19, 199, 10, 500, 1000, 10000, '["Almacenamiento: 10 GB", "Documentos: 500", "Consultas mensuales: 1,000", "Soporte prioritario", "Acceso a documentación legal"]', true, 2, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('plan-professional', 'professional', 'Plan Profesional', 'Professional Plan', 'Para firmas de abogados pequeñas y medianas', 49, 499, 50, 2000, 5000, 50000, '["Almacenamiento: 50 GB", "Documentos: 2,000", "Consultas mensuales: 5,000", "Soporte 24/7", "Acceso completo a biblioteca legal", "API avanzada", "Usuarios ilimitados"]', true, 3, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('plan-enterprise', 'enterprise', 'Plan Empresarial', 'Enterprise Plan', 'Para grandes firmas con necesidades ilimitadas', 149, 1499, 200, 10000, 25000, 250000, '["Almacenamiento: 200 GB", "Documentos: 10,000", "Consultas mensuales: 25,000", "Soporte dedicado", "Biblioteca legal completa", "API ilimitada", "Usuarios ilimitados", "Integración personalizada", "Capacitación incluida"]', true, 4, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

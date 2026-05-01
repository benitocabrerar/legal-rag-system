-- CreateEnum
CREATE TYPE "NormType" AS ENUM ('CONSTITUTIONAL_NORM', 'ORGANIC_LAW', 'ORDINARY_LAW', 'ORGANIC_CODE', 'ORDINARY_CODE', 'REGULATION_GENERAL', 'REGULATION_EXECUTIVE', 'ORDINANCE_MUNICIPAL', 'ORDINANCE_METROPOLITAN', 'RESOLUTION_ADMINISTRATIVE', 'RESOLUTION_JUDICIAL', 'ADMINISTRATIVE_AGREEMENT', 'INTERNATIONAL_TREATY', 'JUDICIAL_PRECEDENT');

-- CreateEnum
CREATE TYPE "LegalHierarchy" AS ENUM ('CONSTITUCION', 'TRATADOS_INTERNACIONALES_DDHH', 'LEYES_ORGANICAS', 'LEYES_ORDINARIAS', 'CODIGOS_ORGANICOS', 'CODIGOS_ORDINARIOS', 'REGLAMENTOS', 'ORDENANZAS', 'RESOLUCIONES', 'ACUERDOS_ADMINISTRATIVOS');

-- CreateEnum
CREATE TYPE "PublicationType" AS ENUM ('ORDINARIO', 'SUPLEMENTO', 'SEGUNDO_SUPLEMENTO', 'SUPLEMENTO_ESPECIAL', 'EDICION_CONSTITUCIONAL');

-- CreateEnum
CREATE TYPE "DocumentState" AS ENUM ('ORIGINAL', 'REFORMADO');

-- CreateEnum
CREATE TYPE "Jurisdiction" AS ENUM ('NACIONAL', 'PROVINCIAL', 'MUNICIPAL', 'INTERNACIONAL');

-- CreateEnum
CREATE TYPE "EventType" AS ENUM ('HEARING', 'MEETING', 'DEADLINE', 'CONSULTATION', 'COURT_DATE', 'FILING_DEADLINE', 'CLIENT_MEETING', 'INTERNAL_MEETING', 'PHONE_CALL', 'VIDEO_CONFERENCE', 'OTHER');

-- CreateEnum
CREATE TYPE "EventStatus" AS ENUM ('SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'RESCHEDULED', 'NO_SHOW');

-- CreateEnum
CREATE TYPE "ReminderType" AS ENUM ('EMAIL', 'SMS', 'IN_APP', 'PUSH');

-- CreateEnum
CREATE TYPE "TaskStatus" AS ENUM ('TODO', 'IN_PROGRESS', 'BLOCKED', 'REVIEW', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "TaskPriority" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'URGENT');

-- CreateEnum
CREATE TYPE "NotificationChannel" AS ENUM ('IN_APP', 'EMAIL', 'SMS', 'PUSH');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'PAID', 'PARTIAL', 'OVERDUE', 'CANCELLED', 'REFUNDED');

-- CreateEnum
CREATE TYPE "PaymentMethodType" AS ENUM ('CASH', 'BANK_TRANSFER', 'CREDIT_CARD', 'DEBIT_CARD', 'CHECK', 'PAYPAL', 'STRIPE', 'OTHER');

-- CreateEnum
CREATE TYPE "InvoiceStatus" AS ENUM ('DRAFT', 'SENT', 'VIEWED', 'PAID', 'PARTIAL', 'OVERDUE', 'CANCELLED', 'REFUNDED');

-- CreateEnum
CREATE TYPE "ServiceItemType" AS ENUM ('CONSULTATION', 'COURT_REPRESENTATION', 'DOCUMENT_PREPARATION', 'RESEARCH', 'FILING', 'NEGOTIATION', 'HOURLY_WORK', 'FIXED_FEE', 'EXPENSE', 'OTHER');

-- CreateEnum
CREATE TYPE "CitationType" AS ENUM ('REFERENCE', 'AMENDMENT', 'REPEAL', 'SUPERSEDES', 'IMPLEMENTS', 'JUDICIAL_PRECEDENT');

-- CreateEnum
CREATE TYPE "RelationshipType" AS ENUM ('SUPERSEDES', 'AMENDS', 'IMPLEMENTS', 'RELATED_TO', 'PRECEDENT', 'CONSOLIDATES');

-- CreateEnum
CREATE TYPE "ExtractionMethod" AS ENUM ('AUTOMATIC', 'MANUAL', 'AI_ASSISTED');

-- CreateEnum
CREATE TYPE "RecommendationType" AS ENUM ('SIMILAR', 'CITED_TOGETHER', 'COLLABORATIVE', 'PERSONALIZED');

-- CreateEnum
CREATE TYPE "MLModelType" AS ENUM ('CASE_OUTCOME', 'DOCUMENT_CLASSIFICATION', 'TIMELINE_PREDICTION', 'RISK_ASSESSMENT', 'ENTITY_EXTRACTION', 'SENTIMENT_ANALYSIS', 'TREND_FORECASTING', 'PATTERN_DETECTION');

-- CreateEnum
CREATE TYPE "MLModelStatus" AS ENUM ('TRAINING', 'VALIDATING', 'ACTIVE', 'INACTIVE', 'DEPRECATED', 'FAILED');

-- CreateEnum
CREATE TYPE "TrendDirection" AS ENUM ('INCREASING', 'DECREASING', 'STABLE', 'VOLATILE', 'UNKNOWN');

-- CreateEnum
CREATE TYPE "AlertType" AS ENUM ('THRESHOLD_BREACH', 'ANOMALY_DETECTED', 'TREND_CHANGE', 'PATTERN_MATCH', 'PREDICTION_ALERT', 'SYSTEM_ALERT');

-- CreateEnum
CREATE TYPE "AlertSeverity" AS ENUM ('INFO', 'LOW', 'MEDIUM', 'HIGH', 'CRITICAL');

-- CreateEnum
CREATE TYPE "ChangeType" AS ENUM ('ADDITION', 'DELETION', 'MODIFICATION', 'REORDERING', 'FORMATTING');

-- CreateEnum
CREATE TYPE "BackupTypeEnum" AS ENUM ('FULL', 'INCREMENTAL', 'DIFFERENTIAL', 'SCHEMA_ONLY', 'DATA_ONLY');

-- CreateEnum
CREATE TYPE "BackupStatusEnum" AS ENUM ('PENDING', 'IN_PROGRESS', 'COMPLETED', 'FAILED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "RestoreStatusEnum" AS ENUM ('PENDING', 'IN_PROGRESS', 'COMPLETED', 'FAILED', 'CANCELLED', 'VALIDATING');

-- CreateEnum
CREATE TYPE "RestoreTypeEnum" AS ENUM ('FULL', 'PARTIAL', 'SCHEMA_ONLY', 'DATA_ONLY');

-- CreateEnum
CREATE TYPE "CompressionTypeEnum" AS ENUM ('NONE', 'GZIP', 'BROTLI', 'LZ4');

-- CreateEnum
CREATE TYPE "StorageClassEnum" AS ENUM ('STANDARD', 'STANDARD_IA', 'INTELLIGENT_TIERING', 'GLACIER', 'DEEP_ARCHIVE');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "password_hash" TEXT,
    "role" TEXT NOT NULL DEFAULT 'user',
    "plan_tier" TEXT NOT NULL DEFAULT 'free',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "last_login" TIMESTAMP(3),
    "storage_used_mb" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "total_queries" INTEGER NOT NULL DEFAULT 0,
    "avatar_url" TEXT,
    "phone_number" TEXT,
    "address" TEXT,
    "city" TEXT,
    "country" TEXT DEFAULT 'Ecuador',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "provider" TEXT NOT NULL DEFAULT 'local',
    "google_id" TEXT,
    "two_factor_enabled" BOOLEAN NOT NULL DEFAULT false,
    "two_factor_secret" TEXT,
    "two_factor_backup_codes" TEXT[],
    "two_factor_verified_at" TIMESTAMP(3),
    "bar_number" TEXT,
    "law_firm" TEXT,
    "specialization" TEXT,
    "license_state" TEXT,
    "bio" TEXT,
    "language" TEXT,
    "timezone" TEXT,
    "theme" TEXT,
    "email_notifications" BOOLEAN,
    "marketing_emails" BOOLEAN,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cases" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "client_name" TEXT,
    "case_number" TEXT,
    "status" TEXT NOT NULL DEFAULT 'active',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cases_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "documents" (
    "id" TEXT NOT NULL,
    "case_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "document_chunks" (
    "id" TEXT NOT NULL,
    "document_id" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "chunk_index" INTEGER NOT NULL,
    "embedding" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "document_chunks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "legal_documents" (
    "id" TEXT NOT NULL,
    "norm_type" "NormType" NOT NULL,
    "norm_title" TEXT NOT NULL,
    "legal_hierarchy" "LegalHierarchy" NOT NULL,
    "publication_type" "PublicationType" NOT NULL,
    "publication_number" TEXT NOT NULL,
    "publication_date" TIMESTAMP(3),
    "last_reform_date" TIMESTAMP(3),
    "document_state" "DocumentState" NOT NULL DEFAULT 'ORIGINAL',
    "jurisdiction" "Jurisdiction" NOT NULL DEFAULT 'NACIONAL',
    "content" TEXT NOT NULL,
    "metadata" JSONB,
    "title" TEXT,
    "category" TEXT,
    "uploaded_by" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "view_count" INTEGER NOT NULL DEFAULT 0,
    "download_count" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "legal_documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "legal_document_chunks" (
    "id" TEXT NOT NULL,
    "legal_document_id" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "chunk_index" INTEGER NOT NULL,
    "embedding" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "legal_document_chunks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "legal_specialties" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "name_english" TEXT,
    "description" TEXT,
    "parent_id" TEXT,
    "level" INTEGER NOT NULL DEFAULT 1,
    "display_order" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "icon" TEXT,
    "color" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "legal_specialties_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "document_specialties" (
    "id" TEXT NOT NULL,
    "document_id" TEXT NOT NULL,
    "specialty_id" TEXT NOT NULL,
    "is_primary" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "document_specialties_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL,
    "user_id" TEXT,
    "action" TEXT NOT NULL,
    "entity" TEXT NOT NULL,
    "entity_id" TEXT,
    "changes" JSONB,
    "ip_address" TEXT,
    "user_agent" TEXT,
    "success" BOOLEAN NOT NULL DEFAULT true,
    "error_message" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "query_logs" (
    "id" TEXT NOT NULL,
    "user_id" TEXT,
    "query" TEXT NOT NULL,
    "response" TEXT,
    "documents_found" INTEGER NOT NULL DEFAULT 0,
    "response_time" INTEGER NOT NULL,
    "tokens_used" INTEGER NOT NULL DEFAULT 0,
    "model" TEXT,
    "success" BOOLEAN NOT NULL DEFAULT true,
    "error_message" TEXT,
    "ip_address" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "query_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_quotas" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "storage_gb" DOUBLE PRECISION NOT NULL DEFAULT 5.0,
    "storage_used_gb" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "documents_limit" INTEGER NOT NULL DEFAULT 100,
    "documents_used" INTEGER NOT NULL DEFAULT 0,
    "monthly_queries" INTEGER NOT NULL DEFAULT 1000,
    "queries_used_month" INTEGER NOT NULL DEFAULT 0,
    "api_calls_limit" INTEGER NOT NULL DEFAULT 10000,
    "api_calls_used" INTEGER NOT NULL DEFAULT 0,
    "reset_date" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_quotas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "storage_usage" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "size_mb" DOUBLE PRECISION NOT NULL,
    "file_count" INTEGER NOT NULL DEFAULT 0,
    "last_calculated" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "storage_usage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "system_metrics" (
    "id" TEXT NOT NULL,
    "metric_name" TEXT NOT NULL,
    "metric_value" DOUBLE PRECISION NOT NULL,
    "metric_unit" TEXT,
    "category" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "metadata" JSONB,

    CONSTRAINT "system_metrics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "database_stats" (
    "id" TEXT NOT NULL,
    "table_name" TEXT NOT NULL,
    "row_count" INTEGER NOT NULL,
    "size_mb" DOUBLE PRECISION NOT NULL,
    "index_size_mb" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "last_vacuum" TIMESTAMP(3),
    "last_analyze" TIMESTAMP(3),
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "database_stats_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "api_keys" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "key_hash" TEXT NOT NULL,
    "last_used" TIMESTAMP(3),
    "expires_at" TIMESTAMP(3),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "permissions" JSONB,
    "usage_count" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "api_keys_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "priority" TEXT NOT NULL DEFAULT 'normal',
    "is_read" BOOLEAN NOT NULL DEFAULT false,
    "read_at" TIMESTAMP(3),
    "action_url" TEXT,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

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

-- CreateTable
CREATE TABLE "user_settings" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "language" TEXT NOT NULL DEFAULT 'es',
    "timezone" TEXT NOT NULL DEFAULT 'America/Guayaquil',
    "date_format" TEXT NOT NULL DEFAULT 'DD/MM/YYYY',
    "time_format" TEXT NOT NULL DEFAULT '24h',
    "theme" TEXT NOT NULL DEFAULT 'light',
    "email_notifications" BOOLEAN NOT NULL DEFAULT true,
    "push_notifications" BOOLEAN NOT NULL DEFAULT true,
    "sms_notifications" BOOLEAN NOT NULL DEFAULT false,
    "marketing_emails" BOOLEAN NOT NULL DEFAULT false,
    "weekly_digest" BOOLEAN NOT NULL DEFAULT true,
    "case_updates" BOOLEAN NOT NULL DEFAULT true,
    "document_alerts" BOOLEAN NOT NULL DEFAULT true,
    "billing_alerts" BOOLEAN NOT NULL DEFAULT true,
    "profile_visibility" TEXT NOT NULL DEFAULT 'private',
    "show_email" BOOLEAN NOT NULL DEFAULT false,
    "show_phone" BOOLEAN NOT NULL DEFAULT false,
    "allow_data_export" BOOLEAN NOT NULL DEFAULT true,
    "slack_webhook" TEXT,
    "teams_webhook" TEXT,
    "zapier_api_key" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "usage_history" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "year" INTEGER NOT NULL,
    "month" INTEGER NOT NULL,
    "week" INTEGER NOT NULL,
    "ai_queries_count" INTEGER NOT NULL DEFAULT 0,
    "documents_uploaded" INTEGER NOT NULL DEFAULT 0,
    "cases_created" INTEGER NOT NULL DEFAULT 0,
    "storage_used_mb" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "api_calls_count" INTEGER NOT NULL DEFAULT 0,
    "average_response_time_ms" INTEGER,
    "total_tokens_used" INTEGER NOT NULL DEFAULT 0,
    "documents_analyzed" INTEGER NOT NULL DEFAULT 0,
    "searches_performed" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "usage_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "invoices" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "subscription_id" TEXT,
    "invoice_number" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "status" TEXT NOT NULL DEFAULT 'pending',
    "period_start" TIMESTAMP(3) NOT NULL,
    "period_end" TIMESTAMP(3) NOT NULL,
    "due_date" TIMESTAMP(3) NOT NULL,
    "paid_at" TIMESTAMP(3),
    "items" JSONB NOT NULL,
    "subtotal" DOUBLE PRECISION NOT NULL,
    "tax_amount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "tax_rate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "total" DOUBLE PRECISION NOT NULL,
    "payment_method" TEXT,
    "payment_id" TEXT,
    "pdf_url" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "invoices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payment_methods" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "is_default" BOOLEAN NOT NULL DEFAULT false,
    "card_last4" TEXT,
    "card_brand" TEXT,
    "card_exp_month" INTEGER,
    "card_exp_year" INTEGER,
    "bank_name" TEXT,
    "account_last4" TEXT,
    "paypal_email" TEXT,
    "stripe_payment_method_id" TEXT,
    "paypal_billing_id" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payment_methods_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "events" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "type" "EventType" NOT NULL,
    "status" "EventStatus" NOT NULL DEFAULT 'SCHEDULED',
    "location" TEXT,
    "meeting_link" TEXT,
    "start_time" TIMESTAMP(3) NOT NULL,
    "end_time" TIMESTAMP(3) NOT NULL,
    "all_day" BOOLEAN NOT NULL DEFAULT false,
    "timezone" TEXT NOT NULL DEFAULT 'America/Guayaquil',
    "is_recurring" BOOLEAN NOT NULL DEFAULT false,
    "recurrence_rule" TEXT,
    "recurrence_end" TIMESTAMP(3),
    "parent_event_id" TEXT,
    "case_id" TEXT,
    "created_by" TEXT NOT NULL,
    "color" TEXT,
    "is_private" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,
    "attachments" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "event_participants" (
    "id" TEXT NOT NULL,
    "event_id" TEXT NOT NULL,
    "user_id" TEXT,
    "email" TEXT,
    "name" TEXT,
    "role" TEXT NOT NULL DEFAULT 'attendee',
    "status" TEXT NOT NULL DEFAULT 'pending',
    "response_time" TIMESTAMP(3),
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "event_participants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "event_reminders" (
    "id" TEXT NOT NULL,
    "event_id" TEXT NOT NULL,
    "type" "ReminderType" NOT NULL,
    "minutes_before" INTEGER NOT NULL,
    "sent_at" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'pending',
    "recipient_user_id" TEXT,
    "recipient_email" TEXT,
    "error_message" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "event_reminders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tasks" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "status" "TaskStatus" NOT NULL DEFAULT 'TODO',
    "priority" "TaskPriority" NOT NULL DEFAULT 'MEDIUM',
    "case_id" TEXT,
    "assigned_to" TEXT,
    "created_by" TEXT NOT NULL,
    "due_date" TIMESTAMP(3),
    "start_date" TIMESTAMP(3),
    "completed_at" TIMESTAMP(3),
    "estimated_hours" DOUBLE PRECISION,
    "actual_hours" DOUBLE PRECISION,
    "progress" INTEGER NOT NULL DEFAULT 0,
    "tags" TEXT[],
    "is_recurring" BOOLEAN NOT NULL DEFAULT false,
    "recurrence_rule" TEXT,
    "parent_task_id" TEXT,
    "depends_on" TEXT[],
    "attachments" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tasks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "task_checklist_items" (
    "id" TEXT NOT NULL,
    "task_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "is_completed" BOOLEAN NOT NULL DEFAULT false,
    "completed_at" TIMESTAMP(3),
    "completed_by" TEXT,
    "display_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "task_checklist_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "task_history" (
    "id" TEXT NOT NULL,
    "task_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "changes" JSONB,
    "comment" TEXT,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "task_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notification_templates" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "channel" "NotificationChannel" NOT NULL,
    "subject" TEXT,
    "body_template" TEXT NOT NULL,
    "variables" JSONB,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "notification_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notification_logs" (
    "id" TEXT NOT NULL,
    "template_id" TEXT,
    "user_id" TEXT,
    "channel" "NotificationChannel" NOT NULL,
    "recipient" TEXT NOT NULL,
    "subject" TEXT,
    "body" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "sent_at" TIMESTAMP(3),
    "delivered_at" TIMESTAMP(3),
    "read_at" TIMESTAMP(3),
    "error_message" TEXT,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notification_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "agreements" (
    "id" TEXT NOT NULL,
    "case_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "total_amount" DOUBLE PRECISION NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "payment_terms" TEXT,
    "start_date" TIMESTAMP(3) NOT NULL,
    "end_date" TIMESTAMP(3),
    "signed_date" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'draft',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "document_url" TEXT,
    "signature_url" TEXT,
    "notes" TEXT,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "agreements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "service_items" (
    "id" TEXT NOT NULL,
    "agreement_id" TEXT,
    "case_id" TEXT NOT NULL,
    "type" "ServiceItemType" NOT NULL,
    "description" TEXT NOT NULL,
    "quantity" DOUBLE PRECISION NOT NULL DEFAULT 1,
    "rate" DOUBLE PRECISION NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "is_billable" BOOLEAN NOT NULL DEFAULT true,
    "is_billed" BOOLEAN NOT NULL DEFAULT false,
    "billed_date" TIMESTAMP(3),
    "service_date" TIMESTAMP(3) NOT NULL,
    "notes" TEXT,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "service_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "finance_invoices" (
    "id" TEXT NOT NULL,
    "case_id" TEXT NOT NULL,
    "invoice_number" TEXT NOT NULL,
    "subtotal" DOUBLE PRECISION NOT NULL,
    "tax_rate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "tax_amount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "discount_amount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "total_amount" DOUBLE PRECISION NOT NULL,
    "paid_amount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "balance_due" DOUBLE PRECISION NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "status" "InvoiceStatus" NOT NULL DEFAULT 'DRAFT',
    "issue_date" TIMESTAMP(3) NOT NULL,
    "due_date" TIMESTAMP(3) NOT NULL,
    "paid_date" TIMESTAMP(3),
    "sent_date" TIMESTAMP(3),
    "viewed_date" TIMESTAMP(3),
    "items" JSONB NOT NULL,
    "client_name" TEXT NOT NULL,
    "client_email" TEXT,
    "client_address" TEXT,
    "pdf_url" TEXT,
    "notes" TEXT,
    "internal_notes" TEXT,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "finance_invoices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "finance_payments" (
    "id" TEXT NOT NULL,
    "invoice_id" TEXT NOT NULL,
    "case_id" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "method" "PaymentMethodType" NOT NULL,
    "status" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
    "transaction_id" TEXT,
    "reference_number" TEXT,
    "payment_date" TIMESTAMP(3) NOT NULL,
    "received_date" TIMESTAMP(3),
    "receipt_url" TEXT,
    "receipt_number" TEXT,
    "notes" TEXT,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "finance_payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "case_finances" (
    "id" TEXT NOT NULL,
    "case_id" TEXT NOT NULL,
    "total_billed" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "total_paid" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "total_outstanding" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "total_expenses" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "invoice_count" INTEGER NOT NULL DEFAULT 0,
    "payment_count" INTEGER NOT NULL DEFAULT 0,
    "last_invoice_date" TIMESTAMP(3),
    "last_payment_date" TIMESTAMP(3),
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "case_finances_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "analysis_queue" (
    "id" TEXT NOT NULL,
    "document_id" TEXT NOT NULL,
    "document_type" TEXT NOT NULL,
    "job_type" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "priority" INTEGER NOT NULL DEFAULT 0,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "max_attempts" INTEGER NOT NULL DEFAULT 3,
    "job_data" JSONB,
    "result" JSONB,
    "error_message" TEXT,
    "scheduled_at" TIMESTAMP(3),
    "started_at" TIMESTAMP(3),
    "completed_at" TIMESTAMP(3),
    "failed_at" TIMESTAMP(3),
    "processing_time_ms" INTEGER,
    "created_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "analysis_queue_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "document_registry" (
    "id" TEXT NOT NULL,
    "document_id" TEXT NOT NULL,
    "document_type" TEXT NOT NULL,
    "parent_id" TEXT,
    "hierarchy_level" INTEGER NOT NULL DEFAULT 0,
    "hierarchy_path" TEXT NOT NULL,
    "display_order" INTEGER NOT NULL DEFAULT 0,
    "title" TEXT NOT NULL,
    "category" TEXT,
    "tags" TEXT[],
    "version" TEXT,
    "is_current_version" BOOLEAN NOT NULL DEFAULT true,
    "superseded_by" TEXT,
    "version_date" TIMESTAMP(3),
    "is_public" BOOLEAN NOT NULL DEFAULT false,
    "access_level" TEXT NOT NULL DEFAULT 'authenticated',
    "restricted_to_roles" TEXT[],
    "search_vector" TEXT,
    "keywords" TEXT[],
    "view_count" INTEGER NOT NULL DEFAULT 0,
    "reference_count" INTEGER NOT NULL DEFAULT 0,
    "last_accessed" TIMESTAMP(3),
    "registered_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "document_registry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "document_references" (
    "id" TEXT NOT NULL,
    "source_document_id" TEXT NOT NULL,
    "source_document_type" TEXT NOT NULL,
    "target_document_id" TEXT,
    "target_document_type" TEXT,
    "reference_type" TEXT NOT NULL,
    "reference_text" TEXT,
    "reference_location" TEXT,
    "is_valid" BOOLEAN NOT NULL DEFAULT true,
    "validation_date" TIMESTAMP(3),
    "validation_error" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "document_references_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "legal_document_articles" (
    "id" TEXT NOT NULL,
    "legal_document_id" TEXT NOT NULL,
    "article_number" INTEGER NOT NULL,
    "article_number_text" TEXT,
    "article_title" TEXT,
    "article_content" TEXT NOT NULL,
    "word_count" INTEGER,
    "parent_section_id" TEXT,
    "display_order" INTEGER,
    "hierarchy_level" INTEGER NOT NULL DEFAULT 4,
    "summary" TEXT,
    "keywords" JSONB,
    "entities" JSONB,
    "referenced_articles" JSONB,
    "embedding" JSONB,
    "summary_embedding" JSONB,
    "query_embedding" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "legal_document_articles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "legal_document_sections" (
    "id" TEXT NOT NULL,
    "legal_document_id" TEXT NOT NULL,
    "section_type" TEXT NOT NULL,
    "section_number" TEXT NOT NULL,
    "section_title" TEXT,
    "parent_section_id" TEXT,
    "level" INTEGER NOT NULL,
    "hierarchy_path" TEXT,
    "display_order" INTEGER,
    "content" TEXT,
    "word_count" INTEGER,
    "summary" TEXT,
    "embedding" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "legal_document_sections_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "legal_document_summaries" (
    "id" TEXT NOT NULL,
    "legal_document_id" TEXT NOT NULL,
    "summary_type" TEXT NOT NULL,
    "summary_level" TEXT NOT NULL,
    "summary_text" TEXT NOT NULL,
    "section_id" TEXT,
    "article_id" TEXT,
    "key_points" JSONB,
    "confidence_score" DOUBLE PRECISION,
    "embedding" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "legal_document_summaries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "query_templates" (
    "id" TEXT NOT NULL,
    "pattern" TEXT NOT NULL,
    "query_type" TEXT NOT NULL,
    "response_template" TEXT,
    "document_ids" TEXT[],
    "document_types" TEXT[],
    "required_fields" JSONB,
    "optional_fields" JSONB,
    "priority" INTEGER NOT NULL DEFAULT 50,
    "use_count" INTEGER NOT NULL DEFAULT 0,
    "success_rate" DOUBLE PRECISION,
    "avg_response_time_ms" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "query_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "document_processing_history" (
    "id" TEXT NOT NULL,
    "document_id" TEXT NOT NULL,
    "document_type" TEXT NOT NULL,
    "process_type" TEXT NOT NULL,
    "process_version" TEXT,
    "status" TEXT NOT NULL,
    "results" JSONB,
    "error_details" JSONB,
    "processing_time_ms" INTEGER,
    "tokens_used" INTEGER,
    "embeddings_generated" INTEGER,
    "chunks_created" INTEGER,
    "started_at" TIMESTAMP(3) NOT NULL,
    "completed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "document_processing_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notification_subscriptions" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "subscription_type" TEXT NOT NULL,
    "channel" TEXT NOT NULL,
    "document_types" TEXT[],
    "categories" TEXT[],
    "keywords" TEXT[],
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "frequency" TEXT NOT NULL DEFAULT 'immediate',
    "quiet_hours_start" TIME,
    "quiet_hours_end" TIME,
    "webhook_url" TEXT,
    "webhook_secret" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "notification_subscriptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notification_queue" (
    "id" TEXT NOT NULL,
    "template_id" TEXT,
    "channel" TEXT NOT NULL,
    "recipient_id" TEXT,
    "recipient_email" TEXT,
    "recipient_phone" TEXT,
    "subject" TEXT,
    "body" TEXT NOT NULL,
    "data" JSONB,
    "priority" TEXT NOT NULL DEFAULT 'normal',
    "scheduled_at" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'pending',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "max_attempts" INTEGER NOT NULL DEFAULT 3,
    "sent_at" TIMESTAMP(3),
    "delivered_at" TIMESTAMP(3),
    "failed_at" TIMESTAMP(3),
    "error_message" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notification_queue_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "search_interactions" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "query" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "results_count" INTEGER NOT NULL DEFAULT 0,
    "filters" JSONB,
    "sort_by" TEXT,
    "session_id" TEXT,
    "user_agent" TEXT,
    "ip_address" TEXT,

    CONSTRAINT "search_interactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "click_events" (
    "id" TEXT NOT NULL,
    "search_interaction_id" TEXT NOT NULL,
    "document_id" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "relevance_score" DOUBLE PRECISION,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dwell_time" INTEGER,

    CONSTRAINT "click_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "relevance_feedback" (
    "id" TEXT NOT NULL,
    "search_interaction_id" TEXT NOT NULL,
    "document_id" TEXT NOT NULL,
    "rating" INTEGER NOT NULL,
    "is_relevant" BOOLEAN,
    "comment" TEXT,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "relevance_feedback_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ab_test_configs" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "start_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "end_date" TIMESTAMP(3),
    "variants" JSONB NOT NULL,
    "traffic_split" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ab_test_configs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ab_test_assignments" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "test_config_id" TEXT NOT NULL,
    "variant" TEXT NOT NULL,
    "assigned_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ab_test_assignments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "document_citations" (
    "id" TEXT NOT NULL,
    "source_document_id" TEXT NOT NULL,
    "target_document_id" TEXT,
    "citation_text" TEXT,
    "citation_context" TEXT,
    "article_reference" TEXT,
    "section_reference" TEXT,
    "citation_type" "CitationType" NOT NULL DEFAULT 'REFERENCE',
    "citation_strength" DOUBLE PRECISION NOT NULL DEFAULT 1.0,
    "confidence_score" DOUBLE PRECISION,
    "extracted_by" "ExtractionMethod" NOT NULL DEFAULT 'AUTOMATIC',
    "extraction_method" TEXT,
    "is_validated" BOOLEAN NOT NULL DEFAULT false,
    "validated_by" TEXT,
    "validated_at" TIMESTAMP(3),
    "validation_notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "document_citations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "document_relationships" (
    "id" TEXT NOT NULL,
    "source_document_id" TEXT NOT NULL,
    "target_document_id" TEXT NOT NULL,
    "relationship_type" "RelationshipType" NOT NULL,
    "relationship_strength" DOUBLE PRECISION NOT NULL DEFAULT 1.0,
    "description" TEXT,
    "effective_date" TIMESTAMP(3),
    "end_date" TIMESTAMP(3),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "metadata" JSONB,
    "created_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "document_relationships_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "document_authority_scores" (
    "id" TEXT NOT NULL,
    "document_id" TEXT NOT NULL,
    "pagerank_score" DOUBLE PRECISION NOT NULL DEFAULT 0.15,
    "weighted_pagerank" DOUBLE PRECISION NOT NULL DEFAULT 0.15,
    "personalized_pagerank" DOUBLE PRECISION,
    "citation_count" INTEGER NOT NULL DEFAULT 0,
    "citation_in_count" INTEGER NOT NULL DEFAULT 0,
    "citation_out_count" INTEGER NOT NULL DEFAULT 0,
    "h_index" INTEGER NOT NULL DEFAULT 0,
    "impact_score" DOUBLE PRECISION,
    "recency_factor" DOUBLE PRECISION,
    "combined_authority" DOUBLE PRECISION,
    "last_calculated" TIMESTAMP(3),
    "calculation_version" TEXT,
    "convergence_iterations" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "document_authority_scores_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "citation_extraction_jobs" (
    "id" TEXT NOT NULL,
    "document_id" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "priority" INTEGER NOT NULL DEFAULT 5,
    "extraction_method" TEXT NOT NULL DEFAULT 'regex',
    "citations_found" INTEGER,
    "citations_validated" INTEGER,
    "processing_time_ms" INTEGER,
    "error_message" TEXT,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "max_attempts" INTEGER NOT NULL DEFAULT 3,
    "started_at" TIMESTAMP(3),
    "completed_at" TIMESTAMP(3),
    "failed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "citation_extraction_jobs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pagerank_calculation_logs" (
    "id" TEXT NOT NULL,
    "damping_factor" DOUBLE PRECISION NOT NULL DEFAULT 0.85,
    "max_iterations" INTEGER NOT NULL DEFAULT 100,
    "convergence_threshold" DOUBLE PRECISION NOT NULL DEFAULT 0.0001,
    "documents_processed" INTEGER NOT NULL DEFAULT 0,
    "iterations_run" INTEGER,
    "converged" BOOLEAN NOT NULL DEFAULT false,
    "avg_pagerank" DOUBLE PRECISION,
    "max_pagerank" DOUBLE PRECISION,
    "min_pagerank" DOUBLE PRECISION,
    "processing_time_ms" INTEGER,
    "calculation_method" TEXT DEFAULT 'iterative',
    "triggered_by" TEXT,
    "notes" TEXT,
    "started_at" TIMESTAMP(3) NOT NULL,
    "completed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pagerank_calculation_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "saved_searches" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "query" TEXT NOT NULL,
    "filters" JSONB,
    "results_count" INTEGER,
    "is_favorite" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "saved_searches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "document_collections" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "is_public" BOOLEAN NOT NULL DEFAULT false,
    "share_token" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "document_collections_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "collection_documents" (
    "collection_id" TEXT NOT NULL,
    "document_id" TEXT NOT NULL,
    "added_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notes" TEXT,

    CONSTRAINT "collection_documents_pkey" PRIMARY KEY ("collection_id","document_id")
);

-- CreateTable
CREATE TABLE "search_suggestions" (
    "id" TEXT NOT NULL,
    "suggestion_text" TEXT NOT NULL,
    "search_count" INTEGER NOT NULL DEFAULT 1,
    "last_used" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "category" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "search_suggestions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "shared_search_links" (
    "id" TEXT NOT NULL,
    "share_token" TEXT NOT NULL,
    "user_id" TEXT,
    "search_query" TEXT NOT NULL,
    "filters" JSONB,
    "result_ids" TEXT[],
    "expires_at" TIMESTAMP(3),
    "access_count" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "shared_search_links_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "document_recommendations" (
    "id" TEXT NOT NULL,
    "source_document_id" TEXT NOT NULL,
    "recommended_document_id" TEXT NOT NULL,
    "recommendation_type" "RecommendationType" NOT NULL,
    "score" DOUBLE PRECISION NOT NULL,
    "reason" TEXT,
    "calculated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "document_recommendations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "query_expansions" (
    "id" TEXT NOT NULL,
    "original_term" TEXT NOT NULL,
    "expanded_terms" TEXT[],
    "context" TEXT,
    "usage_count" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "query_expansions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_conversations" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "title" TEXT,
    "started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_message_at" TIMESTAMP(3) NOT NULL,
    "message_count" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "ai_conversations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_messages" (
    "id" TEXT NOT NULL,
    "conversation_id" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "intent" TEXT,
    "confidence" DOUBLE PRECISION,
    "processing_time_ms" INTEGER,
    "cited_documents" JSONB,
    "cited_chunks" JSONB,
    "was_helpful" BOOLEAN,
    "feedback_text" TEXT,

    CONSTRAINT "ai_messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_citations" (
    "id" TEXT NOT NULL,
    "message_id" TEXT NOT NULL,
    "document_id" TEXT NOT NULL,
    "chunk_id" TEXT,
    "relevance" DOUBLE PRECISION NOT NULL DEFAULT 1.0,
    "article_ref" TEXT,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ai_citations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "analytics_events" (
    "id" TEXT NOT NULL,
    "event_type" TEXT NOT NULL,
    "user_id" TEXT,
    "session_id" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "metadata" JSONB,
    "duration_ms" INTEGER,
    "success" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "analytics_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "analytics_metrics" (
    "id" TEXT NOT NULL,
    "metric_name" TEXT NOT NULL,
    "metric_value" DOUBLE PRECISION NOT NULL,
    "dimensions" JSONB,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "period_start" TIMESTAMP(3) NOT NULL,
    "period_end" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "analytics_metrics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "document_analytics" (
    "id" TEXT NOT NULL,
    "document_id" TEXT NOT NULL,
    "view_count" INTEGER NOT NULL DEFAULT 0,
    "search_count" INTEGER NOT NULL DEFAULT 0,
    "citation_count" INTEGER NOT NULL DEFAULT 0,
    "download_count" INTEGER NOT NULL DEFAULT 0,
    "avg_time_spent" DOUBLE PRECISION,
    "bounce_rate" DOUBLE PRECISION,
    "relevance_score" DOUBLE PRECISION,
    "last_viewed" TIMESTAMP(3),
    "last_cited" TIMESTAMP(3),
    "trending_score" DOUBLE PRECISION,
    "period_start" TIMESTAMP(3) NOT NULL,
    "period_end" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "document_analytics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "search_analytics" (
    "id" TEXT NOT NULL,
    "query" TEXT NOT NULL,
    "result_count" INTEGER NOT NULL,
    "click_through_rate" DOUBLE PRECISION,
    "avg_position" DOUBLE PRECISION,
    "search_count" INTEGER NOT NULL DEFAULT 1,
    "last_searched" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "search_analytics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ml_models" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "version" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "model_type" "MLModelType",
    "status" "MLModelStatus" NOT NULL DEFAULT 'TRAINING',
    "accuracy" DOUBLE PRECISION,
    "precision" DOUBLE PRECISION,
    "recall" DOUBLE PRECISION,
    "f1_score" DOUBLE PRECISION,
    "metrics" JSONB,
    "config" JSONB NOT NULL,
    "trained_at" TIMESTAMP(3),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "training_set" JSONB,
    "training_duration" INTEGER,
    "training_error" TEXT,
    "validation_set" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ml_models_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "predictions" (
    "id" TEXT NOT NULL,
    "model_id" TEXT NOT NULL,
    "prediction_type" TEXT NOT NULL,
    "input_data" JSONB NOT NULL,
    "prediction" JSONB NOT NULL,
    "confidence" DOUBLE PRECISION NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processing_time_ms" INTEGER,
    "context_data" JSONB,
    "explanation" TEXT,

    CONSTRAINT "predictions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "prediction_feedback" (
    "id" TEXT NOT NULL,
    "prediction_id" TEXT NOT NULL,
    "user_id" TEXT,
    "is_accurate" BOOLEAN NOT NULL,
    "actual_outcome" JSONB,
    "feedback_text" TEXT,
    "rating" INTEGER,
    "categories" TEXT[],
    "impact_score" DOUBLE PRECISION,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "prediction_feedback_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "legal_patterns" (
    "id" TEXT NOT NULL,
    "pattern_type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "confidence" DOUBLE PRECISION NOT NULL,
    "impact" TEXT NOT NULL,
    "timeframe" JSONB NOT NULL,
    "evidence" JSONB NOT NULL,
    "detected_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "detected_by" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "verified" BOOLEAN NOT NULL DEFAULT false,
    "verified_by" TEXT,
    "verified_at" TIMESTAMP(3),
    "model_id" TEXT,

    CONSTRAINT "legal_patterns_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pattern_documents" (
    "id" TEXT NOT NULL,
    "pattern_id" TEXT NOT NULL,
    "document_id" TEXT NOT NULL,
    "relevance_score" DOUBLE PRECISION NOT NULL DEFAULT 1.0,
    "match_locations" JSONB,
    "match_count" INTEGER NOT NULL DEFAULT 1,
    "first_detected" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_detected" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "metadata" JSONB,

    CONSTRAINT "pattern_documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "trend_forecasts" (
    "id" TEXT NOT NULL,
    "forecast_type" TEXT NOT NULL,
    "target_metric" TEXT NOT NULL,
    "forecast_period" TEXT NOT NULL,
    "predicted_value" DOUBLE PRECISION NOT NULL,
    "confidence" DOUBLE PRECISION NOT NULL,
    "direction" "TrendDirection" NOT NULL DEFAULT 'UNKNOWN',
    "upper_bound" DOUBLE PRECISION,
    "lower_bound" DOUBLE PRECISION,
    "factors" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "model_id" TEXT,

    CONSTRAINT "trend_forecasts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "trend_data_points" (
    "id" TEXT NOT NULL,
    "trend_forecast_id" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL,
    "value" DOUBLE PRECISION NOT NULL,
    "is_predicted" BOOLEAN NOT NULL DEFAULT false,
    "confidence_lower" DOUBLE PRECISION,
    "confidence_upper" DOUBLE PRECISION,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "trend_data_points_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "trend_alerts" (
    "id" TEXT NOT NULL,
    "trend_forecast_id" TEXT,
    "alert_type" "AlertType" NOT NULL DEFAULT 'THRESHOLD_BREACH',
    "severity" "AlertSeverity" NOT NULL DEFAULT 'MEDIUM',
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "threshold_value" DOUBLE PRECISION,
    "actual_value" DOUBLE PRECISION,
    "direction" "TrendDirection" NOT NULL DEFAULT 'UNKNOWN',
    "is_acknowledged" BOOLEAN NOT NULL DEFAULT false,
    "acknowledged_by" TEXT,
    "acknowledged_at" TIMESTAMP(3),
    "is_resolved" BOOLEAN NOT NULL DEFAULT false,
    "resolved_at" TIMESTAMP(3),
    "resolution_notes" TEXT,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "trend_alerts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "document_summaries" (
    "id" TEXT NOT NULL,
    "document_id" TEXT NOT NULL,
    "summary_type" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "key_points" JSONB,
    "generated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "generated_by" TEXT NOT NULL,
    "version" TEXT NOT NULL DEFAULT '1.0',

    CONSTRAINT "document_summaries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "article_analysis" (
    "id" TEXT NOT NULL,
    "document_id" TEXT NOT NULL,
    "article_number" TEXT NOT NULL,
    "analysis_type" TEXT NOT NULL,
    "analysis" JSONB NOT NULL,
    "score" DOUBLE PRECISION,
    "generated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "article_analysis_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "document_comparisons" (
    "id" TEXT NOT NULL,
    "document1_id" TEXT NOT NULL,
    "document2_id" TEXT NOT NULL,
    "similarity_score" DOUBLE PRECISION NOT NULL,
    "differences" JSONB NOT NULL,
    "similarities" JSONB NOT NULL,
    "compared_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "compared_by" TEXT,
    "comparison_method" TEXT,
    "processing_time_ms" INTEGER,
    "notes" TEXT,

    CONSTRAINT "document_comparisons_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "comparison_changes" (
    "id" TEXT NOT NULL,
    "comparison_id" TEXT NOT NULL,
    "change_type" "ChangeType" NOT NULL DEFAULT 'MODIFICATION',
    "location" TEXT,
    "article_reference" TEXT,
    "section_reference" TEXT,
    "original_text" TEXT,
    "modified_text" TEXT,
    "change_description" TEXT,
    "significance_score" DOUBLE PRECISION,
    "legal_impact" TEXT,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "comparison_changes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "query_history" (
    "id" TEXT NOT NULL,
    "session_id" TEXT NOT NULL,
    "user_id" TEXT,
    "query" TEXT NOT NULL,
    "query_hash" TEXT NOT NULL,
    "intent" JSONB NOT NULL,
    "entities" JSONB NOT NULL,
    "filters" JSONB NOT NULL,
    "results_count" INTEGER NOT NULL,
    "clicked_results" JSONB[],
    "response_time" INTEGER NOT NULL,
    "cache_hit" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "query_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_sessions" (
    "id" TEXT NOT NULL,
    "user_id" TEXT,
    "session_token" TEXT NOT NULL,
    "ip_address" TEXT,
    "user_agent" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "context" JSONB NOT NULL DEFAULT '{}',
    "started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_activity_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ended_at" TIMESTAMP(3),

    CONSTRAINT "user_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "query_cache" (
    "id" TEXT NOT NULL,
    "query_hash" TEXT NOT NULL,
    "query" TEXT NOT NULL,
    "filters" JSONB NOT NULL,
    "cached_response" JSONB NOT NULL,
    "hit_count" INTEGER NOT NULL DEFAULT 0,
    "last_hit_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "query_cache_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "query_suggestions" (
    "id" TEXT NOT NULL,
    "suggestion" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "frequency" INTEGER NOT NULL DEFAULT 1,
    "last_used_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "query_suggestions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "graph_snapshots" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "snapshot_type" TEXT NOT NULL DEFAULT 'FULL',
    "node_count" INTEGER NOT NULL DEFAULT 0,
    "edge_count" INTEGER NOT NULL DEFAULT 0,
    "graph_data" JSONB NOT NULL,
    "statistics" JSONB,
    "algorithm_version" TEXT,
    "calculation_time_ms" INTEGER,
    "is_current" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" TEXT,
    "expires_at" TIMESTAMP(3),
    "filter_config" JSONB,
    "include_doc_types" TEXT[],
    "date_range_start" TIMESTAMP(3),
    "date_range_end" TIMESTAMP(3),

    CONSTRAINT "graph_snapshots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "backups" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "BackupTypeEnum" NOT NULL,
    "status" "BackupStatusEnum" NOT NULL DEFAULT 'PENDING',
    "size" BIGINT NOT NULL DEFAULT 0,
    "compressed_size" BIGINT NOT NULL DEFAULT 0,
    "compression_type" "CompressionTypeEnum" NOT NULL DEFAULT 'GZIP',
    "compression_ratio" DOUBLE PRECISION,
    "encrypted" BOOLEAN NOT NULL DEFAULT false,
    "encryption_key_id" TEXT,
    "storage_location" TEXT NOT NULL,
    "storage_class" "StorageClassEnum" NOT NULL DEFAULT 'STANDARD',
    "s3_bucket" TEXT,
    "s3_key" TEXT,
    "s3_version_id" TEXT,
    "checksum_md5" TEXT,
    "checksum_sha256" TEXT,
    "started_at" TIMESTAMP(3),
    "completed_at" TIMESTAMP(3),
    "duration" INTEGER DEFAULT 0,
    "tables_included" TEXT[],
    "tables_excluded" TEXT[],
    "record_count" BIGINT NOT NULL DEFAULT 0,
    "metadata" JSONB,
    "error" TEXT,
    "created_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "schedule_id" TEXT,

    CONSTRAINT "backups_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "backup_schedules" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "cron_expression" TEXT NOT NULL,
    "timezone" TEXT NOT NULL DEFAULT 'UTC',
    "backup_type" "BackupTypeEnum" NOT NULL DEFAULT 'FULL',
    "compression" "CompressionTypeEnum" NOT NULL DEFAULT 'GZIP',
    "encryption" BOOLEAN NOT NULL DEFAULT true,
    "include_tables" TEXT[],
    "exclude_tables" TEXT[],
    "retention_days" INTEGER NOT NULL DEFAULT 30,
    "retention_count" INTEGER,
    "webhook_url" TEXT,
    "metadata" JSONB,
    "last_run_at" TIMESTAMP(3),
    "last_status" "BackupStatusEnum",
    "next_run_at" TIMESTAMP(3),
    "run_count" INTEGER NOT NULL DEFAULT 0,
    "success_count" INTEGER NOT NULL DEFAULT 0,
    "failure_count" INTEGER NOT NULL DEFAULT 0,
    "created_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "backup_schedules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "restore_jobs" (
    "id" TEXT NOT NULL,
    "backup_id" TEXT NOT NULL,
    "status" "RestoreStatusEnum" NOT NULL DEFAULT 'PENDING',
    "restore_type" "RestoreTypeEnum" NOT NULL DEFAULT 'FULL',
    "target_database" TEXT,
    "include_tables" TEXT[],
    "exclude_tables" TEXT[],
    "dry_run" BOOLEAN NOT NULL DEFAULT false,
    "validate_first" BOOLEAN NOT NULL DEFAULT true,
    "safety_backup_id" TEXT,
    "progress" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "current_phase" TEXT,
    "current_table" TEXT,
    "started_at" TIMESTAMP(3),
    "completed_at" TIMESTAMP(3),
    "duration" INTEGER DEFAULT 0,
    "records_restored" BIGINT NOT NULL DEFAULT 0,
    "tables_restored" INTEGER NOT NULL DEFAULT 0,
    "error" TEXT,
    "warnings" TEXT[],
    "metadata" JSONB,
    "created_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "restore_jobs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "backup_audit_logs" (
    "id" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "resource_type" TEXT NOT NULL,
    "resource_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "user_name" TEXT NOT NULL,
    "user_email" TEXT NOT NULL,
    "ip_address" TEXT,
    "user_agent" TEXT,
    "details" JSONB,
    "success" BOOLEAN NOT NULL DEFAULT true,
    "error_message" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "backup_id" TEXT,
    "schedule_id" TEXT,
    "restore_job_id" TEXT,

    CONSTRAINT "backup_audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "backup_encryption_keys" (
    "id" TEXT NOT NULL,
    "key_id" TEXT NOT NULL,
    "algorithm" TEXT NOT NULL DEFAULT 'AES-256-GCM',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "purpose" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "rotated_at" TIMESTAMP(3),
    "expires_at" TIMESTAMP(3),
    "kms_key_id" TEXT,

    CONSTRAINT "backup_encryption_keys_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "users_google_id_key" ON "users"("google_id");

-- CreateIndex
CREATE INDEX "legal_documents_norm_type_idx" ON "legal_documents"("norm_type");

-- CreateIndex
CREATE INDEX "legal_documents_legal_hierarchy_idx" ON "legal_documents"("legal_hierarchy");

-- CreateIndex
CREATE INDEX "legal_documents_jurisdiction_idx" ON "legal_documents"("jurisdiction");

-- CreateIndex
CREATE INDEX "legal_documents_publication_type_idx" ON "legal_documents"("publication_type");

-- CreateIndex
CREATE INDEX "legal_documents_document_state_idx" ON "legal_documents"("document_state");

-- CreateIndex
CREATE INDEX "legal_documents_publication_date_idx" ON "legal_documents"("publication_date");

-- CreateIndex
CREATE INDEX "legal_document_chunks_legal_document_id_idx" ON "legal_document_chunks"("legal_document_id");

-- CreateIndex
CREATE UNIQUE INDEX "legal_specialties_code_key" ON "legal_specialties"("code");

-- CreateIndex
CREATE INDEX "legal_specialties_parent_id_idx" ON "legal_specialties"("parent_id");

-- CreateIndex
CREATE INDEX "legal_specialties_code_idx" ON "legal_specialties"("code");

-- CreateIndex
CREATE INDEX "document_specialties_document_id_idx" ON "document_specialties"("document_id");

-- CreateIndex
CREATE INDEX "document_specialties_specialty_id_idx" ON "document_specialties"("specialty_id");

-- CreateIndex
CREATE UNIQUE INDEX "document_specialties_document_id_specialty_id_key" ON "document_specialties"("document_id", "specialty_id");

-- CreateIndex
CREATE INDEX "audit_logs_user_id_idx" ON "audit_logs"("user_id");

-- CreateIndex
CREATE INDEX "audit_logs_action_idx" ON "audit_logs"("action");

-- CreateIndex
CREATE INDEX "audit_logs_entity_idx" ON "audit_logs"("entity");

-- CreateIndex
CREATE INDEX "audit_logs_created_at_idx" ON "audit_logs"("created_at");

-- CreateIndex
CREATE INDEX "query_logs_user_id_idx" ON "query_logs"("user_id");

-- CreateIndex
CREATE INDEX "query_logs_created_at_idx" ON "query_logs"("created_at");

-- CreateIndex
CREATE UNIQUE INDEX "user_quotas_user_id_key" ON "user_quotas"("user_id");

-- CreateIndex
CREATE INDEX "storage_usage_user_id_idx" ON "storage_usage"("user_id");

-- CreateIndex
CREATE INDEX "storage_usage_category_idx" ON "storage_usage"("category");

-- CreateIndex
CREATE INDEX "system_metrics_metric_name_idx" ON "system_metrics"("metric_name");

-- CreateIndex
CREATE INDEX "system_metrics_category_idx" ON "system_metrics"("category");

-- CreateIndex
CREATE INDEX "system_metrics_timestamp_idx" ON "system_metrics"("timestamp");

-- CreateIndex
CREATE INDEX "database_stats_table_name_idx" ON "database_stats"("table_name");

-- CreateIndex
CREATE INDEX "database_stats_timestamp_idx" ON "database_stats"("timestamp");

-- CreateIndex
CREATE UNIQUE INDEX "api_keys_key_hash_key" ON "api_keys"("key_hash");

-- CreateIndex
CREATE INDEX "api_keys_user_id_idx" ON "api_keys"("user_id");

-- CreateIndex
CREATE INDEX "api_keys_key_hash_idx" ON "api_keys"("key_hash");

-- CreateIndex
CREATE INDEX "notifications_user_id_idx" ON "notifications"("user_id");

-- CreateIndex
CREATE INDEX "notifications_is_read_idx" ON "notifications"("is_read");

-- CreateIndex
CREATE INDEX "notifications_created_at_idx" ON "notifications"("created_at");

-- CreateIndex
CREATE UNIQUE INDEX "subscription_plans_code_key" ON "subscription_plans"("code");

-- CreateIndex
CREATE UNIQUE INDEX "subscriptions_stripe_subscription_id_key" ON "subscriptions"("stripe_subscription_id");

-- CreateIndex
CREATE UNIQUE INDEX "subscriptions_paypal_subscription_id_key" ON "subscriptions"("paypal_subscription_id");

-- CreateIndex
CREATE INDEX "subscriptions_user_id_idx" ON "subscriptions"("user_id");

-- CreateIndex
CREATE INDEX "subscriptions_status_idx" ON "subscriptions"("status");

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

-- CreateIndex
CREATE UNIQUE INDEX "user_settings_user_id_key" ON "user_settings"("user_id");

-- CreateIndex
CREATE INDEX "usage_history_user_id_idx" ON "usage_history"("user_id");

-- CreateIndex
CREATE INDEX "usage_history_date_idx" ON "usage_history"("date");

-- CreateIndex
CREATE INDEX "usage_history_year_month_idx" ON "usage_history"("year", "month");

-- CreateIndex
CREATE UNIQUE INDEX "usage_history_user_id_date_key" ON "usage_history"("user_id", "date");

-- CreateIndex
CREATE UNIQUE INDEX "invoices_invoice_number_key" ON "invoices"("invoice_number");

-- CreateIndex
CREATE INDEX "invoices_user_id_idx" ON "invoices"("user_id");

-- CreateIndex
CREATE INDEX "invoices_status_idx" ON "invoices"("status");

-- CreateIndex
CREATE INDEX "invoices_invoice_number_idx" ON "invoices"("invoice_number");

-- CreateIndex
CREATE UNIQUE INDEX "payment_methods_stripe_payment_method_id_key" ON "payment_methods"("stripe_payment_method_id");

-- CreateIndex
CREATE UNIQUE INDEX "payment_methods_paypal_billing_id_key" ON "payment_methods"("paypal_billing_id");

-- CreateIndex
CREATE INDEX "payment_methods_user_id_idx" ON "payment_methods"("user_id");

-- CreateIndex
CREATE INDEX "events_case_id_idx" ON "events"("case_id");

-- CreateIndex
CREATE INDEX "events_created_by_idx" ON "events"("created_by");

-- CreateIndex
CREATE INDEX "events_start_time_idx" ON "events"("start_time");

-- CreateIndex
CREATE INDEX "events_status_idx" ON "events"("status");

-- CreateIndex
CREATE INDEX "events_type_idx" ON "events"("type");

-- CreateIndex
CREATE INDEX "event_participants_event_id_idx" ON "event_participants"("event_id");

-- CreateIndex
CREATE INDEX "event_participants_user_id_idx" ON "event_participants"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "event_participants_event_id_user_id_key" ON "event_participants"("event_id", "user_id");

-- CreateIndex
CREATE UNIQUE INDEX "event_participants_event_id_email_key" ON "event_participants"("event_id", "email");

-- CreateIndex
CREATE INDEX "event_reminders_event_id_idx" ON "event_reminders"("event_id");

-- CreateIndex
CREATE INDEX "event_reminders_sent_at_idx" ON "event_reminders"("sent_at");

-- CreateIndex
CREATE INDEX "event_reminders_status_idx" ON "event_reminders"("status");

-- CreateIndex
CREATE INDEX "tasks_case_id_idx" ON "tasks"("case_id");

-- CreateIndex
CREATE INDEX "tasks_assigned_to_idx" ON "tasks"("assigned_to");

-- CreateIndex
CREATE INDEX "tasks_created_by_idx" ON "tasks"("created_by");

-- CreateIndex
CREATE INDEX "tasks_status_idx" ON "tasks"("status");

-- CreateIndex
CREATE INDEX "tasks_priority_idx" ON "tasks"("priority");

-- CreateIndex
CREATE INDEX "tasks_due_date_idx" ON "tasks"("due_date");

-- CreateIndex
CREATE INDEX "task_checklist_items_task_id_idx" ON "task_checklist_items"("task_id");

-- CreateIndex
CREATE INDEX "task_history_task_id_idx" ON "task_history"("task_id");

-- CreateIndex
CREATE INDEX "task_history_user_id_idx" ON "task_history"("user_id");

-- CreateIndex
CREATE INDEX "task_history_timestamp_idx" ON "task_history"("timestamp");

-- CreateIndex
CREATE UNIQUE INDEX "notification_templates_code_key" ON "notification_templates"("code");

-- CreateIndex
CREATE INDEX "notification_logs_user_id_idx" ON "notification_logs"("user_id");

-- CreateIndex
CREATE INDEX "notification_logs_status_idx" ON "notification_logs"("status");

-- CreateIndex
CREATE INDEX "notification_logs_channel_idx" ON "notification_logs"("channel");

-- CreateIndex
CREATE INDEX "notification_logs_created_at_idx" ON "notification_logs"("created_at");

-- CreateIndex
CREATE INDEX "agreements_case_id_idx" ON "agreements"("case_id");

-- CreateIndex
CREATE INDEX "agreements_status_idx" ON "agreements"("status");

-- CreateIndex
CREATE INDEX "service_items_agreement_id_idx" ON "service_items"("agreement_id");

-- CreateIndex
CREATE INDEX "service_items_case_id_idx" ON "service_items"("case_id");

-- CreateIndex
CREATE INDEX "service_items_type_idx" ON "service_items"("type");

-- CreateIndex
CREATE INDEX "service_items_service_date_idx" ON "service_items"("service_date");

-- CreateIndex
CREATE UNIQUE INDEX "finance_invoices_invoice_number_key" ON "finance_invoices"("invoice_number");

-- CreateIndex
CREATE INDEX "finance_invoices_case_id_idx" ON "finance_invoices"("case_id");

-- CreateIndex
CREATE INDEX "finance_invoices_status_idx" ON "finance_invoices"("status");

-- CreateIndex
CREATE INDEX "finance_invoices_issue_date_idx" ON "finance_invoices"("issue_date");

-- CreateIndex
CREATE INDEX "finance_invoices_due_date_idx" ON "finance_invoices"("due_date");

-- CreateIndex
CREATE INDEX "finance_payments_invoice_id_idx" ON "finance_payments"("invoice_id");

-- CreateIndex
CREATE INDEX "finance_payments_case_id_idx" ON "finance_payments"("case_id");

-- CreateIndex
CREATE INDEX "finance_payments_status_idx" ON "finance_payments"("status");

-- CreateIndex
CREATE INDEX "finance_payments_payment_date_idx" ON "finance_payments"("payment_date");

-- CreateIndex
CREATE UNIQUE INDEX "case_finances_case_id_key" ON "case_finances"("case_id");

-- CreateIndex
CREATE INDEX "analysis_queue_document_id_idx" ON "analysis_queue"("document_id");

-- CreateIndex
CREATE INDEX "analysis_queue_status_idx" ON "analysis_queue"("status");

-- CreateIndex
CREATE INDEX "analysis_queue_priority_idx" ON "analysis_queue"("priority");

-- CreateIndex
CREATE INDEX "analysis_queue_scheduled_at_idx" ON "analysis_queue"("scheduled_at");

-- CreateIndex
CREATE INDEX "document_registry_document_id_document_type_idx" ON "document_registry"("document_id", "document_type");

-- CreateIndex
CREATE INDEX "document_registry_parent_id_idx" ON "document_registry"("parent_id");

-- CreateIndex
CREATE INDEX "document_registry_hierarchy_path_idx" ON "document_registry"("hierarchy_path");

-- CreateIndex
CREATE INDEX "document_registry_is_current_version_idx" ON "document_registry"("is_current_version");

-- CreateIndex
CREATE UNIQUE INDEX "document_registry_document_id_document_type_version_key" ON "document_registry"("document_id", "document_type", "version");

-- CreateIndex
CREATE INDEX "document_references_source_document_id_source_document_type_idx" ON "document_references"("source_document_id", "source_document_type");

-- CreateIndex
CREATE INDEX "document_references_target_document_id_target_document_type_idx" ON "document_references"("target_document_id", "target_document_type");

-- CreateIndex
CREATE INDEX "document_references_reference_type_idx" ON "document_references"("reference_type");

-- CreateIndex
CREATE INDEX "legal_document_articles_legal_document_id_idx" ON "legal_document_articles"("legal_document_id");

-- CreateIndex
CREATE INDEX "legal_document_articles_article_number_idx" ON "legal_document_articles"("article_number");

-- CreateIndex
CREATE INDEX "legal_document_articles_parent_section_id_idx" ON "legal_document_articles"("parent_section_id");

-- CreateIndex
CREATE INDEX "legal_document_sections_legal_document_id_idx" ON "legal_document_sections"("legal_document_id");

-- CreateIndex
CREATE INDEX "legal_document_sections_section_type_idx" ON "legal_document_sections"("section_type");

-- CreateIndex
CREATE INDEX "legal_document_sections_parent_section_id_idx" ON "legal_document_sections"("parent_section_id");

-- CreateIndex
CREATE INDEX "legal_document_sections_hierarchy_path_idx" ON "legal_document_sections"("hierarchy_path");

-- CreateIndex
CREATE INDEX "legal_document_summaries_legal_document_id_idx" ON "legal_document_summaries"("legal_document_id");

-- CreateIndex
CREATE INDEX "legal_document_summaries_summary_type_idx" ON "legal_document_summaries"("summary_type");

-- CreateIndex
CREATE INDEX "legal_document_summaries_summary_level_idx" ON "legal_document_summaries"("summary_level");

-- CreateIndex
CREATE INDEX "query_templates_query_type_idx" ON "query_templates"("query_type");

-- CreateIndex
CREATE INDEX "query_templates_priority_idx" ON "query_templates"("priority");

-- CreateIndex
CREATE INDEX "document_processing_history_document_id_document_type_idx" ON "document_processing_history"("document_id", "document_type");

-- CreateIndex
CREATE INDEX "document_processing_history_status_idx" ON "document_processing_history"("status");

-- CreateIndex
CREATE INDEX "document_processing_history_created_at_idx" ON "document_processing_history"("created_at");

-- CreateIndex
CREATE INDEX "notification_subscriptions_user_id_idx" ON "notification_subscriptions"("user_id");

-- CreateIndex
CREATE INDEX "notification_subscriptions_subscription_type_idx" ON "notification_subscriptions"("subscription_type");

-- CreateIndex
CREATE INDEX "notification_subscriptions_is_active_idx" ON "notification_subscriptions"("is_active");

-- CreateIndex
CREATE INDEX "notification_queue_status_idx" ON "notification_queue"("status");

-- CreateIndex
CREATE INDEX "notification_queue_scheduled_at_idx" ON "notification_queue"("scheduled_at");

-- CreateIndex
CREATE INDEX "notification_queue_priority_idx" ON "notification_queue"("priority");

-- CreateIndex
CREATE INDEX "search_interactions_user_id_timestamp_idx" ON "search_interactions"("user_id", "timestamp" DESC);

-- CreateIndex
CREATE INDEX "search_interactions_session_id_idx" ON "search_interactions"("session_id");

-- CreateIndex
CREATE INDEX "click_events_search_interaction_id_idx" ON "click_events"("search_interaction_id");

-- CreateIndex
CREATE INDEX "click_events_document_id_idx" ON "click_events"("document_id");

-- CreateIndex
CREATE INDEX "click_events_timestamp_idx" ON "click_events"("timestamp" DESC);

-- CreateIndex
CREATE INDEX "relevance_feedback_search_interaction_id_idx" ON "relevance_feedback"("search_interaction_id");

-- CreateIndex
CREATE INDEX "relevance_feedback_document_id_idx" ON "relevance_feedback"("document_id");

-- CreateIndex
CREATE UNIQUE INDEX "ab_test_configs_name_key" ON "ab_test_configs"("name");

-- CreateIndex
CREATE INDEX "ab_test_assignments_user_id_test_config_id_idx" ON "ab_test_assignments"("user_id", "test_config_id");

-- CreateIndex
CREATE UNIQUE INDEX "ab_test_assignments_user_id_test_config_id_key" ON "ab_test_assignments"("user_id", "test_config_id");

-- CreateIndex
CREATE INDEX "document_citations_source_document_id_idx" ON "document_citations"("source_document_id");

-- CreateIndex
CREATE INDEX "document_citations_target_document_id_idx" ON "document_citations"("target_document_id");

-- CreateIndex
CREATE INDEX "document_citations_citation_type_idx" ON "document_citations"("citation_type");

-- CreateIndex
CREATE INDEX "document_citations_is_validated_idx" ON "document_citations"("is_validated");

-- CreateIndex
CREATE INDEX "document_citations_created_at_idx" ON "document_citations"("created_at" DESC);

-- CreateIndex
CREATE INDEX "document_relationships_source_document_id_idx" ON "document_relationships"("source_document_id");

-- CreateIndex
CREATE INDEX "document_relationships_target_document_id_idx" ON "document_relationships"("target_document_id");

-- CreateIndex
CREATE INDEX "document_relationships_relationship_type_idx" ON "document_relationships"("relationship_type");

-- CreateIndex
CREATE INDEX "document_relationships_is_active_idx" ON "document_relationships"("is_active");

-- CreateIndex
CREATE INDEX "document_relationships_effective_date_idx" ON "document_relationships"("effective_date" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "document_authority_scores_document_id_key" ON "document_authority_scores"("document_id");

-- CreateIndex
CREATE INDEX "document_authority_scores_pagerank_score_idx" ON "document_authority_scores"("pagerank_score" DESC);

-- CreateIndex
CREATE INDEX "document_authority_scores_combined_authority_idx" ON "document_authority_scores"("combined_authority" DESC);

-- CreateIndex
CREATE INDEX "document_authority_scores_citation_count_idx" ON "document_authority_scores"("citation_count" DESC);

-- CreateIndex
CREATE INDEX "document_authority_scores_last_calculated_idx" ON "document_authority_scores"("last_calculated" DESC);

-- CreateIndex
CREATE INDEX "citation_extraction_jobs_document_id_idx" ON "citation_extraction_jobs"("document_id");

-- CreateIndex
CREATE INDEX "citation_extraction_jobs_status_idx" ON "citation_extraction_jobs"("status");

-- CreateIndex
CREATE INDEX "citation_extraction_jobs_priority_idx" ON "citation_extraction_jobs"("priority" DESC);

-- CreateIndex
CREATE INDEX "citation_extraction_jobs_created_at_idx" ON "citation_extraction_jobs"("created_at" DESC);

-- CreateIndex
CREATE INDEX "pagerank_calculation_logs_started_at_idx" ON "pagerank_calculation_logs"("started_at" DESC);

-- CreateIndex
CREATE INDEX "pagerank_calculation_logs_converged_idx" ON "pagerank_calculation_logs"("converged");

-- CreateIndex
CREATE INDEX "saved_searches_user_id_idx" ON "saved_searches"("user_id");

-- CreateIndex
CREATE INDEX "saved_searches_created_at_idx" ON "saved_searches"("created_at" DESC);

-- CreateIndex
CREATE INDEX "saved_searches_is_favorite_idx" ON "saved_searches"("is_favorite");

-- CreateIndex
CREATE UNIQUE INDEX "document_collections_share_token_key" ON "document_collections"("share_token");

-- CreateIndex
CREATE INDEX "document_collections_user_id_idx" ON "document_collections"("user_id");

-- CreateIndex
CREATE INDEX "document_collections_is_public_idx" ON "document_collections"("is_public");

-- CreateIndex
CREATE INDEX "document_collections_share_token_idx" ON "document_collections"("share_token");

-- CreateIndex
CREATE INDEX "collection_documents_collection_id_idx" ON "collection_documents"("collection_id");

-- CreateIndex
CREATE INDEX "collection_documents_document_id_idx" ON "collection_documents"("document_id");

-- CreateIndex
CREATE UNIQUE INDEX "search_suggestions_suggestion_text_key" ON "search_suggestions"("suggestion_text");

-- CreateIndex
CREATE INDEX "search_suggestions_suggestion_text_idx" ON "search_suggestions"("suggestion_text");

-- CreateIndex
CREATE INDEX "search_suggestions_search_count_idx" ON "search_suggestions"("search_count" DESC);

-- CreateIndex
CREATE INDEX "search_suggestions_category_idx" ON "search_suggestions"("category");

-- CreateIndex
CREATE UNIQUE INDEX "shared_search_links_share_token_key" ON "shared_search_links"("share_token");

-- CreateIndex
CREATE INDEX "shared_search_links_share_token_idx" ON "shared_search_links"("share_token");

-- CreateIndex
CREATE INDEX "shared_search_links_user_id_idx" ON "shared_search_links"("user_id");

-- CreateIndex
CREATE INDEX "shared_search_links_expires_at_idx" ON "shared_search_links"("expires_at");

-- CreateIndex
CREATE INDEX "document_recommendations_source_document_id_idx" ON "document_recommendations"("source_document_id");

-- CreateIndex
CREATE INDEX "document_recommendations_recommendation_type_idx" ON "document_recommendations"("recommendation_type");

-- CreateIndex
CREATE INDEX "document_recommendations_score_idx" ON "document_recommendations"("score" DESC);

-- CreateIndex
CREATE INDEX "query_expansions_original_term_idx" ON "query_expansions"("original_term");

-- CreateIndex
CREATE INDEX "query_expansions_usage_count_idx" ON "query_expansions"("usage_count" DESC);

-- CreateIndex
CREATE INDEX "ai_conversations_user_id_started_at_idx" ON "ai_conversations"("user_id", "started_at" DESC);

-- CreateIndex
CREATE INDEX "ai_conversations_user_id_is_active_idx" ON "ai_conversations"("user_id", "is_active");

-- CreateIndex
CREATE INDEX "ai_messages_conversation_id_timestamp_idx" ON "ai_messages"("conversation_id", "timestamp");

-- CreateIndex
CREATE INDEX "ai_messages_role_idx" ON "ai_messages"("role");

-- CreateIndex
CREATE INDEX "ai_citations_message_id_idx" ON "ai_citations"("message_id");

-- CreateIndex
CREATE INDEX "ai_citations_document_id_idx" ON "ai_citations"("document_id");

-- CreateIndex
CREATE INDEX "ai_citations_relevance_idx" ON "ai_citations"("relevance" DESC);

-- CreateIndex
CREATE INDEX "analytics_events_event_type_timestamp_idx" ON "analytics_events"("event_type", "timestamp" DESC);

-- CreateIndex
CREATE INDEX "analytics_events_user_id_timestamp_idx" ON "analytics_events"("user_id", "timestamp" DESC);

-- CreateIndex
CREATE INDEX "analytics_events_session_id_idx" ON "analytics_events"("session_id");

-- CreateIndex
CREATE INDEX "analytics_metrics_metric_name_timestamp_idx" ON "analytics_metrics"("metric_name", "timestamp" DESC);

-- CreateIndex
CREATE INDEX "analytics_metrics_period_start_period_end_idx" ON "analytics_metrics"("period_start", "period_end");

-- CreateIndex
CREATE INDEX "document_analytics_trending_score_idx" ON "document_analytics"("trending_score" DESC);

-- CreateIndex
CREATE INDEX "document_analytics_view_count_idx" ON "document_analytics"("view_count" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "document_analytics_document_id_period_start_key" ON "document_analytics"("document_id", "period_start");

-- CreateIndex
CREATE INDEX "search_analytics_query_idx" ON "search_analytics"("query");

-- CreateIndex
CREATE INDEX "search_analytics_search_count_idx" ON "search_analytics"("search_count" DESC);

-- CreateIndex
CREATE INDEX "search_analytics_click_through_rate_idx" ON "search_analytics"("click_through_rate" DESC);

-- CreateIndex
CREATE INDEX "ml_models_type_is_active_idx" ON "ml_models"("type", "is_active");

-- CreateIndex
CREATE INDEX "ml_models_model_type_status_idx" ON "ml_models"("model_type", "status");

-- CreateIndex
CREATE INDEX "ml_models_status_created_at_idx" ON "ml_models"("status", "created_at" DESC);

-- CreateIndex
CREATE INDEX "predictions_model_id_idx" ON "predictions"("model_id");

-- CreateIndex
CREATE INDEX "predictions_confidence_idx" ON "predictions"("confidence" DESC);

-- CreateIndex
CREATE INDEX "predictions_timestamp_idx" ON "predictions"("timestamp" DESC);

-- CreateIndex
CREATE INDEX "predictions_prediction_type_timestamp_idx" ON "predictions"("prediction_type", "timestamp" DESC);

-- CreateIndex
CREATE INDEX "prediction_feedback_prediction_id_idx" ON "prediction_feedback"("prediction_id");

-- CreateIndex
CREATE INDEX "prediction_feedback_user_id_idx" ON "prediction_feedback"("user_id");

-- CreateIndex
CREATE INDEX "prediction_feedback_is_accurate_idx" ON "prediction_feedback"("is_accurate");

-- CreateIndex
CREATE INDEX "prediction_feedback_created_at_idx" ON "prediction_feedback"("created_at" DESC);

-- CreateIndex
CREATE INDEX "prediction_feedback_is_accurate_created_at_idx" ON "prediction_feedback"("is_accurate", "created_at" DESC);

-- CreateIndex
CREATE INDEX "legal_patterns_pattern_type_detected_at_idx" ON "legal_patterns"("pattern_type", "detected_at" DESC);

-- CreateIndex
CREATE INDEX "legal_patterns_confidence_idx" ON "legal_patterns"("confidence" DESC);

-- CreateIndex
CREATE INDEX "legal_patterns_model_id_idx" ON "legal_patterns"("model_id");

-- CreateIndex
CREATE INDEX "pattern_documents_pattern_id_idx" ON "pattern_documents"("pattern_id");

-- CreateIndex
CREATE INDEX "pattern_documents_document_id_idx" ON "pattern_documents"("document_id");

-- CreateIndex
CREATE INDEX "pattern_documents_relevance_score_idx" ON "pattern_documents"("relevance_score" DESC);

-- CreateIndex
CREATE INDEX "pattern_documents_pattern_id_relevance_score_idx" ON "pattern_documents"("pattern_id", "relevance_score" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "pattern_documents_pattern_id_document_id_key" ON "pattern_documents"("pattern_id", "document_id");

-- CreateIndex
CREATE INDEX "trend_forecasts_forecast_type_idx" ON "trend_forecasts"("forecast_type");

-- CreateIndex
CREATE INDEX "trend_forecasts_confidence_idx" ON "trend_forecasts"("confidence" DESC);

-- CreateIndex
CREATE INDEX "trend_forecasts_expires_at_idx" ON "trend_forecasts"("expires_at");

-- CreateIndex
CREATE INDEX "trend_forecasts_model_id_idx" ON "trend_forecasts"("model_id");

-- CreateIndex
CREATE INDEX "trend_forecasts_direction_confidence_idx" ON "trend_forecasts"("direction", "confidence" DESC);

-- CreateIndex
CREATE INDEX "trend_data_points_trend_forecast_id_idx" ON "trend_data_points"("trend_forecast_id");

-- CreateIndex
CREATE INDEX "trend_data_points_timestamp_idx" ON "trend_data_points"("timestamp" DESC);

-- CreateIndex
CREATE INDEX "trend_data_points_is_predicted_idx" ON "trend_data_points"("is_predicted");

-- CreateIndex
CREATE INDEX "trend_data_points_trend_forecast_id_timestamp_idx" ON "trend_data_points"("trend_forecast_id", "timestamp" DESC);

-- CreateIndex
CREATE INDEX "trend_alerts_trend_forecast_id_idx" ON "trend_alerts"("trend_forecast_id");

-- CreateIndex
CREATE INDEX "trend_alerts_alert_type_idx" ON "trend_alerts"("alert_type");

-- CreateIndex
CREATE INDEX "trend_alerts_severity_idx" ON "trend_alerts"("severity");

-- CreateIndex
CREATE INDEX "trend_alerts_is_acknowledged_idx" ON "trend_alerts"("is_acknowledged");

-- CreateIndex
CREATE INDEX "trend_alerts_is_resolved_idx" ON "trend_alerts"("is_resolved");

-- CreateIndex
CREATE INDEX "trend_alerts_created_at_idx" ON "trend_alerts"("created_at" DESC);

-- CreateIndex
CREATE INDEX "trend_alerts_severity_is_resolved_idx" ON "trend_alerts"("severity", "is_resolved");

-- CreateIndex
CREATE INDEX "document_summaries_document_id_idx" ON "document_summaries"("document_id");

-- CreateIndex
CREATE INDEX "document_summaries_summary_type_idx" ON "document_summaries"("summary_type");

-- CreateIndex
CREATE INDEX "article_analysis_document_id_idx" ON "article_analysis"("document_id");

-- CreateIndex
CREATE INDEX "article_analysis_analysis_type_idx" ON "article_analysis"("analysis_type");

-- CreateIndex
CREATE INDEX "document_comparisons_document1_id_idx" ON "document_comparisons"("document1_id");

-- CreateIndex
CREATE INDEX "document_comparisons_document2_id_idx" ON "document_comparisons"("document2_id");

-- CreateIndex
CREATE INDEX "document_comparisons_similarity_score_idx" ON "document_comparisons"("similarity_score" DESC);

-- CreateIndex
CREATE INDEX "document_comparisons_compared_at_idx" ON "document_comparisons"("compared_at" DESC);

-- CreateIndex
CREATE INDEX "comparison_changes_comparison_id_idx" ON "comparison_changes"("comparison_id");

-- CreateIndex
CREATE INDEX "comparison_changes_change_type_idx" ON "comparison_changes"("change_type");

-- CreateIndex
CREATE INDEX "comparison_changes_significance_score_idx" ON "comparison_changes"("significance_score" DESC);

-- CreateIndex
CREATE INDEX "query_history_session_id_created_at_idx" ON "query_history"("session_id", "created_at");

-- CreateIndex
CREATE INDEX "query_history_user_id_created_at_idx" ON "query_history"("user_id", "created_at");

-- CreateIndex
CREATE INDEX "query_history_query_hash_idx" ON "query_history"("query_hash");

-- CreateIndex
CREATE INDEX "query_history_created_at_idx" ON "query_history"("created_at");

-- CreateIndex
CREATE UNIQUE INDEX "user_sessions_session_token_key" ON "user_sessions"("session_token");

-- CreateIndex
CREATE INDEX "user_sessions_user_id_is_active_last_activity_at_idx" ON "user_sessions"("user_id", "is_active", "last_activity_at");

-- CreateIndex
CREATE INDEX "user_sessions_session_token_idx" ON "user_sessions"("session_token");

-- CreateIndex
CREATE INDEX "user_sessions_last_activity_at_idx" ON "user_sessions"("last_activity_at");

-- CreateIndex
CREATE UNIQUE INDEX "query_cache_query_hash_key" ON "query_cache"("query_hash");

-- CreateIndex
CREATE INDEX "query_cache_query_hash_created_at_idx" ON "query_cache"("query_hash", "created_at");

-- CreateIndex
CREATE INDEX "query_cache_expires_at_idx" ON "query_cache"("expires_at");

-- CreateIndex
CREATE INDEX "query_cache_last_hit_at_idx" ON "query_cache"("last_hit_at");

-- CreateIndex
CREATE UNIQUE INDEX "query_suggestions_suggestion_key" ON "query_suggestions"("suggestion");

-- CreateIndex
CREATE INDEX "query_suggestions_category_frequency_idx" ON "query_suggestions"("category", "frequency");

-- CreateIndex
CREATE INDEX "query_suggestions_suggestion_idx" ON "query_suggestions"("suggestion");

-- CreateIndex
CREATE INDEX "graph_snapshots_snapshot_type_idx" ON "graph_snapshots"("snapshot_type");

-- CreateIndex
CREATE INDEX "graph_snapshots_is_current_idx" ON "graph_snapshots"("is_current");

-- CreateIndex
CREATE INDEX "graph_snapshots_created_at_idx" ON "graph_snapshots"("created_at" DESC);

-- CreateIndex
CREATE INDEX "graph_snapshots_name_idx" ON "graph_snapshots"("name");

-- CreateIndex
CREATE UNIQUE INDEX "backups_name_key" ON "backups"("name");

-- CreateIndex
CREATE INDEX "backups_status_created_at_idx" ON "backups"("status", "created_at" DESC);

-- CreateIndex
CREATE INDEX "backups_type_status_idx" ON "backups"("type", "status");

-- CreateIndex
CREATE INDEX "backups_created_by_idx" ON "backups"("created_by");

-- CreateIndex
CREATE INDEX "backups_schedule_id_idx" ON "backups"("schedule_id");

-- CreateIndex
CREATE INDEX "backups_created_at_idx" ON "backups"("created_at" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "backup_schedules_name_key" ON "backup_schedules"("name");

-- CreateIndex
CREATE INDEX "backup_schedules_enabled_next_run_at_idx" ON "backup_schedules"("enabled", "next_run_at");

-- CreateIndex
CREATE INDEX "backup_schedules_created_by_idx" ON "backup_schedules"("created_by");

-- CreateIndex
CREATE INDEX "backup_schedules_enabled_last_run_at_idx" ON "backup_schedules"("enabled", "last_run_at" DESC);

-- CreateIndex
CREATE INDEX "restore_jobs_status_created_at_idx" ON "restore_jobs"("status", "created_at" DESC);

-- CreateIndex
CREATE INDEX "restore_jobs_backup_id_idx" ON "restore_jobs"("backup_id");

-- CreateIndex
CREATE INDEX "restore_jobs_created_by_idx" ON "restore_jobs"("created_by");

-- CreateIndex
CREATE INDEX "restore_jobs_created_at_idx" ON "restore_jobs"("created_at" DESC);

-- CreateIndex
CREATE INDEX "backup_audit_logs_resource_type_resource_id_idx" ON "backup_audit_logs"("resource_type", "resource_id");

-- CreateIndex
CREATE INDEX "backup_audit_logs_user_id_idx" ON "backup_audit_logs"("user_id");

-- CreateIndex
CREATE INDEX "backup_audit_logs_action_idx" ON "backup_audit_logs"("action");

-- CreateIndex
CREATE INDEX "backup_audit_logs_created_at_idx" ON "backup_audit_logs"("created_at" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "backup_encryption_keys_key_id_key" ON "backup_encryption_keys"("key_id");

-- CreateIndex
CREATE INDEX "backup_encryption_keys_active_idx" ON "backup_encryption_keys"("active");

-- CreateIndex
CREATE INDEX "backup_encryption_keys_key_id_idx" ON "backup_encryption_keys"("key_id");

-- AddForeignKey
ALTER TABLE "cases" ADD CONSTRAINT "cases_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documents" ADD CONSTRAINT "documents_case_id_fkey" FOREIGN KEY ("case_id") REFERENCES "cases"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documents" ADD CONSTRAINT "documents_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "document_chunks" ADD CONSTRAINT "document_chunks_document_id_fkey" FOREIGN KEY ("document_id") REFERENCES "documents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "legal_documents" ADD CONSTRAINT "legal_documents_uploaded_by_fkey" FOREIGN KEY ("uploaded_by") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "legal_document_chunks" ADD CONSTRAINT "legal_document_chunks_legal_document_id_fkey" FOREIGN KEY ("legal_document_id") REFERENCES "legal_documents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "legal_specialties" ADD CONSTRAINT "legal_specialties_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "legal_specialties"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "document_specialties" ADD CONSTRAINT "document_specialties_document_id_fkey" FOREIGN KEY ("document_id") REFERENCES "legal_documents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "document_specialties" ADD CONSTRAINT "document_specialties_specialty_id_fkey" FOREIGN KEY ("specialty_id") REFERENCES "legal_specialties"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "query_logs" ADD CONSTRAINT "query_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_quotas" ADD CONSTRAINT "user_quotas_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "storage_usage" ADD CONSTRAINT "storage_usage_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "api_keys" ADD CONSTRAINT "api_keys_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

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

-- AddForeignKey
ALTER TABLE "user_settings" ADD CONSTRAINT "user_settings_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "usage_history" ADD CONSTRAINT "usage_history_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "events" ADD CONSTRAINT "events_case_id_fkey" FOREIGN KEY ("case_id") REFERENCES "cases"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "events" ADD CONSTRAINT "events_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "events" ADD CONSTRAINT "events_parent_event_id_fkey" FOREIGN KEY ("parent_event_id") REFERENCES "events"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_participants" ADD CONSTRAINT "event_participants_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_participants" ADD CONSTRAINT "event_participants_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_reminders" ADD CONSTRAINT "event_reminders_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_reminders" ADD CONSTRAINT "event_reminders_recipient_user_id_fkey" FOREIGN KEY ("recipient_user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_case_id_fkey" FOREIGN KEY ("case_id") REFERENCES "cases"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_assigned_to_fkey" FOREIGN KEY ("assigned_to") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_parent_task_id_fkey" FOREIGN KEY ("parent_task_id") REFERENCES "tasks"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "task_checklist_items" ADD CONSTRAINT "task_checklist_items_task_id_fkey" FOREIGN KEY ("task_id") REFERENCES "tasks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "task_checklist_items" ADD CONSTRAINT "task_checklist_items_completed_by_fkey" FOREIGN KEY ("completed_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "task_history" ADD CONSTRAINT "task_history_task_id_fkey" FOREIGN KEY ("task_id") REFERENCES "tasks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "task_history" ADD CONSTRAINT "task_history_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notification_logs" ADD CONSTRAINT "notification_logs_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "notification_templates"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notification_logs" ADD CONSTRAINT "notification_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "agreements" ADD CONSTRAINT "agreements_case_id_fkey" FOREIGN KEY ("case_id") REFERENCES "cases"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "service_items" ADD CONSTRAINT "service_items_agreement_id_fkey" FOREIGN KEY ("agreement_id") REFERENCES "agreements"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "service_items" ADD CONSTRAINT "service_items_case_id_fkey" FOREIGN KEY ("case_id") REFERENCES "cases"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "finance_invoices" ADD CONSTRAINT "finance_invoices_case_id_fkey" FOREIGN KEY ("case_id") REFERENCES "cases"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "finance_payments" ADD CONSTRAINT "finance_payments_invoice_id_fkey" FOREIGN KEY ("invoice_id") REFERENCES "finance_invoices"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "finance_payments" ADD CONSTRAINT "finance_payments_case_id_fkey" FOREIGN KEY ("case_id") REFERENCES "cases"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "case_finances" ADD CONSTRAINT "case_finances_case_id_fkey" FOREIGN KEY ("case_id") REFERENCES "cases"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "analysis_queue" ADD CONSTRAINT "analysis_queue_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "document_registry" ADD CONSTRAINT "document_registry_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "document_registry"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "document_registry" ADD CONSTRAINT "document_registry_superseded_by_fkey" FOREIGN KEY ("superseded_by") REFERENCES "document_registry"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "legal_document_articles" ADD CONSTRAINT "legal_document_articles_legal_document_id_fkey" FOREIGN KEY ("legal_document_id") REFERENCES "legal_documents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "legal_document_articles" ADD CONSTRAINT "legal_document_articles_parent_section_id_fkey" FOREIGN KEY ("parent_section_id") REFERENCES "legal_document_sections"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "legal_document_sections" ADD CONSTRAINT "legal_document_sections_legal_document_id_fkey" FOREIGN KEY ("legal_document_id") REFERENCES "legal_documents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "legal_document_sections" ADD CONSTRAINT "legal_document_sections_parent_section_id_fkey" FOREIGN KEY ("parent_section_id") REFERENCES "legal_document_sections"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "legal_document_summaries" ADD CONSTRAINT "legal_document_summaries_legal_document_id_fkey" FOREIGN KEY ("legal_document_id") REFERENCES "legal_documents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "legal_document_summaries" ADD CONSTRAINT "legal_document_summaries_section_id_fkey" FOREIGN KEY ("section_id") REFERENCES "legal_document_sections"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "legal_document_summaries" ADD CONSTRAINT "legal_document_summaries_article_id_fkey" FOREIGN KEY ("article_id") REFERENCES "legal_document_articles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notification_subscriptions" ADD CONSTRAINT "notification_subscriptions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notification_queue" ADD CONSTRAINT "notification_queue_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "notification_templates"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notification_queue" ADD CONSTRAINT "notification_queue_recipient_id_fkey" FOREIGN KEY ("recipient_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "search_interactions" ADD CONSTRAINT "search_interactions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "click_events" ADD CONSTRAINT "click_events_search_interaction_id_fkey" FOREIGN KEY ("search_interaction_id") REFERENCES "search_interactions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "click_events" ADD CONSTRAINT "click_events_document_id_fkey" FOREIGN KEY ("document_id") REFERENCES "legal_documents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "relevance_feedback" ADD CONSTRAINT "relevance_feedback_search_interaction_id_fkey" FOREIGN KEY ("search_interaction_id") REFERENCES "search_interactions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "relevance_feedback" ADD CONSTRAINT "relevance_feedback_document_id_fkey" FOREIGN KEY ("document_id") REFERENCES "legal_documents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ab_test_assignments" ADD CONSTRAINT "ab_test_assignments_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ab_test_assignments" ADD CONSTRAINT "ab_test_assignments_test_config_id_fkey" FOREIGN KEY ("test_config_id") REFERENCES "ab_test_configs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "document_citations" ADD CONSTRAINT "document_citations_source_document_id_fkey" FOREIGN KEY ("source_document_id") REFERENCES "legal_documents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "document_citations" ADD CONSTRAINT "document_citations_target_document_id_fkey" FOREIGN KEY ("target_document_id") REFERENCES "legal_documents"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "document_relationships" ADD CONSTRAINT "document_relationships_source_document_id_fkey" FOREIGN KEY ("source_document_id") REFERENCES "legal_documents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "document_relationships" ADD CONSTRAINT "document_relationships_target_document_id_fkey" FOREIGN KEY ("target_document_id") REFERENCES "legal_documents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "document_authority_scores" ADD CONSTRAINT "document_authority_scores_document_id_fkey" FOREIGN KEY ("document_id") REFERENCES "legal_documents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "citation_extraction_jobs" ADD CONSTRAINT "citation_extraction_jobs_document_id_fkey" FOREIGN KEY ("document_id") REFERENCES "legal_documents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "saved_searches" ADD CONSTRAINT "saved_searches_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "document_collections" ADD CONSTRAINT "document_collections_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "collection_documents" ADD CONSTRAINT "collection_documents_collection_id_fkey" FOREIGN KEY ("collection_id") REFERENCES "document_collections"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "collection_documents" ADD CONSTRAINT "collection_documents_document_id_fkey" FOREIGN KEY ("document_id") REFERENCES "legal_documents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shared_search_links" ADD CONSTRAINT "shared_search_links_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "document_recommendations" ADD CONSTRAINT "document_recommendations_source_document_id_fkey" FOREIGN KEY ("source_document_id") REFERENCES "legal_documents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "document_recommendations" ADD CONSTRAINT "document_recommendations_recommended_document_id_fkey" FOREIGN KEY ("recommended_document_id") REFERENCES "legal_documents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_conversations" ADD CONSTRAINT "ai_conversations_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_messages" ADD CONSTRAINT "ai_messages_conversation_id_fkey" FOREIGN KEY ("conversation_id") REFERENCES "ai_conversations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_citations" ADD CONSTRAINT "ai_citations_message_id_fkey" FOREIGN KEY ("message_id") REFERENCES "ai_messages"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_citations" ADD CONSTRAINT "ai_citations_document_id_fkey" FOREIGN KEY ("document_id") REFERENCES "legal_documents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "analytics_events" ADD CONSTRAINT "analytics_events_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "document_analytics" ADD CONSTRAINT "document_analytics_document_id_fkey" FOREIGN KEY ("document_id") REFERENCES "legal_documents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "predictions" ADD CONSTRAINT "predictions_model_id_fkey" FOREIGN KEY ("model_id") REFERENCES "ml_models"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "prediction_feedback" ADD CONSTRAINT "prediction_feedback_prediction_id_fkey" FOREIGN KEY ("prediction_id") REFERENCES "predictions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "legal_patterns" ADD CONSTRAINT "legal_patterns_model_id_fkey" FOREIGN KEY ("model_id") REFERENCES "ml_models"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pattern_documents" ADD CONSTRAINT "pattern_documents_pattern_id_fkey" FOREIGN KEY ("pattern_id") REFERENCES "legal_patterns"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pattern_documents" ADD CONSTRAINT "pattern_documents_document_id_fkey" FOREIGN KEY ("document_id") REFERENCES "legal_documents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trend_forecasts" ADD CONSTRAINT "trend_forecasts_model_id_fkey" FOREIGN KEY ("model_id") REFERENCES "ml_models"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trend_data_points" ADD CONSTRAINT "trend_data_points_trend_forecast_id_fkey" FOREIGN KEY ("trend_forecast_id") REFERENCES "trend_forecasts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trend_alerts" ADD CONSTRAINT "trend_alerts_trend_forecast_id_fkey" FOREIGN KEY ("trend_forecast_id") REFERENCES "trend_forecasts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "document_summaries" ADD CONSTRAINT "document_summaries_document_id_fkey" FOREIGN KEY ("document_id") REFERENCES "legal_documents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "article_analysis" ADD CONSTRAINT "article_analysis_document_id_fkey" FOREIGN KEY ("document_id") REFERENCES "legal_documents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "comparison_changes" ADD CONSTRAINT "comparison_changes_comparison_id_fkey" FOREIGN KEY ("comparison_id") REFERENCES "document_comparisons"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "query_history" ADD CONSTRAINT "query_history_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "user_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "query_history" ADD CONSTRAINT "query_history_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "query_history" ADD CONSTRAINT "query_history_query_hash_fkey" FOREIGN KEY ("query_hash") REFERENCES "query_cache"("query_hash") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_sessions" ADD CONSTRAINT "user_sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "backups" ADD CONSTRAINT "backups_schedule_id_fkey" FOREIGN KEY ("schedule_id") REFERENCES "backup_schedules"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "restore_jobs" ADD CONSTRAINT "restore_jobs_backup_id_fkey" FOREIGN KEY ("backup_id") REFERENCES "backups"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "backup_audit_logs" ADD CONSTRAINT "backup_audit_logs_backup_id_fkey" FOREIGN KEY ("backup_id") REFERENCES "backups"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "backup_audit_logs" ADD CONSTRAINT "backup_audit_logs_schedule_id_fkey" FOREIGN KEY ("schedule_id") REFERENCES "backup_schedules"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "backup_audit_logs" ADD CONSTRAINT "backup_audit_logs_restore_job_id_fkey" FOREIGN KEY ("restore_job_id") REFERENCES "restore_jobs"("id") ON DELETE CASCADE ON UPDATE CASCADE;


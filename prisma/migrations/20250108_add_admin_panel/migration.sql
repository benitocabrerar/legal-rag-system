-- Add new columns to users table
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "is_active" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "last_login" TIMESTAMP(3);
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "storage_used_mb" DOUBLE PRECISION NOT NULL DEFAULT 0;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "total_queries" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "avatar_url" TEXT;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "phone_number" TEXT;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "address" TEXT;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "city" TEXT;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "country" TEXT DEFAULT 'Ecuador';

-- Add new columns to legal_documents table
ALTER TABLE "legal_documents" ADD COLUMN IF NOT EXISTS "is_active" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "legal_documents" ADD COLUMN IF NOT EXISTS "view_count" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "legal_documents" ADD COLUMN IF NOT EXISTS "download_count" INTEGER NOT NULL DEFAULT 0;

-- Create legal_specialties table
CREATE TABLE IF NOT EXISTS "legal_specialties" (
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

-- Create unique index on code
CREATE UNIQUE INDEX IF NOT EXISTS "legal_specialties_code_key" ON "legal_specialties"("code");

-- Create indexes for legal_specialties
CREATE INDEX IF NOT EXISTS "legal_specialties_parent_id_idx" ON "legal_specialties"("parent_id");
CREATE INDEX IF NOT EXISTS "legal_specialties_code_idx" ON "legal_specialties"("code");

-- Add foreign key for self-referencing hierarchy
ALTER TABLE "legal_specialties" ADD CONSTRAINT "legal_specialties_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "legal_specialties"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Create document_specialties join table
CREATE TABLE IF NOT EXISTS "document_specialties" (
    "id" TEXT NOT NULL,
    "document_id" TEXT NOT NULL,
    "specialty_id" TEXT NOT NULL,
    "is_primary" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "document_specialties_pkey" PRIMARY KEY ("id")
);

-- Create unique constraint and indexes for document_specialties
CREATE UNIQUE INDEX IF NOT EXISTS "document_specialties_document_id_specialty_id_key" ON "document_specialties"("document_id", "specialty_id");
CREATE INDEX IF NOT EXISTS "document_specialties_document_id_idx" ON "document_specialties"("document_id");
CREATE INDEX IF NOT EXISTS "document_specialties_specialty_id_idx" ON "document_specialties"("specialty_id");

-- Add foreign keys for document_specialties
ALTER TABLE "document_specialties" ADD CONSTRAINT "document_specialties_document_id_fkey" FOREIGN KEY ("document_id") REFERENCES "legal_documents"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "document_specialties" ADD CONSTRAINT "document_specialties_specialty_id_fkey" FOREIGN KEY ("specialty_id") REFERENCES "legal_specialties"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Create audit_logs table
CREATE TABLE IF NOT EXISTS "audit_logs" (
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

-- Create indexes for audit_logs
CREATE INDEX IF NOT EXISTS "audit_logs_user_id_idx" ON "audit_logs"("user_id");
CREATE INDEX IF NOT EXISTS "audit_logs_action_idx" ON "audit_logs"("action");
CREATE INDEX IF NOT EXISTS "audit_logs_entity_idx" ON "audit_logs"("entity");
CREATE INDEX IF NOT EXISTS "audit_logs_created_at_idx" ON "audit_logs"("created_at");

-- Add foreign key for audit_logs
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Create query_logs table
CREATE TABLE IF NOT EXISTS "query_logs" (
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

-- Create indexes for query_logs
CREATE INDEX IF NOT EXISTS "query_logs_user_id_idx" ON "query_logs"("user_id");
CREATE INDEX IF NOT EXISTS "query_logs_created_at_idx" ON "query_logs"("created_at");

-- Add foreign key for query_logs
ALTER TABLE "query_logs" ADD CONSTRAINT "query_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Create user_quotas table
CREATE TABLE IF NOT EXISTS "user_quotas" (
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

-- Create unique index on user_id
CREATE UNIQUE INDEX IF NOT EXISTS "user_quotas_user_id_key" ON "user_quotas"("user_id");

-- Add foreign key for user_quotas
ALTER TABLE "user_quotas" ADD CONSTRAINT "user_quotas_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Create storage_usage table
CREATE TABLE IF NOT EXISTS "storage_usage" (
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

-- Create indexes for storage_usage
CREATE INDEX IF NOT EXISTS "storage_usage_user_id_idx" ON "storage_usage"("user_id");
CREATE INDEX IF NOT EXISTS "storage_usage_category_idx" ON "storage_usage"("category");

-- Add foreign key for storage_usage
ALTER TABLE "storage_usage" ADD CONSTRAINT "storage_usage_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Create system_metrics table
CREATE TABLE IF NOT EXISTS "system_metrics" (
    "id" TEXT NOT NULL,
    "metric_name" TEXT NOT NULL,
    "metric_value" DOUBLE PRECISION NOT NULL,
    "metric_unit" TEXT,
    "category" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "metadata" JSONB,

    CONSTRAINT "system_metrics_pkey" PRIMARY KEY ("id")
);

-- Create indexes for system_metrics
CREATE INDEX IF NOT EXISTS "system_metrics_metric_name_idx" ON "system_metrics"("metric_name");
CREATE INDEX IF NOT EXISTS "system_metrics_category_idx" ON "system_metrics"("category");
CREATE INDEX IF NOT EXISTS "system_metrics_timestamp_idx" ON "system_metrics"("timestamp");

-- Create database_stats table
CREATE TABLE IF NOT EXISTS "database_stats" (
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

-- Create indexes for database_stats
CREATE INDEX IF NOT EXISTS "database_stats_table_name_idx" ON "database_stats"("table_name");
CREATE INDEX IF NOT EXISTS "database_stats_timestamp_idx" ON "database_stats"("timestamp");

-- Create api_keys table
CREATE TABLE IF NOT EXISTS "api_keys" (
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

-- Create unique index on key_hash
CREATE UNIQUE INDEX IF NOT EXISTS "api_keys_key_hash_key" ON "api_keys"("key_hash");

-- Create indexes for api_keys
CREATE INDEX IF NOT EXISTS "api_keys_user_id_idx" ON "api_keys"("user_id");
CREATE INDEX IF NOT EXISTS "api_keys_key_hash_idx" ON "api_keys"("key_hash");

-- Add foreign key for api_keys
ALTER TABLE "api_keys" ADD CONSTRAINT "api_keys_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Create notifications table
CREATE TABLE IF NOT EXISTS "notifications" (
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

-- Create indexes for notifications
CREATE INDEX IF NOT EXISTS "notifications_user_id_idx" ON "notifications"("user_id");
CREATE INDEX IF NOT EXISTS "notifications_is_read_idx" ON "notifications"("is_read");
CREATE INDEX IF NOT EXISTS "notifications_created_at_idx" ON "notifications"("created_at");

-- Add foreign key for notifications
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

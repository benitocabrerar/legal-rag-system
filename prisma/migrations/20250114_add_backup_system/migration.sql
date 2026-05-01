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
ALTER TABLE "backups" ADD CONSTRAINT "backups_schedule_id_fkey" FOREIGN KEY ("schedule_id") REFERENCES "backup_schedules"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "restore_jobs" ADD CONSTRAINT "restore_jobs_backup_id_fkey" FOREIGN KEY ("backup_id") REFERENCES "backups"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "backup_audit_logs" ADD CONSTRAINT "backup_audit_logs_backup_id_fkey" FOREIGN KEY ("backup_id") REFERENCES "backups"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "backup_audit_logs" ADD CONSTRAINT "backup_audit_logs_schedule_id_fkey" FOREIGN KEY ("schedule_id") REFERENCES "backup_schedules"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "backup_audit_logs" ADD CONSTRAINT "backup_audit_logs_restore_job_id_fkey" FOREIGN KEY ("restore_job_id") REFERENCES "restore_jobs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

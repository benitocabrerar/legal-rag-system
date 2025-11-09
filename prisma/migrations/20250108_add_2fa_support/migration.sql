-- Add 2FA support fields to User model
ALTER TABLE "users" ADD COLUMN "two_factor_enabled" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "users" ADD COLUMN "two_factor_secret" TEXT;
ALTER TABLE "users" ADD COLUMN "two_factor_backup_codes" TEXT[];
ALTER TABLE "users" ADD COLUMN "two_factor_verified_at" TIMESTAMP(3);

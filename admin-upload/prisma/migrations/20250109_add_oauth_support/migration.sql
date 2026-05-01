-- AlterTable: Add OAuth support to users table
-- Make passwordHash optional for OAuth users
-- Add provider and googleId columns

-- Make password_hash optional
ALTER TABLE "users" ALTER COLUMN "password_hash" DROP NOT NULL;

-- Add provider column with default 'local'
ALTER TABLE "users" ADD COLUMN "provider" TEXT NOT NULL DEFAULT 'local';

-- Add google_id column (unique, optional)
ALTER TABLE "users" ADD COLUMN "google_id" TEXT;
ALTER TABLE "users" ADD CONSTRAINT "users_google_id_key" UNIQUE ("google_id");

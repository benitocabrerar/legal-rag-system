-- Add missing columns that are defined in Prisma schema but don't exist in database

-- Add attachments column to tasks table
ALTER TABLE "tasks" ADD COLUMN "attachments" JSONB;

-- Add discount_amount column to finance_invoices table
ALTER TABLE "finance_invoices" ADD COLUMN "discount_amount" NUMERIC(10,2) NOT NULL DEFAULT 0;

-- Add currency column to finance_payments table
ALTER TABLE "finance_payments" ADD COLUMN "currency" TEXT NOT NULL DEFAULT 'USD';

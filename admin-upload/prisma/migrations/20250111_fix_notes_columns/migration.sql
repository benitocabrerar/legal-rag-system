-- Fix: Add only the missing columns (notes already exists from table creation)

-- Add internal_notes column to finance_invoices (this is the only missing column)
ALTER TABLE "finance_invoices" ADD COLUMN IF NOT EXISTS "internal_notes" TEXT;

-- Add metadata columns to both tables (if not exist)
ALTER TABLE "finance_invoices" ADD COLUMN IF NOT EXISTS "metadata" JSONB;
ALTER TABLE "finance_payments" ADD COLUMN IF NOT EXISTS "metadata" JSONB;

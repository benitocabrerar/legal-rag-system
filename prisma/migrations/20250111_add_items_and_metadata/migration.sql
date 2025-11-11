-- Add missing items and metadata columns to finance tables

-- Add items column to finance_invoices table
ALTER TABLE "finance_invoices" ADD COLUMN "items" JSONB NOT NULL DEFAULT '[]'::jsonb;

-- Add metadata column to finance_payments table
ALTER TABLE "finance_payments" ADD COLUMN "metadata" JSONB;

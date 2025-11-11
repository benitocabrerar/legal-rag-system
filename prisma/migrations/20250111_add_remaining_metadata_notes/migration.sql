-- Add final missing columns to finance tables

-- Add metadata column to finance_invoices table
ALTER TABLE "finance_invoices" ADD COLUMN "metadata" JSONB;

-- Add notes column to finance_payments table
ALTER TABLE "finance_payments" ADD COLUMN "notes" TEXT;

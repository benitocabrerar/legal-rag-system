-- Add missing currency and reference_number columns to finance tables

-- Add currency column to finance_invoices table
ALTER TABLE "finance_invoices" ADD COLUMN "currency" TEXT NOT NULL DEFAULT 'USD';

-- Add reference_number column to finance_payments table
ALTER TABLE "finance_payments" ADD COLUMN "reference_number" TEXT;

-- Add missing client details and pdf_url columns to finance_invoices table

-- Add client_name column (required field with default)
ALTER TABLE "finance_invoices" ADD COLUMN "client_name" TEXT NOT NULL DEFAULT '';

-- Add client_email column (nullable)
ALTER TABLE "finance_invoices" ADD COLUMN "client_email" TEXT;

-- Add client_address column (nullable)
ALTER TABLE "finance_invoices" ADD COLUMN "client_address" TEXT;

-- Add pdf_url column (nullable)
ALTER TABLE "finance_invoices" ADD COLUMN "pdf_url" TEXT;

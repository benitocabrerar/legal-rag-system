-- Add missing notes columns to finance_invoices table

-- Add notes column (nullable)
ALTER TABLE "finance_invoices" ADD COLUMN "notes" TEXT;

-- Add internal_notes column (nullable)
ALTER TABLE "finance_invoices" ADD COLUMN "internal_notes" TEXT;

-- Add missing viewed_date and receipt_number columns to finance tables

-- Add viewed_date column to finance_invoices table
ALTER TABLE "finance_invoices" ADD COLUMN "viewed_date" TIMESTAMP;

-- Add receipt_number column to finance_payments table
ALTER TABLE "finance_payments" ADD COLUMN "receipt_number" TEXT;

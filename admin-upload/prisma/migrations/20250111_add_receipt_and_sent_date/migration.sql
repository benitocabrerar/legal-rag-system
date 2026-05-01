-- Add missing sent_date and receipt_url columns to finance tables

-- Add sent_date column to finance_invoices table
ALTER TABLE "finance_invoices" ADD COLUMN "sent_date" TIMESTAMP;

-- Add receipt_url column to finance_payments table
ALTER TABLE "finance_payments" ADD COLUMN "receipt_url" TEXT;

-- Add missing date columns to finance tables

-- Add paid_date column to finance_invoices table
ALTER TABLE "finance_invoices" ADD COLUMN "paid_date" TIMESTAMP;

-- Add received_date column to finance_payments table
ALTER TABLE "finance_payments" ADD COLUMN "received_date" TIMESTAMP;

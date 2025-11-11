-- Add missing method and total_amount columns to finance tables

-- Add total_amount column to finance_invoices table
ALTER TABLE "finance_invoices" ADD COLUMN "total_amount" NUMERIC(10,2) NOT NULL DEFAULT 0;

-- Create enum type for payment method if it doesn't exist
DO $$ BEGIN
  CREATE TYPE "PaymentMethodType" AS ENUM ('CASH', 'BANK_TRANSFER', 'CREDIT_CARD', 'DEBIT_CARD', 'CHECK', 'PAYPAL', 'STRIPE', 'OTHER');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Add method column to finance_payments table
ALTER TABLE "finance_payments" ADD COLUMN "method" "PaymentMethodType" NOT NULL DEFAULT 'CASH';

/**
 * Payments Hub SDK · Types
 *
 * Tipos TypeScript que describen el contrato del Payments Hub
 * (proyecto Supabase: ufklwvhgueejtlzwzzhi).
 */

export type PaymentProvider =
  | 'paypal'
  | 'stripe'
  | 'bank_transfer'
  | 'cash'
  | 'crypto'
  | 'manual';

export type PaymentType = 'subscription' | 'one_time' | 'addon' | 'topup' | 'refund';

export type PaymentStatus =
  | 'pending'
  | 'processing'
  | 'paid'
  | 'failed'
  | 'refunded'
  | 'reversed'
  | 'disputed';

export type Currency = 'USD' | 'COP' | 'MXN' | 'EUR' | 'PEN' | 'CLP' | 'ARS' | 'BRL';

/** Cuenta bancaria pública (nunca expone número completo, solo last4). */
export interface BankAccount {
  bank_slug: string;
  bank_name: string;
  account_holder: string;
  account_last4: string;
  account_type: string | null;
  currency: Currency;
  country_code: string;
  app_deep_link: string | null;
  web_url: string | null;
  instructions_es: string | null;
  instructions_en: string | null;
  display_order: number;
}

/** Datos mínimos para iniciar un pago. */
export interface CreatePaymentInput {
  /** ISO-3166 alpha-2 user en la app cliente, ej. user-uuid de auth.users.id de la app */
  externalUserId: string;
  /** Email del usuario (para notificación + matching) */
  userEmail: string;
  /** Nombre completo del usuario (opcional, se setea como app_users.full_name) */
  userFullName?: string;
  /** Monto en cents (entero). 1 USD = 100 cents. */
  amountCents: number;
  /** Moneda ISO */
  currency: Currency;
  /** Proveedor de pago */
  provider: PaymentProvider;
  /** Tipo de cobro */
  type: PaymentType;
  /** Metadata libre — útil para guardar plan_code, addon_code, referencia interna */
  metadata?: Record<string, unknown>;
}

/** Resultado de iniciar un pago. */
export interface CreatePaymentResult {
  paymentId: string;
  referenceCode: string;
  amountCents: number;
  amountUsdCents: number;
  currency: Currency;
  fxRate: number;
  status: PaymentStatus;
}

/** Estado actual de un pago. */
export interface PaymentRecord {
  id: string;
  status: PaymentStatus;
  provider: PaymentProvider;
  type: PaymentType;
  amountCents: number;
  currency: Currency;
  amountUsdCents: number | null;
  paidAt: string | null;
  failedAt: string | null;
  failureReason: string | null;
  proofUrl: string | null;
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

/**
 * Payments Hub SDK · Public exports
 *
 * Centro único de pagos multi-app · Supabase ufklwvhgueejtlzwzzhi
 *
 * Uso típico desde una app cliente (ej. Poweria Legal):
 *
 * ```ts
 * import {
 *   listBankAccounts,        // público (frontend)
 *   createPayment,           // server-side
 *   attachReceiptUrl,        // server-side
 *   markPaymentPaid,         // server-side
 *   notifyReceiptUploaded,   // server-side
 * } from '@/lib/payhub-sdk';
 *
 * const banks = await listBankAccounts('poweria-legal');
 *
 * const payment = await createPayment('poweria-legal', {
 *   externalUserId: 'auth-user-uuid',
 *   userEmail: 'cliente@example.com',
 *   amountCents: 4900,         // $49 USD
 *   currency: 'USD',
 *   provider: 'bank_transfer',
 *   type: 'subscription',
 *   metadata: { plan_code: 'pro' },
 * });
 *
 * await attachReceiptUrl(payment.paymentId, 'https://storage.../receipt.jpg');
 * await notifyReceiptUploaded({
 *   appSlug: 'poweria-legal',
 *   paymentId: payment.paymentId,
 *   referenceCode: payment.referenceCode,
 *   proofUrl: 'https://storage.../receipt.jpg',
 *   payerEmail: 'cliente@example.com',
 *   amountCents: 4900,
 *   currency: 'USD',
 *   bankName: banks[0].bank_name,
 *   bankLast4: banks[0].account_last4,
 * });
 * ```
 */

export { payhubPublicClient, payhubAdminClient, resetPayhubClients } from './client.js';
export { listBankAccounts } from './bank-accounts.js';
export {
  createPayment,
  attachReceiptUrl,
  markPaymentPaid,
  markPaymentFailed,
  getPaymentById,
  listPaymentsByUser,
} from './payments.js';
export {
  notifyReceiptUploaded,
  notifyPaymentInstructions,
  notifyPaymentApproved,
} from './notifications.js';

export type {
  PaymentProvider,
  PaymentType,
  PaymentStatus,
  Currency,
  BankAccount,
  CreatePaymentInput,
  CreatePaymentResult,
  PaymentRecord,
} from './types.js';

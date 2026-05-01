/**
 * Payments Hub SDK · Operaciones de pago
 *
 * SOLO server-side (usa adminClient con service_role).
 * Llama wrappers public.payhub_* que delegan al schema payhub vía
 * SECURITY DEFINER. Esto evita exponer el schema payhub al PostgREST
 * pero da acceso controlado a las operaciones esenciales.
 */
import 'server-only';
import { payhubAdminClient } from './client.js';
import type {
  CreatePaymentInput,
  CreatePaymentResult,
  PaymentRecord,
  PaymentStatus,
} from './types.js';

/**
 * Crea un pago en estado 'pending' con FX snapshot.
 * Genera reference_code automático y registra evento 'created'.
 */
export async function createPayment(
  appSlug: string,
  input: CreatePaymentInput
): Promise<CreatePaymentResult> {
  const sb = payhubAdminClient();
  const refCode = generateReferenceCode();
  const enrichedMetadata = {
    ...(input.metadata || {}),
    reference_code: refCode,
  };

  const { data, error } = await sb.rpc('payhub_record_payment', {
    p_app_slug: appSlug,
    p_external_user_id: input.externalUserId,
    p_user_email: input.userEmail.toLowerCase(),
    p_user_full_name: input.userFullName ?? null,
    p_amount_cents: input.amountCents,
    p_currency: input.currency,
    p_provider: input.provider,
    p_type: input.type,
    p_metadata: enrichedMetadata,
  });

  if (error) throw new Error(`payhub: createPayment → ${error.message}`);

  const r = data as Record<string, unknown>;
  return {
    paymentId: String(r.payment_id),
    referenceCode: String(r.reference_code ?? refCode),
    amountCents: Number(r.amount_cents),
    amountUsdCents: Number(r.amount_usd_cents),
    currency: input.currency,
    fxRate: Number(r.fx_rate),
    status: r.status as PaymentStatus,
  };
}

/** Adjunta URL del comprobante a un pago pendiente. */
export async function attachReceiptUrl(paymentId: string, proofUrl: string): Promise<void> {
  const sb = payhubAdminClient();
  const { error } = await sb.rpc('payhub_attach_receipt', {
    p_payment_id: paymentId,
    p_proof_url: proofUrl,
  });
  if (error) throw new Error(`payhub: attachReceiptUrl → ${error.message}`);
}

/** Admin aprueba un pago manual (transferencia / efectivo). */
export async function markPaymentPaid(
  paymentId: string,
  approverUserId: string,
  _providerPaymentId?: string
): Promise<void> {
  const sb = payhubAdminClient();
  const { error } = await sb.rpc('payhub_approve_manual_payment', {
    p_payment_id: paymentId,
    p_admin_id: approverUserId,
  });
  if (error) throw new Error(`payhub: markPaymentPaid → ${error.message}`);
}

/** Marca un pago como fallido (vía service_role directo). */
export async function markPaymentFailed(
  paymentId: string,
  reason: string
): Promise<void> {
  const sb = payhubAdminClient();
  // Para esto hace falta acceso directo al schema payhub (service_role bypass RLS).
  // Se usa una RPC inline construida con .rpc() o bien via fetch directo.
  // Simplificación: emitimos un UPDATE via wrapper futuro si es necesario.
  // Por ahora exponemos via .rpc cuando agreguemos public.payhub_mark_failed.
  // Como fallback, llamamos a la función payhub.* sin DB schema (no funciona desde el SDK público).
  // En la práctica, lo correcto es agregar un wrapper. Lo dejo TODO con throw.
  throw new Error(
    `payhub: markPaymentFailed pendiente — agregar public.payhub_mark_failed wrapper. paymentId=${paymentId} reason=${reason}`
  );
}

/** Lee un pago por id. */
export async function getPaymentById(paymentId: string): Promise<PaymentRecord | null> {
  const sb = payhubAdminClient();
  const { data, error } = await sb.rpc('payhub_get_payment', { p_payment_id: paymentId });
  if (error) throw new Error(`payhub: getPaymentById → ${error.message}`);
  if (!data) return null;
  const d = data as Record<string, unknown>;
  return {
    id: String(d.id),
    status: d.status as PaymentStatus,
    provider: d.provider as PaymentRecord['provider'],
    type: d.type as PaymentRecord['type'],
    amountCents: Number(d.amount_cents),
    currency: d.currency as PaymentRecord['currency'],
    amountUsdCents: d.amount_usd_cents != null ? Number(d.amount_usd_cents) : null,
    paidAt: d.paid_at as string | null,
    failedAt: d.failed_at as string | null,
    failureReason: d.failure_reason as string | null,
    proofUrl: d.proof_url as string | null,
    metadata: (d.metadata as Record<string, unknown>) || {},
    createdAt: d.created_at as string,
    updatedAt: d.updated_at as string,
  };
}

/** Lista pagos de un usuario (server-side; requiere service_role). */
export async function listPaymentsByUser(
  _appSlug: string,
  _externalUserId: string,
  _limit = 25
): Promise<PaymentRecord[]> {
  // Pendiente wrapper public.payhub_list_payments_by_user
  throw new Error('payhub: listPaymentsByUser pendiente — agregar wrapper');
}

function generateReferenceCode(prefix = 'PAY'): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let s = '';
  for (let i = 0; i < 10; i++) s += chars[Math.floor(Math.random() * chars.length)];
  return `${prefix}-${s}`;
}

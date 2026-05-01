/**
 * Payments Hub SDK · Notificaciones por email
 *
 * Notifica al `payment_notification_email` configurado por app cuando:
 *  - Se crea un pago pendiente (instrucciones de transferencia)
 *  - Se sube un comprobante (admin debe aprobar)
 *  - Se aprueba o rechaza un pago
 *
 * Usa Resend (RESEND_API_KEY del backend).
 */
import 'server-only';
import { payhubAdminClient } from './client.js';

const RESEND_KEY = process.env.RESEND_API_KEY;
const RESEND_FROM = process.env.RESEND_FROM || 'Payments Hub <onboarding@resend.dev>';

interface ResendResult {
  sent: boolean;
  error?: string;
  id?: string;
}

function escape(s: unknown): string {
  if (s === undefined || s === null) return '';
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** Resuelve el email de notificación configurado en payhub.apps. */
async function getNotificationEmail(appSlug: string): Promise<string | null> {
  const sb = payhubAdminClient();
  const { data, error } = await sb.rpc('payhub_get_notification_email', { p_app_slug: appSlug });
  if (error) return null;
  return (data as string) || null;
}

async function sendResend(opts: {
  to: string;
  subject: string;
  html: string;
  replyTo?: string;
}): Promise<ResendResult> {
  if (!RESEND_KEY) return { sent: false, error: 'RESEND_API_KEY no configurada' };
  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${RESEND_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: RESEND_FROM,
        to: [opts.to],
        reply_to: opts.replyTo,
        subject: opts.subject,
        html: opts.html,
      }),
    });
    if (!res.ok) {
      const text = await res.text();
      return { sent: false, error: `Resend ${res.status}: ${text.slice(0, 240)}` };
    }
    const data = await res.json().catch(() => ({}));
    return { sent: true, id: data?.id };
  } catch (err) {
    return { sent: false, error: (err as Error).message };
  }
}

interface NotifyReceiptUploadedInput {
  appSlug: string;
  paymentId: string;
  referenceCode: string;
  proofUrl: string;
  payerEmail: string;
  payerName?: string;
  amountCents: number;
  currency: string;
  bankName?: string;
  bankLast4?: string;
}

/**
 * Notifica al admin de la app que un usuario subió comprobante de transferencia.
 * Email destino: payhub.apps.payment_notification_email (default: francisecuador1@gmail.com).
 */
export async function notifyReceiptUploaded(input: NotifyReceiptUploadedInput): Promise<ResendResult> {
  const to = await getNotificationEmail(input.appSlug);
  if (!to) return { sent: false, error: `App '${input.appSlug}' no tiene payment_notification_email` };

  const amountFmt = (input.amountCents / 100).toFixed(2);
  const html = `
    <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Inter,sans-serif;color:#0f172a;max-width:560px">
      <h2 style="color:#4f46e5;margin:0 0 8px">📥 Comprobante de pago recibido</h2>
      <p style="color:#64748b;margin:0 0 20px">App: <b>${escape(input.appSlug)}</b></p>

      <div style="background:#fef3c7;border-left:4px solid #d97706;padding:14px 18px;border-radius:0 8px 8px 0;margin-bottom:20px">
        <b>⚠️ Acción requerida:</b> Verificar la transferencia y aprobar el pago.
      </div>

      <table cellpadding="8" style="border-collapse:collapse;font-size:14px;width:100%;border:1px solid #e2e8f0;border-radius:8px;overflow:hidden">
        <tr style="background:#f8fafc"><td><b>Referencia</b></td><td><code>${escape(input.referenceCode)}</code></td></tr>
        <tr><td><b>Monto</b></td><td>${escape(input.currency)} ${escape(amountFmt)}</td></tr>
        <tr style="background:#f8fafc"><td><b>Pagador</b></td><td>${escape(input.payerName || '—')} &lt;${escape(input.payerEmail)}&gt;</td></tr>
        ${input.bankName ? `<tr><td><b>Banco destino</b></td><td>${escape(input.bankName)}${input.bankLast4 ? ` ····${escape(input.bankLast4)}` : ''}</td></tr>` : ''}
        <tr style="background:#f8fafc"><td><b>Comprobante</b></td><td><a href="${escape(input.proofUrl)}" target="_blank">Ver archivo</a></td></tr>
        <tr><td><b>payment_id</b></td><td><code>${escape(input.paymentId)}</code></td></tr>
      </table>

      <p style="color:#64748b;font-size:12px;margin-top:24px">
        Aprobá o rechazá este pago desde el dashboard del Payments Hub.<br/>
        Si fue una transferencia errada, marcá el pago como <code>failed</code>.
      </p>
    </div>
  `;
  return sendResend({
    to,
    subject: `🏦 Comprobante: ${input.referenceCode} · ${input.currency} ${amountFmt}`,
    html,
    replyTo: input.payerEmail,
  });
}

interface NotifyPaymentInstructionsInput {
  appSlug: string;
  paymentId: string;
  referenceCode: string;
  payerEmail: string;
  payerName?: string;
  amountCents: number;
  currency: string;
}

/**
 * Envía instrucciones de pago al USUARIO (con datos de la cuenta bancaria activa).
 */
export async function notifyPaymentInstructions(input: NotifyPaymentInstructionsInput): Promise<ResendResult> {
  // Adjuntamos primer banco activo
  const sb = payhubAdminClient();
  const { data: banks } = await sb.rpc('payhub_list_bank_accounts', { p_app_slug: input.appSlug });
  const bank = banks?.[0];

  const adminEmail = await getNotificationEmail(input.appSlug);
  const amountFmt = (input.amountCents / 100).toFixed(2);

  const html = `
    <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Inter,sans-serif;color:#0f172a;max-width:560px">
      <h2 style="color:#4f46e5;margin:0 0 8px">Instrucciones de pago</h2>
      <p style="color:#64748b;margin:0 0 20px">Hola${input.payerName ? ` ${escape(input.payerName.split(' ')[0])}` : ''},
      tu pago está pendiente. Sigue estos pasos:</p>

      <ol style="font-size:14px;line-height:1.7;padding-left:18px">
        <li>Realizá una transferencia a la siguiente cuenta:
          ${
            bank
              ? `<table cellpadding="6" style="border-collapse:collapse;margin:12px 0;font-size:13px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px">
                  <tr><td><b>Banco</b></td><td>${escape(bank.bank_name)}</td></tr>
                  <tr><td><b>Titular</b></td><td>${escape(bank.account_holder)}</td></tr>
                  <tr><td><b>Tipo</b></td><td>${escape(bank.account_type || '—')}</td></tr>
                  <tr><td><b>Número de cuenta</b></td><td><code>${escape(bank.account_last4 ? `····${bank.account_last4}` : '—')}</code> (consultar última cifra completa al admin)</td></tr>
                  <tr><td><b>Moneda</b></td><td>${escape(bank.currency)}</td></tr>
                  <tr><td><b>País</b></td><td>${escape(bank.country_code)}</td></tr>
                </table>`
              : '<i>Sin cuentas bancarias configuradas.</i>'
          }
        </li>
        <li>Indicá la <b>referencia</b> en el concepto: <code>${escape(input.referenceCode)}</code></li>
        <li>Enviá el comprobante a <a href="mailto:${escape(adminEmail || 'admin@example.com')}">${escape(adminEmail || 'admin@example.com')}</a></li>
      </ol>

      <p style="background:#eef2ff;border-left:4px solid #4f46e5;padding:12px 16px;border-radius:0 8px 8px 0;font-size:13px">
        <b>Monto a transferir:</b> ${escape(input.currency)} ${escape(amountFmt)}<br/>
        <b>Referencia:</b> <code>${escape(input.referenceCode)}</code>
      </p>

      <p style="color:#64748b;font-size:12px;margin-top:24px">
        Una vez verificado el comprobante, recibirás un email de confirmación
        y se activará tu plan/producto. Tiempo estimado: 24h hábiles.
      </p>
    </div>
  `;

  return sendResend({
    to: input.payerEmail,
    subject: `💳 Instrucciones de pago · ${input.referenceCode}`,
    html,
  });
}

interface NotifyPaymentApprovedInput {
  paymentId: string;
  referenceCode: string;
  payerEmail: string;
  amountCents: number;
  currency: string;
}

/** Notifica al usuario que su pago fue aprobado. */
export async function notifyPaymentApproved(input: NotifyPaymentApprovedInput): Promise<ResendResult> {
  const amountFmt = (input.amountCents / 100).toFixed(2);
  const html = `
    <div style="font-family:-apple-system,'Segoe UI',Inter,sans-serif;color:#0f172a;max-width:520px">
      <h2 style="color:#059669">✅ Pago aprobado</h2>
      <p>Tu pago de <b>${escape(input.currency)} ${escape(amountFmt)}</b>
      con referencia <code>${escape(input.referenceCode)}</code> fue verificado correctamente.</p>
      <p style="color:#64748b;font-size:12px">payment_id: <code>${escape(input.paymentId)}</code></p>
    </div>
  `;
  return sendResend({
    to: input.payerEmail,
    subject: `✅ Pago aprobado · ${input.referenceCode}`,
    html,
  });
}

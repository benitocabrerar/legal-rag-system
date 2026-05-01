/**
 * Payments Hub bridge — Poweria Legal backend ↔ Hub Supabase
 *
 * Expone endpoints REST que llaman al SDK del payhub (server-side, con
 * service_role). El frontend de Poweria sólo necesita su propio JWT.
 *
 * Endpoints:
 *   GET  /api/v1/payhub/bank-accounts        → cuentas bancarias activas
 *   GET  /api/v1/payhub/plans                → planes activos (?cycle=monthly|yearly)
 *   POST /api/v1/payhub/payments             → crear pago (auth requerido)
 *   GET  /api/v1/payhub/payments/:id         → estado de un pago
 *   POST /api/v1/payhub/payments/:id/receipt → subir comprobante (multipart)
 */
import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { createClient } from '@supabase/supabase-js';

const PAYHUB_URL = process.env.PAYHUB_SUPABASE_URL;
const PAYHUB_KEY = process.env.PAYHUB_SUPABASE_SERVICE_ROLE_KEY;
const APP_SLUG = process.env.PAYHUB_APP_SLUG || 'poweria-legal';
const RESEND_KEY = process.env.RESEND_API_KEY;
const RESEND_FROM = process.env.RESEND_FROM || 'Payments Hub <onboarding@resend.dev>';
const BUCKET = 'payhub-receipts';

function payhub() {
  if (!PAYHUB_URL || !PAYHUB_KEY) {
    throw new Error('PAYHUB_SUPABASE_URL / PAYHUB_SUPABASE_SERVICE_ROLE_KEY no configurados');
  }
  return createClient(PAYHUB_URL, PAYHUB_KEY, { auth: { persistSession: false } });
}

function escape(s: unknown): string {
  if (s === undefined || s === null) return '';
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

async function sendResend(opts: { to: string; subject: string; html: string; replyTo?: string }) {
  if (!RESEND_KEY) return { sent: false, error: 'RESEND_API_KEY missing' };
  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${RESEND_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: RESEND_FROM,
        to: [opts.to],
        reply_to: opts.replyTo,
        subject: opts.subject,
        html: opts.html,
      }),
    });
    if (!res.ok) return { sent: false, error: `Resend ${res.status}` };
    return { sent: true };
  } catch (e: any) {
    return { sent: false, error: e?.message };
  }
}

interface CreatePaymentBody {
  planCode?: string;       // del catálogo payhub.plans
  addonCode?: string;      // del catálogo payhub.addons
  customAmountCents?: number;
  currency?: string;
  provider?: 'paypal' | 'stripe' | 'bank_transfer' | 'cash';
  type?: 'subscription' | 'one_time' | 'addon' | 'topup';
  metadata?: Record<string, unknown>;
}

export async function payhubRoutes(app: FastifyInstance) {
  // ============ GET /payhub/bank-accounts ============
  app.get('/payhub/bank-accounts', async (request, reply) => {
    try {
      const sb = payhub();
      const { data, error } = await sb.rpc('payhub_list_bank_accounts', { p_app_slug: APP_SLUG });
      if (error) throw error;
      return reply.send({ bankAccounts: data || [] });
    } catch (err: any) {
      request.log.error({ err }, 'payhub list bank-accounts failed');
      return reply.code(500).send({ error: err?.message || 'failed' });
    }
  });

  // ============ GET /payhub/plans ============
  app.get('/payhub/plans', async (request, reply) => {
    const cycle = (request.query as any)?.cycle ?? null;
    try {
      const sb = payhub();
      const { data, error } = await sb.rpc('payhub_list_plans', {
        p_app_slug: APP_SLUG,
        p_billing_cycle: cycle,
      });
      if (error) throw error;
      return reply.send({ plans: data || [] });
    } catch (err: any) {
      request.log.error({ err }, 'payhub list plans failed');
      return reply.code(500).send({ error: err?.message || 'failed' });
    }
  });

  // ============ POST /payhub/payments ============
  app.post('/payhub/payments', { onRequest: [app.authenticate] }, async (request, reply) => {
    const userId = (request.user as any)?.id as string;
    const userEmail = (request.user as any)?.email as string;
    const userName = (request.user as any)?.name as string | undefined;
    if (!userId || !userEmail) return reply.code(401).send({ error: 'Unauthorized' });

    const body = request.body as CreatePaymentBody;
    if (!body || (!body.planCode && !body.addonCode && !body.customAmountCents)) {
      return reply.code(400).send({ error: 'Falta planCode, addonCode o customAmountCents' });
    }

    try {
      const sb = payhub();

      // Resolver monto desde plan/addon
      let amountCents: number | null = body.customAmountCents ?? null;
      let currency: string = body.currency || 'USD';
      let label = '';
      const metadata: Record<string, unknown> = { ...(body.metadata || {}) };

      if (body.planCode) {
        const { data: plans } = await sb.rpc('payhub_list_plans', {
          p_app_slug: APP_SLUG,
          p_billing_cycle: null,
        });
        const plan = (plans as any[])?.find((p) => p.code === body.planCode);
        if (!plan) return reply.code(404).send({ error: `Plan '${body.planCode}' no existe` });
        amountCents = plan.price_cents;
        currency = plan.currency;
        label = plan.name;
        metadata.plan_code = plan.code;
        metadata.billing_cycle = plan.billing_cycle;
      }

      if (amountCents == null) {
        return reply.code(400).send({ error: 'No se pudo resolver el monto' });
      }

      const provider = body.provider || 'bank_transfer';
      const type = body.type || (body.planCode ? 'subscription' : 'one_time');

      const { data: payment, error } = await sb.rpc('payhub_record_payment', {
        p_app_slug: APP_SLUG,
        p_external_user_id: userId,
        p_user_email: userEmail,
        p_user_full_name: userName ?? null,
        p_amount_cents: amountCents,
        p_currency: currency,
        p_provider: provider,
        p_type: type,
        p_metadata: metadata,
      });
      if (error) throw error;

      // Mandar email de instrucciones al USUARIO con datos del banco
      const { data: banks } = await sb.rpc('payhub_list_bank_accounts', { p_app_slug: APP_SLUG });
      const bank = (banks as any[])?.[0];
      const adminEmail = await sb
        .rpc('payhub_get_notification_email', { p_app_slug: APP_SLUG })
        .then((r: any) => r.data as string | null);

      if (bank && provider === 'bank_transfer') {
        const amountFmt = (amountCents / 100).toFixed(2);
        const html = `
          <div style="font-family:-apple-system,'Segoe UI',sans-serif;color:#0f172a;max-width:560px">
            <h2 style="color:#4f46e5">Instrucciones de pago — ${escape(label)}</h2>
            <p>Hola, tu pago de <b>${escape(currency)} ${escape(amountFmt)}</b> está pendiente.</p>
            <table cellpadding="6" style="border-collapse:collapse;background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;font-size:14px">
              <tr><td><b>Banco</b></td><td>${escape(bank.bank_name)}</td></tr>
              <tr><td><b>Titular</b></td><td>${escape(bank.account_holder)}</td></tr>
              <tr><td><b>Tipo</b></td><td>${escape(bank.account_type || '—')}</td></tr>
              <tr><td><b>Cuenta</b></td><td><code>····${escape(bank.account_last4)}</code> (último 4 — número completo: <a href="${escape(bank.app_deep_link || '#')}">app del banco</a>)</td></tr>
              <tr><td><b>Moneda</b></td><td>${escape(bank.currency)}</td></tr>
            </table>
            <p style="background:#eef2ff;border-left:4px solid #4f46e5;padding:12px;border-radius:0 8px 8px 0">
              <b>Referencia:</b> <code>${escape((payment as any).reference_code || (payment as any).payment_id)}</code><br/>
              <b>Total:</b> ${escape(currency)} ${escape(amountFmt)}
            </p>
            <p style="color:#64748b;font-size:13px">
              Después de transferir, sube el comprobante en la app o envíalo a
              <a href="mailto:${escape(adminEmail || 'admin')}">${escape(adminEmail || 'admin@example.com')}</a>.
              Tu plan se activa cuando verifiquemos (24h hábiles).
            </p>
          </div>
        `;
        await sendResend({
          to: userEmail,
          subject: `💳 Instrucciones de pago — ${(payment as any).reference_code || ''}`,
          html,
        });
      }

      return reply.send({ payment });
    } catch (err: any) {
      request.log.error({ err }, 'payhub create payment failed');
      return reply.code(500).send({ error: err?.message || 'failed' });
    }
  });

  // ============ GET /payhub/my-payments ============
  // Historial de pagos del usuario autenticado (para /account/billing)
  app.get('/payhub/my-payments', { onRequest: [app.authenticate] }, async (request, reply) => {
    const userId = (request.user as any)?.id as string;
    if (!userId) return reply.code(401).send({ error: 'Unauthorized' });
    try {
      const sb = payhub();
      const { data, error } = await sb.rpc('payhub_list_user_payments', {
        p_app_slug: APP_SLUG,
        p_external_user_id: userId,
        p_limit: 50,
      });
      if (error) throw error;
      return reply.send({ payments: data || [] });
    } catch (err: any) {
      request.log.error({ err }, 'payhub list my-payments failed');
      return reply.code(500).send({ error: err?.message || 'failed' });
    }
  });

  // ============ GET /payhub/payments/:id ============
  app.get('/payhub/payments/:id', { onRequest: [app.authenticate] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    try {
      const sb = payhub();
      const { data, error } = await sb.rpc('payhub_get_payment', { p_payment_id: id });
      if (error) throw error;
      if (!data) return reply.code(404).send({ error: 'Payment not found' });
      return reply.send({ payment: data });
    } catch (err: any) {
      request.log.error({ err }, 'payhub get payment failed');
      return reply.code(500).send({ error: err?.message || 'failed' });
    }
  });

  // ============ POST /payhub/payments/:id/receipt (multipart) ============
  app.post('/payhub/payments/:id/receipt', { onRequest: [app.authenticate] }, async (request, reply) => {
    const { id: paymentId } = request.params as { id: string };
    const userId = (request.user as any)?.id as string;
    const userEmail = (request.user as any)?.email as string;

    if (!request.isMultipart()) return reply.code(400).send({ error: 'Expected multipart/form-data' });

    try {
      const sb = payhub();
      let fileBuffer: Buffer | null = null;
      let filename = 'receipt.bin';
      let mimeType = 'application/octet-stream';
      const fields: Record<string, string> = {};

      for await (const part of (request as any).parts()) {
        if (part.type === 'file') {
          fileBuffer = await part.toBuffer();
          filename = part.filename || filename;
          mimeType = part.mimetype || mimeType;
        } else {
          fields[part.fieldname] = part.value;
        }
      }
      if (!fileBuffer) return reply.code(400).send({ error: 'No file uploaded' });

      // Subir al bucket payhub-receipts
      const ext = filename.split('.').pop() || 'bin';
      const objectKey = `${APP_SLUG}/${paymentId}/${Date.now()}-${userId.slice(0, 8)}.${ext}`;
      const { error: upErr } = await sb.storage
        .from(BUCKET)
        .upload(objectKey, fileBuffer, { contentType: mimeType, upsert: false });
      if (upErr) throw upErr;
      const { data: pub } = sb.storage.from(BUCKET).getPublicUrl(objectKey);
      const proofUrl = pub.publicUrl;

      // Adjuntar URL al pago
      const { error: attachErr } = await sb.rpc('payhub_attach_receipt', {
        p_payment_id: paymentId,
        p_proof_url: proofUrl,
      });
      if (attachErr) throw attachErr;

      // Notificar al admin (francisecuador1@gmail.com)
      const adminEmail = await sb
        .rpc('payhub_get_notification_email', { p_app_slug: APP_SLUG })
        .then((r: any) => r.data as string | null);
      const { data: payment } = await sb.rpc('payhub_get_payment', { p_payment_id: paymentId });
      const ref = (payment as any)?.metadata?.reference_code || paymentId;
      const amountCents = (payment as any)?.amount_cents || 0;
      const currency = (payment as any)?.currency || 'USD';
      const amountFmt = (amountCents / 100).toFixed(2);

      if (adminEmail) {
        const html = `
          <div style="font-family:-apple-system,'Segoe UI',sans-serif;color:#0f172a;max-width:560px">
            <h2 style="color:#4f46e5">📥 Comprobante recibido</h2>
            <p style="color:#64748b">App: <b>${escape(APP_SLUG)}</b></p>
            <div style="background:#fef3c7;border-left:4px solid #d97706;padding:12px;border-radius:0 8px 8px 0">
              ⚠️ <b>Acción requerida:</b> verificar transferencia y aprobar el pago.
            </div>
            <table cellpadding="6" style="border-collapse:collapse;font-size:14px;margin-top:14px">
              <tr><td><b>Referencia</b></td><td><code>${escape(ref)}</code></td></tr>
              <tr><td><b>Monto</b></td><td>${escape(currency)} ${escape(amountFmt)}</td></tr>
              <tr><td><b>Pagador</b></td><td>${escape(userEmail)}</td></tr>
              <tr><td><b>Comprobante</b></td><td><a href="${escape(proofUrl)}" target="_blank">Ver archivo</a></td></tr>
              <tr><td><b>payment_id</b></td><td><code>${escape(paymentId)}</code></td></tr>
              ${fields.bankName ? `<tr><td><b>Banco origen</b></td><td>${escape(fields.bankName)}</td></tr>` : ''}
              ${fields.referenceNumber ? `<tr><td><b>Ref. transferencia</b></td><td>${escape(fields.referenceNumber)}</td></tr>` : ''}
              ${fields.depositDate ? `<tr><td><b>Fecha depósito</b></td><td>${escape(fields.depositDate)}</td></tr>` : ''}
              ${fields.notes ? `<tr><td><b>Notas</b></td><td>${escape(fields.notes)}</td></tr>` : ''}
            </table>
          </div>
        `;
        await sendResend({
          to: adminEmail,
          subject: `🏦 Comprobante: ${ref} · ${currency} ${amountFmt}`,
          html,
          replyTo: userEmail,
        });
      }

      return reply.send({ success: true, proofUrl, paymentId });
    } catch (err: any) {
      request.log.error({ err }, 'payhub upload receipt failed');
      return reply.code(500).send({ error: err?.message || 'failed' });
    }
  });
}

export default payhubRoutes;

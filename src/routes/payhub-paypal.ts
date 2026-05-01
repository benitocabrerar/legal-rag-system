/**
 * Payments Hub · PayPal endpoints
 *
 *   POST /api/v1/payhub/paypal/orders/init       (auth)
 *   POST /api/v1/payhub/paypal/orders/:oid/capture (auth)
 *   POST /api/v1/payhub/webhooks/paypal          (público, signature verified)
 */
import type { FastifyInstance, FastifyRequest } from 'fastify';
import { createClient } from '@supabase/supabase-js';
import { createOrder, captureOrder, getOrder, verifyWebhookSignature } from '../lib/payhub-paypal.js';

const PAYHUB_URL = process.env.PAYHUB_SUPABASE_URL;
const PAYHUB_KEY = process.env.PAYHUB_SUPABASE_SERVICE_ROLE_KEY;
const APP_SLUG = process.env.PAYHUB_APP_SLUG || 'poweria-legal';
const SITE_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
const RESEND_KEY = process.env.RESEND_API_KEY;
const RESEND_FROM = process.env.RESEND_FROM || 'Payments Hub <onboarding@resend.dev>';

function payhub() {
  if (!PAYHUB_URL || !PAYHUB_KEY) throw new Error('PAYHUB_SUPABASE_* no configurados');
  return createClient(PAYHUB_URL, PAYHUB_KEY, { auth: { persistSession: false } });
}

function escape(s: unknown) {
  if (s == null) return '';
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

async function notifyEmail(to: string, subject: string, html: string) {
  if (!RESEND_KEY || !to) return;
  try {
    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${RESEND_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: RESEND_FROM, to: [to], subject, html }),
    });
  } catch { /* swallow */ }
}

export async function payhubPaypalRoutes(app: FastifyInstance) {
  // ============ POST /payhub/paypal/orders/init ============
  // Body: { planCode?: string, amountCents?: number, currency?: string, paymentId?: string }
  // Si paymentId NO se manda, crea uno nuevo en el Hub primero.
  app.post('/payhub/paypal/orders/init', { onRequest: [app.authenticate] }, async (request, reply) => {
    const userId = (request.user as any)?.id as string;
    const userEmail = (request.user as any)?.email as string;
    const userName = (request.user as any)?.name as string | undefined;
    if (!userId || !userEmail) return reply.code(401).send({ error: 'Unauthorized' });

    const body = request.body as {
      planCode?: string;
      addonCode?: string;
      amountCents?: number;
      currency?: string;
      paymentId?: string;
    };

    try {
      const sb = payhub();
      let paymentId = body.paymentId;
      let amountCents = body.amountCents;
      let currency = body.currency || 'USD';
      let label = 'Poweria Legal';

      // Si no hay paymentId, lo creamos vía record_payment con provider=paypal
      if (!paymentId) {
        if (body.planCode) {
          const { data: plans } = await sb.rpc('payhub_list_plans', { p_app_slug: APP_SLUG, p_billing_cycle: null });
          const plan = (plans as any[])?.find((p) => p.code === body.planCode);
          if (!plan) return reply.code(404).send({ error: `Plan '${body.planCode}' no existe` });
          amountCents = plan.price_cents;
          currency = plan.currency;
          label = plan.name;
        }
        if (!amountCents) return reply.code(400).send({ error: 'Falta amountCents o planCode' });

        const { data: created, error: cErr } = await sb.rpc('payhub_record_payment', {
          p_app_slug: APP_SLUG,
          p_external_user_id: userId,
          p_user_email: userEmail,
          p_user_full_name: userName ?? null,
          p_amount_cents: amountCents,
          p_currency: currency,
          p_provider: 'paypal',
          p_type: body.planCode ? 'subscription' : 'one_time',
          p_metadata: {
            plan_code: body.planCode,
            label,
            origin: 'paypal_init',
          },
        });
        if (cErr) throw cErr;
        paymentId = (created as any).payment_id;
      } else {
        const { data: pay } = await sb.rpc('payhub_get_payment', { p_payment_id: paymentId });
        if (!pay) return reply.code(404).send({ error: 'Payment no encontrado' });
        amountCents = (pay as any).amount_cents;
        currency = (pay as any).currency;
        label = (pay as any).metadata?.label || 'Poweria Legal';
      }

      // Crear Order en PayPal
      const order = await createOrder({
        amount: (amountCents! / 100).toFixed(2),
        currency,
        description: `${label} · ref ${paymentId}`,
        referenceId: paymentId!,
        returnUrl: `${SITE_URL}/payment/${paymentId}?paypal=success`,
        cancelUrl: `${SITE_URL}/payment/${paymentId}?paypal=cancel`,
        payerEmail: userEmail,
      });

      // Guardar el orderId en payments.metadata
      await sb.from('payments').update({
        provider_payment_id: order.id,
        metadata: { paypal_order_id: order.id, label },
        updated_at: new Date().toISOString(),
      }).eq('id', paymentId!);

      const approveLink = order.links.find((l) => l.rel === 'approve' || l.rel === 'payer-action')?.href;

      return reply.send({
        paymentId,
        orderId: order.id,
        approveUrl: approveLink,
        status: order.status,
      });
    } catch (err: any) {
      request.log.error({ err }, 'paypal/orders/init failed');
      return reply.code(500).send({ error: err?.message || 'failed' });
    }
  });

  // ============ POST /payhub/paypal/orders/:orderId/capture ============
  app.post('/payhub/paypal/orders/:orderId/capture', { onRequest: [app.authenticate] }, async (request, reply) => {
    const { orderId } = request.params as { orderId: string };
    try {
      const sb = payhub();
      const captured = await captureOrder(orderId);

      // Encontrar el payment por provider_payment_id
      const { data: paymentRow } = await sb
        .from('payments')
        .select('id, app_user_id, currency, amount_cents, metadata')
        .eq('provider_payment_id', orderId)
        .single();
      if (!paymentRow) return reply.code(404).send({ error: 'Payment no encontrado para este order' });

      const isCompleted = captured.status === 'COMPLETED';
      if (isCompleted) {
        await sb.from('payments').update({
          status: 'paid',
          paid_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          metadata: {
            ...(paymentRow.metadata || {}),
            paypal_order_id: orderId,
            paypal_capture: captured,
            payer_email: captured.payer?.email_address,
          },
        }).eq('id', paymentRow.id);

        await sb.from('payment_events').insert({
          payment_id: paymentRow.id,
          event_type: 'paypal_captured',
          payload: { order_id: orderId, status: captured.status, payer: captured.payer },
        });

        // Email confirmación al pagador
        const payerEmail = captured.payer?.email_address;
        if (payerEmail) {
          const amountFmt = ((paymentRow as any).amount_cents / 100).toFixed(2);
          await notifyEmail(
            payerEmail,
            `✅ Pago aprobado · ${orderId.slice(0, 8)}`,
            `<div style="font-family:-apple-system,'Segoe UI',sans-serif;color:#0f172a;max-width:520px">
              <h2 style="color:#059669">✅ Pago confirmado</h2>
              <p>Recibimos tu pago de <b>${escape((paymentRow as any).currency)} ${escape(amountFmt)}</b> vía PayPal.</p>
              <p style="color:#64748b;font-size:12px">Order ID: <code>${escape(orderId)}</code></p>
            </div>`
          );
        }
      } else {
        await sb.from('payment_events').insert({
          payment_id: paymentRow.id,
          event_type: 'paypal_capture_pending',
          payload: { order_id: orderId, status: captured.status },
        });
      }

      return reply.send({
        success: isCompleted,
        status: captured.status,
        paymentId: paymentRow.id,
        orderId,
      });
    } catch (err: any) {
      request.log.error({ err }, 'paypal capture failed');
      return reply.code(500).send({ error: err?.message || 'failed' });
    }
  });

  // ============ GET /payhub/paypal/orders/:orderId ============ (debug)
  app.get('/payhub/paypal/orders/:orderId', { onRequest: [app.authenticate] }, async (request, reply) => {
    const { orderId } = request.params as { orderId: string };
    try {
      const order = await getOrder(orderId);
      return reply.send({ order });
    } catch (err: any) {
      return reply.code(500).send({ error: err?.message || 'failed' });
    }
  });

  // ============ POST /payhub/webhooks/paypal ============ (público, signature verify)
  app.post('/payhub/webhooks/paypal', async (request: FastifyRequest, reply) => {
    const headers = request.headers as Record<string, string | undefined>;
    const body = request.body;

    try {
      // 1. Verificar firma
      const verified = await verifyWebhookSignature({
        'paypal-auth-algo':       headers['paypal-auth-algo'],
        'paypal-cert-url':        headers['paypal-cert-url'],
        'paypal-transmission-id': headers['paypal-transmission-id'],
        'paypal-transmission-sig':headers['paypal-transmission-sig'],
        'paypal-transmission-time': headers['paypal-transmission-time'],
      }, body);

      if (!verified) {
        request.log.warn({ headers }, 'paypal webhook signature INVALID');
        return reply.code(401).send({ error: 'Invalid signature' });
      }

      const evt = body as { id: string; event_type: string; resource: any };
      const sb = payhub();

      // 2. Idempotencia: insertar en webhooks_log con UNIQUE(provider,event_id)
      const { data: appRow } = await sb.from('apps').select('id').eq('slug', APP_SLUG).single();
      const { data: ingest } = await sb.rpc('ingest_webhook' as any, {
        p_app_id: appRow?.id,
        p_provider: 'paypal',
        p_event_id: evt.id,
        p_event_type: evt.event_type,
        p_payload: evt,
        p_signature: headers['paypal-transmission-sig'] ?? null,
      });
      if (!ingest) {
        // Ya procesado antes (UNIQUE conflict)
        return reply.send({ ok: true, deduped: true });
      }

      // 3. Procesar tipos de eventos relevantes
      if (evt.event_type === 'CHECKOUT.ORDER.APPROVED' || evt.event_type === 'PAYMENT.CAPTURE.COMPLETED') {
        const orderId = evt.resource?.supplementary_data?.related_ids?.order_id || evt.resource?.id;
        if (orderId) {
          const { data: payment } = await sb
            .from('payments')
            .select('id, status, app_user_id, amount_cents, currency')
            .eq('provider_payment_id', orderId)
            .maybeSingle();
          if (payment && payment.status !== 'paid') {
            await sb.from('payments').update({
              status: 'paid',
              paid_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            }).eq('id', payment.id);
            await sb.from('payment_events').insert({
              payment_id: payment.id,
              event_type: `paypal_webhook_${evt.event_type.toLowerCase()}`,
              payload: evt.resource,
            });
          }
        }
      }

      if (evt.event_type === 'PAYMENT.CAPTURE.DENIED' || evt.event_type === 'CHECKOUT.ORDER.VOIDED') {
        const orderId = evt.resource?.supplementary_data?.related_ids?.order_id || evt.resource?.id;
        if (orderId) {
          const { data: payment } = await sb
            .from('payments')
            .select('id, status')
            .eq('provider_payment_id', orderId)
            .maybeSingle();
          if (payment && payment.status === 'pending') {
            await sb.from('payments').update({
              status: 'failed',
              failed_at: new Date().toISOString(),
              failure_reason: `PayPal: ${evt.event_type}`,
              updated_at: new Date().toISOString(),
            }).eq('id', payment.id);
            await sb.from('payment_events').insert({
              payment_id: payment.id,
              event_type: `paypal_webhook_${evt.event_type.toLowerCase()}`,
              payload: evt.resource,
            });
          }
        }
      }

      // Marcar webhook como procesado
      await sb.from('webhooks_log').update({
        status: 'processed',
        processed_at: new Date().toISOString(),
      }).eq('provider', 'paypal').eq('event_id', evt.id);

      return reply.send({ ok: true, processed: true });
    } catch (err: any) {
      request.log.error({ err }, 'paypal webhook failed');
      return reply.code(500).send({ error: err?.message || 'failed' });
    }
  });
}

export default payhubPaypalRoutes;

/**
 * Admin Payments Hub — solo super_admin / admin de la app
 *
 * GET   /api/v1/admin/payhub/stats                       → KPIs del Hub
 * GET   /api/v1/admin/payhub/payments                    → listar (filters: status, provider)
 * POST  /api/v1/admin/payhub/payments/:id/approve        → aprobar (transferencia)
 * POST  /api/v1/admin/payhub/payments/:id/reject         → rechazar con motivo
 */
import type { FastifyInstance } from 'fastify';
import { createClient } from '@supabase/supabase-js';

const PAYHUB_URL = process.env.PAYHUB_SUPABASE_URL;
const PAYHUB_KEY = process.env.PAYHUB_SUPABASE_SERVICE_ROLE_KEY;
const APP_SLUG = process.env.PAYHUB_APP_SLUG || 'poweria-legal';
const RESEND_KEY = process.env.RESEND_API_KEY;
const RESEND_FROM = process.env.RESEND_FROM || 'Payments Hub <onboarding@resend.dev>';

function payhub() {
  if (!PAYHUB_URL || !PAYHUB_KEY) throw new Error('PAYHUB_SUPABASE_* no configurados');
  return createClient(PAYHUB_URL, PAYHUB_KEY, { auth: { persistSession: false } });
}

function requireAdmin(request: any) {
  const role = (request.user as any)?.role;
  return role === 'admin' || role === 'super_admin';
}

function escape(s: unknown) {
  if (s == null) return '';
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

async function notifyUser(opts: { to: string; subject: string; html: string }) {
  if (!RESEND_KEY) return { sent: false };
  try {
    const r = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${RESEND_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: RESEND_FROM, to: [opts.to], subject: opts.subject, html: opts.html }),
    });
    return { sent: r.ok };
  } catch { return { sent: false }; }
}

export async function adminPayhubRoutes(app: FastifyInstance) {
  // GET /admin/payhub/stats
  app.get('/admin/payhub/stats', { onRequest: [app.authenticate] }, async (request, reply) => {
    if (!requireAdmin(request)) return reply.code(403).send({ error: 'Forbidden' });
    const sb = payhub();
    const { searchParams } = new URL(request.url, 'http://x');
    const slug = searchParams.get('app_slug') || APP_SLUG;
    try {
      const { data, error } = await sb.rpc('payhub_admin_stats', { p_app_slug: slug });
      if (error) throw error;
      return reply.send({ stats: data, app_slug: slug });
    } catch (err: any) {
      return reply.code(500).send({ error: err?.message || 'failed' });
    }
  });

  // GET /admin/payhub/payments
  app.get('/admin/payhub/payments', { onRequest: [app.authenticate] }, async (request, reply) => {
    if (!requireAdmin(request)) return reply.code(403).send({ error: 'Forbidden' });
    const q = request.query as any;
    const sb = payhub();
    try {
      const { data, error } = await sb.rpc('payhub_admin_list_payments', {
        p_app_slug: q.app_slug || APP_SLUG,
        p_status:   q.status   || null,
        p_provider: q.provider || null,
        p_limit:    Number(q.limit  || 50),
        p_offset:   Number(q.offset || 0),
      });
      if (error) throw error;
      return reply.send({ payments: data || [] });
    } catch (err: any) {
      return reply.code(500).send({ error: err?.message || 'failed' });
    }
  });

  // POST /admin/payhub/payments/:id/approve
  app.post('/admin/payhub/payments/:id/approve', { onRequest: [app.authenticate] }, async (request, reply) => {
    if (!requireAdmin(request)) return reply.code(403).send({ error: 'Forbidden' });
    const { id } = request.params as { id: string };
    const adminId = (request.user as any).id as string;
    const sb = payhub();
    try {
      const { error } = await sb.rpc('payhub_approve_manual_payment', {
        p_payment_id: id,
        p_admin_id: adminId,
      });
      if (error) throw error;

      // Notificar al pagador
      const { data: pay } = await sb.rpc('payhub_get_payment', { p_payment_id: id });
      if (pay) {
        const { data: list } = await sb.rpc('payhub_admin_list_payments', {
          p_app_slug: APP_SLUG, p_status: null, p_provider: null, p_limit: 1, p_offset: 0
        });
        const detailed = (list as any[])?.find((x) => x.id === id) || pay;
        const ref = (detailed as any).metadata?.reference_code || id;
        const amountFmt = ((detailed as any).amount_cents / 100).toFixed(2);
        await notifyUser({
          to: (detailed as any).user_email || (detailed as any).email,
          subject: `✅ Pago aprobado · ${ref}`,
          html: `
            <div style="font-family:-apple-system,'Segoe UI',sans-serif;color:#0f172a;max-width:520px">
              <h2 style="color:#059669">✅ Pago aprobado</h2>
              <p>Tu pago de <b>${escape((detailed as any).currency)} ${escape(amountFmt)}</b>
              con referencia <code>${escape(ref)}</code> fue verificado correctamente.
              Tu plan ya está activo.</p>
            </div>`,
        });
      }
      return reply.send({ success: true });
    } catch (err: any) {
      return reply.code(500).send({ error: err?.message || 'failed' });
    }
  });

  // POST /admin/payhub/payments/:id/reject
  app.post('/admin/payhub/payments/:id/reject', { onRequest: [app.authenticate] }, async (request, reply) => {
    if (!requireAdmin(request)) return reply.code(403).send({ error: 'Forbidden' });
    const { id } = request.params as { id: string };
    const adminId = (request.user as any).id as string;
    const body = request.body as { reason?: string };
    const reason = (body?.reason || '').trim() || 'Sin motivo especificado';

    const sb = payhub();
    try {
      const { error } = await sb.rpc('payhub_admin_reject_payment', {
        p_payment_id: id, p_admin_id: adminId, p_reason: reason,
      });
      if (error) throw error;

      const { data: list } = await sb.rpc('payhub_admin_list_payments', {
        p_app_slug: APP_SLUG, p_status: null, p_provider: null, p_limit: 1, p_offset: 0
      });
      const detailed = (list as any[])?.find((x) => x.id === id);
      if (detailed) {
        const ref = detailed.metadata?.reference_code || id;
        const amountFmt = (detailed.amount_cents / 100).toFixed(2);
        await notifyUser({
          to: detailed.user_email,
          subject: `❌ Pago rechazado · ${ref}`,
          html: `
            <div style="font-family:-apple-system,'Segoe UI',sans-serif;color:#0f172a;max-width:520px">
              <h2 style="color:#e11d48">❌ Pago no verificado</h2>
              <p>Tu pago por <b>${escape(detailed.currency)} ${escape(amountFmt)}</b>
              (ref. <code>${escape(ref)}</code>) fue marcado como no válido.</p>
              <p style="background:#fef2f2;border-left:4px solid #dc2626;padding:12px;border-radius:0 8px 8px 0">
                <b>Motivo:</b> ${escape(reason)}
              </p>
              <p>Si crees que es un error, respondé este correo con la explicación o vuelve a subir el comprobante correcto.</p>
            </div>`,
        });
      }
      return reply.send({ success: true });
    } catch (err: any) {
      return reply.code(500).send({ error: err?.message || 'failed' });
    }
  });
}

export default adminPayhubRoutes;

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { serviceRoleClient } from '../lib/supabase.js';

interface ContactBody {
  name: string;
  email: string;
  phone?: string;
  organization?: string;
  seats?: string;
  message?: string;
  source?: string;
}

const SALES_EMAIL = 'francisecuador1@gmail.com'; // contacto comercial publicado
const SALES_NAME = 'Ing. Francisco Jacome';
const SALES_COMPANY = 'COGNITEX';

// Email donde realmente se envía la notificación. Por defecto el dueño de la cuenta
// Resend (Resend free tier solo permite enviar al email de registro hasta que se
// verifique un dominio). Una vez verificado dominio, cambiar a SALES_EMAIL via .env
const NOTIFICATION_EMAIL = process.env.SALES_NOTIFICATION_EMAIL || 'benitocabrerar@gmail.com';

function escape(s?: string) {
  if (!s) return '';
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function isValidEmail(s: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);
}

async function sendNotificationEmail(payload: ContactBody): Promise<{ sent: boolean; error?: string }> {
  const RESEND_KEY = process.env.RESEND_API_KEY;
  if (!RESEND_KEY) {
    return { sent: false, error: 'RESEND_API_KEY not configured' };
  }
  const forwardNotice = NOTIFICATION_EMAIL !== SALES_EMAIL
    ? `<div style="background:#fef3c7;border-left:4px solid #d97706;padding:12px;margin:16px 0;border-radius:6px">
         <b>⚠️ Acción requerida:</b> Reenviar este lead a <b>${SALES_NAME} (${SALES_COMPANY})</b>:
         <a href="mailto:${SALES_EMAIL}">${SALES_EMAIL}</a>
       </div>`
    : '';

  const html = `
    <h2>Nueva solicitud de cotización — Plan Institucional</h2>
    <p>Llegó una nueva solicitud desde el landing page de Poweria Legal (${SALES_COMPANY}).</p>
    ${forwardNotice}
    <table cellpadding="6" style="border-collapse:collapse;font-family:sans-serif;font-size:14px">
      <tr><td><b>Nombre</b></td><td>${escape(payload.name)}</td></tr>
      <tr><td><b>Email</b></td><td>${escape(payload.email)}</td></tr>
      <tr><td><b>Teléfono</b></td><td>${escape(payload.phone)}</td></tr>
      <tr><td><b>Institución</b></td><td>${escape(payload.organization)}</td></tr>
      <tr><td><b>Usuarios estimados</b></td><td>${escape(payload.seats)}</td></tr>
      <tr><td><b>Origen</b></td><td>${escape(payload.source || 'landing_institutional')}</td></tr>
    </table>
    <h3>Mensaje</h3>
    <pre style="background:#f5f5f5;padding:12px;border-radius:6px;font-family:sans-serif;white-space:pre-wrap">${escape(payload.message)}</pre>
    <hr/>
    <p style="color:#666;font-size:12px">Responde a este lead en menos de 24h hábiles. — Poweria Legal CRM (${SALES_COMPANY})</p>
    <p style="color:#999;font-size:11px">Este email fue enviado a <b>${NOTIFICATION_EMAIL}</b> porque el dominio de email aún no está verificado en Resend. Para que llegue directo a ${SALES_EMAIL}, verifica un dominio en resend.com/domains y cambia <code>SALES_NOTIFICATION_EMAIL</code> en .env.</p>
  `;
  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: process.env.RESEND_FROM || 'Poweria Legal <onboarding@resend.dev>',
        to: [NOTIFICATION_EMAIL],
        reply_to: payload.email,
        subject: `🏛️ Lead Institucional: ${payload.organization || payload.name}`,
        html,
      }),
    });
    if (!res.ok) {
      const text = await res.text();
      return { sent: false, error: `Resend ${res.status}: ${text.slice(0, 200)}` };
    }
    return { sent: true };
  } catch (err: any) {
    return { sent: false, error: err?.message || 'send failed' };
  }
}

export async function contactSalesRoutes(app: FastifyInstance) {
  // POST /api/contact-sales - public endpoint (no auth)
  app.post('/contact-sales', async (request: FastifyRequest, reply: FastifyReply) => {
    const body = request.body as ContactBody;

    // Validation
    if (!body || typeof body !== 'object') {
      return reply.code(400).send({ error: 'Invalid body' });
    }
    if (!body.name?.trim() || !body.email?.trim()) {
      return reply.code(400).send({ error: 'Nombre y email son obligatorios' });
    }
    if (!isValidEmail(body.email)) {
      return reply.code(400).send({ error: 'Email inválido' });
    }
    if (body.name.length > 200 || body.email.length > 200 || (body.message?.length || 0) > 5000) {
      return reply.code(400).send({ error: 'Algún campo excede el tamaño máximo' });
    }

    const ipAddress = (request.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim()
      || request.ip
      || null;
    const userAgent = (request.headers['user-agent'] as string) || null;

    // Persist in DB (best-effort — no falla la request si la tabla no existe)
    let leadId: string | null = null;
    try {
      const sb = serviceRoleClient();
      const { data, error } = await sb
        .from('contact_inquiries')
        .insert({
          name: body.name.trim(),
          email: body.email.trim().toLowerCase(),
          phone: body.phone?.trim() || null,
          organization: body.organization?.trim() || null,
          seats: body.seats?.trim() || null,
          message: body.message?.trim() || null,
          source: body.source || 'landing_institutional',
          ip_address: ipAddress,
          user_agent: userAgent,
          status: 'new',
        })
        .select('id')
        .single();

      if (error) {
        request.log.warn({ err: error }, 'contact_inquiries insert failed');
      } else if (data) {
        leadId = data.id;
      }
    } catch (err) {
      request.log.warn({ err }, 'contact_inquiries persistence skipped');
    }

    // Send email notification (best-effort)
    const emailResult = await sendNotificationEmail(body);
    if (!emailResult.sent) {
      request.log.warn({ err: emailResult.error }, 'sales email notification not sent');
    }

    request.log.info(
      { leadId, email: body.email, organization: body.organization, emailSent: emailResult.sent },
      `Sales lead received for ${SALES_NAME} (${SALES_COMPANY})`
    );

    return reply.send({
      success: true,
      leadId,
      message: `Solicitud recibida. ${SALES_NAME} se pondrá en contacto en menos de 24h.`,
    });
  });

  // GET /api/contact-sales (admin only) - listar leads
  app.get('/contact-sales', { onRequest: [app.authenticate] }, async (request, reply) => {
    const role = (request.user as any)?.role;
    if (role !== 'admin' && role !== 'super_admin') {
      return reply.code(403).send({ error: 'Forbidden' });
    }
    try {
      const sb = serviceRoleClient();
      const { data, error } = await sb
        .from('contact_inquiries')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);
      if (error) throw error;
      return reply.send({ leads: data || [] });
    } catch (err: any) {
      request.log.error({ err }, 'contact_inquiries list failed');
      return reply.code(500).send({ error: err?.message || 'failed' });
    }
  });
}

export default contactSalesRoutes;

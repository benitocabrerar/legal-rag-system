import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { serviceRoleClient } from '../lib/supabase.js';

interface UpdatePreferenceBody {
  countryCode: string;
}

/**
 * Rutas de jurisdicciones (multi-país).
 *
 * GET  /api/v1/jurisdictions         → lista activa (público)
 * GET  /api/v1/jurisdictions/all     → lista completa (admin)
 * GET  /api/v1/jurisdictions/me      → preferencia del usuario actual
 * PUT  /api/v1/jurisdictions/me      → actualizar preferencia
 * PATCH /api/v1/jurisdictions/:code  → activar/desactivar (admin)
 */
export async function jurisdictionsRoutes(app: FastifyInstance) {
  // GET /jurisdictions — lista activa (público, lo usa el selector de UI)
  app.get('/jurisdictions', async (request, reply) => {
    try {
      const sb = serviceRoleClient();
      const { data, error } = await sb
        .from('legal_jurisdictions')
        .select('code, name_es, name_en, flag_emoji, default_currency, default_language, phone_prefix, is_default, display_order')
        .eq('is_active', true)
        .order('display_order');
      if (error) throw error;
      return reply.send({ jurisdictions: data || [] });
    } catch (err: any) {
      request.log.error({ err }, 'list active jurisdictions failed');
      return reply.code(500).send({ error: err?.message || 'failed' });
    }
  });

  // GET /jurisdictions/all — lista completa (admin)
  app.get('/jurisdictions/all', { onRequest: [app.authenticate] }, async (request, reply) => {
    const role = (request.user as any)?.role;
    if (role !== 'admin' && role !== 'super_admin') {
      return reply.code(403).send({ error: 'Forbidden' });
    }
    try {
      const sb = serviceRoleClient();
      const { data, error } = await sb
        .from('legal_jurisdictions')
        .select('*')
        .order('display_order');
      if (error) throw error;
      return reply.send({ jurisdictions: data || [] });
    } catch (err: any) {
      request.log.error({ err }, 'list all jurisdictions failed');
      return reply.code(500).send({ error: err?.message || 'failed' });
    }
  });

  // GET /jurisdictions/me — preferencia del usuario actual
  app.get('/jurisdictions/me', { onRequest: [app.authenticate] }, async (request, reply) => {
    try {
      const userId = (request.user as any)?.id;
      if (!userId) return reply.code(401).send({ error: 'Unauthorized' });
      const sb = serviceRoleClient();
      const { data, error } = await sb
        .from('users')
        .select('preferred_country_code')
        .eq('id', userId)
        .single();
      if (error) throw error;
      return reply.send({
        countryCode: data?.preferred_country_code || 'EC',
      });
    } catch (err: any) {
      request.log.error({ err }, 'get user jurisdiction failed');
      return reply.code(500).send({ error: err?.message || 'failed' });
    }
  });

  // PUT /jurisdictions/me — actualizar preferencia del usuario
  app.put('/jurisdictions/me', { onRequest: [app.authenticate] }, async (request, reply) => {
    try {
      const userId = (request.user as any)?.id;
      if (!userId) return reply.code(401).send({ error: 'Unauthorized' });

      const body = request.body as UpdatePreferenceBody;
      const code = String(body?.countryCode || '').trim().toUpperCase();
      if (!/^[A-Z]{2}$/.test(code)) {
        return reply.code(400).send({ error: 'countryCode debe ser ISO-3166 alpha-2 (2 letras)' });
      }

      const sb = serviceRoleClient();

      // Validar que el país exista y esté activo
      const { data: jur, error: jurErr } = await sb
        .from('legal_jurisdictions')
        .select('code, is_active')
        .eq('code', code)
        .single();
      if (jurErr || !jur) {
        return reply.code(404).send({ error: `País ${code} no existe en el catálogo` });
      }
      if (!jur.is_active) {
        return reply.code(400).send({
          error: `País ${code} aún no está disponible. Contáctanos si necesitas activarlo.`,
        });
      }

      // Actualizar preferencia
      const { error: updErr } = await sb
        .from('users')
        .update({ preferred_country_code: code, updated_at: new Date().toISOString() })
        .eq('id', userId);
      if (updErr) throw updErr;

      return reply.send({ success: true, countryCode: code });
    } catch (err: any) {
      request.log.error({ err }, 'update user jurisdiction failed');
      return reply.code(500).send({ error: err?.message || 'failed' });
    }
  });

  // PATCH /jurisdictions/:code — activar / desactivar (admin)
  app.patch('/jurisdictions/:code', { onRequest: [app.authenticate] }, async (request, reply) => {
    const role = (request.user as any)?.role;
    if (role !== 'admin' && role !== 'super_admin') {
      return reply.code(403).send({ error: 'Forbidden' });
    }
    const { code } = request.params as { code: string };
    const body = request.body as { isActive?: boolean; isDefault?: boolean; notes?: string };
    if (!/^[A-Z]{2}$/.test(code)) {
      return reply.code(400).send({ error: 'code debe ser ISO-3166 alpha-2' });
    }

    const updates: Record<string, any> = { updated_at: new Date().toISOString() };
    if (typeof body.isActive === 'boolean') updates.is_active = body.isActive;
    if (typeof body.isDefault === 'boolean') updates.is_default = body.isDefault;
    if (typeof body.notes === 'string') updates.notes = body.notes;

    try {
      const sb = serviceRoleClient();
      const { data, error } = await sb
        .from('legal_jurisdictions')
        .update(updates)
        .eq('code', code)
        .select('*')
        .single();
      if (error) throw error;
      return reply.send({ jurisdiction: data });
    } catch (err: any) {
      request.log.error({ err }, 'patch jurisdiction failed');
      return reply.code(500).send({ error: err?.message || 'failed' });
    }
  });
}

export default jurisdictionsRoutes;

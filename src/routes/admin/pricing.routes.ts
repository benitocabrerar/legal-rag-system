/**
 * Gestión de Precios — rutas (exclusivas del super-administrador).
 *
 *   GET   /admin/pricing/plans               — planes con precios y stats
 *   GET   /admin/pricing/plans/:id/history   — historial de precios del plan
 *   GET   /admin/pricing/plans/:id/demand    — señales de oferta/demanda
 *   PATCH /admin/pricing/plans/:id/price     — cambia el precio (3 métodos)
 *   PATCH /admin/pricing/plans/:id/meta      — edita features y metadatos
 *   POST  /admin/pricing/bulk-adjust         — ajuste porcentual masivo
 *
 * Todas exigen JWT + super-administrador. Los cambios se reflejan al
 * instante en la página de precios y en el cobro con tarjeta, sin deploy.
 */
import type { FastifyInstance } from 'fastify';
import { requireSuperAdmin } from '../../lib/super-admin.js';
import {
  listPlansForAdmin,
  getPriceHistory,
  getDemandSignals,
  applyPriceChange,
  bulkAdjustPrices,
  updatePlanMeta,
} from '../../services/pricing/pricing-admin.service.js';

export async function adminPricingRoutes(fastify: FastifyInstance) {
  const actorOf = (request: any) => ({
    id: request.user?.id ?? null,
    email: request.user?.email ?? null,
  });

  // ─── GET /admin/pricing/plans ────────────────────────────────────────
  fastify.get(
    '/admin/pricing/plans',
    { onRequest: [fastify.authenticate] },
    async (request, reply) => {
      if (!requireSuperAdmin(request, reply)) return;
      const plans = await listPlansForAdmin();
      return reply.send({ plans, total: plans.length });
    },
  );

  // ─── GET /admin/pricing/plans/:id/history ────────────────────────────
  fastify.get<{ Params: { id: string } }>(
    '/admin/pricing/plans/:id/history',
    { onRequest: [fastify.authenticate] },
    async (request, reply) => {
      if (!requireSuperAdmin(request, reply)) return;
      const history = await getPriceHistory(request.params.id);
      return reply.send({ history, total: history.length });
    },
  );

  // ─── GET /admin/pricing/plans/:id/demand ─────────────────────────────
  fastify.get<{ Params: { id: string } }>(
    '/admin/pricing/plans/:id/demand',
    { onRequest: [fastify.authenticate] },
    async (request, reply) => {
      if (!requireSuperAdmin(request, reply)) return;
      try {
        const signals = await getDemandSignals(request.params.id);
        return reply.send({ signals });
      } catch (e: any) {
        return reply.code(400).send({ error: e?.message || 'No se pudo calcular la demanda.' });
      }
    },
  );

  // ─── PATCH /admin/pricing/plans/:id/price ────────────────────────────
  fastify.patch<{
    Params: { id: string };
    Body: {
      method?: 'absolute' | 'percentage' | 'demand';
      cycle?: 'monthly' | 'yearly' | 'both';
      value?: number;
      reason?: string;
      round?: 'none' | 'integer' | 'psychological';
    };
  }>(
    '/admin/pricing/plans/:id/price',
    { onRequest: [fastify.authenticate] },
    async (request, reply) => {
      if (!requireSuperAdmin(request, reply)) return;
      const b = request.body || {};
      const method = b.method;
      const cycle = b.cycle;
      if (method !== 'absolute' && method !== 'percentage' && method !== 'demand') {
        return reply.code(400).send({ error: 'Método de cambio inválido.' });
      }
      if (cycle !== 'monthly' && cycle !== 'yearly' && cycle !== 'both') {
        return reply.code(400).send({ error: 'Ciclo de facturación inválido.' });
      }
      if (typeof b.value !== 'number') {
        return reply.code(400).send({ error: 'Falta el valor del cambio.' });
      }
      try {
        const result = await applyPriceChange(
          request.params.id,
          { method, cycle, value: b.value, reason: b.reason, round: b.round },
          actorOf(request),
        );
        return reply.send(result);
      } catch (e: any) {
        return reply.code(400).send({ error: e?.message || 'No se pudo aplicar el cambio.' });
      }
    },
  );

  // ─── PATCH /admin/pricing/plans/:id/meta ─────────────────────────────
  fastify.patch<{ Params: { id: string }; Body: Record<string, unknown> }>(
    '/admin/pricing/plans/:id/meta',
    { onRequest: [fastify.authenticate] },
    async (request, reply) => {
      if (!requireSuperAdmin(request, reply)) return;
      try {
        const b = request.body || {};
        const plan = await updatePlanMeta(request.params.id, {
          name: b.name as string | undefined,
          description: b.description as string | undefined,
          features: Array.isArray(b.features) ? (b.features as string[]) : undefined,
          isPopular: typeof b.isPopular === 'boolean' ? b.isPopular : undefined,
          isActive: typeof b.isActive === 'boolean' ? b.isActive : undefined,
          storageGb: typeof b.storageGb === 'number' ? b.storageGb : undefined,
          documentsLimit: typeof b.documentsLimit === 'number' ? b.documentsLimit : undefined,
          monthlyQueries: typeof b.monthlyQueries === 'number' ? b.monthlyQueries : undefined,
          apiCallsLimit: typeof b.apiCallsLimit === 'number' ? b.apiCallsLimit : undefined,
        });
        return reply.send({ plan });
      } catch (e: any) {
        return reply.code(400).send({ error: e?.message || 'No se pudo guardar.' });
      }
    },
  );

  // ─── POST /admin/pricing/bulk-adjust ─────────────────────────────────
  fastify.post<{
    Body: {
      pct?: number;
      cycle?: 'monthly' | 'yearly' | 'both';
      reason?: string;
      round?: 'none' | 'integer' | 'psychological';
    };
  }>(
    '/admin/pricing/bulk-adjust',
    { onRequest: [fastify.authenticate] },
    async (request, reply) => {
      if (!requireSuperAdmin(request, reply)) return;
      const b = request.body || {};
      const cycle = b.cycle ?? 'both';
      if (cycle !== 'monthly' && cycle !== 'yearly' && cycle !== 'both') {
        return reply.code(400).send({ error: 'Ciclo de facturación inválido.' });
      }
      if (typeof b.pct !== 'number') {
        return reply.code(400).send({ error: 'Falta el porcentaje de ajuste.' });
      }
      try {
        const result = await bulkAdjustPrices(
          { pct: b.pct, cycle, reason: b.reason, round: b.round },
          actorOf(request),
        );
        return reply.send(result);
      } catch (e: any) {
        return reply.code(400).send({ error: e?.message || 'No se pudo aplicar el ajuste masivo.' });
      }
    },
  );
}

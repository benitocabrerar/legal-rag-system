/**
 * Entitlements — rutas.
 *
 *   GET   /me/entitlements                       — capacidades del usuario
 *   GET   /admin/pricing/entitlements            — matriz catálogo × planes (super-admin)
 *   PATCH /admin/pricing/plans/:id/entitlements  — edita los entitlements de un plan
 *
 * /me/entitlements lo consume el frontend para mostrar/ocultar features y
 * avisar del estado de la prueba. Las rutas de admin son del super-admin.
 */
import type { FastifyInstance } from 'fastify';
import { requireSuperAdmin } from '../lib/super-admin.js';
import {
  getUserEntitlements,
  getEntitlementsMatrix,
  updatePlanEntitlements,
  EntitlementError,
} from '../services/entitlements/entitlements.service.js';

export async function entitlementsRoutes(fastify: FastifyInstance) {
  // ─── GET /me/entitlements ────────────────────────────────────────────
  fastify.get(
    '/me/entitlements',
    { onRequest: [fastify.authenticate] },
    async (request, reply) => {
      const userId = (request.user as any)?.id as string | undefined;
      if (!userId) return reply.code(401).send({ error: 'No autenticado' });
      try {
        const ent = await getUserEntitlements(userId);
        return reply.send(ent);
      } catch (e: any) {
        const status = e instanceof EntitlementError ? e.httpStatus : 500;
        return reply.code(status).send({ error: e?.message || 'Error' });
      }
    },
  );

  // ─── GET /admin/pricing/entitlements ─────────────────────────────────
  fastify.get(
    '/admin/pricing/entitlements',
    { onRequest: [fastify.authenticate] },
    async (request, reply) => {
      if (!requireSuperAdmin(request, reply)) return;
      const matrix = await getEntitlementsMatrix();
      return reply.send(matrix);
    },
  );

  // ─── PATCH /admin/pricing/plans/:id/entitlements ─────────────────────
  fastify.patch<{ Params: { id: string }; Body: Record<string, unknown> }>(
    '/admin/pricing/plans/:id/entitlements',
    { onRequest: [fastify.authenticate] },
    async (request, reply) => {
      if (!requireSuperAdmin(request, reply)) return;
      try {
        const entitlements = await updatePlanEntitlements(request.params.id, request.body || {});
        return reply.send({ entitlements });
      } catch (e: any) {
        const status = e instanceof EntitlementError ? e.httpStatus : 400;
        return reply.code(status).send({ error: e?.message || 'No se pudo guardar.' });
      }
    },
  );
}

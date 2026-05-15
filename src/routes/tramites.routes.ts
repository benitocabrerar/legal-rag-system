/**
 * Agente de Trámites — rutas.
 *
 *   GET   /tramites/catalog     — catálogo de trámites tipo
 *   POST  /tramites/generate    — genera el borrador de un trámite
 *   GET   /tramites/runs        — historial del usuario
 *   GET   /tramites/runs/:id    — detalle de un trámite
 *   PATCH /tramites/runs/:id    — guarda la revisión / aprueba
 *
 * Todas requieren JWT de usuario. El borrador nace en estado 'borrador':
 * la revisión humana es obligatoria antes de aprobarlo.
 */
import type { FastifyInstance } from 'fastify';
import { listTramiteCatalog } from '../services/tramites/tramites.service.js';
import {
  generateTramite,
  listTramiteRuns,
  getTramiteRun,
  updateTramiteReview,
} from '../services/tramites/tramites.service.js';

export async function tramitesRoutes(fastify: FastifyInstance) {
  // ─── GET /tramites/catalog ───────────────────────────────────────────
  fastify.get(
    '/tramites/catalog',
    { onRequest: [fastify.authenticate] },
    async (_request, reply) => {
      const tramites = listTramiteCatalog();
      return reply.send({ tramites, total: tramites.length });
    },
  );

  // ─── POST /tramites/generate ─────────────────────────────────────────
  fastify.post<{ Body: { tramiteKey?: string; inputs?: Record<string, string>; caseId?: string } }>(
    '/tramites/generate',
    { onRequest: [fastify.authenticate] },
    async (request, reply) => {
      const userId = (request.user as any)?.id as string | undefined;
      if (!userId) return reply.code(401).send({ error: 'No autenticado' });

      const tramiteKey = (request.body?.tramiteKey || '').trim();
      const inputs = request.body?.inputs || {};
      const caseId = request.body?.caseId || null;
      if (!tramiteKey) {
        return reply.code(400).send({ error: 'Falta indicar el tipo de trámite.' });
      }

      try {
        const run = await generateTramite({ userId, caseId, tramiteKey, inputs });
        return reply.send({ run });
      } catch (e: any) {
        fastify.log.error({ err: e?.message }, 'tramite generate failed');
        return reply.code(400).send({ error: e?.message || 'No se pudo generar el trámite.' });
      }
    },
  );

  // ─── GET /tramites/runs ──────────────────────────────────────────────
  fastify.get<{ Querystring: { limit?: string } }>(
    '/tramites/runs',
    { onRequest: [fastify.authenticate] },
    async (request, reply) => {
      const userId = (request.user as any)?.id as string | undefined;
      if (!userId) return reply.code(401).send({ error: 'No autenticado' });

      const limit = Math.min(100, Math.max(1, parseInt(request.query.limit ?? '30', 10)));
      const runs = await listTramiteRuns(userId, limit);
      return reply.send({ runs, total: runs.length });
    },
  );

  // ─── GET /tramites/runs/:id ──────────────────────────────────────────
  fastify.get<{ Params: { id: string } }>(
    '/tramites/runs/:id',
    { onRequest: [fastify.authenticate] },
    async (request, reply) => {
      const userId = (request.user as any)?.id as string | undefined;
      if (!userId) return reply.code(401).send({ error: 'No autenticado' });

      const run = await getTramiteRun(userId, request.params.id);
      if (!run) return reply.code(404).send({ error: 'Trámite no encontrado.' });
      return reply.send({ run });
    },
  );

  // ─── PATCH /tramites/runs/:id ────────────────────────────────────────
  fastify.patch<{ Params: { id: string }; Body: { reviewedContent?: string; approve?: boolean } }>(
    '/tramites/runs/:id',
    { onRequest: [fastify.authenticate] },
    async (request, reply) => {
      const userId = (request.user as any)?.id as string | undefined;
      if (!userId) return reply.code(401).send({ error: 'No autenticado' });

      try {
        const run = await updateTramiteReview(userId, request.params.id, {
          reviewedContent: request.body?.reviewedContent,
          approve: request.body?.approve === true,
        });
        if (!run) return reply.code(404).send({ error: 'Trámite no encontrado.' });
        return reply.send({ run });
      } catch (e: any) {
        return reply.code(400).send({ error: e?.message || 'No se pudo guardar la revisión.' });
      }
    },
  );
}

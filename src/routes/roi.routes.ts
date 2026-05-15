/**
 * Analíticas de ROI — ruta.
 *
 *   GET /roi/summary — actividad IA del usuario traducida en tiempo ahorrado
 *
 * Requiere JWT de usuario.
 */
import type { FastifyInstance } from 'fastify';
import { getRoiSummary } from '../services/roi/roi.service.js';

export async function roiRoutes(fastify: FastifyInstance) {
  fastify.get(
    '/roi/summary',
    { onRequest: [fastify.authenticate] },
    async (request, reply) => {
      const userId = (request.user as any)?.id as string | undefined;
      if (!userId) return reply.code(401).send({ error: 'No autenticado' });

      try {
        const summary = await getRoiSummary(userId);
        return reply.send(summary);
      } catch (e: any) {
        fastify.log.error({ err: e?.message }, 'roi summary failed');
        return reply.code(500).send({ error: 'No se pudo calcular el ROI.' });
      }
    },
  );
}

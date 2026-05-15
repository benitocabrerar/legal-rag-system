/**
 * Dominios de corpus — rutas.
 *
 *   GET   /corpus-domains        — lista de dominios con estadísticas
 *   GET   /corpus-domains/:code  — detalle de un dominio
 *   PATCH /corpus-domains/:code  — activar/desactivar, default, descripción (admin)
 *
 * Requieren JWT de usuario; el PATCH exige rol de administrador.
 */
import type { FastifyInstance } from 'fastify';
import {
  listCorpusDomains,
  getCorpusDomain,
  updateCorpusDomain,
} from '../services/corpus/corpus-domains.service.js';

export async function corpusDomainsRoutes(fastify: FastifyInstance) {
  const requireAdmin = (request: any, reply: any): boolean => {
    const role = request.user?.role;
    if (role !== 'admin' && role !== 'superadmin' && role !== 'super_admin') {
      reply.code(403).send({ error: 'Se requiere rol de administrador.' });
      return false;
    }
    return true;
  };

  // ─── GET /corpus-domains ─────────────────────────────────────────────
  fastify.get(
    '/corpus-domains',
    { onRequest: [fastify.authenticate] },
    async (_request, reply) => {
      const domains = await listCorpusDomains();
      return reply.send({ domains, total: domains.length });
    },
  );

  // ─── GET /corpus-domains/:code ───────────────────────────────────────
  fastify.get<{ Params: { code: string } }>(
    '/corpus-domains/:code',
    { onRequest: [fastify.authenticate] },
    async (request, reply) => {
      const domain = await getCorpusDomain(request.params.code);
      if (!domain) return reply.code(404).send({ error: 'Dominio de corpus no encontrado.' });
      return reply.send({ domain });
    },
  );

  // ─── PATCH /corpus-domains/:code ─────────────────────────────────────
  fastify.patch<{
    Params: { code: string };
    Body: { isActive?: boolean; isDefault?: boolean; description?: string };
  }>(
    '/corpus-domains/:code',
    { onRequest: [fastify.authenticate] },
    async (request, reply) => {
      if (!requireAdmin(request, reply)) return;
      try {
        const domain = await updateCorpusDomain(request.params.code, {
          isActive: request.body?.isActive,
          isDefault: request.body?.isDefault,
          description: request.body?.description,
        });
        if (!domain) return reply.code(404).send({ error: 'Dominio de corpus no encontrado.' });
        return reply.send({ domain });
      } catch (e: any) {
        return reply.code(400).send({ error: e?.message || 'No se pudo actualizar el dominio.' });
      }
    },
  );
}

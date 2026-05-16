/**
 * Agente de Formularios de Inmigración — rutas.
 *
 *   GET   /immigration-forms/catalog      — catálogo de formularios USCIS
 *   POST  /immigration-forms/generate     — genera el paquete de un formulario
 *   GET   /immigration-forms/packets      — historial del usuario
 *   GET   /immigration-forms/packets/:id  — detalle de un paquete
 *   PATCH /immigration-forms/packets/:id  — guarda la revisión / marca revisado
 *
 * Todas requieren JWT de usuario. El paquete nace en estado 'borrador':
 * la revisión de un abogado de inmigración con licencia es obligatoria.
 */
import type { FastifyInstance } from 'fastify';
import { assertFeature, EntitlementError } from '../services/entitlements/entitlements.service.js';
import {
  listImmigrationCatalog,
  generateFormPacket,
  listFormPackets,
  getFormPacket,
  updatePacketReview,
} from '../services/immigration/immigration-forms.service.js';

export async function immigrationFormsRoutes(fastify: FastifyInstance) {
  // ─── GET /immigration-forms/catalog ──────────────────────────────────
  fastify.get(
    '/immigration-forms/catalog',
    { onRequest: [fastify.authenticate] },
    async (_request, reply) => {
      const forms = listImmigrationCatalog();
      return reply.send({ forms, total: forms.length });
    },
  );

  // ─── POST /immigration-forms/generate ────────────────────────────────
  fastify.post<{
    Body: { formKey?: string; clientName?: string; inputs?: Record<string, string>; caseId?: string };
  }>(
    '/immigration-forms/generate',
    { onRequest: [fastify.authenticate] },
    async (request, reply) => {
      const userId = (request.user as any)?.id as string | undefined;
      if (!userId) return reply.code(401).send({ error: 'No autenticado' });

      const formKey = (request.body?.formKey || '').trim();
      const inputs = request.body?.inputs || {};
      const clientName = request.body?.clientName || null;
      const caseId = request.body?.caseId || null;
      if (!formKey) {
        return reply.code(400).send({ error: 'Falta indicar el formulario.' });
      }

      try {
        await assertFeature(userId, 'immigration_forms');
        const packet = await generateFormPacket({ userId, caseId, formKey, clientName, inputs });
        return reply.send({ packet });
      } catch (e: any) {
        if (e instanceof EntitlementError) {
          return reply.code(e.httpStatus).send({ error: e.message, code: e.code });
        }
        fastify.log.error({ err: e?.message }, 'immigration form generate failed');
        return reply.code(400).send({ error: e?.message || 'No se pudo generar el paquete.' });
      }
    },
  );

  // ─── GET /immigration-forms/packets ──────────────────────────────────
  fastify.get<{ Querystring: { limit?: string } }>(
    '/immigration-forms/packets',
    { onRequest: [fastify.authenticate] },
    async (request, reply) => {
      const userId = (request.user as any)?.id as string | undefined;
      if (!userId) return reply.code(401).send({ error: 'No autenticado' });

      const limit = Math.min(100, Math.max(1, parseInt(request.query.limit ?? '30', 10)));
      const packets = await listFormPackets(userId, limit);
      return reply.send({ packets, total: packets.length });
    },
  );

  // ─── GET /immigration-forms/packets/:id ──────────────────────────────
  fastify.get<{ Params: { id: string } }>(
    '/immigration-forms/packets/:id',
    { onRequest: [fastify.authenticate] },
    async (request, reply) => {
      const userId = (request.user as any)?.id as string | undefined;
      if (!userId) return reply.code(401).send({ error: 'No autenticado' });

      const packet = await getFormPacket(userId, request.params.id);
      if (!packet) return reply.code(404).send({ error: 'Paquete no encontrado.' });
      return reply.send({ packet });
    },
  );

  // ─── PATCH /immigration-forms/packets/:id ────────────────────────────
  fastify.patch<{
    Params: { id: string };
    Body: { reviewedContent?: string; markReviewed?: boolean };
  }>(
    '/immigration-forms/packets/:id',
    { onRequest: [fastify.authenticate] },
    async (request, reply) => {
      const userId = (request.user as any)?.id as string | undefined;
      if (!userId) return reply.code(401).send({ error: 'No autenticado' });

      try {
        const packet = await updatePacketReview(userId, request.params.id, {
          reviewedContent: request.body?.reviewedContent,
          markReviewed: request.body?.markReviewed === true,
        });
        if (!packet) return reply.code(404).send({ error: 'Paquete no encontrado.' });
        return reply.send({ packet });
      } catch (e: any) {
        return reply.code(400).send({ error: e?.message || 'No se pudo guardar la revisión.' });
      }
    },
  );
}

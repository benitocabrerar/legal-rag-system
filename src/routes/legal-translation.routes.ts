/**
 * Traductor Jurídico — rutas.
 *
 *   GET  /legal-translate/doc-types   — tipos de documento disponibles
 *   POST /legal-translate             — traduce un texto jurídico es⇄en
 *   GET  /legal-translate/history     — historial del usuario
 *   GET  /legal-translate/:id         — detalle de una traducción
 *
 * Todas requieren JWT de usuario.
 */
import type { FastifyInstance } from 'fastify';
import {
  TRANSLATION_DOC_TYPES,
  translateLegalText,
  listTranslations,
  getTranslation,
  type Lang,
} from '../services/translation/legal-translation.service.js';

export async function legalTranslationRoutes(fastify: FastifyInstance) {
  // ─── GET /legal-translate/doc-types ──────────────────────────────────
  fastify.get(
    '/legal-translate/doc-types',
    { onRequest: [fastify.authenticate] },
    async (_request, reply) => {
      return reply.send({ docTypes: TRANSLATION_DOC_TYPES });
    },
  );

  // ─── POST /legal-translate ───────────────────────────────────────────
  fastify.post<{
    Body: { sourceText?: string; sourceLang?: string; targetLang?: string; docType?: string; caseId?: string };
  }>(
    '/legal-translate',
    { onRequest: [fastify.authenticate] },
    async (request, reply) => {
      const userId = (request.user as any)?.id as string | undefined;
      if (!userId) return reply.code(401).send({ error: 'No autenticado' });

      const sourceText = request.body?.sourceText || '';
      const sourceLang = request.body?.sourceLang;
      const targetLang = request.body?.targetLang;
      if (sourceLang !== 'es' && sourceLang !== 'en') {
        return reply.code(400).send({ error: 'Idioma de origen inválido.' });
      }
      if (targetLang !== 'es' && targetLang !== 'en') {
        return reply.code(400).send({ error: 'Idioma de destino inválido.' });
      }

      try {
        const translation = await translateLegalText({
          userId,
          caseId: request.body?.caseId || null,
          sourceText,
          sourceLang: sourceLang as Lang,
          targetLang: targetLang as Lang,
          docType: request.body?.docType || 'general',
        });
        return reply.send({ translation });
      } catch (e: any) {
        fastify.log.error({ err: e?.message }, 'legal translation failed');
        return reply.code(400).send({ error: e?.message || 'No se pudo traducir el texto.' });
      }
    },
  );

  // ─── GET /legal-translate/history ────────────────────────────────────
  fastify.get<{ Querystring: { limit?: string } }>(
    '/legal-translate/history',
    { onRequest: [fastify.authenticate] },
    async (request, reply) => {
      const userId = (request.user as any)?.id as string | undefined;
      if (!userId) return reply.code(401).send({ error: 'No autenticado' });

      const limit = Math.min(100, Math.max(1, parseInt(request.query.limit ?? '30', 10)));
      const translations = await listTranslations(userId, limit);
      return reply.send({ translations, total: translations.length });
    },
  );

  // ─── GET /legal-translate/:id ────────────────────────────────────────
  fastify.get<{ Params: { id: string } }>(
    '/legal-translate/:id',
    { onRequest: [fastify.authenticate] },
    async (request, reply) => {
      const userId = (request.user as any)?.id as string | undefined;
      if (!userId) return reply.code(401).send({ error: 'No autenticado' });

      const translation = await getTranslation(userId, request.params.id);
      if (!translation) return reply.code(404).send({ error: 'Traducción no encontrada.' });
      return reply.send({ translation });
    },
  );
}

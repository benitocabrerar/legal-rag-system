/**
 * Citations — verificación de fuentes citadas contra el corpus jurídico.
 *
 *   POST /citations/verify  — recibe un texto, devuelve qué normas citadas
 *                             existen en el corpus y qué referencias a
 *                             artículos requieren contraste manual.
 *
 * Requiere JWT de usuario.
 */
import type { FastifyInstance } from 'fastify';
import { verifyCitationsInText } from '../services/legal/citation-verification.service.js';

export async function citationsRoutes(fastify: FastifyInstance) {
  fastify.post<{ Body: { text?: string } }>(
    '/citations/verify',
    { onRequest: [fastify.authenticate] },
    async (request, reply) => {
      const text = (request.body?.text || '').trim();
      if (text.length < 10) {
        return reply.code(400).send({ error: 'El texto a verificar es demasiado corto.' });
      }
      // Tope defensivo — verificar textos enormes no aporta y consume DB.
      const result = await verifyCitationsInText(text.slice(0, 60_000));
      return reply.send(result);
    },
  );
}

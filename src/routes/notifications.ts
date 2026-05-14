/**
 * Notifications routes — in-app notification feed del usuario actual.
 *
 *   GET    /notifications                    — lista paginada
 *   GET    /notifications/unread-count       — solo el count para el badge
 *   GET    /notifications/corpus-updates     — filtrado a type='corpus_update' para el dashboard widget
 *   POST   /notifications/:id/read           — marca una como leída
 *   POST   /notifications/mark-all-read      — marca todas las del user como leídas
 *
 * Las notificaciones se crean automáticamente por el corpus-ingestion
 * pipeline cuando una nueva norma se ingresa al RAG.
 */
import type { FastifyInstance } from 'fastify';
import { prisma } from '../lib/prisma.js';

export async function notificationsRoutes(fastify: FastifyInstance) {
  // ─── GET /notifications ────────────────────────────────────────────
  fastify.get<{
    Querystring: { limit?: string; offset?: string; unreadOnly?: string; type?: string };
  }>(
    '/notifications',
    { onRequest: [fastify.authenticate] },
    async (request, reply) => {
      const userId = (request.user as any).id;
      const { limit, offset, unreadOnly, type } = request.query;
      const limitNum  = Math.min(100, Math.max(5, parseInt(limit  || '20', 10)));
      const offsetNum = Math.max(0, parseInt(offset || '0', 10));

      const conditions: string[] = [`user_id = $1`];
      const params: any[] = [userId];
      if (unreadOnly === 'true' || unreadOnly === '1') {
        conditions.push(`is_read = false`);
      }
      if (type) {
        params.push(type);
        conditions.push(`type = $${params.length}`);
      }

      params.push(limitNum);
      const limitIdx = params.length;
      params.push(offsetNum);
      const offsetIdx = params.length;

      const items = await prisma.$queryRawUnsafe<Array<any>>(
        `SELECT id, type, title, message, priority, is_read, read_at,
                action_url, metadata, created_at
           FROM public.notifications
          WHERE ${conditions.join(' AND ')}
          ORDER BY is_read ASC, created_at DESC
          LIMIT $${limitIdx} OFFSET $${offsetIdx}`,
        ...params,
      );

      const unreadCount = await prisma.$queryRawUnsafe<Array<{ n: bigint }>>(
        `SELECT COUNT(*)::bigint AS n
           FROM public.notifications
          WHERE user_id = $1 AND is_read = false`,
        userId,
      );

      return reply.send({
        items,
        unreadCount: Number(unreadCount[0]?.n || 0),
        pagination: { limit: limitNum, offset: offsetNum },
      });
    },
  );

  // ─── GET /notifications/unread-count (lightweight para el bell) ────
  fastify.get(
    '/notifications/unread-count',
    { onRequest: [fastify.authenticate] },
    async (request, reply) => {
      const userId = (request.user as any).id;
      const r = await prisma.$queryRawUnsafe<Array<{ n: bigint; high_n: bigint }>>(
        `SELECT COUNT(*)::bigint AS n,
                COUNT(*) FILTER (WHERE priority IN ('high','critical'))::bigint AS high_n
           FROM public.notifications
          WHERE user_id = $1 AND is_read = false`,
        userId,
      );
      return reply.send({
        count:    Number(r[0]?.n     || 0),
        highCount:Number(r[0]?.high_n|| 0),
      });
    },
  );

  // ─── GET /notifications/corpus-updates (dashboard widget) ──────────
  // Las 5 más recientes de tipo corpus_update, incluso si están leídas.
  fastify.get(
    '/notifications/corpus-updates',
    { onRequest: [fastify.authenticate] },
    async (request, reply) => {
      const userId = (request.user as any).id;
      const items = await prisma.$queryRawUnsafe<Array<any>>(
        `SELECT id, title, message, priority, is_read, action_url, metadata, created_at
           FROM public.notifications
          WHERE user_id = $1 AND type = 'corpus_update'
          ORDER BY created_at DESC
          LIMIT 5`,
        userId,
      );
      return reply.send({ items });
    },
  );

  // ─── POST /notifications/:id/read ──────────────────────────────────
  fastify.post<{ Params: { id: string } }>(
    '/notifications/:id/read',
    { onRequest: [fastify.authenticate] },
    async (request, reply) => {
      const userId = (request.user as any).id;
      const result = await prisma.$executeRawUnsafe(
        `UPDATE public.notifications
            SET is_read = true, read_at = now()
          WHERE id = $1 AND user_id = $2 AND is_read = false`,
        request.params.id, userId,
      );
      return reply.send({ ok: true, updated: Number(result) || 0 });
    },
  );

  // ─── POST /notifications/mark-all-read ─────────────────────────────
  fastify.post(
    '/notifications/mark-all-read',
    { onRequest: [fastify.authenticate] },
    async (request, reply) => {
      const userId = (request.user as any).id;
      const result = await prisma.$executeRawUnsafe(
        `UPDATE public.notifications
            SET is_read = true, read_at = now()
          WHERE user_id = $1 AND is_read = false`,
        userId,
      );
      return reply.send({ ok: true, updated: Number(result) || 0 });
    },
  );
}

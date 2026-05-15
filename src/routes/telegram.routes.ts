/**
 * Telegram — rutas del usuario para gestionar su vínculo.
 *
 *   POST   /telegram/link/start   — genera token + deep link de vinculación
 *   GET    /telegram/link/status  — estado del vínculo del usuario actual
 *   PATCH  /telegram/link/prefs   — actualiza preferencias de notificación
 *   DELETE /telegram/link         — desvincula la cuenta
 *
 * Todas requieren JWT de usuario (fastify.authenticate).
 */
import type { FastifyInstance } from 'fastify';
import {
  isTelegramConfigured,
  getTelegramBotUsername,
} from '../services/telegram.service.js';
import {
  createLinkToken,
  getLinkByUserId,
  unlinkByUserId,
  updateNotifPrefs,
} from '../services/telegram-link.service.js';
import { buildLinkDeepLink } from '../services/telegram-bot.service.js';

export async function telegramRoutes(fastify: FastifyInstance) {
  // ─── POST /telegram/link/start ───────────────────────────────────────
  fastify.post(
    '/telegram/link/start',
    { onRequest: [fastify.authenticate] },
    async (request, reply) => {
      const userId = (request.user as any)?.id as string;
      if (!userId) return reply.code(401).send({ error: 'No autenticado' });

      if (!isTelegramConfigured()) {
        return reply.code(503).send({ error: 'La integración con Telegram no está disponible en este momento.' });
      }
      const botUsername = getTelegramBotUsername();
      if (!botUsername) {
        return reply.code(503).send({ error: 'TELEGRAM_BOT_USERNAME no configurado en el server.' });
      }

      const { token, expiresAt } = await createLinkToken(userId);
      return reply.send({
        token,
        deepLink: buildLinkDeepLink(token),
        botUsername,
        expiresAt,
      });
    },
  );

  // ─── GET /telegram/link/status ───────────────────────────────────────
  fastify.get(
    '/telegram/link/status',
    { onRequest: [fastify.authenticate] },
    async (request, reply) => {
      const userId = (request.user as any)?.id as string;
      if (!userId) return reply.code(401).send({ error: 'No autenticado' });

      const link = await getLinkByUserId(userId);
      return reply.send({
        configured: isTelegramConfigured(),
        botUsername: getTelegramBotUsername(),
        linked: !!link,
        link: link
          ? {
              username: link.username,
              firstName: link.firstName,
              linkedAt: link.linkedAt,
              prefs: link.prefs,
            }
          : null,
      });
    },
  );

  // ─── PATCH /telegram/link/prefs ──────────────────────────────────────
  fastify.patch<{ Body: Partial<{ corpus: boolean; cases: boolean; calendar: boolean; tasks: boolean }> }>(
    '/telegram/link/prefs',
    { onRequest: [fastify.authenticate] },
    async (request, reply) => {
      const userId = (request.user as any)?.id as string;
      if (!userId) return reply.code(401).send({ error: 'No autenticado' });

      const ok = await updateNotifPrefs(userId, request.body || {});
      if (!ok) {
        return reply.code(404).send({ error: 'No hay un vínculo de Telegram para actualizar.' });
      }
      const link = await getLinkByUserId(userId);
      return reply.send({ ok: true, prefs: link?.prefs });
    },
  );

  // ─── DELETE /telegram/link ───────────────────────────────────────────
  fastify.delete(
    '/telegram/link',
    { onRequest: [fastify.authenticate] },
    async (request, reply) => {
      const userId = (request.user as any)?.id as string;
      if (!userId) return reply.code(401).send({ error: 'No autenticado' });

      const removed = await unlinkByUserId(userId);
      return reply.send({ ok: true, removed });
    },
  );
}

/**
 * Telegram — webhook entrante + gestión del webhook.
 *
 *   POST /telegram/webhook        — recibe los updates de Telegram (público,
 *                                    protegido por secret token en header)
 *   POST /telegram/admin/set-webhook   — registra el webhook (admin JWT)
 *   GET  /telegram/admin/webhook-info  — estado del webhook (admin JWT)
 *   GET  /telegram/admin/bot-info      — getMe / health del bot (admin JWT)
 *
 * El endpoint del webhook responde 200 INMEDIATAMENTE y procesa el update
 * en background: el RAG puede tardar varios segundos y Telegram reintenta
 * el update si no recibe 200 a tiempo (causaría respuestas duplicadas).
 */
import type { FastifyInstance } from 'fastify';
import {
  isTelegramConfigured,
  getTelegramWebhookSecret,
  setTelegramWebhook,
  getTelegramWebhookInfo,
  getTelegramBotInfo,
} from '../services/telegram.service.js';
import { handleTelegramUpdate, type TelegramUpdate } from '../services/telegram-bot.service.js';

export async function telegramWebhookRoutes(fastify: FastifyInstance) {
  const WEBHOOK_SECRET = getTelegramWebhookSecret();

  // ─── POST /telegram/webhook ──────────────────────────────────────────
  fastify.post<{ Body: TelegramUpdate }>(
    '/telegram/webhook',
    async (request, reply) => {
      // Anti-spoofing: Telegram reenvía el secret en este header.
      if (WEBHOOK_SECRET) {
        const got = request.headers['x-telegram-bot-api-secret-token'];
        if (got !== WEBHOOK_SECRET) {
          fastify.log.warn('[telegram] webhook con secret inválido — descartado');
          return reply.code(401).send({ ok: false });
        }
      }

      const update = request.body;
      // Responder 200 YA — procesar en background.
      reply.code(200).send({ ok: true });

      if (update && typeof update.update_id === 'number') {
        handleTelegramUpdate(update).catch((e) => {
          fastify.log.error({ err: e?.message }, '[telegram] update processing failed');
        });
      }
      return reply;
    },
  );

  // ─── Admin guard ─────────────────────────────────────────────────────
  const requireAdmin = async (request: any, reply: any): Promise<boolean> => {
    const user = request.user as { role?: string } | undefined;
    if (!user || (user.role !== 'admin' && user.role !== 'superadmin')) {
      reply.code(403).send({ error: 'Admin role required' });
      return false;
    }
    return true;
  };

  // ─── POST /telegram/admin/set-webhook ────────────────────────────────
  fastify.post<{ Body: { url?: string } }>(
    '/telegram/admin/set-webhook',
    { onRequest: [fastify.authenticate] },
    async (request, reply) => {
      if (!(await requireAdmin(request, reply))) return;
      if (!isTelegramConfigured()) {
        return reply.code(400).send({ error: 'TELEGRAM_BOT_TOKEN no configurado en el server' });
      }
      // URL del webhook: explícita o derivada del host público del backend.
      const explicit = request.body?.url;
      const base = process.env.PUBLIC_API_URL || process.env.BACKEND_PUBLIC_URL || '';
      const url = explicit || (base ? `${base.replace(/\/$/, '')}/api/v1/telegram/webhook` : '');
      if (!url) {
        return reply.code(400).send({
          error: 'No se pudo determinar la URL del webhook. Pasá { url } en el body o configurá PUBLIC_API_URL.',
        });
      }
      const result = await setTelegramWebhook(url);
      if (!result.ok) {
        return reply.code(502).send({ error: result.description || 'setWebhook falló', url });
      }
      return reply.send({ ok: true, url });
    },
  );

  // ─── GET /telegram/admin/webhook-info ────────────────────────────────
  fastify.get(
    '/telegram/admin/webhook-info',
    { onRequest: [fastify.authenticate] },
    async (request, reply) => {
      if (!(await requireAdmin(request, reply))) return;
      const info = await getTelegramWebhookInfo();
      return reply.send(info);
    },
  );

  // ─── GET /telegram/admin/bot-info ────────────────────────────────────
  fastify.get(
    '/telegram/admin/bot-info',
    { onRequest: [fastify.authenticate] },
    async (request, reply) => {
      if (!(await requireAdmin(request, reply))) return;
      const configured = isTelegramConfigured();
      if (!configured) {
        return reply.send({ configured: false });
      }
      const info = await getTelegramBotInfo();
      return reply.send({ configured: true, ...info });
    },
  );
}

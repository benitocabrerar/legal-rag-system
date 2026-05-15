/**
 * Internal cron routes — disparan sincronizaciones desde Render Cron Jobs.
 *
 * Autenticación: Bearer token con CORPUS_SYNC_CRON_SECRET (env var).
 * NO usa JWT de usuario porque los crons no tienen contexto de sesión.
 *
 *   POST /internal/sync/run-ro       — disparado cada 6h por Render
 *   POST /internal/sync/run-asamblea — disparado cada 24h por Render
 *
 * Estos endpoints NO devuelven SSE — el cron espera el resultado JSON final.
 * Si la sincronización es muy larga, el cron timeout es típicamente 1h.
 */
import type { FastifyInstance } from 'fastify';
import { runRoSync, runAsambleaSync } from '../../services/legal-corpus-sync.service.js';

const CRON_SECRET = process.env.CORPUS_SYNC_CRON_SECRET || '';
const SYSTEM_USER_ID = '4d0611a7-3a0e-462c-b2f0-57f10f9bab61'; // admin del sistema

export async function corpusSyncCronRoutes(fastify: FastifyInstance) {
  // ─── Auth helper: secret en lugar de JWT ──────────────────────────
  const requireCronSecret = (request: any, reply: any): boolean => {
    if (!CRON_SECRET) {
      reply.code(500).send({ error: 'CORPUS_SYNC_CRON_SECRET no configurado en el server' });
      return false;
    }
    const auth = request.headers['authorization'] || '';
    const token = auth.startsWith('Bearer ') ? auth.slice(7) : '';
    if (token !== CRON_SECRET) {
      reply.code(401).send({ error: 'Token inválido' });
      return false;
    }
    return true;
  };

  // ─── POST /internal/sync/run-ro ───────────────────────────────────
  fastify.post(
    '/internal/sync/run-ro',
    async (request, reply) => {
      if (!requireCronSecret(request, reply)) return;
      try {
        const result = await runRoSync({
          triggeredBy: 'cron:ro',
          onProgress: () => { /* no SSE, solo log */ },
        });
        return reply.send({ ok: true, ...result });
      } catch (e: any) {
        fastify.log.error({ err: e?.message }, 'cron RO sync failed');
        return reply.code(500).send({ ok: false, error: e?.message || 'unknown' });
      }
    },
  );

  // ─── POST /internal/sync/run-asamblea ─────────────────────────────
  fastify.post<{ Body: { periodo?: string } }>(
    '/internal/sync/run-asamblea',
    async (request, reply) => {
      if (!requireCronSecret(request, reply)) return;
      const periodo = request.body?.periodo;
      try {
        const result = await runAsambleaSync({
          triggeredBy: 'cron:asamblea',
          periodo,
          onProgress: () => { /* no SSE */ },
        });
        return reply.send({ ok: true, ...result });
      } catch (e: any) {
        fastify.log.error({ err: e?.message }, 'cron Asamblea sync failed');
        return reply.code(500).send({ ok: false, error: e?.message || 'unknown' });
      }
    },
  );

  // ─── GET /internal/sync/health ────────────────────────────────────
  // Para que el cron pueda verificar conectividad antes del POST
  fastify.get(
    '/internal/sync/health',
    async (request, reply) => {
      if (!requireCronSecret(request, reply)) return;
      return reply.send({ ok: true, timestamp: new Date().toISOString() });
    },
  );
}

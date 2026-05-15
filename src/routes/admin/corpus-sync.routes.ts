/**
 * Admin routes — Sincronización del corpus jurídico con fuentes externas.
 *
 *   POST /admin/corpus/sync/run-full      (SSE) — todas las fuentes
 *   POST /admin/corpus/sync/run-ro        (SSE) — solo Registro Oficial
 *   POST /admin/corpus/sync/run-asamblea  (SSE) — solo Asamblea Nacional
 *   GET  /admin/corpus/sync/runs          — historial de runs
 *   GET  /admin/corpus/sync/runs/:id      — detalle de un run
 *   GET  /admin/corpus/sync/stats         — KPIs generales
 */
import type { FastifyInstance } from 'fastify';
import { setSseHeaders, startSseKeepalive } from '../../lib/sse-cors.js';
import {
  runFullSync,
  runRoSync,
  runAsambleaSync,
  listSyncRuns,
  getSyncRunDetail,
  getSyncStats,
} from '../../services/legal-corpus-sync.service.js';

export async function corpusSyncRoutes(fastify: FastifyInstance) {
  // ─── Admin guard helper ────────────────────────────────────────────────
  const requireAdmin = async (request: any, reply: any): Promise<boolean> => {
    const user = request.user as { role?: string } | undefined;
    if (!user || (user.role !== 'admin' && user.role !== 'superadmin')) {
      reply.code(403).send({ error: 'Admin role required' });
      return false;
    }
    return true;
  };

  // ─── SSE write helper ──────────────────────────────────────────────────
  const makeSseWriter = (reply: any) => (event: string, data: unknown) => {
    try {
      reply.raw.write(`event: ${event}\n`);
      reply.raw.write(`data: ${JSON.stringify(data)}\n\n`);
    } catch { /* client disconnected */ }
  };

  // ─── POST /admin/corpus/sync/run-full ─────────────────────────────────
  fastify.post<{ Body: { periodo?: string } }>(
    '/admin/corpus/sync/run-full',
    { onRequest: [fastify.authenticate] },
    async (request, reply) => {
      if (!(await requireAdmin(request, reply))) return;
      const userId = (request.user as any).id as string;
      const periodo = request.body?.periodo;

      setSseHeaders(request, reply);
      const stopKa = startSseKeepalive(reply);
      const write = makeSseWriter(reply);

      write('connected', { startedAt: new Date().toISOString(), source: 'full' });

      try {
        const result = await runFullSync({
          triggeredBy: `manual:${userId}`,
          asambleaPeriodo: periodo,
          onProgress: (event, data) => write(event, data),
        });
        write('done', { ...result, finishedAt: new Date().toISOString() });
      } catch (e: any) {
        fastify.log.error({ err: e?.message }, 'corpus-sync run-full failed');
        write('error', { error: e?.message || 'Sync failed' });
      } finally {
        stopKa();
        try { reply.raw.end(); } catch { /* ignore */ }
      }
      return reply;
    },
  );

  // ─── POST /admin/corpus/sync/run-ro ───────────────────────────────────
  fastify.post(
    '/admin/corpus/sync/run-ro',
    { onRequest: [fastify.authenticate] },
    async (request, reply) => {
      if (!(await requireAdmin(request, reply))) return;
      const userId = (request.user as any).id as string;

      setSseHeaders(request, reply);
      const stopKa = startSseKeepalive(reply);
      const write = makeSseWriter(reply);

      write('connected', { startedAt: new Date().toISOString(), source: 'ro' });

      try {
        const result = await runRoSync({
          triggeredBy: `manual:${userId}`,
          onProgress: (event, data) => write(event, data),
        });
        write('done', { ...result, finishedAt: new Date().toISOString() });
      } catch (e: any) {
        fastify.log.error({ err: e?.message }, 'corpus-sync run-ro failed');
        write('error', { error: e?.message || 'RO sync failed' });
      } finally {
        stopKa();
        try { reply.raw.end(); } catch { /* ignore */ }
      }
      return reply;
    },
  );

  // ─── POST /admin/corpus/sync/run-asamblea ─────────────────────────────
  fastify.post<{ Body: { periodo?: string } }>(
    '/admin/corpus/sync/run-asamblea',
    { onRequest: [fastify.authenticate] },
    async (request, reply) => {
      if (!(await requireAdmin(request, reply))) return;
      const userId = (request.user as any).id as string;
      const periodo = request.body?.periodo;

      setSseHeaders(request, reply);
      const stopKa = startSseKeepalive(reply);
      const write = makeSseWriter(reply);

      write('connected', { startedAt: new Date().toISOString(), source: 'asamblea' });

      try {
        const result = await runAsambleaSync({
          triggeredBy: `manual:${userId}`,
          periodo,
          onProgress: (event, data) => write(event, data),
        });
        write('done', { ...result, finishedAt: new Date().toISOString() });
      } catch (e: any) {
        fastify.log.error({ err: e?.message }, 'corpus-sync run-asamblea failed');
        write('error', { error: e?.message || 'Asamblea sync failed' });
      } finally {
        stopKa();
        try { reply.raw.end(); } catch { /* ignore */ }
      }
      return reply;
    },
  );

  // ─── GET /admin/corpus/sync/runs ──────────────────────────────────────
  fastify.get<{ Querystring: { limit?: string } }>(
    '/admin/corpus/sync/runs',
    { onRequest: [fastify.authenticate] },
    async (request, reply) => {
      if (!(await requireAdmin(request, reply))) return;
      const limit = Math.min(100, Math.max(1, parseInt(request.query.limit ?? '20', 10)));
      const runs = await listSyncRuns(limit);
      return reply.send({
        runs,
        total: runs.length,
      });
    },
  );

  // ─── GET /admin/corpus/sync/runs/:id ──────────────────────────────────
  fastify.get<{ Params: { id: string } }>(
    '/admin/corpus/sync/runs/:id',
    { onRequest: [fastify.authenticate] },
    async (request, reply) => {
      if (!(await requireAdmin(request, reply))) return;
      const detail = await getSyncRunDetail(request.params.id);
      if (!detail) return reply.code(404).send({ error: 'Run no encontrado' });
      return reply.send(detail);
    },
  );

  // ─── GET /admin/corpus/sync/stats ─────────────────────────────────────
  fastify.get(
    '/admin/corpus/sync/stats',
    { onRequest: [fastify.authenticate] },
    async (request, reply) => {
      if (!(await requireAdmin(request, reply))) return;
      const stats = await getSyncStats();
      return reply.send(stats);
    },
  );
}

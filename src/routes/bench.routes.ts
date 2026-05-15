/**
 * Poweria Bench — rutas.
 *
 *   GET  /bench/tasks        (admin)   — dataset de tareas
 *   POST /bench/runs         (admin)   — inicia una evaluación (background)
 *   GET  /bench/runs         (admin)   — historial de ejecuciones
 *   GET  /bench/runs/:id     (admin)   — detalle + resultados (polling)
 *   GET  /bench/leaderboard  (público) — última evaluación pública
 *
 * Las evaluaciones corren en segundo plano: POST /runs devuelve el runId
 * de inmediato y el frontend hace polling sobre GET /runs/:id.
 */
import type { FastifyInstance } from 'fastify';
import {
  startBenchRun,
  listBenchRuns,
  getBenchRunDetail,
  getPublicLeaderboard,
  listBenchTasks,
  hasRunningBench,
} from '../services/bench/bench-runner.service.js';

export async function benchRoutes(fastify: FastifyInstance) {
  const requireAdmin = async (request: any, reply: any): Promise<boolean> => {
    const user = request.user as { role?: string } | undefined;
    if (!user || (user.role !== 'admin' && user.role !== 'superadmin')) {
      reply.code(403).send({ error: 'Se requiere rol de administrador.' });
      return false;
    }
    return true;
  };

  // ─── GET /bench/leaderboard (público) ────────────────────────────────
  fastify.get('/bench/leaderboard', async (_request, reply) => {
    const data = await getPublicLeaderboard();
    if (!data) {
      return reply.send({ available: false, run: null, results: [] });
    }
    // No exponemos las respuestas completas en el endpoint público.
    const results = data.results.map((r: any) => ({
      taskId: r.taskId,
      category: r.category,
      difficulty: r.difficulty,
      taskType: r.taskType,
      score: r.score,
      verdict: r.verdict,
      normsExpected: r.normsExpected,
      normsFound: r.normsFound,
      citationsVerified: r.citationsVerified,
      citationsUnverified: r.citationsUnverified,
    }));
    return reply.send({ available: true, run: data.run, results });
  });

  // ─── GET /bench/tasks ────────────────────────────────────────────────
  fastify.get(
    '/bench/tasks',
    { onRequest: [fastify.authenticate] },
    async (request, reply) => {
      if (!(await requireAdmin(request, reply))) return;
      const tasks = await listBenchTasks();
      return reply.send({ tasks, total: tasks.length });
    },
  );

  // ─── POST /bench/runs ────────────────────────────────────────────────
  fastify.post<{ Body: { useRag?: boolean; isPublic?: boolean; notes?: string } }>(
    '/bench/runs',
    { onRequest: [fastify.authenticate] },
    async (request, reply) => {
      if (!(await requireAdmin(request, reply))) return;

      if (await hasRunningBench()) {
        return reply.code(409).send({
          error: 'Ya hay una evaluación en curso. Esperá a que termine antes de iniciar otra.',
        });
      }

      const userId = (request.user as any)?.id as string | undefined;
      const useRag = request.body?.useRag !== false; // default true
      const isPublic = request.body?.isPublic === true;
      const notes = (request.body?.notes || '').trim().slice(0, 500) || null;

      try {
        const { runId, totalTasks } = await startBenchRun({
          triggeredBy: userId ?? null,
          useRag,
          isPublic,
          notes,
        });
        return reply.send({ runId, totalTasks, status: 'running' });
      } catch (e: any) {
        fastify.log.error({ err: e?.message }, 'bench run start failed');
        return reply.code(500).send({ error: e?.message || 'No se pudo iniciar la evaluación.' });
      }
    },
  );

  // ─── GET /bench/runs ─────────────────────────────────────────────────
  fastify.get<{ Querystring: { limit?: string } }>(
    '/bench/runs',
    { onRequest: [fastify.authenticate] },
    async (request, reply) => {
      if (!(await requireAdmin(request, reply))) return;
      const limit = Math.min(100, Math.max(1, parseInt(request.query.limit ?? '25', 10)));
      const runs = await listBenchRuns(limit);
      return reply.send({ runs, total: runs.length });
    },
  );

  // ─── GET /bench/runs/:id ─────────────────────────────────────────────
  fastify.get<{ Params: { id: string } }>(
    '/bench/runs/:id',
    { onRequest: [fastify.authenticate] },
    async (request, reply) => {
      if (!(await requireAdmin(request, reply))) return;
      const detail = await getBenchRunDetail(request.params.id);
      if (!detail) return reply.code(404).send({ error: 'Ejecución no encontrada.' });
      return reply.send(detail);
    },
  );
}

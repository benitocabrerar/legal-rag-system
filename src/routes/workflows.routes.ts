/**
 * Workflow Studio — rutas.
 *
 *   GET  /workflows/templates     — catálogo de plantillas del sistema
 *   POST /workflows/run    (SSE)  — ejecuta un workflow con progreso en vivo
 *   GET  /workflows/runs          — historial del usuario
 *   GET  /workflows/runs/:id      — detalle de una ejecución
 *
 * Todas requieren JWT de usuario.
 */
import type { FastifyInstance } from 'fastify';
import { setSseHeaders, startSseKeepalive } from '../lib/sse-cors.js';
import { WORKFLOW_TEMPLATES, getTemplateByKey } from '../services/workflow/templates.js';
import {
  runWorkflow,
  listWorkflowRuns,
  getWorkflowRunDetail,
} from '../services/workflow/workflow-engine.service.js';

export async function workflowRoutes(fastify: FastifyInstance) {
  // ─── GET /workflows/templates ────────────────────────────────────────
  fastify.get(
    '/workflows/templates',
    { onRequest: [fastify.authenticate] },
    async (_request, reply) => {
      // Devolvemos la metadata, no la mecánica interna de los pasos.
      const templates = WORKFLOW_TEMPLATES.map((t) => ({
        key: t.key,
        name: t.name,
        description: t.description,
        icon: t.icon,
        category: t.category,
        inputLabel: t.inputLabel,
        inputPlaceholder: t.inputPlaceholder,
        steps: t.steps.map((s) => ({ id: s.id, name: s.name, type: s.type })),
      }));
      return reply.send({ templates, total: templates.length });
    },
  );

  // ─── POST /workflows/run (SSE) ───────────────────────────────────────
  fastify.post<{ Body: { templateKey?: string; input?: string; caseId?: string } }>(
    '/workflows/run',
    { onRequest: [fastify.authenticate] },
    async (request, reply) => {
      const userId = (request.user as any)?.id as string;
      if (!userId) return reply.code(401).send({ error: 'No autenticado' });

      const templateKey = (request.body?.templateKey || '').trim();
      const input = (request.body?.input || '').trim();
      const caseId = request.body?.caseId || null;

      const template = getTemplateByKey(templateKey);
      if (!template) {
        return reply.code(404).send({ error: 'Plantilla de workflow no encontrada.' });
      }
      if (input.length < 5) {
        return reply.code(400).send({ error: 'La entrada es demasiado corta. Describí tu consulta con más detalle.' });
      }

      setSseHeaders(request, reply);
      const stopKa = startSseKeepalive(reply);
      const write = (event: string, data: unknown) => {
        try {
          reply.raw.write(`event: ${event}\n`);
          reply.raw.write(`data: ${JSON.stringify(data)}\n\n`);
        } catch { /* cliente desconectado */ }
      };

      write('connected', { startedAt: new Date().toISOString(), template: template.name });

      try {
        await runWorkflow(template, input, {
          userId,
          caseId,
          onProgress: (ev) => write(ev.event, ev),
        });
      } catch (e: any) {
        fastify.log.error({ err: e?.message }, 'workflow run failed');
        write('run-error', { error: e?.message || 'Error ejecutando el workflow' });
      } finally {
        stopKa();
        try { reply.raw.end(); } catch { /* ignore */ }
      }
      return reply;
    },
  );

  // ─── GET /workflows/runs ─────────────────────────────────────────────
  fastify.get<{ Querystring: { limit?: string } }>(
    '/workflows/runs',
    { onRequest: [fastify.authenticate] },
    async (request, reply) => {
      const userId = (request.user as any)?.id as string;
      if (!userId) return reply.code(401).send({ error: 'No autenticado' });

      const limit = Math.min(100, Math.max(1, parseInt(request.query.limit ?? '20', 10)));
      const runs = await listWorkflowRuns(userId, limit);
      return reply.send({ runs, total: runs.length });
    },
  );

  // ─── GET /workflows/runs/:id ─────────────────────────────────────────
  fastify.get<{ Params: { id: string } }>(
    '/workflows/runs/:id',
    { onRequest: [fastify.authenticate] },
    async (request, reply) => {
      const userId = (request.user as any)?.id as string;
      if (!userId) return reply.code(401).send({ error: 'No autenticado' });

      const detail = await getWorkflowRunDetail(userId, request.params.id);
      if (!detail) return reply.code(404).send({ error: 'Ejecución no encontrada.' });
      return reply.send(detail);
    },
  );
}

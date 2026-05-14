/**
 * Admin · Corpus Audit Routes
 *
 *   POST /admin/corpus/audit-full          (SSE) corre auditoría completa
 *   GET  /admin/corpus/audit-runs          historial de runs
 *   GET  /admin/corpus/audit-runs/:id      detalle de un run + items
 *   GET  /admin/corpus/audit-report/:id    descarga HTML del informe
 */
import type { FastifyInstance } from 'fastify';
import fs from 'fs';
import path from 'path';
import { prisma } from '../../lib/prisma.js';
import { runFullAudit } from '../../services/corpus-auditor.service.js';
import { setSseHeaders, startSseKeepalive } from '../../lib/sse-cors.js';

export async function corpusAuditRoutes(fastify: FastifyInstance) {
  // Helper admin guard
  const requireAdmin = async (request: any, reply: any) => {
    const user = request.user;
    if (!user || (user.role !== 'admin' && user.role !== 'superadmin')) {
      reply.code(403).send({ error: 'Admin role required' });
      return false;
    }
    return true;
  };

  // ─── POST /admin/corpus/audit-full (SSE) ───────────────────────────
  fastify.post<{ Body: { confirm?: boolean; dryRun?: boolean; onlyMissing?: boolean } }>(
    '/admin/corpus/audit-full',
    { onRequest: [fastify.authenticate] },
    async (request, reply) => {
      if (!(await requireAdmin(request, reply))) return;
      const userId = (request.user as any).id;

      if (!request.body?.confirm) {
        return reply.code(400).send({
          error: 'Confirmación requerida',
          hint: 'POST con body { "confirm": true } para iniciar. Opcional: dryRun (no ingresa), onlyMissing (salta presentes).',
        });
      }

      setSseHeaders(request, reply);
      const stopKa = startSseKeepalive(reply);
      const write = (event: string, data: any) => {
        try {
          reply.raw.write(`event: ${event}\n`);
          reply.raw.write(`data: ${JSON.stringify(data)}\n\n`);
        } catch { /* client gone */ }
      };

      try {
        const result = await runFullAudit({
          triggeredBy: `manual:${userId}`,
          dryRun: request.body.dryRun === true,
          onlyMissing: request.body.onlyMissing === true,
          onProgress: (event, data) => write(event, data),
        });
        write('completed', { ...result, finishedAt: new Date().toISOString() });
      } catch (e: any) {
        fastify.log.error({ err: e?.message }, 'full corpus audit failed');
        write('error', { error: e?.message || 'Audit failed' });
      } finally {
        stopKa();
        try { reply.raw.end(); } catch { /* ignore */ }
      }
      return reply;
    },
  );

  // ─── GET /admin/corpus/audit-runs ──────────────────────────────────
  fastify.get<{ Querystring: { limit?: string } }>(
    '/admin/corpus/audit-runs',
    { onRequest: [fastify.authenticate] },
    async (request, reply) => {
      if (!(await requireAdmin(request, reply))) return;
      const limit = Math.min(100, Math.max(5, parseInt(request.query.limit || '20', 10)));
      const rows = await prisma.$queryRawUnsafe<any[]>(
        `SELECT id, started_at, completed_at, triggered_by, status,
                total_expected, total_present, total_missing,
                total_ingested_ok, total_ingested_fail,
                total_chunks_added, catalog_version, html_report_path
           FROM public.corpus_audit_runs
          ORDER BY started_at DESC
          LIMIT $1`,
        limit,
      );
      return reply.send({ runs: rows });
    },
  );

  // ─── GET /admin/corpus/audit-runs/:id ──────────────────────────────
  fastify.get<{ Params: { id: string } }>(
    '/admin/corpus/audit-runs/:id',
    { onRequest: [fastify.authenticate] },
    async (request, reply) => {
      if (!(await requireAdmin(request, reply))) return;
      const runs = await prisma.$queryRawUnsafe<any[]>(
        `SELECT * FROM public.corpus_audit_runs WHERE id = $1::uuid`,
        request.params.id,
      );
      if (runs.length === 0) return reply.code(404).send({ error: 'Run no encontrado' });

      const items = await prisma.$queryRawUnsafe<any[]>(
        `SELECT id, canonical_name, short_name, norm_type, legal_hierarchy,
                category, status, matched_legal_doc_id, match_similarity,
                match_method, remote_search_url, remote_pdf_url,
                chunks_created, embeddings_generated, embeddings_vectorized,
                ingestion_duration_ms, error_message
           FROM public.corpus_audit_items
          WHERE run_id = $1::uuid
          ORDER BY
            CASE legal_hierarchy
              WHEN 'CONSTITUCION'       THEN 0
              WHEN 'CODIGOS_ORGANICOS'  THEN 1
              WHEN 'LEYES_ORGANICAS'    THEN 2
              WHEN 'CODIGOS_ORDINARIOS' THEN 3
              WHEN 'LEYES_ORDINARIAS'   THEN 4
              ELSE 5
            END,
            category, canonical_name`,
        request.params.id,
      );

      return reply.send({ run: runs[0], items });
    },
  );

  // ─── GET /admin/corpus/audit-report/:id ────────────────────────────
  // Devuelve el HTML del informe como descarga.
  fastify.get<{ Params: { id: string } }>(
    '/admin/corpus/audit-report/:id',
    { onRequest: [fastify.authenticate] },
    async (request, reply) => {
      if (!(await requireAdmin(request, reply))) return;
      const runs = await prisma.$queryRawUnsafe<Array<{ html_report_path: string | null }>>(
        `SELECT html_report_path FROM public.corpus_audit_runs WHERE id = $1::uuid`,
        request.params.id,
      );
      if (runs.length === 0 || !runs[0].html_report_path) {
        return reply.code(404).send({ error: 'Reporte no disponible para este run' });
      }
      const filepath = runs[0].html_report_path;
      if (!fs.existsSync(filepath)) {
        return reply.code(404).send({ error: 'Archivo de reporte no encontrado en disco' });
      }
      const filename = path.basename(filepath);
      const stream = fs.createReadStream(filepath);
      return reply
        .header('Content-Type', 'text/html; charset=utf-8')
        .header('Content-Disposition', `attachment; filename="${filename}"`)
        .send(stream);
    },
  );
}

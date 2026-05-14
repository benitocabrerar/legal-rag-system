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
import { runBulkIngestion } from '../../services/bulk-ingestion-runner.service.js';
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

  // ═══════════════ BULK INGESTION ENDPOINTS ════════════════════════════
  //
  //   POST /admin/corpus/bulk-ingest          (SSE) ingesta múltiples pubs
  //   GET  /admin/corpus/ingestion-runs       historial
  //   GET  /admin/corpus/ingestion-runs/:id   detalle + items
  //   GET  /admin/corpus/ingestion-report/:id descarga HTML

  // ─── POST /admin/corpus/bulk-ingest (SSE) ──────────────────────────
  fastify.post<{ Body: { publicationIds?: string[]; allAnalyzed?: boolean } }>(
    '/admin/corpus/bulk-ingest',
    { onRequest: [fastify.authenticate] },
    async (request, reply) => {
      if (!(await requireAdmin(request, reply))) return;
      const userId = (request.user as any).id;
      const body = request.body || {};

      let publicationIds = body.publicationIds || [];
      if (body.allAnalyzed) {
        const rows = await prisma.$queryRawUnsafe<Array<{ id: string }>>(
          `SELECT id FROM public.registry_publications
            WHERE status = 'analyzed' AND ingested_legal_doc_id IS NULL
            ORDER BY created_at DESC LIMIT 200`,
        );
        publicationIds = rows.map((r) => r.id);
      }
      if (publicationIds.length === 0) {
        return reply.code(400).send({ error: 'Sin publicaciones para ingestar' });
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
        const result = await runBulkIngestion({
          publicationIds,
          userId,
          triggeredBy: `manual:${userId}`,
          source: 'bulk-approve',
          onProgress: (event, data) => write(event, data),
        });
        write('done', { ...result, finishedAt: new Date().toISOString() });
      } catch (e: any) {
        fastify.log.error({ err: e?.message }, 'bulk ingest failed');
        write('error', { error: e?.message || 'Bulk ingest failed' });
      } finally {
        stopKa();
        try { reply.raw.end(); } catch { /* ignore */ }
      }
      return reply;
    },
  );

  // ─── GET /admin/corpus/ingestion-runs ──────────────────────────────
  fastify.get<{ Querystring: { limit?: string; source?: string } }>(
    '/admin/corpus/ingestion-runs',
    { onRequest: [fastify.authenticate] },
    async (request, reply) => {
      if (!(await requireAdmin(request, reply))) return;
      const limit = Math.min(100, Math.max(5, parseInt(request.query.limit || '30', 10)));
      const conditions: string[] = ['1=1'];
      const params: any[] = [];
      if (request.query.source) { params.push(request.query.source); conditions.push(`source = $${params.length}`); }
      params.push(limit);
      const limitIdx = params.length;

      const runs = await prisma.$queryRawUnsafe<any[]>(
        `SELECT id, started_at, completed_at, triggered_by, source, status,
                total_requested, total_succeeded, total_failed,
                total_chunks, total_embeddings, total_vectorized,
                total_notified_users, total_duration_ms,
                count_constitucion, count_codigos_organicos, count_leyes_organicas,
                count_codigos_ordinarios, count_leyes_ordinarias, count_reglamentos,
                count_otros, html_report_path
           FROM public.corpus_ingestion_runs
          WHERE ${conditions.join(' AND ')}
          ORDER BY started_at DESC
          LIMIT $${limitIdx}`,
        ...params,
      );

      // Stats agregados (global, no por run).
      // COALESCE necesario porque SUM() sobre 0 rows devuelve NULL en
      // Postgres, lo que hace que el frontend reciba null y crashee al
      // llamar (null).toLocaleString().
      const aggregate = await prisma.$queryRawUnsafe<Array<any>>(
        `SELECT
           COUNT(*)::int                              AS total_runs,
           COALESCE(SUM(total_succeeded), 0)::int     AS total_normas_incorporadas,
           COALESCE(SUM(total_chunks), 0)::int        AS total_chunks_creados,
           COALESCE(SUM(total_notified_users), 0)::int AS total_notifs_emitidas,
           COALESCE(SUM(count_constitucion), 0)::int       AS sum_constitucion,
           COALESCE(SUM(count_codigos_organicos), 0)::int  AS sum_codigos_organicos,
           COALESCE(SUM(count_leyes_organicas), 0)::int    AS sum_leyes_organicas,
           COALESCE(SUM(count_codigos_ordinarios), 0)::int AS sum_codigos_ordinarios,
           COALESCE(SUM(count_leyes_ordinarias), 0)::int   AS sum_leyes_ordinarias,
           COALESCE(SUM(count_reglamentos), 0)::int        AS sum_reglamentos
           FROM public.corpus_ingestion_runs
          WHERE status = 'completed'`,
      );

      return reply.send({ runs, aggregate: aggregate[0] || {} });
    },
  );

  // ─── GET /admin/corpus/ingestion-runs/:id ──────────────────────────
  fastify.get<{ Params: { id: string } }>(
    '/admin/corpus/ingestion-runs/:id',
    { onRequest: [fastify.authenticate] },
    async (request, reply) => {
      if (!(await requireAdmin(request, reply))) return;
      const runs = await prisma.$queryRawUnsafe<any[]>(
        `SELECT * FROM public.corpus_ingestion_runs WHERE id = $1::uuid`,
        request.params.id,
      );
      if (runs.length === 0) return reply.code(404).send({ error: 'Run no encontrado' });

      const items = await prisma.$queryRawUnsafe<any[]>(
        `SELECT i.*, ld.norm_title
           FROM public.corpus_ingestion_items i
           LEFT JOIN public.legal_documents ld ON ld.id = i.legal_doc_id
          WHERE i.run_id = $1::uuid
          ORDER BY i.sequence_index ASC`,
        request.params.id,
      );

      return reply.send({ run: runs[0], items });
    },
  );

  // ─── GET /admin/corpus/ingestion-report/:id ────────────────────────
  fastify.get<{ Params: { id: string } }>(
    '/admin/corpus/ingestion-report/:id',
    { onRequest: [fastify.authenticate] },
    async (request, reply) => {
      if (!(await requireAdmin(request, reply))) return;
      const runs = await prisma.$queryRawUnsafe<Array<{ html_report_path: string | null }>>(
        `SELECT html_report_path FROM public.corpus_ingestion_runs WHERE id = $1::uuid`,
        request.params.id,
      );
      if (runs.length === 0 || !runs[0].html_report_path) {
        // Re-generar on-demand si no existe
        try {
          const { generateIngestionHtmlReport } = await import('../../services/corpus-ingestion-report.service.js');
          const newPath = await generateIngestionHtmlReport(request.params.id);
          await prisma.$executeRawUnsafe(
            `UPDATE public.corpus_ingestion_runs SET html_report_path = $2 WHERE id = $1::uuid`,
            request.params.id, newPath,
          );
          const filename = path.basename(newPath);
          const stream = fs.createReadStream(newPath);
          return reply
            .header('Content-Type', 'text/html; charset=utf-8')
            .header('Content-Disposition', `attachment; filename="${filename}"`)
            .send(stream);
        } catch (e: any) {
          return reply.code(404).send({ error: 'Reporte no disponible', detail: e?.message });
        }
      }
      const filepath = runs[0].html_report_path!;
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

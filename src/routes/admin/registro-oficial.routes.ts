/**
 * Admin routes para gestión del scraper del Registro Oficial Ecuador.
 *
 * Endpoints:
 *   GET    /admin/registro-oficial/scans          — historial de scans
 *   GET    /admin/registro-oficial/publications   — lista paginada con filtros
 *   GET    /admin/registro-oficial/publications/:id  — detalle de una pub
 *   POST   /admin/registro-oficial/publications/:id/approve  — vectoriza al corpus
 *   POST   /admin/registro-oficial/publications/:id/reject   — descarta
 *   POST   /admin/registro-oficial/publications/:id/resummarize  — regenera IA
 *   POST   /admin/registro-oficial/scan-now       — dispara scan manual (async)
 *   GET    /admin/registro-oficial/stats          — KPIs del scraper
 */
import { FastifyInstance } from 'fastify';
import { prisma } from '../../lib/prisma.js';
import { runScan } from '../../services/registro-oficial.service.js';
import { setSseHeaders, startSseKeepalive } from '../../lib/sse-cors.js';
import { randomUUID } from 'crypto';

export async function registroOficialAdminRoutes(fastify: FastifyInstance) {
  // Helper: requiere admin role
  const requireAdmin = async (request: any, reply: any) => {
    const user = request.user;
    if (!user || (user.role !== 'admin' && user.role !== 'superadmin')) {
      reply.code(403).send({ error: 'Admin role required' });
      return false;
    }
    return true;
  };

  // ─── GET /admin/registro-oficial/stats ─────────────────────────────────
  fastify.get('/admin/registro-oficial/stats', {
    onRequest: [fastify.authenticate],
  }, async (request, reply) => {
    if (!(await requireAdmin(request, reply))) return;

    const [counts, lastScan, byType] = await Promise.all([
      prisma.$queryRawUnsafe<Array<{ status: string; n: bigint }>>(
        `SELECT status, COUNT(*)::bigint AS n
           FROM public.registry_publications
          GROUP BY status`,
      ),
      prisma.$queryRawUnsafe<Array<{
        id: string; started_at: Date; completed_at: Date | null;
        status: string; editions_found: number; publications_found: number;
      }>>(
        `SELECT id, started_at, completed_at, status, editions_found, publications_found
           FROM public.registry_scans
          ORDER BY started_at DESC LIMIT 1`,
      ),
      prisma.$queryRawUnsafe<Array<{ publication_type: string; n: bigint }>>(
        `SELECT publication_type, COUNT(*)::bigint AS n
           FROM public.registry_publications
          WHERE created_at >= now() - interval '30 days'
          GROUP BY publication_type
          ORDER BY n DESC`,
      ),
    ]);

    const statusMap: Record<string, number> = {};
    for (const c of counts) statusMap[c.status] = Number(c.n);

    return reply.send({
      total: Object.values(statusMap).reduce((a, b) => a + b, 0),
      byStatus: statusMap,
      lastScan: lastScan[0] ? {
        ...lastScan[0],
        editionsFound: lastScan[0].editions_found,
        publicationsFound: lastScan[0].publications_found,
      } : null,
      byTypeLast30d: byType.map((r) => ({ type: r.publication_type, count: Number(r.n) })),
    });
  });

  // ─── GET /admin/registro-oficial/scans ─────────────────────────────────
  fastify.get('/admin/registro-oficial/scans', {
    onRequest: [fastify.authenticate],
  }, async (request, reply) => {
    if (!(await requireAdmin(request, reply))) return;

    const scans = await prisma.$queryRawUnsafe<Array<any>>(
      `SELECT id, started_at, completed_at, status, editions_found,
              publications_found, triggered_by, errors
         FROM public.registry_scans
        ORDER BY started_at DESC
        LIMIT 50`,
    );
    return reply.send({ scans });
  });

  // ─── GET /admin/registro-oficial/publications ──────────────────────────
  fastify.get<{ Querystring: { status?: string; type?: string; q?: string; limit?: string } }>(
    '/admin/registro-oficial/publications',
    { onRequest: [fastify.authenticate] },
    async (request, reply) => {
      if (!(await requireAdmin(request, reply))) return;

      const { status, type, q, limit } = request.query;
      const limitNum = Math.min(200, Math.max(10, parseInt(limit || '50', 10)));

      const conditions: string[] = ['1=1'];
      const params: any[] = [];
      if (status) { params.push(status); conditions.push(`status = $${params.length}`); }
      if (type) { params.push(type); conditions.push(`publication_type = $${params.length}`); }
      if (q) {
        params.push(`%${q}%`);
        conditions.push(`(title ILIKE $${params.length} OR ai_summary ILIKE $${params.length})`);
      }
      params.push(limitNum);

      const pubs = await prisma.$queryRawUnsafe<any[]>(
        `SELECT id, edition_number, edition_date, edition_url, edition_pdf_url,
                publication_type, publication_number, title, issuing_entity,
                ai_summary, ai_classification, ai_relevance_score, ai_keywords,
                status, reviewed_at, ingested_legal_doc_id, chunks_created,
                created_at, updated_at
           FROM public.registry_publications
          WHERE ${conditions.join(' AND ')}
          ORDER BY
            CASE status
              WHEN 'analyzed' THEN 0
              WHEN 'detected' THEN 1
              WHEN 'approved' THEN 2
              WHEN 'ingested' THEN 3
              ELSE 4
            END,
            (ai_relevance_score)::float DESC NULLS LAST,
            edition_date DESC
          LIMIT $${params.length}`,
        ...params,
      );

      return reply.send({ publications: pubs });
    },
  );

  // ─── GET /admin/registro-oficial/publications/:id ──────────────────────
  fastify.get<{ Params: { id: string } }>(
    '/admin/registro-oficial/publications/:id',
    { onRequest: [fastify.authenticate] },
    async (request, reply) => {
      if (!(await requireAdmin(request, reply))) return;

      const rows = await prisma.$queryRawUnsafe<any[]>(
        `SELECT * FROM public.registry_publications WHERE id = $1`,
        request.params.id,
      );
      if (rows.length === 0) return reply.code(404).send({ error: 'Not found' });
      return reply.send({ publication: rows[0] });
    },
  );

  // ─── POST /admin/registro-oficial/publications/:id/approve ─────────────
  // Vectoriza al corpus legal (legal_documents + legal_document_chunks)
  fastify.post<{ Params: { id: string } }>(
    '/admin/registro-oficial/publications/:id/approve',
    { onRequest: [fastify.authenticate] },
    async (request, reply) => {
      if (!(await requireAdmin(request, reply))) return;
      const userId = (request.user as any).id;

      const rows = await prisma.$queryRawUnsafe<any[]>(
        `SELECT * FROM public.registry_publications WHERE id = $1`,
        request.params.id,
      );
      if (rows.length === 0) return reply.code(404).send({ error: 'Not found' });
      const pub = rows[0];

      if (pub.status === 'ingested') {
        return reply.send({ ok: true, alreadyIngested: true, legalDocId: pub.ingested_legal_doc_id });
      }

      try {
        // Crear entrada en legal_documents
        const docId = randomUUID();
        const title = `${pub.publication_type === 'ley_organica' ? 'Ley Orgánica' :
                        pub.publication_type === 'ley_ordinaria' ? 'Ley' :
                        pub.publication_type === 'decreto_ejecutivo' ? 'Decreto Ejecutivo' :
                        pub.publication_type === 'acuerdo_ministerial' ? 'Acuerdo Ministerial' :
                        pub.publication_type === 'resolucion' ? 'Resolución' :
                        pub.publication_type === 'reglamento' ? 'Reglamento' :
                        'Norma'} ${pub.publication_number ? `Nº ${pub.publication_number}` : ''} — ${pub.title}`.slice(0, 500);

        // Schema real de legal_documents: id, title, content, norm_type,
        // norm_title, publication_type, publication_number, publication_date,
        // jurisdiction, country_code, category, uploaded_by, metadata.
        // NO existen: source_url, published_at. La URL del PDF y otros
        // datos van adentro de metadata.
        await prisma.$executeRawUnsafe(
          `INSERT INTO public.legal_documents
             (id, title, norm_title, content, norm_type, publication_type,
              publication_number, publication_date, jurisdiction, country_code,
              category, uploaded_by, is_active, metadata, created_at, updated_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, true, $13::jsonb, now(), now())`,
          docId,
          title.trim(),
          (pub.title || '').slice(0, 500),
          pub.raw_text_excerpt,
          pub.publication_type || 'general',
          pub.publication_type,
          pub.publication_number,
          pub.edition_date,
          'national',
          'EC',
          pub.ai_classification || 'general',
          userId,
          JSON.stringify({
            source: 'registro_oficial_ec',
            editionNumber: pub.edition_number,
            editionUrl: pub.edition_url,
            editionPdfUrl: pub.edition_pdf_url,
            issuingEntity: pub.issuing_entity,
            aiClassification: pub.ai_classification,
            aiKeywords: pub.ai_keywords,
            aiSummary: pub.ai_summary,
            registryPublicationId: pub.id,
            approvedBy: userId,
            approvedAt: new Date().toISOString(),
          }),
        );

        // Marcar como ingestado (la vectorización del texto se dispara aparte via job)
        await prisma.$executeRawUnsafe(
          `UPDATE public.registry_publications
             SET status = 'ingested',
                 reviewed_by = $2,
                 reviewed_at = now(),
                 ingested_legal_doc_id = $3,
                 ingested_at = now()
           WHERE id = $1`,
          request.params.id, userId, docId,
        );

        return reply.send({
          ok: true,
          legalDocId: docId,
          note: 'Documento agregado al corpus. La vectorización se procesará en background.',
        });
      } catch (e: any) {
        fastify.log.error({ err: e?.message }, 'approve publication failed');
        return reply.code(500).send({ error: e?.message || 'Error al aprobar' });
      }
    },
  );

  // ─── POST /admin/registro-oficial/publications/:id/reject ──────────────
  fastify.post<{ Params: { id: string }; Body: { reason?: string } }>(
    '/admin/registro-oficial/publications/:id/reject',
    { onRequest: [fastify.authenticate] },
    async (request, reply) => {
      if (!(await requireAdmin(request, reply))) return;
      const userId = (request.user as any).id;
      const reason = (request.body?.reason || '').slice(0, 500);

      await prisma.$executeRawUnsafe(
        `UPDATE public.registry_publications
           SET status = 'rejected',
               reviewed_by = $2,
               reviewed_at = now(),
               rejection_reason = $3
         WHERE id = $1`,
        request.params.id, userId, reason,
      );
      return reply.send({ ok: true });
    },
  );

  // ─── GET /admin/registro-oficial/ingestion-log ─────────────────────────
  // Lista detallada de TODAS las publicaciones que fueron ingestadas al
  // corpus legal vectorizado (status='ingested'). Incluye join a
  // legal_documents y legal_document_chunks para reportar tamaño real
  // del texto + chunks generados.
  fastify.get<{ Querystring: { limit?: string; q?: string } }>(
    '/admin/registro-oficial/ingestion-log',
    { onRequest: [fastify.authenticate] },
    async (request, reply) => {
      if (!(await requireAdmin(request, reply))) return;
      const limit = Math.min(500, Math.max(10, parseInt(request.query.limit || '100', 10)));
      const q = (request.query.q || '').trim();

      const conditions: string[] = ["rp.status = 'ingested'", 'rp.ingested_legal_doc_id IS NOT NULL'];
      const params: any[] = [];
      if (q) {
        params.push(`%${q}%`);
        conditions.push(`(rp.title ILIKE $${params.length} OR rp.ai_summary ILIKE $${params.length} OR ld.title ILIKE $${params.length})`);
      }
      params.push(limit);

      const rows = await prisma.$queryRawUnsafe<Array<{
        publication_id: string;
        legal_doc_id: string | null;
        legal_doc_title: string | null;
        legal_doc_norm_type: string | null;
        legal_doc_jurisdiction: string | null;
        publication_date: Date | null;
        edition_number: string | null;
        edition_date: Date | null;
        edition_pdf_url: string | null;
        publication_type: string | null;
        publication_number: string | null;
        title: string;
        issuing_entity: string | null;
        ai_summary: string | null;
        ai_classification: string | null;
        ai_relevance_score: number | null;
        ai_keywords: string[] | null;
        raw_text_length: number | null;
        content_size_bytes: number | null;
        chunks_count: bigint | null;
        reviewed_by: string | null;
        reviewer_email: string | null;
        reviewed_at: Date | null;
        ingested_at: Date | null;
        created_at: Date;
      }>>(
        `SELECT
            rp.id AS publication_id,
            rp.ingested_legal_doc_id AS legal_doc_id,
            ld.title AS legal_doc_title,
            ld.norm_type AS legal_doc_norm_type,
            ld.jurisdiction AS legal_doc_jurisdiction,
            ld.publication_date,
            rp.edition_number,
            rp.edition_date,
            rp.edition_pdf_url,
            rp.publication_type,
            rp.publication_number,
            rp.title,
            rp.issuing_entity,
            rp.ai_summary,
            rp.ai_classification,
            rp.ai_relevance_score,
            rp.ai_keywords,
            rp.raw_text_length,
            OCTET_LENGTH(COALESCE(ld.content, ''))::int AS content_size_bytes,
            (SELECT COUNT(*)::bigint FROM public.legal_document_chunks ldc
              WHERE ldc.legal_document_id = ld.id) AS chunks_count,
            rp.reviewed_by,
            u.email AS reviewer_email,
            rp.reviewed_at,
            rp.ingested_at,
            rp.created_at
          FROM public.registry_publications rp
          LEFT JOIN public.legal_documents ld ON ld.id = rp.ingested_legal_doc_id
          LEFT JOIN public.users u ON u.id = rp.reviewed_by
          WHERE ${conditions.join(' AND ')}
          ORDER BY rp.ingested_at DESC NULLS LAST, rp.created_at DESC
          LIMIT $${params.length}`,
        ...params,
      );

      // Aggregate stats para el header del tab
      const agg = await prisma.$queryRawUnsafe<Array<{
        total: bigint;
        total_bytes: bigint;
        total_chunks: bigint;
        last_24h: bigint;
        last_7d: bigint;
      }>>(
        `SELECT
            COUNT(*)::bigint AS total,
            COALESCE(SUM(OCTET_LENGTH(COALESCE(ld.content, ''))), 0)::bigint AS total_bytes,
            COALESCE(SUM(
              (SELECT COUNT(*) FROM public.legal_document_chunks ldc
                WHERE ldc.legal_document_id = ld.id)
            ), 0)::bigint AS total_chunks,
            COUNT(*) FILTER (WHERE rp.ingested_at >= now() - interval '24 hours')::bigint AS last_24h,
            COUNT(*) FILTER (WHERE rp.ingested_at >= now() - interval '7 days')::bigint AS last_7d
          FROM public.registry_publications rp
          LEFT JOIN public.legal_documents ld ON ld.id = rp.ingested_legal_doc_id
          WHERE rp.status = 'ingested' AND rp.ingested_legal_doc_id IS NOT NULL`,
      );
      const a = agg[0] || { total: 0n, total_bytes: 0n, total_chunks: 0n, last_24h: 0n, last_7d: 0n };

      return reply.send({
        summary: {
          totalIngested: Number(a.total),
          totalBytes: Number(a.total_bytes),
          totalChunks: Number(a.total_chunks),
          last24h: Number(a.last_24h),
          last7d: Number(a.last_7d),
        },
        items: rows.map((r) => ({
          publicationId: r.publication_id,
          legalDocId: r.legal_doc_id,
          legalDocTitle: r.legal_doc_title,
          normType: r.legal_doc_norm_type,
          jurisdiction: r.legal_doc_jurisdiction,
          publishedAt: r.publication_date?.toISOString() ?? null,
          editionNumber: r.edition_number,
          editionDate: r.edition_date?.toISOString() ?? null,
          editionPdfUrl: r.edition_pdf_url,
          publicationType: r.publication_type,
          publicationNumber: r.publication_number,
          title: r.title,
          issuingEntity: r.issuing_entity,
          aiSummary: r.ai_summary,
          aiClassification: r.ai_classification,
          aiRelevanceScore: r.ai_relevance_score,
          aiKeywords: r.ai_keywords || [],
          rawTextLength: r.raw_text_length,
          contentSizeBytes: r.content_size_bytes,
          chunksCount: Number(r.chunks_count || 0),
          reviewedBy: r.reviewed_by,
          reviewerEmail: r.reviewer_email,
          reviewedAt: r.reviewed_at?.toISOString() ?? null,
          ingestedAt: r.ingested_at?.toISOString() ?? null,
          createdAt: r.created_at.toISOString(),
        })),
      });
    },
  );

  // ─── POST /admin/registro-oficial/scan-now ─────────────────────────────
  // SSE con progreso en tiempo real del scan manual. El admin ve cada fase
  // como va ocurriendo: listing → diff → descarga → parse → análisis IA →
  // resumen. Cada publicación individual emite un evento `publication`.
  fastify.post<{ Body: { year?: number } }>(
    '/admin/registro-oficial/scan-now',
    { onRequest: [fastify.authenticate] },
    async (request, reply) => {
      if (!(await requireAdmin(request, reply))) return;
      const userId = (request.user as any).id;
      const year = request.body?.year;

      setSseHeaders(request, reply);
      const stopKeepalive = startSseKeepalive(reply, 1000);
      const write = (event: string, data: any) => {
        try {
          reply.raw.write(`event: ${event}\n`);
          reply.raw.write(`data: ${JSON.stringify(data)}\n\n`);
        } catch { /* client gone */ }
      };

      write('connected', { startedAt: new Date().toISOString() });

      try {
        const result = await runScan({
          triggeredBy: `manual:${userId}`,
          year,
          onProgress: (event, data) => write(event, data),
        });
        write('done', {
          scanId: result.scanId,
          editionsFound: result.editionsFound,
          publicationsFound: result.publicationsFound,
          errors: result.errors,
          finishedAt: new Date().toISOString(),
        });
      } catch (e: any) {
        fastify.log.error({ err: e?.message }, 'manual scan failed');
        write('error', { error: e?.message || 'Scan failed' });
      } finally {
        stopKeepalive();
        try { reply.raw.end(); } catch { /* ignore */ }
      }
      return reply;
    },
  );
}

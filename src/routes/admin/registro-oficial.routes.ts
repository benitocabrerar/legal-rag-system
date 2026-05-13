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

        await prisma.$executeRawUnsafe(
          `INSERT INTO public.legal_documents
             (id, title, content, norm_type, jurisdiction, country_code,
              source_url, published_at, metadata, created_at, updated_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9::jsonb, now(), now())`,
          docId,
          title.trim(),
          pub.raw_text_excerpt,
          pub.publication_type,
          'national',
          'EC',
          pub.edition_pdf_url || pub.edition_url,
          pub.edition_date,
          JSON.stringify({
            source: 'registro_oficial_ec',
            editionNumber: pub.edition_number,
            issuingEntity: pub.issuing_entity,
            aiClassification: pub.ai_classification,
            aiKeywords: pub.ai_keywords,
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

  // ─── POST /admin/registro-oficial/scan-now ─────────────────────────────
  // Dispara un scan manual de forma asíncrona
  fastify.post<{ Body: { year?: number } }>(
    '/admin/registro-oficial/scan-now',
    { onRequest: [fastify.authenticate] },
    async (request, reply) => {
      if (!(await requireAdmin(request, reply))) return;
      const userId = (request.user as any).id;
      const year = request.body?.year;

      // No esperamos a que termine — corre en background
      void runScan({ triggeredBy: `manual:${userId}`, year })
        .catch((e) => fastify.log.error({ err: e?.message }, 'manual scan failed'));

      return reply.send({ ok: true, message: 'Scan disparado en background — ver /scans en 1-3 minutos' });
    },
  );
}

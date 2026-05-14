/**
 * GET  /api/v1/admin/embeddings        — lista de docs con estado de vectorización
 * GET  /api/v1/admin/embeddings/stats  — totales globales
 * POST /api/v1/admin/embeddings/test-search — query de prueba al RAG
 *
 * Solo admin. Antes la ruta solo exigía autenticación, lo que dejaba que
 * cualquier abogado/cliente leyera el inventario completo de documentos
 * legales y consultara el corpus directamente. Cerramos con un guard de
 * rol además del onRequest authenticate.
 */
import type { FastifyInstance } from 'fastify';
import { prisma } from '../../lib/prisma.js';
import { LegalDocumentService } from '../../services/legal-document-service.js';
import { setSseHeaders, startSseKeepalive } from '../../lib/sse-cors.js';

async function requireAdmin(request: any, reply: any) {
  const user = request.user;
  if (!user || user.role !== 'admin') {
    return reply.code(403).send({ error: 'Forbidden — admin only' });
  }
}

export async function adminEmbeddingsRoutes(fastify: FastifyInstance) {
  fastify.addHook('onRequest', (fastify as any).authenticate);
  // Defensa en profundidad: también validamos rol antes de cualquier handler.
  fastify.addHook('preHandler', requireAdmin);

  // STATS
  fastify.get('/admin/embeddings/stats', async (_req, reply) => {
    try {
      const [vectorCount, docCount, pending, sample] = await Promise.all([
        prisma.legalDocumentChunk.count({ where: { embeddingV: { not: null } } } as any).catch(async () => {
          const r = await prisma.$queryRawUnsafe<{ n: bigint }[]>(
            `SELECT COUNT(*)::bigint AS n FROM public.legal_document_chunks WHERE embedding_v IS NOT NULL`
          );
          return Number(r[0].n);
        }),
        prisma.legalDocument.count({ where: { isActive: true } }),
        prisma.$queryRawUnsafe<{ n: bigint }[]>(
          `SELECT COUNT(*)::bigint AS n FROM public.legal_document_chunks WHERE embedding_v IS NULL`
        ).then(r => Number(r[0].n)).catch(() => 0),
        prisma.$queryRawUnsafe<{ avg: number }[]>(
          `SELECT AVG(LENGTH(content))::float AS avg FROM public.legal_document_chunks LIMIT 1`
        ).catch(() => [{ avg: 0 }]),
      ]);

      // 1536 floats × 4 bytes ≈ 6 KB por vector
      const storageMb = Math.round((Number(vectorCount) * 6) / 1024);
      const totalDocsRaw = await prisma.$queryRawUnsafe<{ n: bigint }[]>(
        `SELECT COUNT(*)::bigint AS n FROM public.legal_documents`
      );
      const totalDocs = Number(totalDocsRaw[0].n);
      const completed = totalDocs - pending;

      return reply.send({
        totalVectors: Number(vectorCount),
        totalDocuments: totalDocs,
        processingQueue: pending,
        avgProcessingTime: Math.round((sample[0]?.avg || 0) / 100),
        successRate: totalDocs ? Math.round((completed / totalDocs) * 100) : 0,
        storageUsed: storageMb,
      });
    } catch (e: any) {
      fastify.log.error(e);
      return reply.code(500).send({ error: e.message });
    }
  });

  // LIST docs with embedding status
  fastify.get('/admin/embeddings', async (req, reply) => {
    try {
      const q = req.query as Record<string, string>;
      const limit = Math.min(parseInt(q.limit || '500', 10), 1000);

      const rows = await prisma.$queryRawUnsafe<any[]>(
        `SELECT
          ld.id,
          ld.id AS document_id,
          COALESCE(NULLIF(ld.title, ''), ld.norm_title) AS document_title,
          ld.category,
          ld.legal_hierarchy::text AS legal_hierarchy,
          ld.created_at AS created_at,
          ld.updated_at AS completed_at,
          (SELECT COUNT(*)::int FROM public.legal_document_chunks WHERE legal_document_id = ld.id) AS chunk_count,
          (SELECT COUNT(*)::int FROM public.legal_document_chunks WHERE legal_document_id = ld.id AND embedding_v IS NOT NULL) AS vectors_count
        FROM public.legal_documents ld
        ORDER BY ld.updated_at DESC
        LIMIT $1`,
        limit
      );

      const data = rows.map((r) => {
        const status =
          r.vectors_count === 0
            ? 'pending'
            : r.vectors_count < r.chunk_count
              ? 'processing'
              : 'completed';
        const progress = r.chunk_count > 0 ? Math.round((r.vectors_count / r.chunk_count) * 100) : 0;
        return {
          id: r.id,
          documentId: r.document_id,
          documentTitle: r.document_title,
          category: r.category || '—',
          legalHierarchy: r.legal_hierarchy,
          status,
          progress,
          vectorsCount: r.vectors_count,
          chunkCount: r.chunk_count,
          createdAt: r.created_at,
          completedAt: r.completed_at,
        };
      });

      return reply.send(data);
    } catch (e: any) {
      fastify.log.error(e);
      return reply.code(500).send({ error: e.message });
    }
  });

  // ─── POST /admin/embeddings/rechunk-corpus (SSE) ───────────────────
  // Re-chunkea TODOS los legal_documents activos con overlap 150 chars
  // y vectoriza desde cero. Reporta progreso por doc en tiempo real.
  // Costo: ~$0.02/1M tokens text-embedding-3-small. Para 138 docs/36k
  // chunks típicos ≈ $0.50-1.00 y 30-60 min.
  //
  // Requiere body { confirm: true } para evitar disparos accidentales
  // (es una operación destructiva que recrea TODOS los chunks).
  fastify.post('/admin/embeddings/rechunk-corpus', async (req, reply) => {
    const body = (req.body || {}) as { confirm?: boolean; overlap?: number; chunkSize?: number; onlyMissingVector?: boolean };
    if (!body.confirm) {
      return reply.code(400).send({
        error: 'Confirmación requerida',
        hint: 'POST con body { "confirm": true } para iniciar. Opcional: overlap (default 150), chunkSize (default 1000), onlyMissingVector (default false → re-chunkea TODO).',
      });
    }
    const overlap   = Math.max(0, Math.min(500, body.overlap   ?? 150));
    const chunkSize = Math.max(300, Math.min(4000, body.chunkSize ?? 1000));
    const onlyMissingVector = body.onlyMissingVector === true;
    const userId = (req.user as any).id;

    setSseHeaders(req, reply);
    const stopKa = startSseKeepalive(reply);
    const write = (event: string, data: any) => {
      try {
        reply.raw.write(`event: ${event}\n`);
        reply.raw.write(`data: ${JSON.stringify(data)}\n\n`);
      } catch { /* client gone */ }
    };

    write('connected', { startedAt: new Date().toISOString(), chunkSize, overlap, onlyMissingVector });

    try {
      // Listado de docs a procesar
      const filterClause = onlyMissingVector
        ? `WHERE is_active = true
             AND EXISTS (SELECT 1 FROM public.legal_document_chunks ldc
                          WHERE ldc.legal_document_id = legal_documents.id
                            AND ldc.embedding_v IS NULL)`
        : `WHERE is_active = true`;
      const docs = await prisma.$queryRawUnsafe<Array<{ id: string; title: string; norm_title: string | null }>>(
        `SELECT id, title, norm_title
           FROM public.legal_documents
          ${filterClause}
          ORDER BY updated_at DESC`,
      );

      write('phase', { phase: 'started', label: `${docs.length} documentos a procesar`, total: docs.length });

      const svc = new LegalDocumentService(prisma);
      let processed = 0;
      let totalChunks = 0;
      let totalVectorized = 0;
      let failed = 0;
      const errors: Array<{ docId: string; error: string }> = [];

      for (const doc of docs) {
        processed++;
        const pct = Math.round((processed / docs.length) * 100);
        try {
          write('doc-start', {
            index: processed,
            total: docs.length,
            pct,
            docId: doc.id,
            title: (doc.norm_title || doc.title || '').slice(0, 120),
          });

          const r = await svc.regenerateEmbeddings(doc.id, userId, { chunkSize, overlap });

          // Copiar embedding JSONB → embedding_v vector (fix conocido)
          let vec = 0;
          try {
            const u = await prisma.$executeRawUnsafe(
              `UPDATE public.legal_document_chunks
                  SET embedding_v = (embedding::text)::vector
                WHERE legal_document_id = $1
                  AND embedding IS NOT NULL
                  AND embedding_v IS NULL`,
              doc.id,
            );
            vec = Number(u) || 0;
          } catch { /* non-fatal */ }

          totalChunks += r.totalChunks;
          totalVectorized += vec;

          write('doc-done', {
            index: processed,
            total: docs.length,
            pct,
            docId: doc.id,
            chunks: r.totalChunks,
            embeddingsGenerated: r.embeddingsGenerated,
            embeddingsVectorized: vec,
          });
        } catch (e: any) {
          failed++;
          const msg = e?.message || 'unknown error';
          errors.push({ docId: doc.id, error: msg });
          write('doc-error', { index: processed, total: docs.length, pct, docId: doc.id, error: msg });
        }
      }

      write('done', {
        processed,
        succeeded: processed - failed,
        failed,
        totalChunks,
        totalVectorized,
        errors: errors.slice(0, 20),
        finishedAt: new Date().toISOString(),
      });
    } catch (e: any) {
      write('error', { error: e?.message || 'Fatal error' });
    } finally {
      stopKa();
      try { reply.raw.end(); } catch { /* ignore */ }
    }
    return reply;
  });

  // TEST SEARCH — proxy a /search/legal pero mantenemos un endpoint local para la UI admin
  fastify.post('/admin/embeddings/test-search', async (req, reply) => {
    const { query, limit } = (req.body as { query: string; limit?: number }) || ({} as any);
    if (!query || typeof query !== 'string') {
      return reply.code(400).send({ error: 'query string requerido' });
    }
    try {
      const auth = req.headers.authorization || '';
      const r = await fetch(`http://localhost:${process.env.PORT || '8000'}/api/v1/search/legal`, {
        method: 'POST',
        headers: { Authorization: auth, 'Content-Type': 'application/json' },
        body: JSON.stringify({ query, matchCount: limit || 5 }),
      });
      const data = await r.json();
      return reply.code(r.status).send(data);
    } catch (e: any) {
      return reply.code(500).send({ error: e.message });
    }
  });
}

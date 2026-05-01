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

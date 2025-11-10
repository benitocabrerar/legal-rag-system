import { FastifyInstance } from 'fastify';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function diagnosticsRoutes(fastify: FastifyInstance) {
  // Diagnostic endpoint to check legal documents in database
  fastify.get('/diagnostics/legal-documents', {
    onRequest: [fastify.authenticate],
  }, async (request, reply) => {
    try {
      const user = request.user as any;

      // Only allow admins
      if (user.role !== 'admin') {
        return reply.code(403).send({
          error: 'Forbidden',
          message: 'Only administrators can access diagnostics',
        });
      }

      // Count total documents
      const totalDocs = await prisma.legalDocument.count();
      const activeDocs = await prisma.legalDocument.count({
        where: { isActive: true },
      });
      const inactiveDocs = await prisma.legalDocument.count({
        where: { isActive: false },
      });

      // Get all documents with chunk counts
      const documents = await prisma.legalDocument.findMany({
        select: {
          id: true,
          normTitle: true,
          normType: true,
          legalHierarchy: true,
          isActive: true,
          createdAt: true,
          _count: {
            select: {
              chunks: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
        take: 50, // Limit to avoid huge responses
      });

      // Count total chunks and embeddings
      const totalChunks = await prisma.legalDocumentChunk.count();
      const chunksWithEmbeddings = await prisma.legalDocumentChunk.count({
        where: {
          NOT: {
            embedding: null,
          },
        },
      });

      // Get chunk details for each document
      const documentsWithEmbeddings = await Promise.all(
        documents.map(async (doc) => {
          const chunks = await prisma.legalDocumentChunk.count({
            where: { legalDocumentId: doc.id },
          });
          const embeddingsCount = await prisma.legalDocumentChunk.count({
            where: {
              legalDocumentId: doc.id,
              NOT: { embedding: null },
            },
          });

          return {
            ...doc,
            totalChunks: chunks,
            embeddingsGenerated: embeddingsCount,
            embeddingsFailed: chunks - embeddingsCount,
            embeddingRate: chunks > 0 ? Math.round((embeddingsCount / chunks) * 100) : 0,
          };
        })
      );

      return reply.send({
        summary: {
          totalDocuments: totalDocs,
          activeDocuments: activeDocs,
          inactiveDocuments: inactiveDocs,
          totalChunks,
          chunksWithEmbeddings,
          chunksWithoutEmbeddings: totalChunks - chunksWithEmbeddings,
          overallEmbeddingRate: totalChunks > 0
            ? Math.round((chunksWithEmbeddings / totalChunks) * 100)
            : 0,
        },
        documents: documentsWithEmbeddings,
      });
    } catch (error) {
      fastify.log.error(error);
      return reply.code(500).send({
        error: 'Internal Server Error',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  // Test query endpoint to see what it retrieves
  fastify.get('/diagnostics/test-query', {
    onRequest: [fastify.authenticate],
  }, async (request, reply) => {
    try {
      const user = request.user as any;

      // Only allow admins
      if (user.role !== 'admin') {
        return reply.code(403).send({
          error: 'Forbidden',
          message: 'Only administrators can access diagnostics',
        });
      }

      // Simulate what the query endpoint does
      const legalChunks = await prisma.legalDocumentChunk.findMany({
        where: {
          legalDocument: {
            isActive: true,
          },
        },
        take: 100,
        include: {
          legalDocument: {
            select: {
              id: true,
              normTitle: true,
              normType: true,
              legalHierarchy: true,
            },
          },
        },
      });

      const chunksWithEmbeddings = legalChunks.filter(chunk => chunk.embedding !== null);
      const chunksWithoutEmbeddings = legalChunks.filter(chunk => chunk.embedding === null);

      // Group by document
      const documentGroups = new Map<string, any>();
      legalChunks.forEach(chunk => {
        const docId = chunk.legalDocument.id;
        if (!documentGroups.has(docId)) {
          documentGroups.set(docId, {
            documentId: docId,
            normTitle: chunk.legalDocument.normTitle,
            totalChunks: 0,
            chunksWithEmbeddings: 0,
            chunksWithoutEmbeddings: 0,
          });
        }
        const group = documentGroups.get(docId)!;
        group.totalChunks++;
        if (chunk.embedding) {
          group.chunksWithEmbeddings++;
        } else {
          group.chunksWithoutEmbeddings++;
        }
      });

      return reply.send({
        summary: {
          totalChunksRetrieved: legalChunks.length,
          chunksWithEmbeddings: chunksWithEmbeddings.length,
          chunksWithoutEmbeddings: chunksWithoutEmbeddings.length,
          documentsFound: documentGroups.size,
        },
        documentBreakdown: Array.from(documentGroups.values()),
        sampleChunks: legalChunks.slice(0, 3).map(chunk => ({
          documentTitle: chunk.legalDocument.normTitle,
          chunkIndex: chunk.chunkIndex,
          hasEmbedding: chunk.embedding !== null,
          contentPreview: chunk.content.substring(0, 200),
        })),
      });
    } catch (error) {
      fastify.log.error(error);
      return reply.code(500).send({
        error: 'Internal Server Error',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });
}

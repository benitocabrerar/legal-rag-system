import { FastifyInstance } from 'fastify';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';
import { OpenAI } from 'openai';

const prisma = new PrismaClient();
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const uploadSchema = z.object({
  title: z.string().min(1),
  caseId: z.string().uuid(),
  content: z.string().min(1),
});

export async function documentRoutes(fastify: FastifyInstance) {
  // Upload document
  fastify.post('/documents/upload', {
    onRequest: [fastify.authenticate],
  }, async (request, reply) => {
    try {
      const body = uploadSchema.parse(request.body);
      const userId = (request.user as any).id;

      // Verify case belongs to user
      const caseDoc = await prisma.case.findFirst({
        where: {
          id: body.caseId,
          userId,
        },
      });

      if (!caseDoc) {
        return reply.code(404).send({ error: 'Case not found' });
      }

      // Create document
      const document = await prisma.document.create({
        data: {
          title: body.title,
          content: body.content,
          caseId: body.caseId,
          userId,
        },
      });

      // Split content into chunks (simple implementation)
      const chunkSize = 1000;
      const chunks = [];
      for (let i = 0; i < body.content.length; i += chunkSize) {
        chunks.push(body.content.slice(i, i + chunkSize));
      }

      // Generate embeddings for each chunk
      for (let i = 0; i < chunks.length; i++) {
        const chunk = chunks[i];

        // Generate embedding using OpenAI
        const embeddingResponse = await openai.embeddings.create({
          model: 'text-embedding-ada-002',
          input: chunk,
        });

        const embedding = embeddingResponse.data[0].embedding;

        // Store chunk with embedding
        await prisma.documentChunk.create({
          data: {
            documentId: document.id,
            content: chunk,
            chunkIndex: i,
            embedding: embedding,
          },
        });
      }

      return reply.send({
        document: {
          id: document.id,
          title: document.title,
          createdAt: document.createdAt,
          chunksCount: chunks.length,
        },
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return reply.code(400).send({ error: error.errors });
      }
      fastify.log.error(error);
      return reply.code(500).send({ error: 'Internal server error' });
    }
  });

  // Get documents for a case
  fastify.get('/documents/case/:caseId', {
    onRequest: [fastify.authenticate],
  }, async (request, reply) => {
    try {
      const { caseId } = request.params as { caseId: string };
      const userId = (request.user as any).id;

      // Verify case belongs to user
      const caseDoc = await prisma.case.findFirst({
        where: {
          id: caseId,
          userId,
        },
      });

      if (!caseDoc) {
        return reply.code(404).send({ error: 'Case not found' });
      }

      // Get documents
      const documents = await prisma.document.findMany({
        where: {
          caseId,
          userId,
        },
        select: {
          id: true,
          title: true,
          createdAt: true,
          updatedAt: true,
        },
        orderBy: {
          createdAt: 'desc',
        },
      });

      return reply.send({ documents });
    } catch (error) {
      fastify.log.error(error);
      return reply.code(500).send({ error: 'Internal server error' });
    }
  });

  // Get document by ID
  fastify.get('/documents/:id', {
    onRequest: [fastify.authenticate],
  }, async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const userId = (request.user as any).id;

      const document = await prisma.document.findFirst({
        where: {
          id,
          userId,
        },
        include: {
          case: {
            select: {
              id: true,
              title: true,
            },
          },
        },
      });

      if (!document) {
        return reply.code(404).send({ error: 'Document not found' });
      }

      return reply.send({ document });
    } catch (error) {
      fastify.log.error(error);
      return reply.code(500).send({ error: 'Internal server error' });
    }
  });

  // Delete document
  fastify.delete('/documents/:id', {
    onRequest: [fastify.authenticate],
  }, async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const userId = (request.user as any).id;

      const document = await prisma.document.findFirst({
        where: {
          id,
          userId,
        },
      });

      if (!document) {
        return reply.code(404).send({ error: 'Document not found' });
      }

      // Delete chunks first
      await prisma.documentChunk.deleteMany({
        where: {
          documentId: id,
        },
      });

      // Delete document
      await prisma.document.delete({
        where: {
          id,
        },
      });

      return reply.send({ message: 'Document deleted successfully' });
    } catch (error) {
      fastify.log.error(error);
      return reply.code(500).send({ error: 'Internal server error' });
    }
  });
}

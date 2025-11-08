import { FastifyInstance } from 'fastify';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';
import { OpenAI } from 'openai';

const prisma = new PrismaClient();
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const uploadLegalDocSchema = z.object({
  title: z.string().min(1),
  category: z.enum(['constitution', 'law', 'code', 'regulation', 'jurisprudence']),
  content: z.string().min(1),
  metadata: z.object({
    year: z.number().optional(),
    number: z.string().optional(),
    jurisdiction: z.string().optional(),
  }).optional(),
});

export async function legalDocumentRoutes(fastify: FastifyInstance) {
  // Upload legal document (admin only)
  fastify.post('/legal-documents/upload', {
    onRequest: [fastify.authenticate],
  }, async (request, reply) => {
    try {
      const user = request.user as any;

      // Check if user is admin
      if (user.role !== 'admin') {
        return reply.code(403).send({ error: 'Only administrators can upload legal documents' });
      }

      const body = uploadLegalDocSchema.parse(request.body);

      // Create legal document
      const document = await prisma.legalDocument.create({
        data: {
          title: body.title,
          category: body.category,
          content: body.content,
          metadata: body.metadata || {},
          uploadedBy: user.id,
        },
      });

      // Split content into chunks
      const chunkSize = 1000;
      const chunks = [];
      for (let i = 0; i < body.content.length; i += chunkSize) {
        chunks.push(body.content.slice(i, i + chunkSize));
      }

      // Generate embeddings for each chunk
      for (let i = 0; i < chunks.length; i++) {
        const chunk = chunks[i];

        const embeddingResponse = await openai.embeddings.create({
          model: 'text-embedding-ada-002',
          input: chunk,
        });

        const embedding = embeddingResponse.data[0].embedding;

        await prisma.legalDocumentChunk.create({
          data: {
            legalDocumentId: document.id,
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
          category: document.category,
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

  // List all legal documents (available to all authenticated users)
  fastify.get('/legal-documents', {
    onRequest: [fastify.authenticate],
  }, async (request, reply) => {
    try {
      const { category } = request.query as { category?: string };

      const where = category ? { category } : {};

      const documents = await prisma.legalDocument.findMany({
        where,
        select: {
          id: true,
          title: true,
          category: true,
          metadata: true,
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

  // Get legal document by ID
  fastify.get('/legal-documents/:id', {
    onRequest: [fastify.authenticate],
  }, async (request, reply) => {
    try {
      const { id } = request.params as { id: string };

      const document = await prisma.legalDocument.findUnique({
        where: { id },
      });

      if (!document) {
        return reply.code(404).send({ error: 'Legal document not found' });
      }

      return reply.send({ document });
    } catch (error) {
      fastify.log.error(error);
      return reply.code(500).send({ error: 'Internal server error' });
    }
  });

  // Delete legal document (admin only)
  fastify.delete('/legal-documents/:id', {
    onRequest: [fastify.authenticate],
  }, async (request, reply) => {
    try {
      const user = request.user as any;
      const { id } = request.params as { id: string };

      if (user.role !== 'admin') {
        return reply.code(403).send({ error: 'Only administrators can delete legal documents' });
      }

      const document = await prisma.legalDocument.findUnique({
        where: { id },
      });

      if (!document) {
        return reply.code(404).send({ error: 'Legal document not found' });
      }

      // Delete chunks first
      await prisma.legalDocumentChunk.deleteMany({
        where: { legalDocumentId: id },
      });

      // Delete document
      await prisma.legalDocument.delete({
        where: { id },
      });

      return reply.send({ message: 'Legal document deleted successfully' });
    } catch (error) {
      fastify.log.error(error);
      return reply.code(500).send({ error: 'Internal server error' });
    }
  });
}

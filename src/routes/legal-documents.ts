import { FastifyInstance } from 'fastify';
import { prisma } from '../lib/prisma.js';
import { z } from 'zod';
import { OpenAI } from 'openai';
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Enum values matching Prisma schema
const NormType = z.enum([
  'CONSTITUTIONAL_NORM', 'ORGANIC_LAW', 'ORDINARY_LAW', 'ORGANIC_CODE', 'ORDINARY_CODE',
  'REGULATION_GENERAL', 'REGULATION_EXECUTIVE', 'ORDINANCE_MUNICIPAL', 'ORDINANCE_METROPOLITAN',
  'RESOLUTION_ADMINISTRATIVE', 'RESOLUTION_JUDICIAL', 'ADMINISTRATIVE_AGREEMENT',
  'INTERNATIONAL_TREATY', 'JUDICIAL_PRECEDENT'
]);

const LegalHierarchy = z.enum([
  'CONSTITUCION', 'TRATADOS_INTERNACIONALES_DDHH', 'LEYES_ORGANICAS', 'LEYES_ORDINARIAS',
  'CODIGOS_ORGANICOS', 'CODIGOS_ORDINARIOS', 'REGLAMENTOS', 'ORDENANZAS', 'RESOLUCIONES',
  'ACUERDOS_ADMINISTRATIVOS'
]);

const PublicationType = z.enum([
  'ORDINARIO', 'SUPLEMENTO', 'SEGUNDO_SUPLEMENTO', 'SUPLEMENTO_ESPECIAL', 'EDICION_CONSTITUCIONAL'
]);

const DocumentState = z.enum(['ORIGINAL', 'REFORMADO']);
const Jurisdiction = z.enum(['NACIONAL', 'PROVINCIAL', 'MUNICIPAL', 'INTERNACIONAL']);

const uploadLegalDocSchema = z.object({
  // Required fields per Prisma schema
  normType: NormType,
  normTitle: z.string().min(1),
  legalHierarchy: LegalHierarchy,
  publicationType: PublicationType,
  publicationNumber: z.string().min(1),
  content: z.string().min(1),
  // Optional fields
  publicationDate: z.string().datetime().optional(),
  lastReformDate: z.string().datetime().optional(),
  documentState: DocumentState.optional().default('ORIGINAL'),
  jurisdiction: Jurisdiction.optional().default('NACIONAL'),
  metadata: z.record(z.any()).optional(),
  // Legacy fields (for backward compatibility)
  title: z.string().optional(),
  category: z.string().optional(),
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

      // Create legal document with new schema fields
      const document = await prisma.legalDocument.create({
        data: {
          normType: body.normType,
          normTitle: body.normTitle,
          legalHierarchy: body.legalHierarchy,
          publicationType: body.publicationType,
          publicationNumber: body.publicationNumber,
          content: body.content,
          publicationDate: body.publicationDate ? new Date(body.publicationDate) : null,
          lastReformDate: body.lastReformDate ? new Date(body.lastReformDate) : null,
          documentState: body.documentState || 'ORIGINAL',
          jurisdiction: body.jurisdiction || 'NACIONAL',
          metadata: body.metadata || {},
          // Legacy fields
          title: body.title || body.normTitle,
          category: body.category || body.legalHierarchy,
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
          normType: document.normType,
          normTitle: document.normTitle,
          legalHierarchy: document.legalHierarchy,
          publicationType: document.publicationType,
          publicationNumber: document.publicationNumber,
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
      const { legalHierarchy, normType, jurisdiction } = request.query as {
        legalHierarchy?: string;
        normType?: string;
        jurisdiction?: string;
      };

      const where: any = { isActive: true };
      if (legalHierarchy) where.legalHierarchy = legalHierarchy;
      if (normType) where.normType = normType;
      if (jurisdiction) where.jurisdiction = jurisdiction;

      const documents = await prisma.legalDocument.findMany({
        where,
        select: {
          id: true,
          normType: true,
          normTitle: true,
          legalHierarchy: true,
          publicationType: true,
          publicationNumber: true,
          publicationDate: true,
          documentState: true,
          jurisdiction: true,
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

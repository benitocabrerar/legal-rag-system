import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { PrismaClient } from '@prisma/client';
import { OpenAI } from 'openai';
import { LegalDocumentService } from '../services/legal-document-service';
import {
  CreateLegalDocumentSchema,
  UpdateLegalDocumentSchema,
  QueryLegalDocumentsSchema,
  LegacyLegalDocumentSchema,
  CreateDocumentRevisionSchema,
} from '../schemas/legal-document-schemas';

const prisma = new PrismaClient();
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
});

export async function legalDocumentRoutesV2(fastify: FastifyInstance) {
  const documentService = new LegalDocumentService(prisma, openai);

  // ============================================================================
  // CREATE LEGAL DOCUMENT
  // ============================================================================
  fastify.post('/legal-documents-v2', {
    schema: {
      body: CreateLegalDocumentSchema,
      tags: ['Legal Documents'],
      description: 'Create a new legal document with enhanced metadata',
      security: [{ bearerAuth: [] }],
    },
    onRequest: [fastify.authenticate],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const user = request.user as any;

      // Check admin permission
      if (user.role !== 'admin') {
        return reply.code(403).send({
          error: 'Forbidden',
          message: 'Only administrators can create legal documents',
        });
      }

      const body = CreateLegalDocumentSchema.parse(request.body);
      const document = await documentService.createDocument(body, user.id);

      return reply.code(201).send({
        success: true,
        document,
      });
    } catch (error: any) {
      fastify.log.error(error);
      if (error.name === 'ZodError') {
        return reply.code(400).send({
          error: 'Validation Error',
          details: error.errors,
        });
      }
      return reply.code(500).send({
        error: 'Internal Server Error',
        message: error.message,
      });
    }
  });

  // ============================================================================
  // UPDATE LEGAL DOCUMENT
  // ============================================================================
  fastify.put('/legal-documents-v2/:id', {
    schema: {
      params: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
        },
        required: ['id'],
      },
      body: UpdateLegalDocumentSchema,
      tags: ['Legal Documents'],
      description: 'Update an existing legal document',
      security: [{ bearerAuth: [] }],
    },
    onRequest: [fastify.authenticate],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const user = request.user as any;
      const { id } = request.params as { id: string };

      // Check admin permission
      if (user.role !== 'admin') {
        return reply.code(403).send({
          error: 'Forbidden',
          message: 'Only administrators can update legal documents',
        });
      }

      const body = UpdateLegalDocumentSchema.parse(request.body);
      const document = await documentService.updateDocument(id, body, user.id);

      return reply.send({
        success: true,
        document,
      });
    } catch (error: any) {
      fastify.log.error(error);
      if (error.name === 'ZodError') {
        return reply.code(400).send({
          error: 'Validation Error',
          details: error.errors,
        });
      }
      if (error.message === 'Legal document not found') {
        return reply.code(404).send({
          error: 'Not Found',
          message: error.message,
        });
      }
      return reply.code(500).send({
        error: 'Internal Server Error',
        message: error.message,
      });
    }
  });

  // ============================================================================
  // QUERY LEGAL DOCUMENTS
  // ============================================================================
  fastify.get('/legal-documents-v2', {
    schema: {
      querystring: QueryLegalDocumentsSchema,
      tags: ['Legal Documents'],
      description: 'Query legal documents with advanced filters',
      security: [{ bearerAuth: [] }],
    },
    onRequest: [fastify.authenticate],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const query = QueryLegalDocumentsSchema.parse(request.query);
      const result = await documentService.queryDocuments(query);

      return reply.send({
        success: true,
        ...result,
      });
    } catch (error: any) {
      fastify.log.error(error);
      if (error.name === 'ZodError') {
        return reply.code(400).send({
          error: 'Validation Error',
          details: error.errors,
        });
      }
      return reply.code(500).send({
        error: 'Internal Server Error',
        message: error.message,
      });
    }
  });

  // ============================================================================
  // GET SINGLE LEGAL DOCUMENT
  // ============================================================================
  fastify.get('/legal-documents-v2/:id', {
    schema: {
      params: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
        },
        required: ['id'],
      },
      tags: ['Legal Documents'],
      description: 'Get a legal document by ID',
      security: [{ bearerAuth: [] }],
    },
    onRequest: [fastify.authenticate],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { id } = request.params as { id: string };
      const document = await documentService.getDocumentById(id);

      if (!document) {
        return reply.code(404).send({
          error: 'Not Found',
          message: 'Legal document not found',
        });
      }

      return reply.send({
        success: true,
        document,
      });
    } catch (error: any) {
      fastify.log.error(error);
      return reply.code(500).send({
        error: 'Internal Server Error',
        message: error.message,
      });
    }
  });

  // ============================================================================
  // DELETE LEGAL DOCUMENT
  // ============================================================================
  fastify.delete('/legal-documents-v2/:id', {
    schema: {
      params: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
        },
        required: ['id'],
      },
      tags: ['Legal Documents'],
      description: 'Delete a legal document',
      security: [{ bearerAuth: [] }],
    },
    onRequest: [fastify.authenticate],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const user = request.user as any;
      const { id } = request.params as { id: string };

      // Check admin permission
      if (user.role !== 'admin') {
        return reply.code(403).send({
          error: 'Forbidden',
          message: 'Only administrators can delete legal documents',
        });
      }

      // Soft delete by setting isActive to false
      await prisma.legalDocument.update({
        where: { id },
        data: { isActive: false },
      });

      // Create audit log
      await prisma.auditLog.create({
        data: {
          userId: user.id,
          action: 'DELETE_LEGAL_DOCUMENT',
          entity: 'LegalDocument',
          entityId: id,
          success: true,
        },
      });

      return reply.send({
        success: true,
        message: 'Legal document deleted successfully',
      });
    } catch (error: any) {
      fastify.log.error(error);
      return reply.code(500).send({
        error: 'Internal Server Error',
        message: error.message,
      });
    }
  });

  // ============================================================================
  // CREATE DOCUMENT REVISION
  // ============================================================================
  fastify.post('/legal-documents-v2/:id/revisions', {
    schema: {
      params: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
        },
        required: ['id'],
      },
      body: CreateDocumentRevisionSchema,
      tags: ['Legal Documents'],
      description: 'Create a new revision for a legal document',
      security: [{ bearerAuth: [] }],
    },
    onRequest: [fastify.authenticate],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const user = request.user as any;
      const { id } = request.params as { id: string };

      // Check admin permission
      if (user.role !== 'admin') {
        return reply.code(403).send({
          error: 'Forbidden',
          message: 'Only administrators can create document revisions',
        });
      }

      const body = CreateDocumentRevisionSchema.parse(request.body);

      // Get current revision count
      const revisionCount = await prisma.legalDocumentRevision.count({
        where: { legalDocumentId: id },
      });

      // Create revision
      const revision = await prisma.legalDocumentRevision.create({
        data: {
          legalDocumentId: id,
          revisionNumber: revisionCount + 1,
          revisionType: body.revisionType,
          description: body.description,
          previousContent: body.previousContent,
          newContent: body.newContent,
          effectiveDate: new Date(body.effectiveDate),
          changedBy: user.id,
          approvedBy: body.approvedBy,
        },
      });

      // Update document state if it's a reform
      if (body.revisionType === 'reform') {
        await prisma.legalDocument.update({
          where: { id },
          data: {
            documentState: 'REFORMADO',
            lastReformDate: new Date(body.effectiveDate),
          },
        });
      }

      return reply.code(201).send({
        success: true,
        revision,
      });
    } catch (error: any) {
      fastify.log.error(error);
      if (error.name === 'ZodError') {
        return reply.code(400).send({
          error: 'Validation Error',
          details: error.errors,
        });
      }
      return reply.code(500).send({
        error: 'Internal Server Error',
        message: error.message,
      });
    }
  });

  // ============================================================================
  // SEMANTIC SEARCH
  // ============================================================================
  fastify.post('/legal-documents-v2/search', {
    schema: {
      body: {
        type: 'object',
        properties: {
          query: { type: 'string', minLength: 1 },
          limit: { type: 'integer', minimum: 1, maximum: 50, default: 10 },
        },
        required: ['query'],
      },
      tags: ['Legal Documents'],
      description: 'Perform semantic search on legal documents',
      security: [{ bearerAuth: [] }],
    },
    onRequest: [fastify.authenticate],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { query, limit } = request.body as { query: string; limit?: number };
      const results = await documentService.semanticSearch(query, limit || 10);

      return reply.send({
        success: true,
        results,
        count: results.length,
      });
    } catch (error: any) {
      fastify.log.error(error);
      return reply.code(500).send({
        error: 'Internal Server Error',
        message: error.message,
      });
    }
  });

  // ============================================================================
  // LEGACY MIGRATION ENDPOINT
  // ============================================================================
  fastify.post('/legal-documents-v2/migrate', {
    schema: {
      body: LegacyLegalDocumentSchema,
      tags: ['Legal Documents'],
      description: 'Migrate a legacy document to new structure',
      security: [{ bearerAuth: [] }],
    },
    onRequest: [fastify.authenticate],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const user = request.user as any;

      // Check admin permission
      if (user.role !== 'admin') {
        return reply.code(403).send({
          error: 'Forbidden',
          message: 'Only administrators can migrate documents',
        });
      }

      const legacyData = LegacyLegalDocumentSchema.parse(request.body);
      const document = await documentService.migrateLegacyDocument(legacyData, user.id);

      return reply.code(201).send({
        success: true,
        document,
        message: 'Legacy document migrated successfully',
      });
    } catch (error: any) {
      fastify.log.error(error);
      if (error.name === 'ZodError') {
        return reply.code(400).send({
          error: 'Validation Error',
          details: error.errors,
        });
      }
      return reply.code(500).send({
        error: 'Internal Server Error',
        message: error.message,
      });
    }
  });

  // ============================================================================
  // GET ENUM VALUES (For Frontend Dropdowns)
  // ============================================================================
  fastify.get('/legal-documents-v2/enums', {
    schema: {
      tags: ['Legal Documents'],
      description: 'Get all enum values for legal documents',
      security: [{ bearerAuth: [] }],
    },
    onRequest: [fastify.authenticate],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    return reply.send({
      success: true,
      enums: {
        normTypes: [
          'CONSTITUTIONAL_NORM',
          'ORGANIC_LAW',
          'ORDINARY_LAW',
          'ORGANIC_CODE',
          'ORDINARY_CODE',
          'REGULATION_GENERAL',
          'REGULATION_EXECUTIVE',
          'ORDINANCE_MUNICIPAL',
          'ORDINANCE_METROPOLITAN',
          'RESOLUTION_ADMINISTRATIVE',
          'RESOLUTION_JUDICIAL',
          'ADMINISTRATIVE_AGREEMENT',
          'INTERNATIONAL_TREATY',
          'JUDICIAL_PRECEDENT',
        ],
        legalHierarchy: [
          'CONSTITUCION',
          'TRATADOS_INTERNACIONALES_DDHH',
          'LEYES_ORGANICAS',
          'LEYES_ORDINARIAS',
          'CODIGOS_ORGANICOS',
          'CODIGOS_ORDINARIOS',
          'REGLAMENTOS',
          'ORDENANZAS',
          'RESOLUCIONES',
          'ACUERDOS_ADMINISTRATIVOS',
        ],
        publicationTypes: [
          'ORDINARIO',
          'SUPLEMENTO',
          'SEGUNDO_SUPLEMENTO',
          'SUPLEMENTO_ESPECIAL',
          'EDICION_CONSTITUCIONAL',
        ],
        documentStates: ['ORIGINAL', 'REFORMADO'],
      },
    });
  });
}
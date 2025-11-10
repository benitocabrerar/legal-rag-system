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
import { PDFExtract } from 'pdf.js-extract';

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

      let documentData: any;

      // Handle multipart file upload
      if (request.isMultipart()) {
        const parts = request.parts();
        const formData: any = {};
        let fileBuffer: Buffer | null = null;
        let filename: string | null = null;

        // Process all parts
        for await (const part of parts) {
          if (part.type === 'file') {
            // Get file buffer
            fileBuffer = await part.toBuffer();
            filename = part.filename;
          } else {
            // Regular form field
            formData[part.fieldname] = (part as any).value;
          }
        }

        if (!fileBuffer) {
          return reply.code(400).send({
            error: 'Bad Request',
            message: 'No file provided',
          });
        }

        // Extract text from PDF
        let extractedText: string;
        try {
          const pdfExtract = new PDFExtract();
          const pdfData = await pdfExtract.extractBuffer(fileBuffer);

          // Extract text from all pages
          extractedText = pdfData.pages
            .map(page => page.content.map(item => item.str).join(' '))
            .join('\n');

          if (!extractedText || extractedText.trim().length === 0) {
            return reply.code(400).send({
              error: 'Bad Request',
              message: 'Could not extract text from PDF. The file may be empty or image-based.',
            });
          }
        } catch (pdfError: any) {
          fastify.log.error('PDF parsing error:', pdfError);
          return reply.code(400).send({
            error: 'Bad Request',
            message: `Failed to parse PDF: ${pdfError.message}`,
          });
        }

        // Helper function to convert date strings to ISO 8601 datetime format
        const toISODateTime = (dateStr: string | undefined): string | undefined => {
          if (!dateStr) return undefined;
          try {
            // If already ISO datetime, return as-is
            if (dateStr.includes('T')) return dateStr;
            // Convert simple date to ISO datetime
            return new Date(dateStr).toISOString();
          } catch {
            return undefined;
          }
        };

        // Build document data from form fields
        documentData = {
          normType: formData.norm_type,
          normTitle: formData.norm_title,
          legalHierarchy: formData.legal_hierarchy,
          content: extractedText,
          publicationType: formData.publication_type,
          publicationNumber: formData.publication_number,
          publicationDate: toISODateTime(formData.publication_date),
          documentState: formData.document_state,
          jurisdiction: formData.jurisdiction,
          lastReformDate: toISODateTime(formData.last_reform_date),
        };
      } else {
        // Handle JSON request
        documentData = request.body;
      }

      // Validate with Zod schema
      const validatedData = CreateLegalDocumentSchema.parse(documentData);
      const document = await documentService.createDocument(validatedData, user.id);

      // Build detailed message about vectorization status
      const vectorization = (document as any).vectorization;
      let message: string;
      let warnings: string[] = [];

      if (vectorization && vectorization.success) {
        // All embeddings generated successfully
        message = `✅ Documento cargado y vectorizado correctamente. Se generaron ${vectorization.embeddingsGenerated} embeddings de ${vectorization.totalChunks} fragmentos. El documento está listo para búsquedas semánticas con IA.`;
      } else if (vectorization && vectorization.embeddingsFailed > 0) {
        // Some embeddings failed
        message = `⚠️ Documento cargado pero la vectorización fue parcial. Se generaron ${vectorization.embeddingsGenerated} de ${vectorization.totalChunks} embeddings. ${vectorization.embeddingsFailed} fragmentos NO tienen embeddings.`;
        warnings.push(
          `${vectorization.embeddingsFailed} fragmentos no pudieron ser vectorizados y solo estarán disponibles mediante búsqueda de texto.`,
          `Para búsquedas óptimas con IA, se recomienda eliminar este documento y volver a subirlo.`,
          `Si el problema persiste, verifique su configuración de API de OpenAI o contacte al administrador del sistema.`
        );
      } else {
        // No vectorization info (shouldn't happen but handle it)
        message = `✅ Documento cargado correctamente.`;
      }

      return reply.code(201).send({
        success: vectorization ? vectorization.success : true,
        message,
        warnings: warnings.length > 0 ? warnings : undefined,
        document,
        vectorization: vectorization ? {
          totalChunks: vectorization.totalChunks,
          embeddingsGenerated: vectorization.embeddingsGenerated,
          embeddingsFailed: vectorization.embeddingsFailed,
          successRate: `${Math.round((vectorization.embeddingsGenerated / vectorization.totalChunks) * 100)}%`,
        } : undefined,
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
/**
 * Enhanced Legal Documents Routes with Event-Driven Processing
 *
 * Integrates with the automatic document analysis and notification system
 */

import { FastifyInstance } from 'fastify';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';
import { getDocumentEventBus, DocumentEventType } from '../events/documentEventBus';
import { DocumentProcessor } from '../workers/documentProcessor';
import { DocumentRegistry } from '../services/documentRegistry';
import { NotificationService } from '../services/notificationService';

const prisma = new PrismaClient();

// Enhanced upload schema with all required fields
const uploadLegalDocumentSchema = z.object({
  normTitle: z.string().min(1),
  normType: z.enum([
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
    'JUDICIAL_PRECEDENT'
  ]),
  legalHierarchy: z.enum([
    'CONSTITUCION',
    'TRATADOS_INTERNACIONALES_DDHH',
    'LEYES_ORGANICAS',
    'LEYES_ORDINARIAS',
    'CODIGOS_ORGANICOS',
    'CODIGOS_ORDINARIOS',
    'REGLAMENTOS',
    'ORDENANZAS',
    'RESOLUCIONES',
    'ACUERDOS_ADMINISTRATIVOS'
  ]),
  content: z.string().min(1),
  publicationType: z.enum([
    'ORDINARIO',
    'SUPLEMENTO',
    'SEGUNDO_SUPLEMENTO',
    'SUPLEMENTO_ESPECIAL',
    'EDICION_CONSTITUCIONAL'
  ]).optional(),
  publicationNumber: z.string().optional(),
  publicationDate: z.string().optional(),
  jurisdiction: z.enum(['NACIONAL', 'PROVINCIAL', 'MUNICIPAL', 'INTERNACIONAL']).optional(),
  specialties: z.array(z.string()).optional(),
  metadata: z.object({
    year: z.number().optional(),
    number: z.string().optional(),
    tags: z.array(z.string()).optional(),
    description: z.string().optional()
  }).optional()
});

export async function legalDocumentRoutesEnhanced(fastify: FastifyInstance) {
  // Initialize services
  const eventBus = getDocumentEventBus(fastify.log);
  const documentProcessor = new DocumentProcessor(
    prisma,
    fastify.log,
    eventBus,
    {
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      password: process.env.REDIS_PASSWORD
    }
  );

  const documentRegistry = new DocumentRegistry(
    prisma,
    fastify.log,
    eventBus
  );

  const notificationService = new NotificationService(
    prisma,
    fastify.log,
    eventBus,
    undefined,
    {
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASSWORD
      }
    }
  );

  // Start document processor worker
  await documentProcessor.start();

  /**
   * Upload legal document with automatic processing
   */
  fastify.post('/api/legal-documents/upload', {
    onRequest: [fastify.authenticate],
    schema: {
      description: 'Upload a new legal document with automatic analysis',
      tags: ['legal-documents'],
      body: uploadLegalDocumentSchema,
      response: {
        200: {
          type: 'object',
          properties: {
            document: { type: 'object' },
            jobId: { type: 'string' },
            message: { type: 'string' }
          }
        }
      }
    }
  }, async (request, reply) => {
    try {
      const user = request.user as any;

      // Check if user is admin
      if (user.role !== 'admin') {
        return reply.code(403).send({
          error: 'Only administrators can upload legal documents'
        });
      }

      const body = uploadLegalDocumentSchema.parse(request.body);

      // Create legal document with proper structure
      const document = await prisma.legalDocument.create({
        data: {
          normTitle: body.normTitle,
          normType: body.normType,
          legalHierarchy: body.legalHierarchy,
          publicationType: body.publicationType || 'ORDINARIO',
          publicationNumber: body.publicationNumber || `AUTO-${Date.now()}`,
          publicationDate: body.publicationDate ? new Date(body.publicationDate) : new Date(),
          jurisdiction: body.jurisdiction || 'NACIONAL',
          content: body.content,
          uploadedBy: user.id,
          metadata: {
            ...body.metadata,
            uploadedAt: new Date(),
            uploadedBy: {
              id: user.id,
              name: user.name,
              email: user.email
            },
            processingStatus: 'queued'
          }
        }
      });

      // Emit document uploaded event
      eventBus.emitEvent(DocumentEventType.LEGAL_DOCUMENT_UPLOADED, {
        documentId: document.id,
        documentType: 'LegalDocument',
        userId: user.id,
        title: document.normTitle,
        metadata: {
          normType: document.normType,
          legalHierarchy: document.legalHierarchy,
          jurisdiction: document.jurisdiction
        },
        timestamp: new Date()
      });

      // Add to processing queue (will be handled by event listener)
      const jobId = await documentProcessor.addDocument(
        document.id,
        'LegalDocument',
        {
          userId: user.id,
          priority: 1,
          metadata: {
            normType: document.normType,
            legalHierarchy: document.legalHierarchy
          }
        }
      );

      // Log audit trail
      await prisma.auditLog.create({
        data: {
          userId: user.id,
          action: 'LEGAL_DOCUMENT_UPLOAD',
          entity: 'LegalDocument',
          entityId: document.id,
          changes: {
            title: document.normTitle,
            type: document.normType,
            hierarchy: document.legalHierarchy
          },
          ipAddress: request.ip,
          userAgent: request.headers['user-agent']
        }
      });

      return reply.send({
        document: {
          id: document.id,
          normTitle: document.normTitle,
          normType: document.normType,
          legalHierarchy: document.legalHierarchy,
          createdAt: document.createdAt,
          processingStatus: 'queued'
        },
        jobId,
        message: 'Document uploaded successfully and queued for processing'
      });

    } catch (error) {
      if (error instanceof z.ZodError) {
        return reply.code(400).send({ error: error.errors });
      }
      fastify.log.error(error);
      return reply.code(500).send({ error: 'Internal server error' });
    }
  });

  /**
   * Get processing status for a document
   */
  fastify.get('/api/legal-documents/:id/processing-status', {
    onRequest: [fastify.authenticate],
    schema: {
      description: 'Get processing status for a legal document',
      tags: ['legal-documents'],
      params: z.object({
        id: z.string().uuid()
      }),
      response: {
        200: {
          type: 'object',
          properties: {
            documentId: { type: 'string' },
            status: { type: 'string' },
            progress: { type: 'number' },
            results: { type: 'object' },
            error: { type: 'string' }
          }
        }
      }
    }
  }, async (request, reply) => {
    try {
      const { id } = request.params as { id: string };

      // Get document
      const document = await prisma.legalDocument.findUnique({
        where: { id },
        select: { metadata: true }
      });

      if (!document) {
        return reply.code(404).send({ error: 'Document not found' });
      }

      const metadata = document.metadata as any;
      const processingStatus = metadata?.processingStatus || 'unknown';

      // Get job status from queue if available
      let jobStatus = null;
      if (metadata?.jobId) {
        jobStatus = await documentProcessor.getJobStatus(metadata.jobId);
      }

      return reply.send({
        documentId: id,
        status: jobStatus?.state || processingStatus,
        progress: jobStatus?.progress || 0,
        results: metadata?.analysisResults,
        error: jobStatus?.failedReason
      });

    } catch (error) {
      fastify.log.error(error);
      return reply.code(500).send({ error: 'Internal server error' });
    }
  });

  /**
   * Get document hierarchy from registry
   */
  fastify.get('/api/legal-documents/hierarchy', {
    onRequest: [fastify.authenticate],
    schema: {
      description: 'Get complete document hierarchy',
      tags: ['legal-documents'],
      response: {
        200: {
          type: 'object'
        }
      }
    }
  }, async (request, reply) => {
    try {
      const user = request.user as any;
      const hierarchy = await documentRegistry.getHierarchy(user.id);

      return reply.send(hierarchy);
    } catch (error) {
      fastify.log.error(error);
      return reply.code(500).send({ error: 'Internal server error' });
    }
  });

  /**
   * Search documents in registry
   */
  fastify.get('/api/legal-documents/search', {
    onRequest: [fastify.authenticate],
    schema: {
      description: 'Search legal documents',
      tags: ['legal-documents'],
      querystring: z.object({
        q: z.string().min(1),
        limit: z.number().optional(),
        offset: z.number().optional()
      }),
      response: {
        200: {
          type: 'object',
          properties: {
            results: { type: 'array' },
            total: { type: 'number' }
          }
        }
      }
    }
  }, async (request, reply) => {
    try {
      const { q, limit, offset } = request.query as any;
      const user = request.user as any;

      const results = await documentRegistry.searchDocuments(
        q,
        user.id,
        {
          documentType: 'LegalDocument',
          limit: limit || 20,
          offset: offset || 0
        }
      );

      return reply.send({
        results,
        total: results.length
      });
    } catch (error) {
      fastify.log.error(error);
      return reply.code(500).send({ error: 'Internal server error' });
    }
  });

  /**
   * Get registry statistics
   */
  fastify.get('/api/legal-documents/statistics', {
    onRequest: [fastify.authenticate],
    schema: {
      description: 'Get document registry statistics',
      tags: ['legal-documents'],
      response: {
        200: {
          type: 'object'
        }
      }
    }
  }, async (request, reply) => {
    try {
      const stats = await documentRegistry.getStatistics();
      return reply.send(stats);
    } catch (error) {
      fastify.log.error(error);
      return reply.code(500).send({ error: 'Internal server error' });
    }
  });

  /**
   * Subscribe to document notifications
   */
  fastify.post('/api/legal-documents/notifications/subscribe', {
    onRequest: [fastify.authenticate],
    schema: {
      description: 'Subscribe to legal document notifications',
      tags: ['legal-documents', 'notifications'],
      body: z.object({
        subscriptionType: z.enum(['document_upload', 'analysis_complete', 'hierarchy_update']),
        channel: z.enum(['email', 'in-app', 'webhook']),
        filters: z.object({
          documentTypes: z.array(z.string()).optional(),
          categories: z.array(z.string()).optional(),
          keywords: z.array(z.string()).optional()
        }).optional(),
        webhookUrl: z.string().url().optional()
      }),
      response: {
        200: {
          type: 'object',
          properties: {
            subscription: { type: 'object' },
            message: { type: 'string' }
          }
        }
      }
    }
  }, async (request, reply) => {
    try {
      const user = request.user as any;
      const body = request.body as any;

      // Create subscription
      const subscription = await prisma.notificationSubscription.create({
        data: {
          userId: user.id,
          subscriptionType: body.subscriptionType,
          channel: body.channel.toUpperCase(),
          documentTypes: body.filters?.documentTypes,
          categories: body.filters?.categories,
          keywords: body.filters?.keywords,
          webhookUrl: body.webhookUrl
        }
      });

      return reply.send({
        subscription,
        message: 'Successfully subscribed to notifications'
      });

    } catch (error) {
      fastify.log.error(error);
      return reply.code(500).send({ error: 'Internal server error' });
    }
  });

  /**
   * Get queue statistics
   */
  fastify.get('/api/admin/processing-queue/stats', {
    onRequest: [fastify.authenticate],
    schema: {
      description: 'Get processing queue statistics',
      tags: ['admin'],
      response: {
        200: {
          type: 'object'
        }
      }
    }
  }, async (request, reply) => {
    try {
      const user = request.user as any;

      // Check if user is admin
      if (user.role !== 'admin') {
        return reply.code(403).send({ error: 'Admin access required' });
      }

      const stats = await documentProcessor.getQueueStats();
      return reply.send(stats);

    } catch (error) {
      fastify.log.error(error);
      return reply.code(500).send({ error: 'Internal server error' });
    }
  });

  /**
   * Reprocess a document
   */
  fastify.post('/api/legal-documents/:id/reprocess', {
    onRequest: [fastify.authenticate],
    schema: {
      description: 'Reprocess a legal document',
      tags: ['legal-documents'],
      params: z.object({
        id: z.string().uuid()
      }),
      response: {
        200: {
          type: 'object',
          properties: {
            jobId: { type: 'string' },
            message: { type: 'string' }
          }
        }
      }
    }
  }, async (request, reply) => {
    try {
      const user = request.user as any;
      const { id } = request.params as { id: string };

      // Check if user is admin
      if (user.role !== 'admin') {
        return reply.code(403).send({ error: 'Admin access required' });
      }

      // Check document exists
      const document = await prisma.legalDocument.findUnique({
        where: { id },
        select: { id: true, normTitle: true }
      });

      if (!document) {
        return reply.code(404).send({ error: 'Document not found' });
      }

      // Add to processing queue
      const jobId = await documentProcessor.addDocument(
        id,
        'LegalDocument',
        {
          userId: user.id,
          priority: 2,
          metadata: { reprocess: true }
        }
      );

      // Log audit trail
      await prisma.auditLog.create({
        data: {
          userId: user.id,
          action: 'LEGAL_DOCUMENT_REPROCESS',
          entity: 'LegalDocument',
          entityId: id,
          ipAddress: request.ip,
          userAgent: request.headers['user-agent']
        }
      });

      return reply.send({
        jobId,
        message: 'Document queued for reprocessing'
      });

    } catch (error) {
      fastify.log.error(error);
      return reply.code(500).send({ error: 'Internal server error' });
    }
  });

  // Clean up on server shutdown
  fastify.addHook('onClose', async () => {
    await documentProcessor.stop();
    notificationService.destroy();
  });
}
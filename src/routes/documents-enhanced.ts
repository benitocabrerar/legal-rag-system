/**
 * Enhanced Documents Routes with Event-Driven Processing
 *
 * Handles user case documents with automatic analysis and notifications
 */

import { FastifyInstance } from 'fastify';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';
import { getDocumentEventBus, DocumentEventType } from '../events/documentEventBus';
import { DocumentProcessor } from '../workers/documentProcessor';
import { DocumentRegistry } from '../services/documentRegistry';
import { NotificationService } from '../services/notificationService';
import multer from 'fastify-multer';
import { uploadToCloudinary } from '../utils/cloudinary';

const prisma = new PrismaClient();

// Document upload schema
const uploadDocumentSchema = z.object({
  caseId: z.string().uuid(),
  title: z.string().min(1).max(200),
  description: z.string().optional(),
  documentType: z.enum(['contract', 'evidence', 'brief', 'motion', 'correspondence', 'other']).optional(),
  tags: z.array(z.string()).optional(),
  isConfidential: z.boolean().optional()
});

// Configure multer for file uploads
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB max
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain',
      'image/jpeg',
      'image/png'
    ];

    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only PDF, DOC, DOCX, TXT, JPG, and PNG files are allowed.'));
    }
  }
});

export async function documentsRoutesEnhanced(fastify: FastifyInstance) {
  // Register multer
  fastify.register(multer.contentParser);

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

  /**
   * Upload document with automatic processing
   */
  fastify.post('/api/documents/upload', {
    onRequest: [fastify.authenticate],
    preHandler: upload.single('file'),
    schema: {
      description: 'Upload a new document to a case with automatic analysis',
      tags: ['documents'],
      consumes: ['multipart/form-data']
    }
  }, async (request: any, reply) => {
    try {
      const user = request.user as any;
      const file = request.file;

      if (!file) {
        return reply.code(400).send({ error: 'No file uploaded' });
      }

      // Parse form data
      const body = uploadDocumentSchema.parse({
        caseId: request.body.caseId,
        title: request.body.title,
        description: request.body.description,
        documentType: request.body.documentType,
        tags: request.body.tags ? JSON.parse(request.body.tags) : undefined,
        isConfidential: request.body.isConfidential === 'true'
      });

      // Check case ownership
      const caseData = await prisma.case.findUnique({
        where: { id: body.caseId },
        select: { id: true, userId: true, title: true }
      });

      if (!caseData) {
        return reply.code(404).send({ error: 'Case not found' });
      }

      if (caseData.userId !== user.id) {
        return reply.code(403).send({ error: 'You do not have access to this case' });
      }

      // Extract text content based on file type
      let content = '';
      if (file.mimetype === 'text/plain') {
        content = file.buffer.toString('utf-8');
      } else if (file.mimetype === 'application/pdf') {
        // TODO: Implement PDF text extraction
        content = `[PDF Document: ${file.originalname}]`;
      } else {
        content = `[Binary Document: ${file.originalname}]`;
      }

      // Upload file to cloud storage
      let fileUrl = null;
      if (process.env.CLOUDINARY_URL) {
        const uploadResult = await uploadToCloudinary(file.buffer, {
          folder: `cases/${body.caseId}/documents`,
          public_id: `${Date.now()}-${file.originalname}`,
          resource_type: 'auto'
        });
        fileUrl = uploadResult.secure_url;
      }

      // Create document record
      const document = await prisma.document.create({
        data: {
          caseId: body.caseId,
          userId: user.id,
          title: body.title,
          content,
          metadata: {
            description: body.description,
            documentType: body.documentType,
            tags: body.tags,
            isConfidential: body.isConfidential,
            originalFilename: file.originalname,
            mimeType: file.mimetype,
            fileSize: file.size,
            fileUrl,
            uploadedAt: new Date(),
            processingStatus: 'queued'
          }
        }
      });

      // Update user storage usage
      await prisma.user.update({
        where: { id: user.id },
        data: {
          storageUsedMB: {
            increment: file.size / (1024 * 1024)
          }
        }
      });

      // Emit document uploaded event
      eventBus.emitEvent(DocumentEventType.DOCUMENT_UPLOADED, {
        documentId: document.id,
        documentType: 'Document',
        userId: user.id,
        caseId: body.caseId,
        title: document.title,
        fileUrl,
        metadata: {
          caseTitle: caseData.title,
          documentType: body.documentType,
          tags: body.tags
        },
        timestamp: new Date()
      });

      // Add to processing queue
      const jobId = await documentProcessor.addDocument(
        document.id,
        'Document',
        {
          userId: user.id,
          metadata: {
            caseId: body.caseId,
            documentType: body.documentType
          }
        }
      );

      // Log activity
      await prisma.auditLog.create({
        data: {
          userId: user.id,
          action: 'DOCUMENT_UPLOAD',
          entity: 'Document',
          entityId: document.id,
          changes: {
            caseId: body.caseId,
            title: document.title,
            fileSize: file.size
          },
          ipAddress: request.ip,
          userAgent: request.headers['user-agent']
        }
      });

      return reply.send({
        document: {
          id: document.id,
          caseId: document.caseId,
          title: document.title,
          createdAt: document.createdAt,
          processingStatus: 'queued',
          fileUrl
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
   * Upload document content (text-based)
   */
  fastify.post('/api/documents/upload-text', {
    onRequest: [fastify.authenticate],
    schema: {
      description: 'Upload a text document to a case',
      tags: ['documents'],
      body: z.object({
        caseId: z.string().uuid(),
        title: z.string().min(1).max(200),
        content: z.string().min(1),
        description: z.string().optional(),
        documentType: z.string().optional(),
        tags: z.array(z.string()).optional()
      }),
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
      const body = request.body as any;

      // Check case ownership
      const caseData = await prisma.case.findUnique({
        where: { id: body.caseId },
        select: { id: true, userId: true, title: true }
      });

      if (!caseData) {
        return reply.code(404).send({ error: 'Case not found' });
      }

      if (caseData.userId !== user.id) {
        return reply.code(403).send({ error: 'You do not have access to this case' });
      }

      // Create document
      const document = await prisma.document.create({
        data: {
          caseId: body.caseId,
          userId: user.id,
          title: body.title,
          content: body.content,
          metadata: {
            description: body.description,
            documentType: body.documentType,
            tags: body.tags,
            uploadedAt: new Date(),
            processingStatus: 'queued'
          }
        }
      });

      // Emit event
      eventBus.emitEvent(DocumentEventType.DOCUMENT_UPLOADED, {
        documentId: document.id,
        documentType: 'Document',
        userId: user.id,
        caseId: body.caseId,
        title: document.title,
        metadata: {
          caseTitle: caseData.title,
          documentType: body.documentType,
          tags: body.tags
        },
        timestamp: new Date()
      });

      // Add to processing queue
      const jobId = await documentProcessor.addDocument(
        document.id,
        'Document',
        {
          userId: user.id,
          metadata: { caseId: body.caseId }
        }
      );

      return reply.send({
        document: {
          id: document.id,
          caseId: document.caseId,
          title: document.title,
          createdAt: document.createdAt,
          processingStatus: 'queued'
        },
        jobId,
        message: 'Document created and queued for processing'
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
   * Get document processing status
   */
  fastify.get('/api/documents/:id/processing-status', {
    onRequest: [fastify.authenticate],
    schema: {
      description: 'Get processing status for a document',
      tags: ['documents'],
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
      const user = request.user as any;
      const { id } = request.params as { id: string };

      // Get document and check ownership
      const document = await prisma.document.findUnique({
        where: { id },
        select: {
          userId: true,
          metadata: true
        }
      });

      if (!document) {
        return reply.code(404).send({ error: 'Document not found' });
      }

      if (document.userId !== user.id) {
        return reply.code(403).send({ error: 'Access denied' });
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
   * Get case documents with processing status
   */
  fastify.get('/api/cases/:caseId/documents', {
    onRequest: [fastify.authenticate],
    schema: {
      description: 'Get all documents for a case',
      tags: ['documents'],
      params: z.object({
        caseId: z.string().uuid()
      }),
      response: {
        200: {
          type: 'object',
          properties: {
            documents: { type: 'array' }
          }
        }
      }
    }
  }, async (request, reply) => {
    try {
      const user = request.user as any;
      const { caseId } = request.params as { caseId: string };

      // Check case ownership
      const caseData = await prisma.case.findUnique({
        where: { id: caseId },
        select: { userId: true }
      });

      if (!caseData) {
        return reply.code(404).send({ error: 'Case not found' });
      }

      if (caseData.userId !== user.id) {
        return reply.code(403).send({ error: 'Access denied' });
      }

      // Get documents with chunks count
      const documents = await prisma.document.findMany({
        where: { caseId },
        select: {
          id: true,
          title: true,
          createdAt: true,
          updatedAt: true,
          metadata: true,
          _count: {
            select: { chunks: true }
          }
        },
        orderBy: { createdAt: 'desc' }
      });

      // Format response
      const formattedDocuments = documents.map(doc => {
        const metadata = doc.metadata as any;
        return {
          id: doc.id,
          title: doc.title,
          createdAt: doc.createdAt,
          updatedAt: doc.updatedAt,
          chunksCount: doc._count.chunks,
          processingStatus: metadata?.processingStatus || 'unknown',
          fileUrl: metadata?.fileUrl,
          fileSize: metadata?.fileSize,
          mimeType: metadata?.mimeType,
          documentType: metadata?.documentType,
          tags: metadata?.tags
        };
      });

      return reply.send({ documents: formattedDocuments });

    } catch (error) {
      fastify.log.error(error);
      return reply.code(500).send({ error: 'Internal server error' });
    }
  });

  /**
   * Delete document
   */
  fastify.delete('/api/documents/:id', {
    onRequest: [fastify.authenticate],
    schema: {
      description: 'Delete a document',
      tags: ['documents'],
      params: z.object({
        id: z.string().uuid()
      }),
      response: {
        200: {
          type: 'object',
          properties: {
            message: { type: 'string' }
          }
        }
      }
    }
  }, async (request, reply) => {
    try {
      const user = request.user as any;
      const { id } = request.params as { id: string };

      // Get document and check ownership
      const document = await prisma.document.findUnique({
        where: { id },
        select: {
          userId: true,
          caseId: true,
          title: true,
          metadata: true
        }
      });

      if (!document) {
        return reply.code(404).send({ error: 'Document not found' });
      }

      if (document.userId !== user.id) {
        return reply.code(403).send({ error: 'Access denied' });
      }

      const metadata = document.metadata as any;

      // Delete chunks first
      await prisma.documentChunk.deleteMany({
        where: { documentId: id }
      });

      // Delete document
      await prisma.document.delete({
        where: { id }
      });

      // Update storage usage
      if (metadata?.fileSize) {
        await prisma.user.update({
          where: { id: user.id },
          data: {
            storageUsedMB: {
              decrement: metadata.fileSize / (1024 * 1024)
            }
          }
        });
      }

      // Unregister from document registry
      await documentRegistry.unregisterDocument(id, 'Document');

      // Log activity
      await prisma.auditLog.create({
        data: {
          userId: user.id,
          action: 'DOCUMENT_DELETE',
          entity: 'Document',
          entityId: id,
          changes: {
            title: document.title,
            caseId: document.caseId
          },
          ipAddress: request.ip,
          userAgent: request.headers['user-agent']
        }
      });

      return reply.send({ message: 'Document deleted successfully' });

    } catch (error) {
      fastify.log.error(error);
      return reply.code(500).send({ error: 'Internal server error' });
    }
  });

  /**
   * Reprocess document
   */
  fastify.post('/api/documents/:id/reprocess', {
    onRequest: [fastify.authenticate],
    schema: {
      description: 'Reprocess a document',
      tags: ['documents'],
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

      // Check document ownership
      const document = await prisma.document.findUnique({
        where: { id },
        select: { userId: true, caseId: true }
      });

      if (!document) {
        return reply.code(404).send({ error: 'Document not found' });
      }

      if (document.userId !== user.id) {
        return reply.code(403).send({ error: 'Access denied' });
      }

      // Add to processing queue
      const jobId = await documentProcessor.addDocument(
        id,
        'Document',
        {
          userId: user.id,
          metadata: {
            caseId: document.caseId,
            reprocess: true
          }
        }
      );

      // Log activity
      await prisma.auditLog.create({
        data: {
          userId: user.id,
          action: 'DOCUMENT_REPROCESS',
          entity: 'Document',
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

  /**
   * Get user document hierarchy
   */
  fastify.get('/api/documents/hierarchy', {
    onRequest: [fastify.authenticate],
    schema: {
      description: 'Get user document hierarchy',
      tags: ['documents'],
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

      // Filter to show only user's documents
      const userBranch = hierarchy.children.find(c => c.id === 'user-documents');

      return reply.send(userBranch || { children: [] });

    } catch (error) {
      fastify.log.error(error);
      return reply.code(500).send({ error: 'Internal server error' });
    }
  });

  /**
   * Search user documents
   */
  fastify.get('/api/documents/search', {
    onRequest: [fastify.authenticate],
    schema: {
      description: 'Search user documents',
      tags: ['documents'],
      querystring: z.object({
        q: z.string().min(1),
        caseId: z.string().uuid().optional(),
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
      const { q, caseId, limit, offset } = request.query as any;
      const user = request.user as any;

      // Build search query
      const where: any = {
        userId: user.id,
        OR: [
          { title: { contains: q, mode: 'insensitive' } },
          { content: { contains: q, mode: 'insensitive' } }
        ]
      };

      if (caseId) {
        where.caseId = caseId;
      }

      const [documents, total] = await Promise.all([
        prisma.document.findMany({
          where,
          select: {
            id: true,
            caseId: true,
            title: true,
            createdAt: true,
            case: {
              select: { title: true }
            }
          },
          take: limit || 20,
          skip: offset || 0,
          orderBy: { createdAt: 'desc' }
        }),
        prisma.document.count({ where })
      ]);

      const results = documents.map(doc => ({
        id: doc.id,
        type: 'Document',
        title: doc.title,
        caseId: doc.caseId,
        caseTitle: doc.case.title,
        createdAt: doc.createdAt,
        path: `/cases/${doc.caseId}/documents/${doc.id}`,
        accessible: true
      }));

      return reply.send({ results, total });

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
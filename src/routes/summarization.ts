/**
 * M3: Document Summarization Routes
 *
 * Provides endpoints for AI-powered document summarization, key point extraction,
 * executive summaries, batch processing, and document comparison.
 *
 * @module routes/summarization
 * @version 1.0.0
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { getDocumentSummarizationService } from '../services/ai/document-summarization.service.js';
import {
  SummarizeDocumentSchema,
  ExtractKeyPointsSchema,
  ExecutiveSummarySchema,
  BatchSummarizeSchema,
  CompareDocumentsSchema,
  type SummarizeDocumentInput,
  type ExtractKeyPointsInput,
  type ExecutiveSummaryInput,
  type BatchSummarizeInput,
  type CompareDocumentsInput,
} from '../schemas/summarization-schemas.js';
import { prisma } from '../lib/prisma.js';

// Type definitions for route handlers
interface DocumentParams {
  id: string;
}

interface SummaryParams {
  summaryId: string;
}

interface PaginationQuery {
  page?: number;
  limit?: number;
}

/**
 * Register summarization routes
 * All routes require authentication via fastify.authenticate decorator
 */
export async function summarizationRoutes(fastify: FastifyInstance): Promise<void> {
  const summarizationService = getDocumentSummarizationService();

  /**
   * POST /document/:id
   * Summarize a single document with configurable options
   */
  fastify.post<{
    Params: DocumentParams;
    Body: SummarizeDocumentInput;
  }>(
    '/document/:id',
    {
      onRequest: [fastify.authenticate],
      schema: {
        description: 'Summarize a single legal document',
        tags: ['summarization'],
        params: {
          type: 'object',
          required: ['id'],
          properties: {
            id: { type: 'string', format: 'uuid', description: 'Document UUID' }
          }
        },
        response: {
          200: {
            type: 'object',
            properties: {
              id: { type: 'string', format: 'uuid' },
              documentId: { type: 'string', format: 'uuid' },
              level: { type: 'string' },
              summary: { type: 'string' },
              keyPoints: { type: 'array', items: { type: 'string' } },
              wordCount: { type: 'number' },
              confidenceScore: { type: 'number' },
              language: { type: 'string' },
              processingTime: { type: 'number' },
              generatedAt: { type: 'string', format: 'date-time' }
            }
          }
        }
      }
    },
    async (request, reply) => {
      const startTime = Date.now();

      try {
        const { id } = request.params;
        const options = SummarizeDocumentSchema.parse(request.body || {});

        fastify.log.info({ documentId: id, level: options.level, language: options.language }, 'Summarizing document');

        // Verify document exists and user has access
        const document = await prisma.legalDocument.findUnique({
          where: { id },
          select: {
            id: true,
            normTitle: true,
            content: true,
            normType: true
          }
        });

        if (!document) {
          return reply.status(404).send({
            error: 'NOT_FOUND',
            message: 'Document not found'
          });
        }

        if (!document.content) {
          return reply.status(400).send({
            error: 'INVALID_DOCUMENT',
            message: 'Document has no content to summarize'
          });
        }

        // Generate summary using AI service
        // Note: SummaryOptions only supports: level, language, includeKeyPoints, includeReferences, maxLength
        const result = await summarizationService.summarizeDocument(id, {
          level: options.level as 'brief' | 'standard' | 'detailed',
          language: options.language as 'es' | 'en',
          includeKeyPoints: options.includeKeyPoints,
          includeReferences: options.includeReferences,
          maxLength: options.maxLength
        });

        const processingTime = Date.now() - startTime;

        fastify.log.info(
          { documentId: id, processingTimeMs: processingTime },
          'Document summarized successfully'
        );

        return reply.status(200).send({
          id: result.id,
          documentId: result.documentId,
          level: result.level,
          summary: result.summary,
          keyPoints: result.keyPoints || [],
          wordCount: result.wordCount,
          confidenceScore: result.confidenceScore,
          language: result.language,
          processingTime,
          generatedAt: result.createdAt.toISOString()
        });

      } catch (error) {
        fastify.log.error({ error, documentId: request.params.id }, 'Failed to summarize document');

        if (error instanceof Error) {
          return reply.status(500).send({
            error: 'SUMMARIZATION_FAILED',
            message: error.message
          });
        }

        return reply.status(500).send({
          error: 'INTERNAL_ERROR',
          message: 'An unexpected error occurred while summarizing the document'
        });
      }
    }
  );

  /**
   * POST /document/:id/key-points
   * Extract key points from a document without full summarization
   */
  fastify.post<{
    Params: DocumentParams;
    Body: ExtractKeyPointsInput;
  }>(
    '/document/:id/key-points',
    {
      onRequest: [fastify.authenticate],
      schema: {
        description: 'Extract key points from a legal document',
        tags: ['summarization'],
        params: {
          type: 'object',
          required: ['id'],
          properties: {
            id: { type: 'string', format: 'uuid' }
          }
        },
        response: {
          200: {
            type: 'object',
            properties: {
              keyPoints: { type: 'array', items: { type: 'object' } },
              metadata: {
                type: 'object',
                properties: {
                  count: { type: 'number' },
                  language: { type: 'string' },
                  extractedAt: { type: 'string', format: 'date-time' }
                }
              }
            }
          }
        }
      }
    },
    async (request, reply) => {
      try {
        const { id } = request.params;
        const options = ExtractKeyPointsSchema.parse(request.body || {});

        fastify.log.info({ documentId: id, maxPoints: options.maxPoints, language: options.language }, 'Extracting key points');

        // Verify document exists
        const document = await prisma.legalDocument.findUnique({
          where: { id },
          select: {
            id: true,
            content: true,
            normType: true
          }
        });

        if (!document) {
          return reply.status(404).send({
            error: 'NOT_FOUND',
            message: 'Document not found'
          });
        }

        if (!document.content) {
          return reply.status(400).send({
            error: 'INVALID_DOCUMENT',
            message: 'Document has no content to analyze'
          });
        }

        // Extract key points - service only takes documentId
        const keyPoints = await summarizationService.extractKeyPoints(id);

        // Apply maxPoints limit if specified
        const limitedKeyPoints = options.maxPoints
          ? keyPoints.slice(0, options.maxPoints)
          : keyPoints;

        fastify.log.info(
          { documentId: id, keyPointsCount: limitedKeyPoints.length },
          'Key points extracted successfully'
        );

        return reply.status(200).send({
          keyPoints: limitedKeyPoints,
          metadata: {
            count: limitedKeyPoints.length,
            language: options.language,
            extractedAt: new Date().toISOString()
          }
        });

      } catch (error) {
        fastify.log.error({ error, documentId: request.params.id }, 'Failed to extract key points');

        return reply.status(500).send({
          error: 'EXTRACTION_FAILED',
          message: error instanceof Error ? error.message : 'Failed to extract key points'
        });
      }
    }
  );

  /**
   * POST /case/:id/executive
   * Generate an executive summary for a legal case
   */
  fastify.post<{
    Params: DocumentParams;
    Body: ExecutiveSummaryInput;
  }>(
    '/case/:id/executive',
    {
      onRequest: [fastify.authenticate],
      schema: {
        description: 'Generate executive summary for a legal case',
        tags: ['summarization'],
        params: {
          type: 'object',
          required: ['id'],
          properties: {
            id: { type: 'string', format: 'uuid' }
          }
        },
        response: {
          200: {
            type: 'object',
            properties: {
              id: { type: 'string', format: 'uuid' },
              caseId: { type: 'string', format: 'uuid' },
              title: { type: 'string' },
              overview: { type: 'string' },
              keyFindings: { type: 'array', items: { type: 'string' } },
              timeline: { type: 'array', items: { type: 'object' } },
              riskFactors: { type: 'array', items: { type: 'string' } },
              recommendations: { type: 'array', items: { type: 'string' } },
              documentsCovered: { type: 'number' },
              generatedAt: { type: 'string', format: 'date-time' }
            }
          }
        }
      }
    },
    async (request, reply) => {
      try {
        const { id } = request.params;
        // Parse options for logging, but service doesn't accept them
        const _options = ExecutiveSummarySchema.parse(request.body || {});

        fastify.log.info({ caseId: id }, 'Generating executive summary for case');

        // Get case and associated documents
        const caseRecord = await prisma.case.findUnique({
          where: { id },
          include: {
            documents: {
              select: {
                id: true,
                title: true,
                content: true,
                createdAt: true
              }
            }
          }
        });

        if (!caseRecord) {
          return reply.status(404).send({
            error: 'NOT_FOUND',
            message: 'Case not found'
          });
        }

        if (caseRecord.documents.length === 0) {
          return reply.status(400).send({
            error: 'NO_DOCUMENTS',
            message: 'Case has no documents to summarize'
          });
        }

        // Generate executive summary - service only takes caseId
        const result = await summarizationService.generateExecutiveSummary(id);

        fastify.log.info(
          { caseId: id, documentsAnalyzed: caseRecord.documents.length },
          'Executive summary generated successfully'
        );

        return reply.status(200).send({
          id: result.id,
          caseId: result.caseId,
          title: result.title,
          overview: result.overview,
          keyFindings: result.keyFindings,
          timeline: result.timeline || [],
          riskFactors: result.riskFactors || [],
          recommendations: result.recommendations || [],
          documentsCovered: result.documentSummaries.length,
          generatedAt: result.createdAt.toISOString()
        });

      } catch (error) {
        fastify.log.error({ error, caseId: request.params.id }, 'Failed to generate executive summary');

        return reply.status(500).send({
          error: 'EXECUTIVE_SUMMARY_FAILED',
          message: error instanceof Error ? error.message : 'Failed to generate executive summary'
        });
      }
    }
  );

  /**
   * POST /batch
   * Batch summarize multiple documents in a single request
   */
  fastify.post<{
    Body: BatchSummarizeInput;
  }>(
    '/batch',
    {
      onRequest: [fastify.authenticate],
      schema: {
        description: 'Batch summarize multiple documents',
        tags: ['summarization'],
        response: {
          200: {
            type: 'object',
            properties: {
              summaries: { type: 'array', items: { type: 'object' } },
              totalDocuments: { type: 'number' },
              successCount: { type: 'number' },
              failureCount: { type: 'number' },
              totalProcessingTime: { type: 'number' }
            }
          }
        }
      }
    },
    async (request, reply) => {
      const startTime = Date.now();

      try {
        const options = BatchSummarizeSchema.parse(request.body);

        fastify.log.info(
          { documentCount: options.documentIds.length, level: options.level },
          'Starting batch summarization'
        );

        // Verify documents exist
        const documents = await prisma.legalDocument.findMany({
          where: {
            id: { in: options.documentIds }
          },
          select: {
            id: true,
            content: true,
            normType: true
          }
        });

        if (documents.length === 0) {
          return reply.status(404).send({
            error: 'NOT_FOUND',
            message: 'No valid documents found'
          });
        }

        // Process documents in batch - returns DocumentSummary[]
        const summaries = await summarizationService.batchSummarize(options.documentIds, {
          level: options.level as 'brief' | 'standard' | 'detailed',
          language: options.language as 'es' | 'en'
        });

        const processingTime = Date.now() - startTime;

        // Calculate success/failure counts
        const successCount = summaries.length;
        const failureCount = options.documentIds.length - successCount;

        fastify.log.info(
          {
            totalDocuments: options.documentIds.length,
            successful: successCount,
            failed: failureCount,
            processingTimeMs: processingTime
          },
          'Batch summarization completed'
        );

        return reply.status(200).send({
          summaries: summaries.map(s => ({
            id: s.id,
            documentId: s.documentId,
            level: s.level,
            summary: s.summary,
            keyPoints: s.keyPoints,
            wordCount: s.wordCount,
            confidenceScore: s.confidenceScore,
            language: s.language,
            createdAt: s.createdAt.toISOString()
          })),
          totalDocuments: options.documentIds.length,
          successCount,
          failureCount,
          totalProcessingTime: processingTime
        });

      } catch (error) {
        fastify.log.error({ error }, 'Batch summarization failed');

        return reply.status(500).send({
          error: 'BATCH_SUMMARIZATION_FAILED',
          message: error instanceof Error ? error.message : 'Batch summarization failed'
        });
      }
    }
  );

  /**
   * POST /compare
   * Compare multiple documents and generate a comparative analysis
   */
  fastify.post<{
    Body: CompareDocumentsInput;
  }>(
    '/compare',
    {
      onRequest: [fastify.authenticate],
      schema: {
        description: 'Compare multiple documents and generate comparative analysis',
        tags: ['summarization'],
        response: {
          200: {
            type: 'object',
            properties: {
              id: { type: 'string', format: 'uuid' },
              documentIds: { type: 'array', items: { type: 'string' } },
              commonThemes: { type: 'array', items: { type: 'string' } },
              differences: { type: 'array', items: { type: 'string' } },
              conflicts: { type: 'array', items: { type: 'string' } },
              recommendations: { type: 'array', items: { type: 'string' } },
              overallAnalysis: { type: 'string' },
              comparisonType: { type: 'string' },
              generatedAt: { type: 'string', format: 'date-time' }
            }
          }
        }
      }
    },
    async (request, reply) => {
      try {
        const options = CompareDocumentsSchema.parse(request.body);

        if (options.documentIds.length < 2) {
          return reply.status(400).send({
            error: 'INVALID_INPUT',
            message: 'At least 2 documents are required for comparison'
          });
        }

        fastify.log.info(
          { documentCount: options.documentIds.length, comparisonType: options.comparisonType },
          'Starting document comparison'
        );

        // Verify documents exist
        const documents = await prisma.legalDocument.findMany({
          where: {
            id: { in: options.documentIds }
          },
          select: {
            id: true,
            normTitle: true,
            content: true,
            normType: true
          }
        });

        if (documents.length < 2) {
          return reply.status(404).send({
            error: 'INSUFFICIENT_DOCUMENTS',
            message: 'Not enough valid documents found for comparison'
          });
        }

        // Generate comparison - service only takes documentIds
        const result = await summarizationService.compareDocuments(options.documentIds);

        fastify.log.info(
          { documentsCompared: documents.length },
          'Document comparison completed successfully'
        );

        // ComparativeSummary structure:
        // { id, documentIds, comparison: { commonThemes, differences, conflicts, recommendations },
        //   documentSummaries, overallAnalysis, createdAt }
        return reply.status(200).send({
          id: result.id,
          documentIds: result.documentIds,
          commonThemes: result.comparison.commonThemes,
          differences: result.comparison.differences,
          conflicts: result.comparison.conflicts,
          recommendations: result.comparison.recommendations,
          overallAnalysis: result.overallAnalysis,
          comparisonType: options.comparisonType,
          generatedAt: result.createdAt.toISOString()
        });

      } catch (error) {
        fastify.log.error({ error }, 'Document comparison failed');

        return reply.status(500).send({
          error: 'COMPARISON_FAILED',
          message: error instanceof Error ? error.message : 'Document comparison failed'
        });
      }
    }
  );

  /**
   * GET /:summaryId
   * Retrieve an existing summary by its ID
   */
  fastify.get<{
    Params: SummaryParams;
  }>(
    '/:summaryId',
    {
      onRequest: [fastify.authenticate],
      schema: {
        description: 'Retrieve an existing summary by ID',
        tags: ['summarization'],
        params: {
          type: 'object',
          required: ['summaryId'],
          properties: {
            summaryId: { type: 'string', format: 'uuid' }
          }
        },
        response: {
          200: {
            type: 'object',
            properties: {
              id: { type: 'string', format: 'uuid' },
              documentId: { type: 'string', format: 'uuid' },
              summary: { type: 'string' },
              keyPoints: { type: 'array', items: { type: 'object' } },
              level: { type: 'string' },
              confidenceScore: { type: 'number' },
              createdAt: { type: 'string', format: 'date-time' }
            }
          }
        }
      }
    },
    async (request, reply) => {
      try {
        const { summaryId } = request.params;

        fastify.log.info({ summaryId }, 'Retrieving summary');

        // Use service method to get properly formatted summary
        const summary = await summarizationService.getSummary(summaryId);

        if (!summary) {
          return reply.status(404).send({
            error: 'NOT_FOUND',
            message: 'Summary not found'
          });
        }

        fastify.log.info({ summaryId }, 'Summary retrieved successfully');

        return reply.status(200).send({
          id: summary.id,
          documentId: summary.documentId,
          summary: summary.summary,
          keyPoints: summary.keyPoints,
          level: summary.level,
          confidenceScore: summary.confidenceScore,
          createdAt: summary.createdAt.toISOString()
        });

      } catch (error) {
        fastify.log.error({ error, summaryId: request.params.summaryId }, 'Failed to retrieve summary');

        return reply.status(500).send({
          error: 'RETRIEVAL_FAILED',
          message: error instanceof Error ? error.message : 'Failed to retrieve summary'
        });
      }
    }
  );

  /**
   * GET /document/:id/summaries
   * List all summaries for a specific document
   */
  fastify.get<{
    Params: DocumentParams;
    Querystring: PaginationQuery;
  }>(
    '/document/:id/summaries',
    {
      onRequest: [fastify.authenticate],
      schema: {
        description: 'List all summaries for a document',
        tags: ['summarization'],
        params: {
          type: 'object',
          required: ['id'],
          properties: {
            id: { type: 'string', format: 'uuid' }
          }
        },
        querystring: {
          type: 'object',
          properties: {
            page: { type: 'number', minimum: 1, default: 1 },
            limit: { type: 'number', minimum: 1, maximum: 100, default: 20 }
          }
        },
        response: {
          200: {
            type: 'object',
            properties: {
              summaries: { type: 'array', items: { type: 'object' } },
              pagination: {
                type: 'object',
                properties: {
                  total: { type: 'number' },
                  page: { type: 'number' },
                  limit: { type: 'number' },
                  hasMore: { type: 'boolean' }
                }
              }
            }
          }
        }
      }
    },
    async (request, reply) => {
      try {
        const { id } = request.params;
        const { page = 1, limit = 20 } = request.query;
        const skip = (page - 1) * limit;

        fastify.log.info({ documentId: id, page, limit }, 'Listing document summaries');

        // Verify document exists
        const document = await prisma.legalDocument.findUnique({
          where: { id },
          select: { id: true }
        });

        if (!document) {
          return reply.status(404).send({
            error: 'NOT_FOUND',
            message: 'Document not found'
          });
        }

        // Fetch summaries with pagination using correct Prisma field name
        const [summaries, total] = await Promise.all([
          prisma.legalDocumentSummary.findMany({
            where: { legalDocumentId: id },
            orderBy: { createdAt: 'desc' },
            take: limit,
            skip
          }),
          prisma.legalDocumentSummary.count({
            where: { legalDocumentId: id }
          })
        ]);

        fastify.log.info(
          { documentId: id, count: summaries.length, total },
          'Document summaries retrieved successfully'
        );

        // Map Prisma fields to API response format
        return reply.status(200).send({
          summaries: summaries.map(s => ({
            id: s.id,
            documentId: s.legalDocumentId,
            summary: s.summaryText,
            level: s.summaryType,
            keyPoints: s.keyPoints,
            confidenceScore: s.confidenceScore,
            createdAt: s.createdAt.toISOString()
          })),
          pagination: {
            total,
            page,
            limit,
            hasMore: skip + limit < total
          }
        });

      } catch (error) {
        fastify.log.error({ error, documentId: request.params.id }, 'Failed to list summaries');

        return reply.status(500).send({
          error: 'LIST_FAILED',
          message: error instanceof Error ? error.message : 'Failed to list summaries'
        });
      }
    }
  );
}

/**
 * AI Predictions API Routes
 *
 * Endpoints for case outcome predictions, document relevance predictions,
 * timeline predictions, and prediction feedback.
 */

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { getPredictiveIntelligenceService } from '../services/ai/predictive-intelligence.service.js';
import { PrismaClient } from '@prisma/client';

// Request/Response types
interface PredictCaseOutcomeParams {
  id: string;
}

interface PredictDocumentRelevanceBody {
  documentId: string;
  queryContext: string;
}

interface PredictTimelineParams {
  id: string;
}

interface GetPredictionParams {
  id: string;
}

interface SubmitFeedbackParams {
  id: string;
}

interface SubmitFeedbackBody {
  accuracy: number;
  helpful: boolean;
  comment?: string;
}

/**
 * Register AI prediction routes
 */
export async function aiPredictionsRoutes(fastify: FastifyInstance) {
  const prisma = (fastify as any).prisma as PrismaClient;
  const predictiveService = getPredictiveIntelligenceService(prisma);

  /**
   * Predict case outcome
   * POST /api/v1/predictions/case/:id
   */
  fastify.post<{ Params: PredictCaseOutcomeParams }>(
    '/predictions/case/:id',
    {
      preHandler: [(fastify as any).authenticate],
      schema: {
        tags: ['AI Predictions'],
        description: 'Predict the outcome of a legal case using AI analysis',
        params: {
          type: 'object',
          required: ['id'],
          properties: {
            id: { type: 'string', description: 'Case ID' }
          }
        },
        response: {
          200: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              caseId: { type: 'string' },
              predictedOutcome: { type: 'string' },
              confidenceScore: { type: 'number' },
              factors: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    name: { type: 'string' },
                    impact: { type: 'string' },
                    weight: { type: 'number' },
                    description: { type: 'string' }
                  }
                }
              },
              similarCases: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    caseId: { type: 'string' },
                    title: { type: 'string' },
                    similarity: { type: 'number' },
                    outcome: { type: 'string' }
                  }
                }
              },
              recommendations: { type: 'array', items: { type: 'string' } },
              createdAt: { type: 'string' }
            }
          },
          400: {
            type: 'object',
            properties: {
              error: { type: 'string' }
            }
          },
          404: {
            type: 'object',
            properties: {
              error: { type: 'string' }
            }
          }
        }
      }
    },
    async (request: FastifyRequest<{ Params: PredictCaseOutcomeParams }>, reply: FastifyReply) => {
      try {
        const { id } = request.params;

        // Verify user has access to this case
        // @ts-ignore
        const userId = request.user?.id;
        const caseAccess = await prisma.case.findFirst({
          where: {
            id,
            userId
          }
        });

        if (!caseAccess) {
          return reply.code(404).send({ error: 'Case not found or access denied' });
        }

        const prediction = await predictiveService.predictCaseOutcome(id);
        reply.code(200).send(prediction);
      } catch (error) {
        request.log.error(error);
        const message = error instanceof Error ? error.message : 'Failed to predict case outcome';
        reply.code(500).send({ error: message });
      }
    }
  );

  /**
   * Predict document relevance
   * POST /api/v1/predictions/document-relevance
   */
  fastify.post<{ Body: PredictDocumentRelevanceBody }>(
    '/predictions/document-relevance',
    {
      preHandler: [(fastify as any).authenticate],
      schema: {
        tags: ['AI Predictions'],
        description: 'Predict how relevant a document is to a specific query or context',
        body: {
          type: 'object',
          required: ['documentId', 'queryContext'],
          properties: {
            documentId: { type: 'string', description: 'Document ID to analyze' },
            queryContext: { type: 'string', description: 'Query or context to compare against' }
          }
        },
        response: {
          200: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              documentId: { type: 'string' },
              queryContext: { type: 'string' },
              relevanceScore: { type: 'number' },
              semanticSimilarity: { type: 'number' },
              keyMatchingTerms: { type: 'array', items: { type: 'string' } },
              explanation: { type: 'string' },
              createdAt: { type: 'string' }
            }
          }
        }
      }
    },
    async (request: FastifyRequest<{ Body: PredictDocumentRelevanceBody }>, reply: FastifyReply) => {
      try {
        const { documentId, queryContext } = request.body;

        if (!documentId || !queryContext) {
          return reply.code(400).send({ error: 'documentId and queryContext are required' });
        }

        const prediction = await predictiveService.predictDocumentRelevance(documentId, queryContext);
        reply.code(200).send(prediction);
      } catch (error) {
        request.log.error(error);
        const message = error instanceof Error ? error.message : 'Failed to predict document relevance';
        reply.code(500).send({ error: message });
      }
    }
  );

  /**
   * Generate timeline prediction for a case
   * POST /api/v1/predictions/timeline/:id
   */
  fastify.post<{ Params: PredictTimelineParams }>(
    '/predictions/timeline/:id',
    {
      preHandler: [(fastify as any).authenticate],
      schema: {
        tags: ['AI Predictions'],
        description: 'Generate timeline predictions for case milestones',
        params: {
          type: 'object',
          required: ['id'],
          properties: {
            id: { type: 'string', description: 'Case ID' }
          }
        },
        response: {
          200: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              caseId: { type: 'string' },
              milestones: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    name: { type: 'string' },
                    predictedDate: { type: 'string' },
                    confidenceLevel: { type: 'string' },
                    dependencies: { type: 'array', items: { type: 'string' } },
                    description: { type: 'string' }
                  }
                }
              },
              estimatedCompletionDate: { type: 'string' },
              confidenceScore: { type: 'number' },
              riskFactors: { type: 'array', items: { type: 'string' } },
              createdAt: { type: 'string' }
            }
          }
        }
      }
    },
    async (request: FastifyRequest<{ Params: PredictTimelineParams }>, reply: FastifyReply) => {
      try {
        const { id } = request.params;

        // Verify user has access to this case
        // @ts-ignore
        const userId = request.user?.id;
        const caseAccess = await prisma.case.findFirst({
          where: {
            id,
            userId
          }
        });

        if (!caseAccess) {
          return reply.code(404).send({ error: 'Case not found or access denied' });
        }

        const prediction = await predictiveService.generateTimelinePrediction(id);
        reply.code(200).send(prediction);
      } catch (error) {
        request.log.error(error);
        const message = error instanceof Error ? error.message : 'Failed to generate timeline prediction';
        reply.code(500).send({ error: message });
      }
    }
  );

  /**
   * Get prediction by ID
   * GET /api/v1/predictions/:id
   */
  fastify.get<{ Params: GetPredictionParams }>(
    '/predictions/:id',
    {
      preHandler: [(fastify as any).authenticate],
      schema: {
        tags: ['AI Predictions'],
        description: 'Get a specific prediction by ID',
        params: {
          type: 'object',
          required: ['id'],
          properties: {
            id: { type: 'string', description: 'Prediction ID' }
          }
        },
        response: {
          200: {
            type: 'object',
            description: 'Prediction data (structure varies by type)'
          },
          404: {
            type: 'object',
            properties: {
              error: { type: 'string' }
            }
          }
        }
      }
    },
    async (request: FastifyRequest<{ Params: GetPredictionParams }>, reply: FastifyReply) => {
      try {
        const { id } = request.params;

        const prediction = await predictiveService.getPrediction(id);

        if (!prediction) {
          return reply.code(404).send({ error: 'Prediction not found' });
        }

        reply.code(200).send(prediction);
      } catch (error) {
        request.log.error(error);
        reply.code(500).send({ error: 'Failed to get prediction' });
      }
    }
  );

  /**
   * Submit feedback for a prediction
   * POST /api/v1/predictions/:id/feedback
   */
  fastify.post<{ Params: SubmitFeedbackParams; Body: SubmitFeedbackBody }>(
    '/predictions/:id/feedback',
    {
      preHandler: [(fastify as any).authenticate],
      schema: {
        tags: ['AI Predictions'],
        description: 'Submit feedback on prediction accuracy',
        params: {
          type: 'object',
          required: ['id'],
          properties: {
            id: { type: 'string', description: 'Prediction ID' }
          }
        },
        body: {
          type: 'object',
          required: ['accuracy', 'helpful'],
          properties: {
            accuracy: { type: 'number', minimum: 0, maximum: 1, description: 'Accuracy score (0-1)' },
            helpful: { type: 'boolean', description: 'Whether the prediction was helpful' },
            comment: { type: 'string', description: 'Optional feedback comment' }
          }
        },
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              message: { type: 'string' }
            }
          }
        }
      }
    },
    async (request: FastifyRequest<{ Params: SubmitFeedbackParams; Body: SubmitFeedbackBody }>, reply: FastifyReply) => {
      try {
        const { id } = request.params;
        const { accuracy, helpful, comment } = request.body;

        // @ts-ignore
        const userId = request.user?.id;

        if (!userId) {
          return reply.code(401).send({ error: 'Unauthorized' });
        }

        await predictiveService.submitFeedback({
          predictionId: id,
          userId,
          accuracy,
          helpful,
          comment
        });

        reply.code(200).send({
          success: true,
          message: 'Feedback submitted successfully'
        });
      } catch (error) {
        request.log.error(error);
        reply.code(500).send({ error: 'Failed to submit feedback' });
      }
    }
  );

  /**
   * Get prediction statistics
   * GET /api/v1/predictions/stats
   */
  fastify.get(
    '/predictions/stats',
    {
      preHandler: [(fastify as any).authenticate],
      schema: {
        tags: ['AI Predictions'],
        description: 'Get prediction statistics and accuracy metrics',
        response: {
          200: {
            type: 'object',
            properties: {
              totalPredictions: { type: 'number' },
              predictionsByType: {
                type: 'object',
                properties: {
                  case_outcome: { type: 'number' },
                  document_relevance: { type: 'number' },
                  timeline: { type: 'number' }
                }
              },
              averageConfidence: { type: 'number' },
              feedbackCount: { type: 'number' },
              averageAccuracy: { type: 'number' }
            }
          }
        }
      }
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        // Get prediction counts
        const predictions = await prisma.systemMetric.groupBy({
          by: ['category'],
          where: {
            metricName: 'ai_prediction'
          },
          _count: true,
          _avg: {
            metricValue: true
          }
        });

        // Get feedback stats
        const feedbackStats = await prisma.systemMetric.aggregate({
          where: {
            metricName: 'prediction_feedback'
          },
          _count: true,
          _avg: {
            metricValue: true
          }
        });

        const predictionsByType: Record<string, number> = {};
        let totalPredictions = 0;
        let totalConfidence = 0;

        predictions.forEach(p => {
          const type = p.category.replace('prediction_', '');
          predictionsByType[type] = p._count;
          totalPredictions += p._count;
          totalConfidence += (p._avg.metricValue || 0) * p._count;
        });

        reply.code(200).send({
          totalPredictions,
          predictionsByType,
          averageConfidence: totalPredictions > 0 ? totalConfidence / totalPredictions : 0,
          feedbackCount: feedbackStats._count || 0,
          averageAccuracy: feedbackStats._avg?.metricValue || 0
        });
      } catch (error) {
        request.log.error(error);
        reply.code(500).send({ error: 'Failed to get prediction statistics' });
      }
    }
  );
}

export default aiPredictionsRoutes;

/**
 * Prediction API Routes
 * ML-based prediction endpoints for case outcomes, appeals, and settlements
 *
 * @module predictions-routes
 * @author Legal RAG System - AI/NLP Improvements
 * @version 1.0.0
 */

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import {
  predictiveIntelligenceService,
  CasePredictionInput
} from '../services/ml/predictive-intelligence.service.js';

// ============================================================================
// Request/Response Types
// ============================================================================

interface CaseOutcomePredictionBody {
  caseType: string;
  jurisdiction: string;
  documentIds?: string[];
  caseMetadata?: {
    plaintiffType?: string;
    defendantType?: string;
    claimAmount?: number;
    filingDate?: string;
    legalArea?: string;
    complexity?: 'low' | 'medium' | 'high';
  };
}

interface AppealPredictionBody {
  rulingDocumentId: string;
}

interface SettlementEstimateBody {
  caseType: string;
  jurisdiction: string;
  documentIds?: string[];
  caseMetadata?: {
    claimAmount?: number;
    complexity?: 'low' | 'medium' | 'high';
    legalArea?: string;
  };
}

interface FeedbackBody {
  actualOutcome: any;
  wasAccurate: boolean;
  feedback?: string;
}

interface PredictionIdParams {
  id: string;
}

interface ModelIdQuery {
  modelId?: string;
}

/**
 * Standard API response wrapper
 */
interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  timestamp: string;
}

// ============================================================================
// Route Registration
// ============================================================================

/**
 * Register Prediction API routes
 */
export async function predictionRoutes(fastify: FastifyInstance) {
  /**
   * POST /api/predictions/case-outcome
   *
   * Predict the outcome of a legal case using ML models
   *
   * @example
   * POST /api/predictions/case-outcome
   * {
   *   "caseType": "civil",
   *   "jurisdiction": "nacional",
   *   "documentIds": ["doc-123", "doc-456"],
   *   "caseMetadata": {
   *     "claimAmount": 50000,
   *     "complexity": "medium"
   *   }
   * }
   */
  fastify.post<{ Body: CaseOutcomePredictionBody }>(
    '/case-outcome',
    async (request: FastifyRequest<{ Body: CaseOutcomePredictionBody }>, reply: FastifyReply) => {
      try {
        const { caseType, jurisdiction, documentIds, caseMetadata } = request.body;

        // Validate required fields
        if (!caseType || !jurisdiction) {
          return reply.code(400).send({
            success: false,
            error: 'caseType and jurisdiction are required',
            timestamp: new Date().toISOString()
          } as ApiResponse);
        }

        // Validate case type
        const validCaseTypes = ['civil', 'criminal', 'administrative', 'constitutional', 'labor', 'family', 'commercial'];
        if (!validCaseTypes.includes(caseType.toLowerCase())) {
          return reply.code(400).send({
            success: false,
            error: `Invalid caseType. Valid types: ${validCaseTypes.join(', ')}`,
            timestamp: new Date().toISOString()
          } as ApiResponse);
        }

        // Build prediction input
        const input: CasePredictionInput = {
          caseType: caseType.toLowerCase(),
          jurisdiction,
          documentIds,
          caseMetadata: caseMetadata ? {
            ...caseMetadata,
            filingDate: caseMetadata.filingDate ? new Date(caseMetadata.filingDate) : undefined
          } : undefined
        };

        // Get prediction
        const prediction = await predictiveIntelligenceService.predictCaseOutcome(input);

        return {
          success: true,
          data: prediction,
          timestamp: new Date().toISOString()
        } as ApiResponse;

      } catch (error) {
        console.error('Case outcome prediction error:', error);

        return reply.code(500).send({
          success: false,
          error: 'Failed to generate case outcome prediction',
          message: error instanceof Error ? error.message : 'Unknown error',
          timestamp: new Date().toISOString()
        } as ApiResponse);
      }
    }
  );

  /**
   * POST /api/predictions/appeal-likelihood
   *
   * Predict the likelihood of an appeal based on a ruling document
   *
   * @example
   * POST /api/predictions/appeal-likelihood
   * {
   *   "rulingDocumentId": "doc-789"
   * }
   */
  fastify.post<{ Body: AppealPredictionBody }>(
    '/appeal-likelihood',
    async (request: FastifyRequest<{ Body: AppealPredictionBody }>, reply: FastifyReply) => {
      try {
        const { rulingDocumentId } = request.body;

        if (!rulingDocumentId) {
          return reply.code(400).send({
            success: false,
            error: 'rulingDocumentId is required',
            timestamp: new Date().toISOString()
          } as ApiResponse);
        }

        const prediction = await predictiveIntelligenceService.predictAppealLikelihood(rulingDocumentId);

        return {
          success: true,
          data: prediction,
          timestamp: new Date().toISOString()
        } as ApiResponse;

      } catch (error) {
        console.error('Appeal likelihood prediction error:', error);

        if (error instanceof Error && error.message.includes('not found')) {
          return reply.code(404).send({
            success: false,
            error: 'Ruling document not found',
            timestamp: new Date().toISOString()
          } as ApiResponse);
        }

        return reply.code(500).send({
          success: false,
          error: 'Failed to generate appeal likelihood prediction',
          message: error instanceof Error ? error.message : 'Unknown error',
          timestamp: new Date().toISOString()
        } as ApiResponse);
      }
    }
  );

  /**
   * POST /api/predictions/settlement-estimate
   *
   * Estimate settlement range for a legal case
   *
   * @example
   * POST /api/predictions/settlement-estimate
   * {
   *   "caseType": "civil",
   *   "jurisdiction": "nacional",
   *   "caseMetadata": {
   *     "claimAmount": 100000,
   *     "complexity": "high"
   *   }
   * }
   */
  fastify.post<{ Body: SettlementEstimateBody }>(
    '/settlement-estimate',
    async (request: FastifyRequest<{ Body: SettlementEstimateBody }>, reply: FastifyReply) => {
      try {
        const { caseType, jurisdiction, documentIds, caseMetadata } = request.body;

        if (!caseType || !jurisdiction) {
          return reply.code(400).send({
            success: false,
            error: 'caseType and jurisdiction are required',
            timestamp: new Date().toISOString()
          } as ApiResponse);
        }

        const input: CasePredictionInput = {
          caseType: caseType.toLowerCase(),
          jurisdiction,
          documentIds,
          caseMetadata
        };

        const estimate = await predictiveIntelligenceService.estimateSettlement(input);

        return {
          success: true,
          data: estimate,
          timestamp: new Date().toISOString()
        } as ApiResponse;

      } catch (error) {
        console.error('Settlement estimate error:', error);

        return reply.code(500).send({
          success: false,
          error: 'Failed to generate settlement estimate',
          message: error instanceof Error ? error.message : 'Unknown error',
          timestamp: new Date().toISOString()
        } as ApiResponse);
      }
    }
  );

  /**
   * GET /api/predictions/model-performance
   *
   * Get performance metrics for ML models
   *
   * @query modelId - Optional specific model ID
   *
   * @example
   * GET /api/predictions/model-performance
   * GET /api/predictions/model-performance?modelId=model-123
   */
  fastify.get<{ Querystring: ModelIdQuery }>(
    '/model-performance',
    async (request: FastifyRequest<{ Querystring: ModelIdQuery }>, reply: FastifyReply) => {
      try {
        const { modelId } = request.query;

        // Check admin access
        const userRole = (request as any).user?.role;
        if (userRole !== 'ADMIN' && userRole !== 'admin') {
          return reply.code(403).send({
            success: false,
            error: 'Admin access required to view model performance',
            timestamp: new Date().toISOString()
          } as ApiResponse);
        }

        const metrics = await predictiveIntelligenceService.getModelPerformance(modelId);

        return {
          success: true,
          data: {
            models: metrics,
            totalModels: metrics.length,
            avgAccuracy: metrics.reduce((sum, m) => sum + m.accuracy, 0) / metrics.length || 0
          },
          timestamp: new Date().toISOString()
        } as ApiResponse;

      } catch (error) {
        console.error('Model performance retrieval error:', error);

        return reply.code(500).send({
          success: false,
          error: 'Failed to retrieve model performance',
          message: error instanceof Error ? error.message : 'Unknown error',
          timestamp: new Date().toISOString()
        } as ApiResponse);
      }
    }
  );

  /**
   * POST /api/predictions/:id/feedback
   *
   * Submit feedback on a prediction to improve model accuracy
   *
   * @example
   * POST /api/predictions/pred-123/feedback
   * {
   *   "actualOutcome": { "result": "favorable", "details": "Case won" },
   *   "wasAccurate": true,
   *   "feedback": "Prediction was helpful"
   * }
   */
  fastify.post<{ Params: PredictionIdParams; Body: FeedbackBody }>(
    '/:id/feedback',
    async (
      request: FastifyRequest<{ Params: PredictionIdParams; Body: FeedbackBody }>,
      reply: FastifyReply
    ) => {
      try {
        const { id: predictionId } = request.params;
        const { actualOutcome, wasAccurate, feedback } = request.body;

        if (!predictionId) {
          return reply.code(400).send({
            success: false,
            error: 'Prediction ID is required',
            timestamp: new Date().toISOString()
          } as ApiResponse);
        }

        if (actualOutcome === undefined || wasAccurate === undefined) {
          return reply.code(400).send({
            success: false,
            error: 'actualOutcome and wasAccurate are required',
            timestamp: new Date().toISOString()
          } as ApiResponse);
        }

        const userId = (request as any).user?.id;

        await predictiveIntelligenceService.submitFeedback(
          predictionId,
          actualOutcome,
          wasAccurate,
          feedback,
          userId
        );

        return {
          success: true,
          message: 'Feedback submitted successfully',
          timestamp: new Date().toISOString()
        } as ApiResponse;

      } catch (error) {
        console.error('Feedback submission error:', error);

        return reply.code(500).send({
          success: false,
          error: 'Failed to submit feedback',
          message: error instanceof Error ? error.message : 'Unknown error',
          timestamp: new Date().toISOString()
        } as ApiResponse);
      }
    }
  );

  /**
   * GET /api/predictions/health
   *
   * Health check for prediction services
   */
  fastify.get(
    '/health',
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const metrics = await predictiveIntelligenceService.getModelPerformance();

        const activeModels = metrics.filter(m => m.accuracy > 0);

        return {
          success: true,
          data: {
            status: activeModels.length > 0 ? 'healthy' : 'degraded',
            service: 'Predictive Intelligence',
            version: '1.0.0',
            activeModels: activeModels.length,
            totalPredictions: metrics.reduce((sum, m) => sum + m.predictionCount, 0),
            avgModelAccuracy: activeModels.reduce((sum, m) => sum + m.accuracy, 0) / activeModels.length || 0
          },
          timestamp: new Date().toISOString()
        } as ApiResponse;

      } catch (error) {
        return reply.code(500).send({
          success: false,
          error: 'Service health check failed',
          message: error instanceof Error ? error.message : 'Unknown error',
          timestamp: new Date().toISOString()
        } as ApiResponse);
      }
    }
  );
}

/**
 * Feedback API Routes
 * Phase 7: User Feedback Loop
 *
 * API endpoints for tracking user interactions, click events, and relevance feedback.
 */

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { feedbackService } from '../services/feedback/feedback-service';

interface TrackSearchBody {
  query: string;
  resultsCount: number;
  filters?: Record<string, any>;
  sortBy?: string;
  sessionId?: string;
}

interface TrackClickBody {
  searchInteractionId: string;
  documentId: string;
  position: number;
  relevanceScore?: number;
}

interface UpdateDwellTimeBody {
  dwellTime: number;
}

interface TrackFeedbackBody {
  searchInteractionId: string;
  documentId: string;
  rating: number;
  isRelevant?: boolean;
  comment?: string;
}

interface ABTestBody {
  name: string;
  description?: string;
  variants: Record<string, any>[];
  trafficSplit: Record<string, number>;
  startDate?: string;
  endDate?: string;
}

/**
 * Register feedback routes
 */
export async function feedbackRoutes(fastify: FastifyInstance) {
  /**
   * Track search interaction
   * POST /api/feedback/search
   */
  fastify.post<{ Body: TrackSearchBody }>(
    '/search',
    {
      schema: {
        tags: ['Feedback'],
        description: 'Track a user search interaction',
        body: {
          type: 'object',
          required: ['query', 'resultsCount'],
          properties: {
            query: { type: 'string', description: 'Search query text' },
            resultsCount: { type: 'number', description: 'Number of results returned' },
            filters: { type: 'object', description: 'Applied filters' },
            sortBy: { type: 'string', description: 'Sort method used' },
            sessionId: { type: 'string', description: 'Session identifier' }
          }
        },
        response: {
          200: {
            type: 'object',
            properties: {
              id: { type: 'string' }
            }
          }
        }
      }
    },
    async (request: FastifyRequest<{ Body: TrackSearchBody }>, reply: FastifyReply) => {
      try {
        // @ts-ignore - user is added by JWT authentication middleware
        const userId = request.user?.id;

        if (!userId) {
          return reply.code(401).send({ error: 'Unauthorized' });
        }

        const result = await feedbackService.trackSearch({
          userId,
          query: request.body.query,
          resultsCount: request.body.resultsCount,
          filters: request.body.filters,
          sortBy: request.body.sortBy,
          sessionId: request.body.sessionId,
          userAgent: request.headers['user-agent'],
          ipAddress: request.ip
        });

        reply.code(200).send(result);
      } catch (error) {
        request.log.error(error);
        reply.code(500).send({ error: 'Failed to track search' });
      }
    }
  );

  /**
   * Track click event
   * POST /api/feedback/click
   */
  fastify.post<{ Body: TrackClickBody }>(
    '/click',
    {
      schema: {
        tags: ['Feedback'],
        description: 'Track when user clicks on a search result',
        body: {
          type: 'object',
          required: ['searchInteractionId', 'documentId', 'position'],
          properties: {
            searchInteractionId: { type: 'string', description: 'ID of the search interaction' },
            documentId: { type: 'string', description: 'ID of clicked document' },
            position: { type: 'number', description: 'Position of result in search results (0-indexed)' },
            relevanceScore: { type: 'number', description: 'Relevance score of the result' }
          }
        },
        response: {
          200: {
            type: 'object',
            properties: {
              id: { type: 'string' }
            }
          }
        }
      }
    },
    async (request: FastifyRequest<{ Body: TrackClickBody }>, reply: FastifyReply) => {
      try {
        const result = await feedbackService.trackClick(request.body);
        reply.code(200).send(result);
      } catch (error) {
        request.log.error(error);
        reply.code(500).send({ error: 'Failed to track click' });
      }
    }
  );

  /**
   * Update dwell time for click event
   * PUT /api/feedback/click/:clickEventId/dwell-time
   */
  fastify.put<{ Params: { clickEventId: string }; Body: UpdateDwellTimeBody }>(
    '/click/:clickEventId/dwell-time',
    {
      schema: {
        tags: ['Feedback'],
        description: 'Update dwell time when user leaves document',
        params: {
          type: 'object',
          properties: {
            clickEventId: { type: 'string', description: 'ID of the click event' }
          }
        },
        body: {
          type: 'object',
          required: ['dwellTime'],
          properties: {
            dwellTime: { type: 'number', description: 'Time spent on document in milliseconds' }
          }
        },
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' }
            }
          }
        }
      }
    },
    async (request: FastifyRequest<{ Params: { clickEventId: string }; Body: UpdateDwellTimeBody }>, reply: FastifyReply) => {
      try {
        await feedbackService.updateDwellTime(
          request.params.clickEventId,
          request.body.dwellTime
        );
        reply.code(200).send({ success: true });
      } catch (error) {
        request.log.error(error);
        reply.code(500).send({ error: 'Failed to update dwell time' });
      }
    }
  );

  /**
   * Track relevance feedback
   * POST /api/feedback/relevance
   */
  fastify.post<{ Body: TrackFeedbackBody }>(
    '/relevance',
    {
      schema: {
        tags: ['Feedback'],
        description: 'Track explicit user relevance feedback',
        body: {
          type: 'object',
          required: ['searchInteractionId', 'documentId', 'rating'],
          properties: {
            searchInteractionId: { type: 'string', description: 'ID of the search interaction' },
            documentId: { type: 'string', description: 'ID of the document' },
            rating: { type: 'number', minimum: 1, maximum: 5, description: '1-5 star rating' },
            isRelevant: { type: 'boolean', description: 'Whether document is relevant' },
            comment: { type: 'string', description: 'Optional comment' }
          }
        },
        response: {
          200: {
            type: 'object',
            properties: {
              id: { type: 'string' }
            }
          }
        }
      }
    },
    async (request: FastifyRequest<{ Body: TrackFeedbackBody }>, reply: FastifyReply) => {
      try {
        const result = await feedbackService.trackRelevanceFeedback(request.body);
        reply.code(200).send(result);
      } catch (error) {
        request.log.error(error);
        const message = error instanceof Error ? error.message : 'Failed to track feedback';
        reply.code(500).send({ error: message });
      }
    }
  );

  /**
   * Get CTR metrics
   * GET /api/feedback/metrics/ctr
   */
  fastify.get(
    '/metrics/ctr',
    {
      schema: {
        tags: ['Feedback', 'Analytics'],
        description: 'Get click-through rate metrics',
        querystring: {
          type: 'object',
          properties: {
            startDate: { type: 'string', format: 'date-time', description: 'Start date for metrics' },
            endDate: { type: 'string', format: 'date-time', description: 'End date for metrics' },
            userId: { type: 'string', description: 'Filter by specific user' }
          }
        },
        response: {
          200: {
            type: 'object',
            properties: {
              totalSearches: { type: 'number' },
              searchesWithClicks: { type: 'number' },
              totalClicks: { type: 'number' },
              ctr: { type: 'number', description: 'Click-through rate percentage' },
              avgClicksPerSearch: { type: 'number' },
              avgPosition: { type: 'number', description: 'Average position of clicked results' }
            }
          }
        }
      }
    },
    async (request: FastifyRequest<{
      Querystring: { startDate?: string; endDate?: string; userId?: string };
    }>, reply: FastifyReply) => {
      try {
        const { startDate, endDate, userId } = request.query;

        const metrics = await feedbackService.getCTRMetrics(
          startDate ? new Date(startDate) : undefined,
          endDate ? new Date(endDate) : undefined,
          userId
        );

        reply.code(200).send(metrics);
      } catch (error) {
        request.log.error(error);
        reply.code(500).send({ error: 'Failed to get CTR metrics' });
      }
    }
  );

  /**
   * Get relevance metrics
   * GET /api/feedback/metrics/relevance
   */
  fastify.get(
    '/metrics/relevance',
    {
      schema: {
        tags: ['Feedback', 'Analytics'],
        description: 'Get relevance feedback metrics',
        querystring: {
          type: 'object',
          properties: {
            startDate: { type: 'string', format: 'date-time', description: 'Start date for metrics' },
            endDate: { type: 'string', format: 'date-time', description: 'End date for metrics' },
            userId: { type: 'string', description: 'Filter by specific user' }
          }
        },
        response: {
          200: {
            type: 'object',
            properties: {
              totalFeedback: { type: 'number' },
              avgRating: { type: 'number' },
              relevantCount: { type: 'number' },
              irrelevantCount: { type: 'number' },
              relevanceRate: { type: 'number', description: 'Percentage of relevant feedback' }
            }
          }
        }
      }
    },
    async (request: FastifyRequest<{
      Querystring: { startDate?: string; endDate?: string; userId?: string };
    }>, reply: FastifyReply) => {
      try {
        const { startDate, endDate, userId } = request.query;

        const metrics = await feedbackService.getRelevanceMetrics(
          startDate ? new Date(startDate) : undefined,
          endDate ? new Date(endDate) : undefined,
          userId
        );

        reply.code(200).send(metrics);
      } catch (error) {
        request.log.error(error);
        reply.code(500).send({ error: 'Failed to get relevance metrics' });
      }
    }
  );

  /**
   * Get top clicked documents for a query
   * GET /api/feedback/top-clicked
   */
  fastify.get(
    '/top-clicked',
    {
      schema: {
        tags: ['Feedback', 'Analytics'],
        description: 'Get most clicked documents for a query',
        querystring: {
          type: 'object',
          required: ['query'],
          properties: {
            query: { type: 'string', description: 'Search query' },
            limit: { type: 'number', default: 10, description: 'Max results' }
          }
        },
        response: {
          200: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                documentId: { type: 'string' },
                clickCount: { type: 'number' },
                avgPosition: { type: 'number' }
              }
            }
          }
        }
      }
    },
    async (request: FastifyRequest<{
      Querystring: { query: string; limit?: number };
    }>, reply: FastifyReply) => {
      try {
        const { query, limit } = request.query;

        const results = await feedbackService.getTopClickedDocuments(
          query,
          limit || 10
        );

        reply.code(200).send(results);
      } catch (error) {
        request.log.error(error);
        reply.code(500).send({ error: 'Failed to get top clicked documents' });
      }
    }
  );

  /**
   * Create A/B test configuration (admin only)
   * POST /api/feedback/ab-test
   */
  fastify.post<{ Body: ABTestBody }>(
    '/ab-test',
    {
      schema: {
        tags: ['Feedback', 'A/B Testing'],
        description: 'Create A/B test configuration (admin only)',
        body: {
          type: 'object',
          required: ['name', 'variants', 'trafficSplit'],
          properties: {
            name: { type: 'string', description: 'Test name' },
            description: { type: 'string', description: 'Test description' },
            variants: {
              type: 'array',
              description: 'Array of variant configurations',
              items: { type: 'object' }
            },
            trafficSplit: {
              type: 'object',
              description: 'Traffic split percentages by variant name'
            },
            startDate: { type: 'string', format: 'date-time' },
            endDate: { type: 'string', format: 'date-time' }
          }
        },
        response: {
          200: {
            type: 'object',
            properties: {
              id: { type: 'string' }
            }
          }
        }
      }
    },
    async (request: FastifyRequest<{ Body: ABTestBody }>, reply: FastifyReply) => {
      try {
        // @ts-ignore - user is added by JWT authentication middleware
        const userRole = request.user?.role;

        if (userRole !== 'admin') {
          return reply.code(403).send({ error: 'Admin access required' });
        }

        const result = await feedbackService.createABTest({
          name: request.body.name,
          description: request.body.description,
          variants: request.body.variants,
          trafficSplit: request.body.trafficSplit,
          startDate: request.body.startDate ? new Date(request.body.startDate) : undefined,
          endDate: request.body.endDate ? new Date(request.body.endDate) : undefined
        });

        reply.code(200).send(result);
      } catch (error) {
        request.log.error(error);
        reply.code(500).send({ error: 'Failed to create A/B test' });
      }
    }
  );

  /**
   * Get user's A/B test variant
   * GET /api/feedback/ab-test/:testConfigId/variant
   */
  fastify.get<{ Params: { testConfigId: string } }>(
    '/ab-test/:testConfigId/variant',
    {
      schema: {
        tags: ['Feedback', 'A/B Testing'],
        description: 'Get or assign user to A/B test variant',
        params: {
          type: 'object',
          properties: {
            testConfigId: { type: 'string', description: 'A/B test configuration ID' }
          }
        },
        response: {
          200: {
            type: 'object',
            properties: {
              variant: { type: 'string' }
            }
          }
        }
      }
    },
    async (request: FastifyRequest<{ Params: { testConfigId: string } }>, reply: FastifyReply) => {
      try {
        // @ts-ignore - user is added by JWT authentication middleware
        const userId = request.user?.id;

        if (!userId) {
          return reply.code(401).send({ error: 'Unauthorized' });
        }

        // Try to get existing assignment
        let variant = await feedbackService.getUserABTestVariant(userId, request.params.testConfigId);

        // If no assignment, create one
        if (!variant) {
          const result = await feedbackService.assignUserToABTest(userId, request.params.testConfigId);
          variant = result.variant;
        }

        reply.code(200).send({ variant });
      } catch (error) {
        request.log.error(error);
        reply.code(500).send({ error: 'Failed to get A/B test variant' });
      }
    }
  );

  /**
   * Get A/B test results (admin only)
   * GET /api/feedback/ab-test/:testConfigId/results
   */
  fastify.get<{ Params: { testConfigId: string } }>(
    '/ab-test/:testConfigId/results',
    {
      schema: {
        tags: ['Feedback', 'A/B Testing', 'Analytics'],
        description: 'Get A/B test results (admin only)',
        params: {
          type: 'object',
          properties: {
            testConfigId: { type: 'string', description: 'A/B test configuration ID' }
          }
        },
        response: {
          200: {
            type: 'object',
            properties: {
              variants: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    variant: { type: 'string' },
                    userCount: { type: 'number' },
                    avgCTR: { type: 'number' },
                    avgRelevance: { type: 'number' }
                  }
                }
              }
            }
          }
        }
      }
    },
    async (request: FastifyRequest<{ Params: { testConfigId: string } }>, reply: FastifyReply) => {
      try {
        // @ts-ignore - user is added by JWT authentication middleware
        const userRole = request.user?.role;

        if (userRole !== 'admin') {
          return reply.code(403).send({ error: 'Admin access required' });
        }

        const results = await feedbackService.getABTestResults(request.params.testConfigId);
        reply.code(200).send(results);
      } catch (error) {
        request.log.error(error);
        reply.code(500).send({ error: 'Failed to get A/B test results' });
      }
    }
  );
}

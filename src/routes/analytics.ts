import { FastifyInstance } from 'fastify';
import { analyticsService } from '../services/analytics/analytics-service.js';

export async function analyticsRoutes(fastify: FastifyInstance) {
  // Get trending documents
  fastify.get('/api/analytics/trending', {
    schema: {
      querystring: {
        type: 'object',
        properties: {
          limit: { type: 'number', default: 10 }
        }
      }
    }
  }, async (request, reply) => {
    const { limit } = request.query as { limit?: number };

    try {
      const trending = await analyticsService.getTrendingDocuments(limit || 10);
      return { documents: trending };
    } catch (error) {
      console.error('Error fetching trending documents:', error);
      return reply.code(500).send({ error: 'Failed to fetch trending documents' });
    }
  });

  // Get top search queries
  fastify.get('/api/analytics/top-searches', {
    schema: {
      querystring: {
        type: 'object',
        properties: {
          limit: { type: 'number', default: 20 }
        }
      }
    }
  }, async (request, reply) => {
    const { limit } = request.query as { limit?: number };

    try {
      const queries = await analyticsService.getTopSearchQueries(limit || 20);
      return { queries };
    } catch (error) {
      console.error('Error fetching top searches:', error);
      return reply.code(500).send({ error: 'Failed to fetch top searches' });
    }
  });

  // Get user engagement metrics
  fastify.get('/api/analytics/user/engagement', {
    schema: {
      querystring: {
        type: 'object',
        properties: {
          days: { type: 'number', default: 30 }
        }
      }
    }
  }, async (request, reply) => {
    const { days } = request.query as { days?: number };
    const userId = (request.user as any)?.id;

    if (!userId) {
      return reply.code(401).send({ error: 'Unauthorized' });
    }

    try {
      const metrics = await analyticsService.getUserEngagementMetrics(userId, days || 30);
      return { metrics };
    } catch (error) {
      console.error('Error fetching user engagement:', error);
      return reply.code(500).send({ error: 'Failed to fetch user engagement metrics' });
    }
  });

  // Get system dashboard (admin only)
  fastify.get('/api/analytics/dashboard', {
    schema: {
      querystring: {
        type: 'object',
        properties: {
          days: { type: 'number', default: 30 }
        }
      }
    }
  }, async (request, reply) => {
    const userId = (request.user as any)?.id;
    const userRole = (request.user as any)?.role;

    if (!userId || userRole !== 'ADMIN') {
      return reply.code(403).send({ error: 'Admin access required' });
    }

    const { days } = request.query as { days?: number };

    try {
      const dashboard = await analyticsService.getDashboard(days || 30);
      return { dashboard };
    } catch (error) {
      console.error('Error fetching dashboard:', error);
      return reply.code(500).send({ error: 'Failed to fetch dashboard' });
    }
  });

  // Track document view
  fastify.post('/api/analytics/track/view', {
    schema: {
      body: {
        type: 'object',
        required: ['documentId'],
        properties: {
          documentId: { type: 'string' },
          timeSpent: { type: 'number' }
        }
      }
    }
  }, async (request, reply) => {
    const { documentId, timeSpent } = request.body as { documentId: string; timeSpent?: number };
    const userId = (request.user as any)?.id;

    try {
      await analyticsService.updateDocumentAnalytics({
        documentId,
        viewCount: 1,
        timeSpent
      });

      if (userId) {
        await analyticsService.trackEvent({
          eventType: 'document_view',
          userId,
          sessionId: request.id,
          metadata: { documentId },
          durationMs: timeSpent
        });
      }

      return { success: true };
    } catch (error) {
      console.error('Error tracking document view:', error);
      return reply.code(500).send({ error: 'Failed to track view' });
    }
  });

  // Track document download
  fastify.post('/api/analytics/track/download', {
    schema: {
      body: {
        type: 'object',
        required: ['documentId'],
        properties: {
          documentId: { type: 'string' }
        }
      }
    }
  }, async (request, reply) => {
    const { documentId } = request.body as { documentId: string };
    const userId = (request.user as any)?.id;

    try {
      await analyticsService.updateDocumentAnalytics({
        documentId,
        downloadCount: 1
      });

      if (userId) {
        await analyticsService.trackEvent({
          eventType: 'document_download',
          userId,
          sessionId: request.id,
          metadata: { documentId }
        });
      }

      return { success: true };
    } catch (error) {
      console.error('Error tracking document download:', error);
      return reply.code(500).send({ error: 'Failed to track download' });
    }
  });

  // Track search
  fastify.post('/api/analytics/track/search', {
    schema: {
      body: {
        type: 'object',
        required: ['query', 'resultCount'],
        properties: {
          query: { type: 'string' },
          resultCount: { type: 'number' },
          clickPosition: { type: 'number' }
        }
      }
    }
  }, async (request, reply) => {
    const { query, resultCount, clickPosition } = request.body as {
      query: string;
      resultCount: number;
      clickPosition?: number;
    };

    const userId = (request.user as any)?.id;

    try {
      await analyticsService.trackSearch(query, resultCount, clickPosition);

      if (userId) {
        await analyticsService.trackEvent({
          eventType: 'search',
          userId,
          sessionId: request.id,
          metadata: { query, resultCount, clickPosition }
        });
      }

      return { success: true };
    } catch (error) {
      console.error('Error tracking search:', error);
      return reply.code(500).send({ error: 'Failed to track search' });
    }
  });
}

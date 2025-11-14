/**
 * Unified Search API Routes (Fastify)
 * Week 3 NLP-RAG Performance Optimization
 *
 * Integrates:
 * - Multi-tier caching (L1/L2/L3)
 * - Async OpenAI processing
 * - NLP query processing
 * - RAG enhancement
 * - Query analytics
 */

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { getUnifiedSearchOrchestrator } from '../services/orchestration/unified-search-orchestrator.js';
import { getMultiTierCacheService } from '../services/cache/multi-tier-cache.service.js';
import { getAsyncOpenAIService } from '../services/ai/async-openai.service.js';

interface UnifiedSearchBody {
  query: string;
  filters?: {
    jurisdiction?: string;
    documentType?: string;
    dateFrom?: string;
    dateTo?: string;
    [key: string]: any;
  };
  limit?: number;
  offset?: number;
  sessionId?: string;
}

interface SearchAnalyticsQuery {
  userId?: string;
}

interface CacheStatsQuery {
  detailed?: string;
}

interface SessionContextBody {
  sessionId: string;
  context: Record<string, any>;
}

export async function unifiedSearchRoutes(app: FastifyInstance) {
  const orchestrator = getUnifiedSearchOrchestrator();
  const cacheService = getMultiTierCacheService();
  const aiService = getAsyncOpenAIService();

  /**
   * POST /api/unified-search
   * Execute unified search with NLP, RAG, and multi-tier caching
   */
  app.post<{ Body: UnifiedSearchBody }>(
    '/',
    async (request: FastifyRequest<{ Body: UnifiedSearchBody }>, reply: FastifyReply) => {
      try {
        const { query, filters, limit, offset, sessionId } = request.body;

        // Validate required fields
        if (!query || typeof query !== 'string' || query.trim().length === 0) {
          return reply.code(400).send({
            error: 'Query parameter is required and must be a non-empty string'
          });
        }

        // Validate limit
        const validatedLimit = Math.min(Math.max(1, limit || 20), 100);

        // Get user ID from auth (if authenticated)
        const userId = (request as any).user?.id;

        // Execute unified search
        const startTime = Date.now();
        const result = await orchestrator.search({
          query,
          userId,
          sessionId,
          filters,
          limit: validatedLimit,
          offset: offset || 0,
        });

        const totalTime = Date.now() - startTime;

        return reply.send({
          success: true,
          data: {
            documents: result.documents,
            totalCount: result.totalCount,
            responseTime: result.responseTime,
            totalProcessingTime: totalTime,
            metadata: {
              ...result.metadata,
              timestamp: new Date().toISOString(),
            },
          },
        });
      } catch (error: any) {
        app.log.error('Unified search error:', error);
        return reply.code(500).send({
          error: 'Search failed',
          message: error.message,
        });
      }
    }
  );

  /**
   * GET /api/unified-search/analytics
   * Get search analytics and performance metrics
   */
  app.get<{ Querystring: SearchAnalyticsQuery }>(
    '/analytics',
    async (request: FastifyRequest<{ Querystring: SearchAnalyticsQuery }>, reply: FastifyReply) => {
      try {
        // Get user ID from query or auth
        const userId = request.query.userId || (request as any).user?.id;

        const analytics = await orchestrator.getSearchAnalytics(userId);

        return reply.send({
          success: true,
          data: analytics,
        });
      } catch (error: any) {
        app.log.error('Analytics fetch error:', error);
        return reply.code(500).send({
          error: 'Failed to fetch analytics',
          message: error.message,
        });
      }
    }
  );

  /**
   * GET /api/unified-search/cache/stats
   * Get cache statistics (L1/L2/L3)
   */
  app.get<{ Querystring: CacheStatsQuery }>(
    '/cache/stats',
    async (request: FastifyRequest<{ Querystring: CacheStatsQuery }>, reply: FastifyReply) => {
      try {
        const detailed = request.query.detailed === 'true';

        const stats = await cacheService.getStats();
        const hitRate = cacheService.getCacheHitRate();

        if (detailed) {
          return reply.send({
            success: true,
            data: {
              ...stats,
              hitRate,
              breakdown: {
                l1: {
                  ...stats.l1,
                  ttl: parseInt(process.env.CACHE_L1_TTL_MS || '300000') / 1000,
                },
                l2: {
                  ...stats.l2,
                  ttl: parseInt(process.env.CACHE_L2_TTL_MS || '3600000') / 1000,
                },
                l3: {
                  ...stats.l3,
                  ttl: parseInt(process.env.CACHE_L3_TTL_MS || '86400000') / 1000,
                },
              },
            },
          });
        }

        return reply.send({
          success: true,
          data: {
            hitRate,
            l1Keys: stats.l1.keys,
            l2Connected: stats.l2.isConnected,
            l3Connected: stats.l3.isConnected,
          },
        });
      } catch (error: any) {
        app.log.error('Cache stats error:', error);
        return reply.code(500).send({
          error: 'Failed to fetch cache stats',
          message: error.message,
        });
      }
    }
  );

  /**
   * POST /api/unified-search/cache/clear
   * Clear cache (L1/L2/L3) - Admin only
   */
  app.post(
    '/cache/clear',
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        // Check admin permissions
        const userRole = (request as any).user?.role;
        if (userRole !== 'ADMIN') {
          return reply.code(403).send({
            error: 'Forbidden',
            message: 'Admin access required',
          });
        }

        await cacheService.clear();

        return reply.send({
          success: true,
          message: 'All cache tiers cleared successfully',
        });
      } catch (error: any) {
        app.log.error('Cache clear error:', error);
        return reply.code(500).send({
          error: 'Failed to clear cache',
          message: error.message,
        });
      }
    }
  );

  /**
   * GET /api/unified-search/queue/stats
   * Get OpenAI queue statistics
   */
  app.get(
    '/queue/stats',
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const queueStats = await aiService.getQueueStats();
        const cacheStats = await aiService.getCacheStats();

        return reply.send({
          success: true,
          data: {
            queue: queueStats,
            cache: cacheStats,
          },
        });
      } catch (error: any) {
        app.log.error('Queue stats error:', error);
        return reply.code(500).send({
          error: 'Failed to fetch queue stats',
          message: error.message,
        });
      }
    }
  );

  /**
   * POST /api/unified-search/session/context
   * Update session context for personalization
   */
  app.post<{ Body: SessionContextBody }>(
    '/session/context',
    async (request: FastifyRequest<{ Body: SessionContextBody }>, reply: FastifyReply) => {
      try {
        const { sessionId, context } = request.body;

        if (!sessionId || !context) {
          return reply.code(400).send({
            error: 'sessionId and context are required',
          });
        }

        const userId = (request as any).user?.id;

        await orchestrator.updateSessionContext(sessionId, userId, context);

        return reply.send({
          success: true,
          message: 'Session context updated',
        });
      } catch (error: any) {
        app.log.error('Session context update error:', error);
        return reply.code(500).send({
          error: 'Failed to update session context',
          message: error.message,
        });
      }
    }
  );

  /**
   * GET /api/unified-search/suggestions
   * Get query suggestions for autocomplete
   */
  app.get<{ Querystring: { q: string; limit?: string } }>(
    '/suggestions',
    async (request: FastifyRequest<{ Querystring: { q: string; limit?: string } }>, reply: FastifyReply) => {
      try {
        const { q, limit } = request.query;

        if (!q || q.trim().length === 0) {
          return reply.code(400).send({
            error: 'Query parameter q is required',
          });
        }

        const validatedLimit = Math.min(Math.max(1, parseInt(limit || '10')), 20);

        const suggestions = await orchestrator.getSuggestions(
          q.trim(),
          validatedLimit
        );

        return reply.send({
          success: true,
          data: suggestions,
        });
      } catch (error: any) {
        app.log.error('Suggestions error:', error);
        return reply.code(500).send({
          error: 'Failed to fetch suggestions',
          message: error.message,
        });
      }
    }
  );

  /**
   * GET /api/unified-search/health
   * Health check endpoint for unified search system
   */
  app.get(
    '/health',
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const cacheStats = await cacheService.getStats();
        const queueStats = await aiService.getQueueStats();

        const health = {
          status: 'healthy',
          timestamp: new Date().toISOString(),
          components: {
            cache: {
              l1: { status: cacheStats.l1.keys >= 0 ? 'healthy' : 'unhealthy' },
              l2: { status: cacheStats.l2.isConnected ? 'healthy' : 'unhealthy' },
              l3: { status: cacheStats.l3.isConnected ? 'healthy' : 'unhealthy' },
            },
            queue: {
              status: queueStats.waiting >= 0 ? 'healthy' : 'unhealthy',
              metrics: queueStats,
            },
          },
        };

        const isHealthy =
          cacheStats.l2.isConnected &&
          cacheStats.l3.isConnected &&
          queueStats.waiting >= 0;

        return reply.code(isHealthy ? 200 : 503).send({
          success: isHealthy,
          data: health,
        });
      } catch (error: any) {
        app.log.error('Health check error:', error);
        return reply.code(503).send({
          success: false,
          error: 'Health check failed',
          message: error.message,
        });
      }
    }
  );
}

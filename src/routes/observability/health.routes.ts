/**
 * Health Check Routes
 *
 * Health, readiness, and liveness endpoints for Kubernetes/Docker
 * Week 5-6: Observabilidad - Health Check API
 */

import { FastifyPluginAsync } from 'fastify';
import { getHealthService } from '../../services/observability/health.service';

const healthRoutes: FastifyPluginAsync = async (fastify) => {
  const healthService = getHealthService();

  /**
   * GET /health
   * Comprehensive health check including all dependencies
   */
  fastify.get('/health', async (request, reply) => {
    try {
      const health = await healthService.healthCheck();

      const statusCode = health.status === 'healthy' ? 200 : health.status === 'degraded' ? 200 : 503;

      reply.code(statusCode).send(health);
    } catch (error) {
      fastify.log.error({ error }, 'Health check failed');
      reply.code(503).send({
        status: 'unhealthy',
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      });
    }
  });

  /**
   * GET /ready
   * Readiness probe for Kubernetes
   * Returns 200 if the service is ready to accept traffic
   */
  fastify.get('/ready', async (request, reply) => {
    try {
      const readiness = await healthService.readinessCheck();

      if (readiness.ready) {
        reply.code(200).send(readiness);
      } else {
        reply.code(503).send(readiness);
      }
    } catch (error) {
      fastify.log.error({ error }, 'Readiness check failed');
      reply.code(503).send({
        ready: false,
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  /**
   * GET /live
   * Liveness probe for Kubernetes
   * Returns 200 if the service is alive
   */
  fastify.get('/live', async (request, reply) => {
    try {
      const liveness = healthService.livenessCheck();

      reply.code(200).send(liveness);
    } catch (error) {
      fastify.log.error({ error }, 'Liveness check failed');
      reply.code(503).send({
        alive: false,
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });
};

export default healthRoutes;

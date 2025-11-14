/**
 * Metrics Routes
 *
 * Prometheus metrics endpoint for monitoring
 * Week 5-6: Observabilidad - Metrics API
 */

import { FastifyPluginAsync } from 'fastify';
import { getMetricsService } from '../../services/observability/metrics.service';

const metricsRoutes: FastifyPluginAsync = async (fastify) => {
  const metricsService = getMetricsService();

  /**
   * GET /metrics
   * Returns Prometheus-formatted metrics
   */
  fastify.get('/metrics', async (request, reply) => {
    try {
      const metrics = await metricsService.getMetrics();

      reply
        .code(200)
        .header('Content-Type', 'text/plain; version=0.0.4; charset=utf-8')
        .send(metrics);
    } catch (error) {
      fastify.log.error({ error }, 'Failed to get metrics');
      reply.code(500).send({ error: 'Failed to get metrics' });
    }
  });

  /**
   * GET /metrics/json
   * Returns metrics in JSON format
   */
  fastify.get('/metrics/json', async (request, reply) => {
    try {
      const metrics = await metricsService.getMetricsJSON();

      reply.code(200).send(metrics);
    } catch (error) {
      fastify.log.error({ error }, 'Failed to get metrics JSON');
      reply.code(500).send({ error: 'Failed to get metrics' });
    }
  });
};

export default metricsRoutes;

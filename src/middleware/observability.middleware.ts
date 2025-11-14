/**
 * Observability Middleware
 *
 * Automatic request tracing and metrics collection
 * Week 5-6: Observabilidad - Fastify Middleware
 */

import { FastifyRequest, FastifyReply } from 'fastify';
import { getMetricsService } from '../services/observability/metrics.service';
import { getTracingService } from '../services/observability/tracing.service';

const metricsService = getMetricsService();
const tracingService = getTracingService();

/**
 * Request metrics middleware
 * Automatically records HTTP request metrics
 */
export async function requestMetricsMiddleware(
  request: FastifyRequest,
  reply: FastifyReply
) {
  const startTime = Date.now();

  // Add hook to record metrics after response is sent
  reply.addHook('onSend', async (request, reply) => {
    const duration = (Date.now() - startTime) / 1000; // Convert to seconds
    const method = request.method;
    const route = request.routerPath || request.url;
    const statusCode = reply.statusCode;

    // Record request metrics
    metricsService.recordRequest(method, route, statusCode, duration);

    // Add trace ID to response headers if available
    const traceId = tracingService.getCurrentTraceId();
    if (traceId) {
      reply.header('X-Trace-Id', traceId);
    }
  });
}

/**
 * Error tracking middleware
 * Records errors in metrics
 */
export async function errorTrackingMiddleware(
  error: Error,
  request: FastifyRequest,
  reply: FastifyReply
) {
  // Record error metric
  metricsService.recordError(
    error.name || 'UnknownError',
    request.routerPath || 'unknown'
  );

  // Add event to current span
  tracingService.addEvent('error', {
    'error.type': error.name,
    'error.message': error.message,
    'error.stack': error.stack,
  });

  // Re-throw error to let Fastify handle it
  throw error;
}

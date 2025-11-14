/**
 * Prisma Middleware
 *
 * Automatic database query tracing and metrics
 * Week 5-6: Observabilidad - Prisma Query Tracing
 */

import { Prisma } from '@prisma/client';
import { getTracingService } from '../services/observability/tracing.service';
import { getMetricsService } from '../services/observability/metrics.service';

const tracingService = getTracingService();
const metricsService = getMetricsService();

/**
 * Prisma middleware for query tracing and metrics
 */
export const prismaTracingMiddleware: Prisma.Middleware = async (params, next) => {
  const startTime = Date.now();
  const { model, action } = params;

  try {
    // Execute query within a trace span
    const result = await tracingService.traceDatabaseQuery(
      action,
      model || 'unknown',
      async () => {
        return await next(params);
      }
    );

    // Record successful query metrics
    const duration = (Date.now() - startTime) / 1000;
    metricsService.recordDatabaseQuery(action, model || 'unknown', duration);

    return result;
  } catch (error) {
    // Record error metrics
    const duration = (Date.now() - startTime) / 1000;
    metricsService.recordDatabaseQuery(action, model || 'unknown', duration);
    metricsService.recordError('DatabaseError', model || 'unknown');

    throw error;
  }
};

/**
 * Apply Prisma middleware to client
 */
export function applyPrismaMiddleware(prisma: any): void {
  prisma.$use(prismaTracingMiddleware);
  console.log('✅ Prisma tracing middleware enabled');
}
